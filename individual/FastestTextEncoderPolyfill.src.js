(function(window){
  "use strict";
  var log = Math.log;
  var LN2 = Math.LN2;
  var clz32 = Math.clz32 || function(x) {return 31 - log(x >>> 0) / LN2 | 0};
  var fromCharCode = String.fromCharCode;
  var patchedU8Array = window.Uint8Array || Array;
  //////////////////////////////////////////////////////////////////////////////////////
  function encoderReplacer(nonAsciiChars){
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
  function TextEncoder(){};
  TextEncoder.prototype.encode = function(inputString){
    // 0xc0 => 0b11000000; 0xff => 0b11111111; 0xc0-0xff => 0b11xxxxxx
    // 0x80 => 0b10000000; 0xbf => 0b10111111; 0x80-0xbf => 0b10xxxxxx
    var encodedString = inputString === void 0 ?  "" : ("" + inputString).replace(/[\x80-\uD7ff\uDC00-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]?/g, encoderReplacer);
    var len=encodedString.length|0, result = new patchedU8Array(len);
    for (var i=0; i<len; i=i+1|0)
      result[i] = encodedString.charCodeAt(i);
    return result;
  };
  if (!window["TextEncoder"]) window["TextEncoder"] = TextEncoder;
})(typeof global == "" + void 0 ? typeof self == "" + void 0 ? this : self : global);
