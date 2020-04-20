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
	var cp0 = encoded.charCodeAt(0), codePoint=0x110000, i=0, stringLen=encoded.length|0, result="";
    switch(cp0 >>> 4) {
    	// no 1 byte sequences
		case 12:
		case 13:
			codePoint = ((cp0 & 0x1F) << 6) | (encoded.charCodeAt(1) & 0x3F);
			i = codePoint < 0x80 ? 0 : 2;
			break;
		case 14:
			codePoint = ((cp0 & 0x0F) << 12) | ((encoded.charCodeAt(1) & 0x3F) << 6) | (encoded.charCodeAt(2) & 0x3F);
			i = codePoint < 0x800 ? 0 : 3;
			break;
		case 15:
			if ((cp0 >>> 3) === 30) {
				codePoint = ((cp0 & 0x07) << 18) | ((encoded.charCodeAt(1) & 0x3F) << 12) | ((encoded.charCodeAt(2) & 0x3F) << 6) | encoded.charCodeAt(3);
				i = codePoint < 0x10000 ? 0 : 4;
			}
    }
    if (i) {
        if (stringLen < i) {
        	i = 0;
        } else if (codePoint < 0x10000) { // BMP code point
			result = fromCharCode(codePoint);
		} else if (codePoint < 0x110000) {
			codePoint = codePoint - 0x10080|0;//- 0x10000|0;
			result = fromCharCode(
				(codePoint >>> 10) + 0xD800|0,  // highSurrogate
				(codePoint & 0x3ff) + 0xDC00|0 // lowSurrogate
			);
		} else i = 0; // to fill it in with INVALIDs
	}
	
	for (; i < stringLen; i=i+1|0) result += "\ufffd"; // fill rest with replacement character
	
	return result;
  }
  function TextDecoder(_, opts){/*this["ignoreBOM"] = !!opts && !!opts["ignoreBOM"]*/};
  TextDecoder["prototype"]["decode"] = function(inputArrayOrBuffer){
    var buffer = (inputArrayOrBuffer && inputArrayOrBuffer.buffer) || inputArrayOrBuffer;
    var asObjectString = Object_prototype_toString.call(buffer);
    if (asObjectString !== arrayBufferString && asObjectString !== sharedArrayBufferString && inputArrayOrBuffer !== undefined)
      throw TypeError("Failed to execute 'decode' on 'TextDecoder': The provided value is not of type '(ArrayBuffer or ArrayBufferView)'");
    var inputAs8 = NativeUint8Array ? new patchedU8Array(buffer) : buffer;
    var resultingString = "";
    for (var index=0/*inputAs8[0]!==0xEF||inputAs8[1]!==0xBB||inputAs8[2]!==0xBF||this["ignoreBOM"]?0:3*/,len=inputAs8.length|0; index<len; index=index+32768|0)
      resultingString += fromCharCode.apply(0, inputAs8[NativeUint8Array ? "subarray" : "slice"](index,index+32768|0));

    return resultingString.replace(/[\xc0-\xff][\x80-\xbf]+|[\x80-\xff]/g, decoderReplacer);
  }
  if (!window["TextDecoder"]) window["TextDecoder"] = TextDecoder;
})(typeof global == "" + void 0 ? typeof self == "" + void 0 ? this : self : global);
