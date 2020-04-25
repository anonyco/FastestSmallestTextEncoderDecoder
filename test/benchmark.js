"use strict";
let Table;
try {Table = require('tty-table')} catch(e) {
	require("child_process").spawnSync("npm", ["i"], {windowsHide: true, timeout: 20000}); // If it takes more than 20 seconds, there's definately something wrong
	Table = require('tty-table');
}
const Promise = global.Promise;
const setImmediate = global.setImmediate;
const https = require("https");
const fs = require("fs");
const /*Array_isArray = Array.isArray,*/ Uint8Array = global.Uint8Array;
const Math_min = Math.min, Math_max = Math.max, Math_round = Math.round;
const performance = require("perf_hooks").performance;
//node -e 'var perf = require("perf_hooks").performance; for(let i=0;i<300;i=i+1|0)perf.now(); var start=perf.now(); for(let i=0;i<99999;i=i+1|0)perf.now(); var end=perf.now(); console.log( end - start )'

const filesDownloadedReady = new Promise(function(accept) {
	/*fs.exists("encoding-indexes.js", function(doesExist) {
		if (doesExist) return accept();
		download("https://raw.githubusercontent.com/inexorabletash/text-encoding/master/lib/encoding-indexes.js", "encoding-indexes.js", setTimeout.bind(null, accept, 50));
	});*/
	accept();
});

