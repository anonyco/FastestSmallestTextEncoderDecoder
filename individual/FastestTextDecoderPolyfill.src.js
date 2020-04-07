(function(window){
  "use strict";
  var log = Math.log;
  var LN2 = Math.LN2;
  var clz32 = Math.clz32 || function(x) {return 31 - log(x >>> 0) / LN2 | 0};
  var fromCharCode = String.fromCharCode;
  var Object_prototype_toString = ({}).toString;
  var NativeSharedArrayBuffer = window["SharedArrayBuffer"];
  var sharedArrayBufferString = NativeSharedArrayBuffer ? Object_prototype_toString.call(NativeSharedArrayBuffer) : "";
  var NativeUint8Array = window.Uint8Array;
  var patchedU8Array = NativeUint8Array || Array;
  var arrayBufferString = Object_prototype_toString.call((NativeUint8Array ? ArrayBuffer : patchedU8Array).prototype);
  function decoderReplacer(encoded){
    var codePoint = encoded.charCodeAt(0) << 24;
    var leadingOnes = clz32(~codePoint)|0;
    var endPos = 0, stringLen = encoded.length|0;
    var result = "";
    if (leadingOnes < 5 && stringLen >= leadingOnes) {
      codePoint = (codePoint<<leadingOnes)>>>(24+leadingOnes);
      for (endPos = 1; endPos < leadingOnes; endPos=endPos+1|0)
        codePoint = (codePoint<<6) | (encoded.charCodeAt(endPos)&0x3f/*0b00111111*/);
      if (codePoint <= 0xFFFF) { // BMP code point
        result += fromCharCode(codePoint);
      } else if (codePoint <= 0x10FFFF) {
        // https://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
        codePoint = codePoint - 0x10000|0;
        result += fromCharCode(
          (codePoint >> 10) + 0xD800|0,  // highSurrogate
          (codePoint & 0x3ff) + 0xDC00|0 // lowSurrogate
        );
      } else endPos = 0; // to fill it in with INVALIDs
    }
    for (; endPos < stringLen; endPos=endPos+1|0) result += "\ufffd"; // replacement character
    return result;
  }
  function TextDecoder(){};
  TextDecoder["prototype"]["decode"] = function(inputArrayOrBuffer){
    var buffer = (inputArrayOrBuffer && inputArrayOrBuffer.buffer) || inputArrayOrBuffer;
    var asObjectString = Object_prototype_toString.call(buffer);
    if (asObjectString !== arrayBufferString && asObjectString !== sharedArrayBufferString || inputArrayOrBuffer === undefined)
      throw Error("Failed to execute 'decode' on 'TextDecoder': The provided value is not of type '(ArrayBuffer or ArrayBufferView)'");
    var inputAs8 = NativeUint8Array ? new patchedU8Array(buffer) : buffer;
    var resultingString = "";
    for (var index=0,len=inputAs8.length|0; index<len; index=index+32768|0)
      resultingString += fromCharCode.apply(0, inputAs8[NativeUint8Array ? "subarray" : "slice"](index,index+32768|0));

    return resultingString.replace(/[\xc0-\xff][\x80-\xbf]*/g, decoderReplacer);
  }
  if (!window["TextDecoder"]) window["TextDecoder"] = TextDecoder;
})(typeof global == "" + void 0 ? typeof self == "" + void 0 ? this : self : global);
