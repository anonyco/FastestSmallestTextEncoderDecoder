

[![npm version](http://img.shields.io/npm/v/fastestsmallesttextencoderdecoder.svg?label=version)](https://npmjs.org/package/fastestsmallesttextencoderdecoder "View this project on npm")
[![GitHub stars](https://img.shields.io/github/stars/anonyco/FastestSmallestTextEncoderDecoder.svg?style=social)](https://github.com/anonyco/FastestSmallestTextEncoderDecoder/stargazers "View others who have stared this repository")
[![GitHub file size in bytes](https://img.shields.io/github/size/anonyco/FastestSmallestTextEncoderDecoder/EncoderDecoderTogether.min.js.svg?label=without%20gzip)](https://github.com/anonyco/FastestSmallestTextEncoderDecoder/blob/master/EncoderDecoderTogether.min.js "File without gzip")
[![GitHub file size in bytes](https://img.shields.io/github/size/anonyco/FastestSmallestTextEncoderDecoder/gh-pages/EncoderDecoderTogether.min.js.gz?label=gzip%20applied)](https://github.com/anonyco/FastestSmallestTextEncoderDecoder/blob/master/gh-pages/EncoderDecoderTogether.min.js.gz "Gzipped file")
[![npm bundle size (version)](https://img.shields.io/bundlephobia/min/fastestsmallesttextencoderdecoder/latest.svg?color=maroon&label=NPM%20bundle%20size)](https://npmjs.org/package/fastestsmallesttextencoderdecoder "View this project on npm")
[![Issues](http://img.shields.io/github/issues/anonyco/FastestSmallestTextEncoderDecoder.svg)]( https://github.com/anonyco/FastestSmallestTextEncoderDecoder/issues )
[![Unlicense license](http://img.shields.io/badge/license-Unlicense-brightgreen.svg)](https://unlicense.org/ "This project's liscence")
[![npm downloads](https://img.shields.io/npm/dt/fastestsmallesttextencoderdecoder.svg)](https://npmjs.org/package/fastestsmallesttextencoderdecoder "View this project on npm")

This Javascript library provides the most performant tiny polyfill for [`window.TextEncoder`](https://developer.mozilla.org/en-US/docs/Web/API/TextEncoder) and [`window.TextDecoder`](https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder).

## Quick Start

Add the following HTML Code to your head:

````HTML
<script src="https://dl.dropboxusercontent.com/s/r55397ld512etib/EncoderDecoderTogether.min.js?dl=0" type="text/javascript"></script>
````

If you know that no script on the page requires this library until the DOMContentLoaded event, then you can switch to the much less blocking version below:

````HTML
<script defer="" src="https://dl.dropboxusercontent.com/s/r55397ld512etib/EncoderDecoderTogether.min.js?dl=0" type="text/javascript"></script>
````

Alternatively, either use `https://dl.dropboxusercontent.com/s/47481btie8pb95h/FastestTextEncoderPolyfill.min.js?dl=0` to polyfill `window.TextEncoder` for converting a `String` into a `Uint8Array` or use `https://dl.dropboxusercontent.com/s/qmoknmp86sytc74/FastestTextDecoderPolyfill.min.js?dl=0` to only polyfill `window.TextDecoder` for converting a `Uint8Array`/`ArrayBuffer`/*\[typedarray\]*/`global.Buffer` into a `String`.

## Browser Support

This polyfill will bring
support for TextEncoder/TextDecoder to the following browsers.

| Feature | Chrome <img src="https://developer.mozilla.org/static/browsers/chrome.svg" height="14" /> | Firefox <img src="https://developer.mozilla.org/static/browsers/firefox.svg" height="14" /> | Opera <img src="https://developer.mozilla.org/static/browsers/opera.svg" height="14" /> | Edge <img src="https://developer.mozilla.org/static/browsers/edge.svg" height="14" /> | Internet Explorer <img src="https://developer.mozilla.org/static/browsers/internet-explorer.svg" height="14" /> | Safari <img src="https://developer.mozilla.org/static/browsers/safari.svg" height="14" /> | Android <img src="https://developer.mozilla.org/static/platforms/android.svg" height="14" /> | Samsung Internet <img src="https://developer.mozilla.org/static/browsers/samsung-internet.svg" height="14" /> | Node.js <img src="https://nodejs.org/static/favicon.ico" height="14" /> |
| ------------------ | --- | --- | -------------------------------- | ------ | --- | ------------------------- | --- | --- | --- |
| Full Polyfill      | [7.0](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray#Browser_compatibility) | [4.0](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray#Browser_compatibility) | [11.6](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray#Browser_compatibility)                             | [12.0\*\*](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray#Browser_compatibility) | [10](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray#Browser_compatibility)  | [5.1](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray#Browser_compatibility) (Desktop) / [4.2](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray#Browser_compatibility) (iOS) | [4.0](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray#Browser_compatibility) | [1.0](https://gist.github.com/poshaughnessy/5718717a04db20a02e9fdb3fc16e2258) | [3.0](https://nodejs.org/docs/latest-v4.x/api/buffer.html#buffer_buffers_and_typedarray) |
| Partial Polyfill\* | 1.0 | [0.6](https://en.wikipedia.org/wiki/Comparison_of_JavaScript_engines) | [7.0](https://en.wikipedia.org/wiki/Presto_\(browser_engine\)) (Desktop) / [9.5\*\*](https://en.wikipedia.org/wiki/Presto_\(browser_engine\)) (Mobile) | [12.0\*\*](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray#Browser_compatibility) | [4.0](https://en.wikipedia.org/wiki/Comparison_of_JavaScript_engines) | [2.0](https://en.wikipedia.org/wiki/Comparison_of_JavaScript_engines)                       | 1.0 | [1.0](https://gist.github.com/poshaughnessy/5718717a04db20a02e9fdb3fc16e2258) | [0.10](https://nodejs.org/docs/latest-v0.10.x/api/index.html) |


\* Partial polyfill means that `Array` will be used instead of `Uint8Array`/`ArrayBuffer`/\[*typedarray*\].

\*\* This is the first public release of the browser

## API Documentation

Please review the MDN at [`window.TextEncoder`](https://developer.mozilla.org/en-US/docs/Web/API/TextEncoder) and [`window.TextDecoder`](https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder) for information on how to use TextEncoder and TextDecoder.

As for NodeJS, calling `require("EncoderAndDecoderNodeJS.src.js")` yields the following object:

```Javascript
module.exports = {
	TextEncoder: function TextEncoder(){/*...*/},
	TextDecoder: function TextEncoder(){/*...*/},
	encode: TextEncoder.prototype.encode,
	decode: TextDecoder.prototype.decode
}
```

Thus, in NodeJS, you do not ever have to use `new` just to get the encoder/decoder (although you still can do so if you want to). All of the code snippets below function identically <sub>(aside from unused local variables introduced into the scope)</sub>. There are an innumerable number of ways to rewrite this same snippet of code, thus I only chose the three which I thought would be most useful.

```Javascript
    // Variation 1
    const {TextEncoder, TextDecoder} = require("EncoderAndDecoderNodeJS.src.js");
    const encode = (new TextEncoder).encode;
    const decode = (new TextEncoder).decode;
```

```Javascript
    // Variation 2
    const {encode, decode} = require("EncoderAndDecoderNodeJS.src.js");
```

```Javascript
    // Variation 3
    const encodeAndDecodeModule = require("EncoderAndDecoderNodeJS.src.js");
    const encode = encodeAndDecodeModule.encode;
    const decode = encodeAndDecodeModule.decode;
```

# Demonstration

Visit the [GithubPage](https://anonyco.github.io/FastestSmallestTextEncoderDecoder/gh-pages/) to see a demonstation. As seen in the Web Worker [hexWorker.js](https://github.com/anonyco/FastestSmallestTextEncoderDecoder/blob/master/gh-pages/hexWorker.js), the Github Pages demonstration uses a special [encoderAndDecoderForced.src.js](https://github.com/anonyco/FastestSmallestTextEncoderDecoder/blob/master/gh-pages/encoderAndDecoderForced.src.js) version of this library to forcefully install the TextEncoder and TextDecoder even when there is native support. That way, this demonstraton should serve to truthfully demonstrate this polyfill.

## NPM Project
You can find this project on [NPM here at this link](https://npmjs.org/package/fastestsmallesttextencoderdecoder).