allAssoc({
	
	FastTextEncoding: httpGet("https://raw.githubusercontent.com/samthor/fast-text-encoding/master/text.min.js").then(evalEncoderDecoder),
	TextEncoding: httpGet("https://raw.githubusercontent.com/inexorabletash/text-encoding/master/lib/encoding.js").then(evalEncoderDecoder),
	TextEncoderTextDecoderJS: httpGet("https://gist.githubusercontent.com/Yaffle/5458286/raw/a5eee05b217ab22b471bc2e7e96f6df84edde9cf/TextEncoderTextDecoder.js").then(evalEncoderDecoder),
	textEncoderLite: httpGet("https://raw.githubusercontent.com/solderjs/TextEncoderLite/master/text-encoder-lite.min.js").then(evalEncoderDecoder),
	textEncoderShim: httpGet("https://gitlab.com/PseudoPsycho/text-encoding-shim/-/raw/master/index.js").then(evalEncoderDecoder),
	FastestSmallestTextEncoderDecoder: readFile("../EncoderDecoderTogether.src.js").then(evalEncoderDecoder),
	nativeImplementation: getEncodeAndDecode( require('util') ),
	
	// Polyfills:
	codePointAtPolyfill: httpGet("https://raw.githubusercontent.com/mathiasbynens/String.prototype.codePointAt/master/codepointat.js"),
	fromCharCodePolyfill: httpGet("https://raw.githubusercontent.com/mathiasbynens/String.fromCodePoint/master/fromcodepoint.js"),
	
	// Text Files:
	largeTestFile: readFile("random-test-30000000.txt", true),
	largeAsciiFile: readFile("random-ascii-30000000.txt", true),
	bibleInRussian: readFile("1876 The Russian Synodal Bible.txt", true)
}).then(async function(assets) {
	Function(assets.codePointAtPolyfill + "\n" + assets.fromCharCodePolyfill)(); // load polyfills
	
	// save lots of memory by clearing the require cache
	for (const key in require.cache) try{ delete require.cache[key]; }catch(e){}
    Object.keys(module.constructor._pathCache).forEach(function(cacheKey) {
        delete module.constructor._pathCache[cacheKey];
    });
	
	const largeAsciiArray = Uint8Array.prototype.subarray.call(assets.largeAsciiFile, 0, 16777216);
	const mediumAsciiArray = largeAsciiArray.subarray(32768, 65536);
	const smallAsciiArray = largeAsciiArray.subarray(32, 64);
	
	const largeAsciiString = assets.nativeImplementation.encode(largeAsciiArray);
	const mediumAsciiString = assets.nativeImplementation.encode(mediumAsciiArray);
	const smallAsciiString = assets.nativeImplementation.encode(smallAsciiArray);
	
	
	
	const largeTestArray = Uint8Array.prototype.subarray.call(assets.largeTestFile, 0, 16777216);
	const mediumTestArray = largeTestArray.subarray(32768, 65536); // potential invalid points at start/end are intended
	const smallTestArray = largeTestArray.subarray(32, 64); // potential invalid points at start/end are intended
	
	const largeTestString = assets.nativeImplementation.encode(largeTestArray);
	const mediumTestString = assets.nativeImplementation.encode(mediumTestArray);
	const smallTestString = assets.nativeImplementation.encode(smallTestArray);
	
	
	const bibleRussianArray = Uint8Array.prototype.subarray.call(assets.bibleInRussian);
	
	const bibleRussianString = assets.nativeImplementation.encode(bibleRussianArray);
	
	
	
	var asciiSnippet = (
		'| Library | Decode 32 bytes | Decode 32768 | Decode 16777216 | Encode 32 bytes | Encode 32768 | Encode 16777216 |\n' +
		'| ------- | --------------- | ------------ | --------------- | --------------- | ------------ | --------------- |\n'
	);
	
	var tableSnippet = (
		'| Library | Decode 32 bytes | Decode 32768 | Decode 16777216 | Encode 32 bytes | Encode 32768 | Encode 16777216 |\n' +
		'| ------- | --------------- | ------------ | --------------- | --------------- | ------------ | --------------- |\n'
	);
	
	var russianBibleSnippet = (
		'| Library | Decode Russian Bible | Encode Russian Bible |\n' +
		'| ------- | -------------------- | -------------------- |\n'
	);
	

	function averageTimeUnit(bencher, f, v, count) {
		global.gc( true ); // force full garbage collection clean slate to start off with
		
		return new Promise(function(resolve) { 
			setImmediate(function() {
				var samples = [];
				
				try {
					for (let i=0; i<count; i=i+1|0) samples.push( bencher(f, v) );
				} catch (e) {console.error(e); resolve("<i>ERROR</i>"); return;}
				
				samples.sort();
				var sum = 0, divisor = 0;
				for (let i=count<7?0:count>>>2, end=count<7?count:(count+count+count+3|0)>>>2; i<count; i=i+1|0)
					sum += samples[i], divisor = divisor + 1|0;
				
				resolve( " " + Math_round(v.length / (sum / divisor / 1000) / 1024) + " Kb/sec" );
			});
		});
	}
	
	async function runTest(name, tableStart) {
		console.log("Running test " + name);
		var encodeAndDecode = assets[name];
		if (!encodeAndDecode) throw Error("Resource named " + name + " not found!");
		
		var asciiRow = tableStart;
		var resultRow = tableStart;
		var russianRow = tableStart;
		
		if (encodeAndDecode.decode) {
			asciiRow += await averageTimeUnit(benchmarkSmall, encodeAndDecode.decode, smallAsciiArray, 192) + " |";
			asciiRow += await averageTimeUnit(benchmarkMedium, encodeAndDecode.decode, mediumAsciiArray, 36) + " |";
			asciiRow += await averageTimeUnit(benchmarkLarge, encodeAndDecode.decode, largeAsciiArray, 2) + " |";
			
			resultRow += await averageTimeUnit(benchmarkSmall, encodeAndDecode.decode, smallTestArray, 192) + " |";
			resultRow += await averageTimeUnit(benchmarkMedium, encodeAndDecode.decode, mediumTestArray, 36) + " |";
			resultRow += await averageTimeUnit(benchmarkLarge, encodeAndDecode.decode, largeTestArray, 2) + " |";
			
			russianRow += await averageTimeUnit(benchmarkLarge, encodeAndDecode.decode, bibleRussianArray, 2) + " |";
		} else {
			asciiRow += "n/a | ";
			asciiRow += "n/a | ";
			asciiRow += "n/a | ";
		
			resultRow += "n/a | ";
			resultRow += "n/a | ";
			resultRow += "n/a | ";
			
			russianRow += "n/a | ";
		}
		
		if (encodeAndDecode.encode) {
			asciiRow += await averageTimeUnit(benchmarkSmall, encodeAndDecode.encode, smallAsciiString, 192) + " |";
			asciiRow += await averageTimeUnit(benchmarkMedium, encodeAndDecode.encode, mediumAsciiString, 36) + " |";
			asciiRow += await averageTimeUnit(benchmarkLarge, encodeAndDecode.encode, largeAsciiString, 2) + " |";
			
			resultRow += await averageTimeUnit(benchmarkSmall, encodeAndDecode.encode, smallTestString, 192) + " |";
			resultRow += await averageTimeUnit(benchmarkMedium, encodeAndDecode.encode, mediumTestString, 36) + " |";
			resultRow += await averageTimeUnit(benchmarkLarge, encodeAndDecode.encode, largeTestString, 2) + " |";
			
			russianRow += await averageTimeUnit(benchmarkLarge, encodeAndDecode.encode, bibleRussianString, 2) + " | ";
		} else {
			asciiRow += "n/a | ";
			asciiRow += "n/a | ";
			asciiRow += "n/a | ";
		
			resultRow += "n/a | ";
			resultRow += "n/a | ";
			resultRow += "n/a | ";
			
			russianRow += "n/a | ";
		}
		
		asciiSnippet += asciiRow + "\n";
		tableSnippet += resultRow + "\n";
		russianBibleSnippet += russianRow + "\n";
	}
	
	await runTest("FastTextEncoding", "| [fast-text-encoding](https://github.com/samthor/fast-text-encoding) |");
	await runTest("TextEncoding", "| [text-encoding](https://github.com/inexorabletash/text-encoding) |");
	await runTest("TextEncoderTextDecoderJS", "| [TextEncoderTextDecoder.js](https://gist.github.com/Yaffle/5458286) |");
	await runTest("textEncoderLite", "| [TextEncoderLite](https://github.com/solderjs/TextEncoderLite) |");
	await runTest("textEncoderShim", "| [text-encoding-shim](https://gitlab.com/PseudoPsycho/text-encoding-shim) |");
	await runTest("FastestSmallestTextEncoderDecoder", "| FastestSmallestTextEncoderDecoder |");
	await runTest("nativeImplementation", "| <i>Native</i> |");
	
	console.log("\n\n" + asciiSnippet + "\n\n" + tableSnippet + "\n\n" + russianBibleSnippet);
}, function(err) {
	console.error(err);
});

