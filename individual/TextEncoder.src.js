(function(window){
  "use strict";
  var log = Math.log;
  var LN2 = Math.LN2;
  var clz32 = Math.clz32 || function(x) {return 31 - log(x >>> 0) / LN2 | 0};
  var fromCharCode = String.fromCharCode;
  var patchedU8Array = window.Uint8Array || Array;
  //////////////////////////////////////////////////////////////////////////////////////
  function encoderReplacer(encoded){
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
  function TextEncoder(){};
  TextEncoder.prototype.encode = function(inputString){
    // 0xc0 => 0b11000000; 0xff => 0b11111111; 0xc0-0xff => 0b11xxxxxx
    // 0x80 => 0b10000000; 0xbf => 0b10111111; 0x80-0xbf => 0b10xxxxxx
    var encodedString = inputString === void 0 ?  "" : ("" + inputString).replace(/[\xc0-\xff][\x80-\xbf]*/g, encoderReplacer);
    var len=encodedString.length|0, result = new patchedU8Array(len);
    for (var i=0; i<len; i=i+1|0)
      result[i] = encodedString.charCodeAt(i);
    return result;
  };
  if (!window["TextEncoder"]) window["TextEncoder"] = TextEncoder;
})(typeof global == "" + void 0 ? typeof self == "" + void 0 ? this : self : global);
