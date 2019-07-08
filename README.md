

[![npm version](http://img.shields.io/npm/v/bestbase64utf8.svg?label=version)](https://npmjs.org/package/bestbase64utf8 "View this project on npm")
[![GitHub stars](https://img.shields.io/github/stars/anonyco/FastestSmallestTextEncoderDecoder.svg?style=social)](https://github.com/anonyco/FastestSmallestTextEncoderDecoder/stargazers "View others who have stared this repository")
[![GitHub file size in bytes](https://img.shields.io/github/size/anonyco/FastestSmallestTextEncoderDecoder/EncoderDecoderTogether.min.js.svg?label=without%20gzip)](https://github.com/anonyco/FastestSmallestTextEncoderDecoder/blob/master/EncoderDecoderTogether.min.js "File without gzip")
[![GitHub file size in bytes](https://img.shields.io/github/size/anonyco/FastestSmallestTextEncoderDecoder/EncoderDecoderTogether.min.js.gz?label=gzip%20applied)](https://github.com/anonyco/FastestSmallestTextEncoderDecoder/blob/master/EncoderDecoderTogether.min.js.gz "Gzipped file")
[![npm bundle size (version)](https://img.shields.io/bundlephobia/min/bestbase64utf8/latest.svg?color=maroon&label=NPM%20bundle%20size)](https://npmjs.org/package/bestbase64utf8 "View this project on npm")
[![Issues](http://img.shields.io/github/issues/anonyco/FastestSmallestTextEncoderDecoder.svg)]( https://github.com/anonyco/FastestSmallestTextEncoderDecoder/issues )
[![Unlicense license](http://img.shields.io/badge/license-Unlicense-brightgreen.svg)](https://unlicense.org/ "This project's liscence")
[![npm downloads](https://img.shields.io/npm/dt/bestbase64utf8.svg)](https://npmjs.org/package/bestbase64utf8 "View this project on npm")

This Javascript library provides the most performant tiny polyfill for [`window.TextEncoder`](https://developer.mozilla.org/en-US/docs/Web/API/TextEncoder) and [`window.TextDecoder`](https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder).

## Quick Start

Add the following HTML Code to your head:

````HTML
<script src="https://dl.dropboxusercontent.com/s/r55397ld512etib/EncoderDecoderTogether.min.js?raw=1" type="text/javascript"></script>
````

If you know that no script on the page requires this library until the DOMContentLoaded event, then you can switch to the much faster version below:

````HTML
<script defer="" src="https://dl.dropboxusercontent.com/s/r55397ld512etib/EncoderDecoderTogether.min.js?raw=1" type="text/javascript"></script>
````

## API Documentation

There are two separate API functions introduced by the library:

* `/*String*/ btoaUTF8(/*String*/ originalString, /*boolean*/ autoBOMit = false)`
    * Encodes the binary string `originalString` into valid base 64. 
    * `autoBOMit` determines whether to prepend the string with a BOM. Only use this when the base64 is to be used as  a data URI link. If you have no idea what this means and are confused, then simply ignore this option and it should not give you any problems.

* `/*String*/ atobUTF8(/*String*/ encodedBase64String, /*boolean*/ keepBOM = false)`
    * Decodes the base64 string `encodedBase64String` into its original UTF8 binary counterpart.
    * `keepBOM` will keep the BOM of the string. Set this option to true if you are certain that the original UTF8 string was raw binary data. Keep this option false if you used the `autoBOMit` option when encoding the string.


## FastestSmallestTextEncoderDecoder

I would assume that one might want it base64 encoded in a more standard way than other solutions that attempt to address this problem. This "standard" way is naturally interpretable by the browser such that you can use the base64 in a data URI. Please visit this data URI here to see a demonstration: `data:text/plain;charset=utf-8;base64,4pi44pi54pi64pi74pi84pi+4pi/` (copy the data uri, open a new tab, paste the data URI into the address bar, then press enter to go to the page). As you can see, despite the fact that it is a base64-encoded URL, the browser is still able to recognize the high code points and decode them properly. Thus, this demonstration proves that this is the best way to go because it is the most standard. Then, to decode the base64 data, either HTTP get the data as a data URI or use the `atobUTF8` function. The advantage of being more standard is that this encoder and this decoder are more widely applicable because they can be used as a valid URL that displays correctly. Please visit [this demo page](https://anonyco.github.io/BestBase64EncoderDecoder/demo.html) to see the generation of unicode base64.

In addition to being very standardized, the above code snippets are also very fast. Instead of an indirect chain of succession where the data has to be converted several times between various forms, the above code snippet is as direct as performantly possible. It uses only one simple fast `String.prototype.replace` call to process the data when encoding, and only one to decode the data when decoding. Another plus is that (especially for big strings), `String.prototype.replace` allows the browser to automatically handle the underlying memory management of resizing the string, causing a significant performance boost especially in evergreen browsers like Chrome and Firefox that heavily optimize `String.prototype.replace`. Finally, the icing on the cake is that for you latin script exclūsīvō users, strings which don't contain any code points above 0x7f are extra super fast to process because the string remains unmodified by the replacement algorithm.

(see also https://stackoverflow.com/a/53433503/5601591)<br />
(see also [The MDN Page Base64_encoding_and_decoding](https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/Base64_encoding_and_decoding#Solution_1_%E2%80%93UTF-16_%3E_binary_UTF8-in-16))


## Example Usage

The below code snippet was taken from the [demonstration page](https://github.com/anonyco/BestBase64EncoderDecoder/blob/master/demo.html). This demonstration page can be viewed live [here via Github Pages](https://anonyco.github.io/BestBase64EncoderDecoder/demo.html).

```Javascript
(function(window, btoaUTF8){
    "use strict";
    var sourceEle = document.getElementById("source");
    var urlBarEle = document.getElementById("urlBar");
    var mainFrameEle = document.getElementById("mainframe");
    var gotoButton = document.getElementById("gotoButton");
    var parseInt = window.parseInt;
    var fromCodePoint = String.fromCodePoint;
    var parse = JSON.parse;
    
    function unescape(str){
        return str.replace(/\\u[\da-f]{0,4}|\\x[\da-f]{0,2}|\\u{[^}]*}|\\[bfnrtv"'\\]|\\0[0-7]{1,3}|\\\d{1,3}/g, function(match){
          try{
            if (match.startsWith("\\u{"))
              return fromCodePoint(parseInt(match.slice(2,-1),16));
            if (match.startsWith("\\u") || match.startsWith("\\x"))
              return fromCodePoint(parseInt(match.substring(2),16));
            if (match.startsWith("\\0") && match.length > 2)
              return fromCodePoint(parseInt(match.substring(2),8));
            if (/^\\\d/.test(match)) return fromCodePoint(+match.slice(1));
          }catch(e){
	  	for (var str="", i=match.length; i--; ) str += match.charAt(i);
		return str;
	  }
          return parse('"' + match + '"');
        });
    }
    
    function whenChange(){
      try{ urlBarEle.value = "data:text/plain;base64," + btoaUTF8(unescape(sourceEle.value), true);
      } finally{ gotoURL(); }
    }
    sourceEle.addEventListener("change",whenChange,{passive:1});
    sourceEle.addEventListener("input",whenChange,{passive:1});
    
    // IFrame Setup:
    function gotoURL(){mainFrameEle.src = urlBarEle.value}
    gotoButton.addEventListener("click", gotoURL, {passive: 1});
    function urlChanged(){urlBarEle.value = mainFrameEle.src}
    mainFrameEle.addEventListener("load", urlChanged, {passive: 1});
    urlBarEle.addEventListener("keypress", function(evt){
      if (evt.key === "enter") evt.preventDefault(), urlChanged();
    }, {passive: 1});
    setTimeout(whenChange, 0);
})(window, btoaUTF8);
```


## SpiderNode (Hooray!) / NodeJS (Booo!)

Simply drop the file [`atobAndBtoaTogether.node.js`](https://github.com/anonyco/BestBase64EncoderDecoder/blob/master/atobAndBtoaTogether.node.js) into the same folder as your Javascript node file. Then, add the following to the Javascript in the SpiderNode/NodeJS file.

```Javascript
var AtobAndBtoaTogether = require("./atobAndBtoaTogether.node.js");
```

Then, here is the node API:
* `/*String*/ AtobAndBtoaTogether.btoaUTF8(/*String*/ originalString, /*boolean*/ autoBOMit = false)`
    * Encodes the binary string `originalString` into valid base 64. 
    * `autoBOMit` determines whether to append a BOM on to the end of the string. Only use this when the base64 is to be used as  a data URI link. If you have no idea what this means and are confused, then simply ignore this option and it should not give you any problems.

* `/*String*/ AtobAndBtoaTogether.atobUTF8(/*String*/ encodedBase64String, /*boolean*/ keepBOM = false)`
    * Decodes the base64 string `encodedBase64String` into its original UTF8 binary counterpart.
    * `keepBOM` will keep the BOM of the string. Use this option if you are certain that the original UTF8 string was raw binary data. Keep this option false if you used the `autoBOMit` option when encoding the string.

Enjoy!