function benchmarkSmall(f, v) {
	void f( v ); // warm up
	
	var S0 = performance.now();
	void f(v); void f(v); void f(v); void f(v); 
	void f(v); void f(v); void f(v); void f(v); 
	void f(v); void f(v); void f(v); void f(v); 
	void f(v); void f(v); void f(v); void f(v); 
	void f(v); void f(v); void f(v); void f(v); 
	void f(v); void f(v); void f(v); void f(v); 
	void f(v); void f(v); void f(v); void f(v); 
	void f(v); void f(v); void f(v); void f(v); 
	var E0 = performance.now();
	
	var S1 = performance.now();
	void f(v); void f(v); void f(v); void f(v); 
	void f(v); void f(v); void f(v); void f(v); 
	void f(v); void f(v); void f(v); void f(v); 
	void f(v); void f(v); void f(v); void f(v); 
	void f(v); void f(v); void f(v); void f(v); 
	void f(v); void f(v); void f(v); void f(v); 
	void f(v); void f(v); void f(v); void f(v); 
	void f(v); void f(v); void f(v); void f(v); 
	var E1 = performance.now();
	
	var S2 = performance.now();
	void f(v); void f(v); void f(v); void f(v); 
	void f(v); void f(v); void f(v); void f(v); 
	void f(v); void f(v); void f(v); void f(v); 
	void f(v); void f(v); void f(v); void f(v); 
	void f(v); void f(v); void f(v); void f(v); 
	void f(v); void f(v); void f(v); void f(v); 
	void f(v); void f(v); void f(v); void f(v); 
	void f(v); void f(v); void f(v); void f(v); 
	var E2 = performance.now();
	
	var S3 = performance.now();
	void f(v); void f(v); void f(v); void f(v); 
	void f(v); void f(v); void f(v); void f(v); 
	void f(v); void f(v); void f(v); void f(v); 
	void f(v); void f(v); void f(v); void f(v); 
	void f(v); void f(v); void f(v); void f(v); 
	void f(v); void f(v); void f(v); void f(v); 
	void f(v); void f(v); void f(v); void f(v); 
	void f(v); void f(v); void f(v); void f(v); 
	var E3 = performance.now();
	
	// Finally, return the mean of the 2 middle perfs
	var T0 = E0 - S0, T1 = E1 - S1, T2 = E2 - S2, T3 = E3 - S3;
	var min = Math_min(T0, T1, T2, T3);
	var max = Math_max(T0, T1, T2, T3);
	return (T0 + T1 + T2 + T3 - max - min) / 64; // 32 tests X 2
}
for (let i=0; i<30; i=i+1|0) void benchmarkSmall(Math.max, "" + i); // warm up

