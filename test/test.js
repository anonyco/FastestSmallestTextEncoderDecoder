'use strict';

(async function() {

const TestUnit = require("./utils");

const testEncodeInto = process.argv.includes("-test-encode-into");

const fs = require("fs");
global.window = global;

const decoderTest = new TestUnit("Decoding Test");
const encoderTest = new TestUnit("Encoding Test");
const encodeIntoTest = testEncodeInto && new TestUnit("Encode Into Test");

/** bindMethod
 * A useful way to bind a method on an instance
 * @param {!Object} inst
 * @param {!string} name
 * @param {!Function=} _
 */
function bindMethod(inst, name, _) {
	_ = inst[name];
	return function() {
		return _.apply(inst, arguments);
	};
}

const baselinePackage = require("util");
const decodeId = decoderTest.addBaseLine(bindMethod(new baselinePackage.TextDecoder, "decode"));
const encodeId = encoderTest.addBaseLine(bindMethod(new baselinePackage.TextEncoder, "encode"));

const baseLineTextEncodeInto = bindMethod(new baselinePackage.TextEncoder, "encodeInto");
const encodeIntoId = testEncodeInto && encodeIntoTest.addBaseLine(function(a, b) {
	b.fill(0);
	var obj = baseLineTextEncodeInto(a, b);
	obj.buffer = b;
	return obj;
});

await Promise.all([
	loadTestScript("../EncoderDecoderTogether.min.js", true),
	fs.existsSync("../individual/FastestTextDecoderPolyfill.min.js") ? loadTestScript("../individual/FastestTextDecoderPolyfill.min.js", true) : null,
	loadTestScript("../individual/FastestTextEncoderPolyfill.min.js", true),
	loadTestScript("../NodeJS/EncoderAndDecoderNodeJS.min.js"),
	loadTestScript("../NodeJS/EncoderAndDecoderNodeJS.min.mjs")
]);

// decoderTest.runTest( "null test", null );// NodeJS does not appear to have a correct implementation in this reguard

const allByteCodes = new Uint8Array(256);
for (let i=256; i; ) allByteCodes[i=i-1|0] = i; 

const decoderTests = {
	"easy ascii": decoderTest.runTest( "easy ascii", new Uint8Array([80, 84, 88, 92, 96, 100]) ),
	"complex unicode": decoderTest.runTest( "complex unicode", new Uint8Array([0x24, 0xC2, 0xA2, 0xE0, 0xA4, 0xB9, 0xF0, 0x90, 0x8D, 0x88, 0xED, 0x95, 0x9C]) ),
	"single invalid": decoderTest.runTest( "single invalid", new Uint8Array([0xED]) ),
	"UB invalid 0x9C 0xFF": decoderTest.runTest( "UB invalid 0x9C 0xFF", new Uint8Array([0x9C, 0xFF]) ),
	"UB invalid 0x80 0x80": decoderTest.runTest( "UB invalid 0x80 0x80", new Uint8Array([0x80, 0x80]) ),
	"All codes 0x00 to 0xFF": decoderTest.runTest( "All codes 0x00 to 0xFF", allByteCodes )
};

for (const key in decoderTests) encoderTest.runTest( key, decoderTests[key] );

if (encodeIntoTest) {
	const emptyGroup = encodeIntoTest.group("EncodeInto empty array");
	for (const key in decoderTests) emptyGroup.runTest( key, decoderTests[key], new Uint8Array(0) );
	
	const tinyGroup = encodeIntoTest.group("EncodeInto size 1 array");
	for (const key in decoderTests) tinyGroup.runTest( key, decoderTests[key], new Uint8Array(1) );
	
	const largeGroup = encodeIntoTest.group("EncodeInto big 99 array");
	for (const key in decoderTests) largeGroup.runTest( key, decoderTests[key], new Uint8Array(99) );
}

// Finally, show the results of the test
encoderTest.print();
decoderTest.print();
if (encodeIntoTest) encodeIntoTest.print()


async function loadTestScript(path, isBrowser) {
	let ret;
	
	if (/\.mjs$/i.test(path)) {
		const fileContents = await new Promise(function(accept){fs.readFile(path, 'utf8', function(err,data){accept(data)})});
	
		delete global.TextEncoder;
		delete global.TextDecoder;
		
		try {
			ret = Function( fileContents.replace("export{", "return{") )();
		} catch(e) {
			console.error( fileContents.replace("export{", "return{") );
		}
	} else {
		let exportsFromScript;
		try {
			if (isBrowser) {
				const fileContents = isBrowser && await new Promise(function(accept) {fs.readFile(path, 'utf8', function(err,data){accept(data)})});
	
				delete global.TextEncoder;
				delete global.TextDecoder;
				
				exportsFromScript = Function( fileContents )() || {};
			
			} else {
				delete global.TextEncoder;
				delete global.TextDecoder;
				
				delete require.cache[require.resolve(path)];
				exportsFromScript = require(path) || {};
			}
		} catch(e) {
			console.error("At " + path + ":");
			throw e;
		}
		ret = {
			TextDecoder: exportsFromScript.TextDecoder || global.TextDecoder,
			TextEncoder: exportsFromScript.TextEncoder || global.TextEncoder
		};
	}
	
	if (!ret) throw Error('Failed to load ' + path + ' because nothing could be pulled from there');
	
	try {
		if (ret.TextDecoder) {
			ret.decode = bindMethod(new ret.TextDecoder, "decode");
		}
		
		if (ret.TextEncoder) {
			ret.encode = bindMethod(new ret.TextEncoder, "encode");
			
			if (testEncodeInto && !ret.encodeInto) {
				ret.encodeInto = bindMethod(new ret.TextEncoder, "encodeInto");
			}
		}
		
		if (/js$/i.test(path)) {
			if (ret.TextDecoder) decoderTest.addHandle(ret.decode, decodeId, path, "decode", new ret.TextDecoder);
			if (ret.TextEncoder) {
				encoderTest.addHandle(ret.encode, encodeId, path, "encode", new ret.TextEncoder);
				if (testEncodeInto) encodeIntoTest.addHandle(function(a, b) {
					b.fill(0);
					var obj = ret.encodeInto(a, b);
					obj.buffer = b;
					return obj;
				}, encodeIntoId, path, "encodeInto", new ret.TextEncoder);
			}
		}
	} catch(e) {
		console.error("At " + path + ":");
		console.dirxml(ret);
		throw e;
	}
	
	return ret;
}

function asyncRequire() {

}

})();
