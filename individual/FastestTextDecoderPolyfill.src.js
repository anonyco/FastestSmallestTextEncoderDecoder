(function(window){
  "use strict";
  var log = Math.log;
  var LN2 = Math.LN2;
  var clz32 = Math.clz32 || function(x) {return 31 - log(x >>> 0) / LN2 | 0};
  var fromCharCode = String.fromCharCode;
  var Object_prototype_toString = ({}).toString;
  var NativeUint8Array = window.Uint8Array;
  var patchedU8Array = NativeUint8Array || Array;
  var ArrayBufferString = Object_prototype_toString.call((window.ArrayBuffer || patchedU8Array).prototype);
  function decoderReplacer(nonAsciiChars){
    // make the UTF string into a binary UTF-8 encoded string
    var point = nonAsciiChars.charCodeAt(0)|0;
    if (point >= 0xD800 && point <= 0xDBFF) {
      var nextcode = nonAsciiChars.charCodeAt(1)|0;
      if (nextcode !== nextcode) // NaN because string is 1 code point long
        return fromCharCode(0xef/*11101111*/, 0xbf/*10111111*/, 0xbd/*10111101*/);
      // https://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
      if (nextcode >= 0xDC00 && nextcode <= 0xDFFF) {
        point = ((point - 0xD800)<<10) + nextcode - 0xDC00 + 0x10000|0;
        if (point > 0xffff)
          return fromCharCode(
            (0x1e/*0b11110*/<<3) | (point>>>18),
            (0x2/*0b10*/<<6) | ((point>>>12)&0x3f/*0b00111111*/),
            (0x2/*0b10*/<<6) | ((point>>>6)&0x3f/*0b00111111*/),
            (0x2/*0b10*/<<6) | (point&0x3f/*0b00111111*/)
          );
      } else return fromCharCode(0xef, 0xbf, 0xbd);
    }
    if (point <= 0x007f) return nonAsciiChars;
    else if (point <= 0x07ff) {
      return fromCharCode((0x6<<5)|(point>>>6), (0x2<<6)|(point&0x3f));
    } else return fromCharCode(
      (0xe/*0b1110*/<<4) | (point>>>12),
      (0x2/*0b10*/<<6) | ((point>>>6)&0x3f/*0b00111111*/),
      (0x2/*0b10*/<<6) | (point&0x3f/*0b00111111*/)
    );
  }
  function TextDecoder(){};
  TextDecoder.prototype.decode = function(inputArrayOrBuffer){
    var buffer = (inputArrayOrBuffer && inputArrayOrBuffer.buffer) || inputArrayOrBuffer;
    if (Object_prototype_toString.call(buffer) !== ArrayBufferString)
      throw Error("Failed to execute 'decode' on 'TextDecoder': The provided value is not of type '(ArrayBuffer or ArrayBufferView)'");
    var inputAs8 = NativeUint8Array ? new patchedU8Array(buffer) : buffer;
    var resultingString = "";
    for (var index=0,len=inputAs8.length|0; index<len; index=index+32768|0)
      resultingString += fromCharCode.apply(0, inputAs8[NativeUint8Array ? "slice" : "subarray"](index,index+32768|0));

    return resultingString.replace(/[\x80-\uD7ff\uDC00-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]?/g, decoderReplacer);
  }
  if (!window["TextDecoder"]) window["TextDecoder"] = TextDecoder;
})(typeof global == "" + void 0 ? typeof self == "" + void 0 ? this : self : global);