function benchmarkMedium(f, v) {
	void f( v ); // warm up
	
	var S0 = performance.now();
	void f(v); void f(v); void f(v); void f(v); void f(v);
	var E0 = performance.now();
	
	var S1 = performance.now();
	void f(v); void f(v); void f(v); void f(v); void f(v);
	var E1 = performance.now();
	
	var S2 = performance.now();
	void f(v); void f(v); void f(v); void f(v); void f(v);
	var E2 = performance.now();
	
	var S3 = performance.now();
	void f(v); void f(v); void f(v); void f(v); void f(v);
	var E3 = performance.now();
	
	// Finally, return the mean of the 2 middle perfs
	var T0 = E0 - S0, T1 = E1 - S1, T2 = E2 - S2, T3 = E3 - S3;
	var min = Math_min(T0, T1, T2, T3);
	var max = Math_max(T0, T1, T2, T3);
	return (T0 + T1 + T2 + T3 - max - min) / 10; // 5 tests X 2
}
for (let i=0; i<30; i=i+1|0) void benchmarkMedium(Math.min, "" + i); // warm up

function benchmarkLarge(f, v) {
	var S0 = performance.now();
	void f(v);
	var E0 = performance.now();
	
	var S1 = performance.now();
	void f(v);
	var E1 = performance.now();
	
	var S2 = performance.now();
	void f(v);
	var E2 = performance.now();
	
	// Finally, return the middle of the three perfs
	var T0 = E0 - S0, T1 = E1 - S1, T2 = E2 - S2;
	var min = Math_min(T0, T1, T2);
	var max = Math_max(T0, T1, T2);
	return (T0 + T1 + T2 - max - min) / 2; // 1 tests X 2
}
for (let i=0; i<30; i=i+1|0) void benchmarkLarge(function(x){return new Promise(x)}, function(){return i}); // warm up

function httpGet(uriLocation) {
	return new Promise(function(accept, reject) {
		https.get(new URL(uriLocation), function(res) {
			var body = '';
			res.on('data', function(chunk) {body += chunk});
			res.on('end', function() { accept(body + '//URL=' + encodeURIComponent(uriLocation)); });
		}).on('error', reject);
	});
}
function readFile(name, binary) {
	return new Promise(function(accept, reject) {
		function after(err,data) {
			err ? reject(err) : accept(data)
		}
		binary ? fs.readFile(name, after) : fs.readFile(name, 'utf8', after);
	});
}
function allAssoc(object) { // https://stackoverflow.com/a/45043545/5601591
    const values = Object.values(object), keys = Object.keys(object);
    return Promise.all(values).then(function(results){
        var out = {};
        for(var i=0; i<results.length; i++) out[keys[i]] = results[i];
        return out;
    });
}
function evalEncoderDecoder(text/*, isRequire*/) {
	var window = global.window = global;
	delete window.TextDecoder;
	delete window.TextEncoder;
	delete String.fromCodePoint;
	delete String.prototype.codePointAt;
	delete global.SharedArrayBuffer;
	delete Math.clz32;
	var objReturned;
	var urlIndex = text.lastIndexOf("//URL=");
	if (urlIndex === -1) urlIndex = text.length;
	
	objReturned = Function("var module,exports,require;" + text.substring(0,urlIndex) + ";return{TextDecoder:typeof TextDecoder!='undefined'?TextDecoder:typeof TextDecoderLite!='undefined'?TextDecoderLite:null,TextEncoder:typeof TextEncoder!='undefined'?TextEncoder:typeof TextEncoderLite!='undefined'?TextEncoderLite:null}")() || {};
	var encoderAndDecoder = /*isRequire ? require(text) :*/ {TextDecoder: objReturned.TextDecoder || window.TextDecoder, TextEncoder: objReturned.TextEncoder ||  window.TextEncoder};
	var retObj = getEncodeAndDecode( encoderAndDecoder );
	retObj.src = decodeURIComponent( text.substring(urlIndex+"//URL=".length) );
	return retObj;
}
function getEncodeAndDecode(inObject) {
	return filesDownloadedReady.then(function() {
		var decoder = inObject.TextDecoder ? new inObject.TextDecoder("utf-8") : null;
		var encoder = inObject.TextEncoder ? new inObject.TextEncoder("utf-8") : null;
		var decode = inObject.decode || decoder && function(array) {
			return decoder.decode( array );
		};
		var encode = inObject.encode || encoder && function(string) {
			var res = encoder.encode( "" + string );
			return res && res.constructor !== Uint8Array ? new Uint8Array(res) : res || null; //Array_isArray(res) ? new Uint8Array(res) : res;
		};
		/*try {
			(decode || function(){})( encode && encode("hello") || new Uint8Array([68,70,72,74]) ); // test both methods
		} catch(e) {
			console.error("At " + inObject.src + ":\n");
			console.error(e);
		}*/
		return {decode: decode, encode: encode};
	});
}

function download(url, dest, cb) {
  var file = fs.createWriteStream(dest);
  var request = https.get(url, function(response) {
    response.pipe(file);
    file.on('finish', function() {
      file.close(cb);  // close() is async, call cb after close completes.
    });
  });
}

// code used to generate random text files:
/*(function(a,b){if("function"==typeof define&&define.amd)define([],b);else if("undefined"!=typeof exports)b();else{b(),a.FileSaver={exports:{}}.exports}})(this,function(){"use strict";function b(a,b){return"undefined"==typeof b?b={autoBom:!1}:"object"!=typeof b&&(console.warn("Deprecated: Expected third argument to be a object"),b={autoBom:!b}),b.autoBom&&/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(a.type)?new Blob(["\uFEFF",a],{type:a.type}):a}function c(a,b,c){var d=new XMLHttpRequest;d.open("GET",a),d.responseType="blob",d.onload=function(){g(d.response,b,c)},d.onerror=function(){console.error("could not download file")},d.send()}function d(a){var b=new XMLHttpRequest;b.open("HEAD",a,!1);try{b.send()}catch(a){}return 200<=b.status&&299>=b.status}function e(a){try{a.dispatchEvent(new MouseEvent("click"))}catch(c){var b=document.createEvent("MouseEvents");b.initMouseEvent("click",!0,!0,window,0,0,0,80,20,!1,!1,!1,!1,0,null),a.dispatchEvent(b)}}var f="object"==typeof window&&window.window===window?window:"object"==typeof self&&self.self===self?self:"object"==typeof global&&global.global===global?global:void 0,a=/AppleWebKit/.test(navigator.userAgent),g=f.saveAs||("object"!=typeof window||window!==f?function(){}:"download"in HTMLAnchorElement.prototype&&!a?function(b,g,h){var i=f.URL||f.webkitURL,j=document.createElement("a");g=g||b.name||"download",j.download=g,j.rel="noopener","string"==typeof b?(j.href=b,j.origin===location.origin?e(j):d(j.href)?c(b,g,h):e(j,j.target="_blank")):(j.href=i.createObjectURL(b),setTimeout(function(){i.revokeObjectURL(j.href)},4E4),setTimeout(function(){e(j)},0))}:"msSaveOrOpenBlob"in navigator?function(f,g,h){if(g=g||f.name||"download","string"!=typeof f)navigator.msSaveOrOpenBlob(b(f,h),g);else if(d(f))c(f,g,h);else{var i=document.createElement("a");i.href=f,i.target="_blank",setTimeout(function(){e(i)})}}:function(b,d,e,g){if(g=g||open("","_blank"),g&&(g.document.title=g.document.body.innerText="downloading..."),"string"==typeof b)return c(b,d,e);var h="application/octet-stream"===b.type,i=/constructor/i.test(f.HTMLElement)||f.safari,j=/CriOS\/[\d]+/.test(navigator.userAgent);if((j||h&&i||a)&&"undefined"!=typeof FileReader){var k=new FileReader;k.onloadend=function(){var a=k.result;a=j?a:a.replace(/^data:[^;]*;/,"data:attachment/file;"),g?g.location.href=a:location=a,g=null},k.readAsDataURL(b)}else{var l=f.URL||f.webkitURL,m=l.createObjectURL(b);g?g.location=m:location.href=m,g=null,setTimeout(function(){l.revokeObjectURL(m)},4E4)}});f.saveAs=g.saveAs=g,"undefined"!=typeof module&&(module.exports=g)});

//# sourceMappingURL=FileSaver.min.js.map

saveAs(new Blob([function() {
	const divisor = Math.ceil((-1 >>> 2) / Math.log2(147952));//0x10ffff));
	const Math_imul = Math.imul;

/*(function(){
// ran at https://en.wikipedia.org/wiki/Unicode_block
var cp = 0, space=0, filled=0;
var voids = [], code="", after="x";
var arr = [].map.call(
	document.querySelectorAll('td[data-sort-value^="A&"]'),
	x=>/unknown/i.test(x.parentNode.lastElementChild.textContent)?"":x.textContent
);
arr.forEach(function(entry) {
	if (!entry) return;
	var values = entry.split("..");
	var first = parseInt(values[0].substring(2), 16);
	var second = parseInt(values[1].substring(2), 16);
	
	if (cp !== first) voids.push([cp, first]);
	if (cp !== first) code += (cp-space) + "<=x?";
	if (cp !== first) space += first - cp;
	if (cp !== first) after = "x+" + space + ":" + after;
	
	cp = second + 1;
	filled += cp - first;
});
code += after;
return {filled, voids, code};
})();*\/
	function skipUnusedBlocks(x) {
	return 2160<=x?12208<=x?55232<=x?57536<=x?57888<=x?58256<=x?58640<=x?58816<=x?58912<=x?59200<=x?59440<=x?59520<=x?59712<=x?59808<=x?59920<=x?60592<=x?60848<=x?61072<=x?61408<=x?61472<=x?61552<=x?61744<=x?62016<=x?62080<=x?62272<=x?62448<=x?62480<=x?63920<=x?65008<=x?65648<=x?66272<=x?66464<=x?66560<=x?66720<=x?74320<=x?75088<=x?75264<=x?75856<=x?76016<=x?77728<=x?77776<=x?77856<=x?77920<=x?78144<=x?78240<=x?78320<=x?78400<=x?78656<=x?81728<=x?124448<=x?142096<=x?142640<=x?147584<=x?147712<=x?x+770048:x+769920:x+53968:x+52464:x+49376:x+49344:x+48320:x+48064:x+47888:x+47824:x+47040:x+47008:x+45728:x+45360:x+45152:x+43792:x+43664:x+43520:x+38576:x+36272:x+27456:x+27392:x+27296:x+26608:x+26512:x+17936:x+13904:x+11168:x+10992:x+10688:x+10624:x+10368:x+10352:x+10288:x+10208:x+10016:x+9968:x+9808:x+9680:x+9632:x+9568:x+9504:x+9216:x+9168:x+9088:x+9056:x+8992:x+8944:x+8816:x+8672:x+8640:x+8512:x+64:x+48:x;
	}
	
	const arrRaw32 = new Int32Array(30000000);
	for (var pos=0; pos<arrRaw32.length; pos=pos+16384|0)
		crypto.getRandomValues( arrRaw32.subarray(pos, pos+16384|0) );
	const asI32 = new Int32Array(30000000);
	for (let i=0, int=0, num=0; i<30000000; i=i+1|0) {
		int = arrRaw32[i]|0;
		if (int < 1073741823) {
			asI32[i] = 64 + (int & 63) |0;
		} else {
			num = (int - 1073740000) / divisor;
			asI32[i] = skipUnusedBlocks(2 ** num |0) |0;
		}
	}
	var s = "", fromCodePoint = String.fromCodePoint;
	for (let i=0; i<30000000; i=i+65536|0) s += fromCodePoint.apply( null, asI32.subarray(i, i+65536|0) );
	
	
	return s;
}()], {"type": "text/plain; charset=utf-8"}), "random-test-30000000.txt");*/

/**
// Generate ascii text file

(function(a,b){if("function"==typeof define&&define.amd)define([],b);else if("undefined"!=typeof exports)b();else{b(),a.FileSaver={exports:{}}.exports}})(this,function(){"use strict";function b(a,b){return"undefined"==typeof b?b={autoBom:!1}:"object"!=typeof b&&(console.warn("Deprecated: Expected third argument to be a object"),b={autoBom:!b}),b.autoBom&&/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(a.type)?new Blob(["\uFEFF",a],{type:a.type}):a}function c(a,b,c){var d=new XMLHttpRequest;d.open("GET",a),d.responseType="blob",d.onload=function(){g(d.response,b,c)},d.onerror=function(){console.error("could not download file")},d.send()}function d(a){var b=new XMLHttpRequest;b.open("HEAD",a,!1);try{b.send()}catch(a){}return 200<=b.status&&299>=b.status}function e(a){try{a.dispatchEvent(new MouseEvent("click"))}catch(c){var b=document.createEvent("MouseEvents");b.initMouseEvent("click",!0,!0,window,0,0,0,80,20,!1,!1,!1,!1,0,null),a.dispatchEvent(b)}}var f="object"==typeof window&&window.window===window?window:"object"==typeof self&&self.self===self?self:"object"==typeof global&&global.global===global?global:void 0,a=/AppleWebKit/.test(navigator.userAgent),g=f.saveAs||("object"!=typeof window||window!==f?function(){}:"download"in HTMLAnchorElement.prototype&&!a?function(b,g,h){var i=f.URL||f.webkitURL,j=document.createElement("a");g=g||b.name||"download",j.download=g,j.rel="noopener","string"==typeof b?(j.href=b,j.origin===location.origin?e(j):d(j.href)?c(b,g,h):e(j,j.target="_blank")):(j.href=i.createObjectURL(b),setTimeout(function(){i.revokeObjectURL(j.href)},4E4),setTimeout(function(){e(j)},0))}:"msSaveOrOpenBlob"in navigator?function(f,g,h){if(g=g||f.name||"download","string"!=typeof f)navigator.msSaveOrOpenBlob(b(f,h),g);else if(d(f))c(f,g,h);else{var i=document.createElement("a");i.href=f,i.target="_blank",setTimeout(function(){e(i)})}}:function(b,d,e,g){if(g=g||open("","_blank"),g&&(g.document.title=g.document.body.innerText="downloading..."),"string"==typeof b)return c(b,d,e);var h="application/octet-stream"===b.type,i=/constructor/i.test(f.HTMLElement)||f.safari,j=/CriOS\/[\d]+/.test(navigator.userAgent);if((j||h&&i||a)&&"undefined"!=typeof FileReader){var k=new FileReader;k.onloadend=function(){var a=k.result;a=j?a:a.replace(/^data:[^;]*;/,"data:attachment/file;"),g?g.location.href=a:location=a,g=null},k.readAsDataURL(b)}else{var l=f.URL||f.webkitURL,m=l.createObjectURL(b);g?g.location=m:location.href=m,g=null,setTimeout(function(){l.revokeObjectURL(m)},4E4)}});f.saveAs=g.saveAs=g,"undefined"!=typeof module&&(module.exports=g)});

//# sourceMappingURL=FileSaver.min.js.map

saveAs(new Blob([function() {
	const arrRaw32 = new Int32Array(30000000);
	for (var pos=0; pos<arrRaw32.length; pos=pos+16384|0)
		crypto.getRandomValues( arrRaw32.subarray(pos, pos+16384|0) );
	const asI8 = new Int8Array(30000000);
	for (let i=0, int=0, num=0; i<30000000; i=i+1|0) {
		int = arrRaw32[i]|0;
		if (int < 0xefffffff) {
			asI8[i] = 64 + (int & 63) |0;
		} else {
			asI8[i] = int & 127;
		}
	}
	var s = "", fromCodePoint = String.fromCodePoint;
	for (let i=0; i<30000000; i=i+65536|0) s += fromCodePoint.apply( null, asI8.subarray(i, i+65536|0) );
	
	
	return s;
}()], {"type": "text/plain; charset=utf-8"}), "random-ascii-30000000.txt");*/


