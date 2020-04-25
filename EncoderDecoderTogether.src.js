/** @define {boolean} */
var ENCODEINTO_BUILD = false;

(function(window){
	"use strict";
	//var log = Math.log;
	//var LN2 = Math.LN2;
	//var clz32 = Math.clz32 || function(x) {return 31 - log(x >>> 0) / LN2 | 0};
	var fromCharCode = String.fromCharCode;
	var Object_prototype_toString = ({}).toString;
	var sharedArrayBufferString = Object_prototype_toString.call(window["SharedArrayBuffer"]);
	var undefinedObjectString = Object_prototype_toString();
	var NativeUint8Array = window.Uint8Array;
	var patchedU8Array = NativeUint8Array || Array;
	var nativeArrayBuffer = NativeUint8Array ? ArrayBuffer : patchedU8Array;
	var arrayBuffer_isView = nativeArrayBuffer.isView || function(x) {return x && "length" in x};
	var arrayBufferString = Object_prototype_toString.call(nativeArrayBuffer.prototype);
	var window_encodeURIComponent = encodeURIComponent;
	var window_parseInt = parseInt;
	var TextEncoderPrototype = TextEncoder["prototype"];
	var GlobalTextEncoder = window["TextEncoder"];
	var decoderRegexp = /[\xc0-\xff][\x80-\xbf]+|[\x80-\xff]/g;
	var encoderRegexp = /[\x80-\uD7ff\uDC00-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]?/g;
	var tmpBufferU16 = new (NativeUint8Array ? Uint16Array : patchedU8Array)(8192);
	var globalTextEncoderPrototype;
	var globalTextEncoderInstance;
	
	/*function decoderReplacer(encoded) {
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
					codePoint = ((cp0 & 0x07) << 18) | ((encoded.charCodeAt(1) & 0x3F) << 12) | ((encoded.charCodeAt(2) & 0x3F) << 6) | (encoded.charCodeAt(3) & 0x3F);
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
	}*/
	function TextDecoder(){};
	TextDecoder["prototype"]["decode"] = function(inputArrayOrBuffer){
		var inputAs8 = inputArrayOrBuffer, asObjectString;
		if (!arrayBuffer_isView(inputAs8)) {
			asObjectString = Object_prototype_toString.call(inputAs8);
			if (asObjectString !== arrayBufferString && asObjectString !== sharedArrayBufferString && asObjectString !== undefinedObjectString)
				throw TypeError("Failed to execute 'decode' on 'TextDecoder': The provided value is not of type '(ArrayBuffer or ArrayBufferView)'");
			inputAs8 = NativeUint8Array ? new patchedU8Array(inputAs8) : inputAs8 || [];
		}
		
		var resultingString="", index=0, len=inputAs8.length|0, nextStop=0, cp0=0, codePoint=0, mask=0b11111, shift=0, minBits=0, cp1=0, pos=0, tmp=0, result="";
		// Note that tmp represents the 2nd half of a surrogate pair incase a surrogate gets divided between blocks
		for (; index < len; ) {
			for (; index < len && pos < 8192; index=index+1|0, pos=pos+1|0) {
				cp0 = inputAs8[index] & 0xff;
				switch(cp0 >>> 4) {
					case 15:
						mask >>>= 1;
						cp1 = inputAs8[index=index+1|0] & 0xff;
						codePoint = cp1 & 0b00111111;
						minBits = (cp1 >>> 6) === 0b10 && cp0 < 0b11111000 ? 5 : 20; // 20 ensures it never passes -> all invalid replacements
						shift = 6;
					case 14:
						mask >>>= 1;
						cp1 = inputAs8[index=index+1|0] & 0xff;
						codePoint <<= 6;
						codePoint |= cp1 & 0b00111111;
						minBits = (cp1 >>> 6) === 0b10 ? minBits + 4|0 : 24; // 24 ensures it never passes -> all invalid replacements
						shift = shift + 6|0;
					case 13:
					case 12:
						cp1 = inputAs8[index=index+1|0] & 0xff;
						codePoint <<= 6;
						codePoint |= cp1 & 0b00111111;
						minBits = (cp1 >>> 6) === 0b10 ? minBits + 7|0 : 31; // 31 ensures it never passes -> all invalid replacements
						shift = shift + 6|0;
						
						// Now, process the code point
						codePoint |= (cp0 & mask) << shift;
						if (index < len && (codePoint >>> minBits) && codePoint < 0x110000) {
							cp0 = codePoint;
							if (0xffff < codePoint) { // BMP code point
								codePoint = codePoint - 0x10000|0;
								
								tmp = (codePoint >>> 10) + 0xD800|0,  // highSurrogate
								cp0 = (codePoint & 0x3ff) + 0xDC00|0 // lowSurrogate (will be inserted later in the switch-statement)
								
								if (pos < 8191) { // notice 8191 instead of 8192
									tmpBufferU16[pos] = tmp;
									pos = pos + 1|0;
									tmp = -1;
								}  else {// else, we are at the end of the inputAs8 and let tmp0 be filled in later on
									// NOTE that cp1 is being used as a temporary variable for the swapping
									cp1 = tmp;
									tmp = cp0;
									cp0 = cp1;
								}
							}
						} else {
							// invalid code point means replacing the whole thing with null replacement characters
							index = index - (shift/6|0) |0;
							cp0 = 0xfffd;
						}
						
						
						// Finally, reset the variables for the next go-around
						mask = 0b11111;
						shift = 0;
						minBits = 0;
						codePoint = 0;
					/*case 11:
					case 10:
					case 9:
					case 8:
						codePoint ? codePoint = 0 : cp0 = 0xfffd; // fill with invalid replacement character*/
					case 7:
					case 6:
					case 5:
					case 4:
					case 3:
					case 2:
					case 1:
					case 0:
						tmpBufferU16[pos] = cp0;
						continue;
					case 8:
					case 9:
					case 10:
					case 11:
						tmpBufferU16[pos] = 0xfffd; // fill with invalid replacement character
				}
			}
			resultingString += fromCharCode.apply(null, pos === 2048 ? tmpBufferU16 : NativeUint8Array ?  tmpBufferU16.subarray(0,pos) : tmpBufferU16.slice(0,pos));
			tmpBufferU16[0] = tmp;
			pos = tmp !== -1 ? 1 : 0;
			tmp = -1;
		}

		return resultingString//.replace(decoderRegexp, decoderReplacer);
	}
	if (!window["TextDecoder"]) window["TextDecoder"] = TextDecoder;
	//////////////////////////////////////////////////////////////////////////////////////
	function encoderReplacer(nonAsciiChars){
		// make the UTF string into a binary UTF-8 encoded string
		var point = nonAsciiChars.charCodeAt(0)|0;
		if (0xD800 <= point && point <= 0xDBFF) {
			var nextcode = nonAsciiChars.charCodeAt(1)|0; // defaults to 0 when NaN, causing null replacement character
			
			if (0xDC00 <= nextcode && nextcode <= 0xDFFF) {
				//point = ((point - 0xD800)<<10) + nextcode - 0xDC00 + 0x10000|0;
				point = (point<<10) + nextcode - 0x35fdc00|0;
				if (point > 0xffff)
					return fromCharCode(
						(0x1e/*0b11110*/<<3) | (point>>>18),
						(0x2/*0b10*/<<6) | ((point>>>12)&0x3f/*0b00111111*/),
						(0x2/*0b10*/<<6) | ((point>>>6)&0x3f/*0b00111111*/),
						(0x2/*0b10*/<<6) | (point&0x3f/*0b00111111*/)
					);
			} else point = 65533/*0b1111111111111101*/;//return '\xEF\xBF\xBD';//fromCharCode(0xef, 0xbf, 0xbd);
		}
		/*if (point <= 0x007f) return nonAsciiChars;
		else */if (point <= 0x07ff) {
			return fromCharCode((0x6<<5)|(point>>>6), (0x2<<6)|(point&0x3f));
		} else return fromCharCode(
			(0xe/*0b1110*/<<4) | (point>>>12),
			(0x2/*0b10*/<<6) | ((point>>>6)&0x3f/*0b00111111*/),
			(0x2/*0b10*/<<6) | (point&0x3f/*0b00111111*/)
		);
	}
	function TextEncoder(){};
	TextEncoderPrototype["encode"] = function(inputString){
		// 0xc0 => 0b11000000; 0xff => 0b11111111; 0xc0-0xff => 0b11xxxxxx
		// 0x80 => 0b10000000; 0xbf => 0b10111111; 0x80-0xbf => 0b10xxxxxx
		var encodedString = inputString === void 0 ? "" : ("" + inputString), len=0, result, i=0;/*, pos=0, code=0;
		if (encodedString.length < 16384) {
			encodedString = window_encodeURIComponent(encodedString);
			result = new patchedU8Array(encodedString.length);
			
			
			for (len=encoded.length|0; i<len; i=i+1|0) {
				code = encodedString.charCodeAt(i);
				if (code === 37) { //  "%"
					result[pos] = parseInt(encodedString.substr(pos+1|0, 2), 16)|0;
					i = i+2|0;
				} else {
					result[pos] = code;
				} 
				pos = pos + 1|0;
			}
			
			return NativeUint8Array ? result.subarray(0, pos) : result.slice(0, pos);//result[NativeUint8Array ? "subarray" : "slice"](0, pos);
		}*/
		encodedString = encodedString.replace(encoderRegexp, encoderReplacer);
		len=encodedString.length|0, result = new patchedU8Array(len);
		for (i=0; i<len; i=i+1|0)
			result[i] = encodedString.charCodeAt(i);
		return result;
	};
	function polyfill_encodeInto(inputString, u8Arr) {
		var encodedString = inputString === void 0 ?  "" : ("" + inputString).replace(encoderRegexp, encoderReplacer);
		var len=encodedString.length|0, i=0, char=0, read=0, u8ArrLen = u8Arr.length|0, inputLength=inputString.length|0;
		if (u8ArrLen < len) len=u8ArrLen;
		putChars: for (; i<len; i=i+1|0) {
			char = encodedString.charCodeAt(i) |0;
			switch(char >>> 4) {
				case 0:
				case 1:
				case 2:
				case 3:
				case 4:
				case 5:
				case 6:
				case 7:
					read = read + 1|0;
					// extension points:
				case 8:
				case 9:
				case 10:
				case 11:
					break;
				case 12:
				case 13:
					if ((i+1|0) < u8ArrLen) {
						read = read + 1|0;
						break;
					}
				case 14:
					if ((i+2|0) < u8ArrLen) {
						//if (!(char === 0xEF && encodedString.substr(i+1|0,2) === "\xBF\xBD"))
						read = read + 1|0;
						break;
					}
				case 15:
					if ((i+3|0) < u8ArrLen) {
						read = read + 1|0;
						break;
					}
				default:
					break putChars;
			}
			//read = read + ((char >>> 6) !== 2) |0;
			u8Arr[i] = char;
		}
		return {"written": i, "read": inputLength < read ? inputLength : read};
		// 0xc0 => 0b11000000; 0xff => 0b11111111; 0xc0-0xff => 0b11xxxxxx
		// 0x80 => 0b10000000; 0xbf => 0b10111111; 0x80-0xbf => 0b10xxxxxx
		/*var encodedString = typeof inputString == "string" ? inputString : inputString === void 0 ?  "" : "" + inputString;
		var encodedLen = encodedString.length|0, u8LenLeft=u8Arr.length|0;
		var i=-1, read=-1, code=0, point=0, nextcode=0;
		tryFast: if (2 < encodedLen && encodedLen < (u8LenLeft >> 1)) {
			// Skip the normal checks because we can almost certainly fit the string inside the existing buffer
			while (1) {		// make the UTF string into a binary UTF-8 encoded string
				point = encodedString.charCodeAt(read = read + 1|0)|0;
				
				if (point <= 0x007f) {
					if (point === 0 && encodedLen <= read) {
						read = read - 1|0;
						break; // we have reached the end of the string
					}
					u8Arr[i=i+1|0] = point;
				} else if (point <= 0x07ff) {
					u8Arr[i=i+1|0] = (0x6<<5)|(point>>>6);
					u8Arr[i=i+1|0] = (0x2<<6)|(point&0x3f);
				} else {
					if (0xD800 <= point && point <= 0xDBFF) {
						nextcode = encodedString.charCodeAt(read)|0; // defaults to 0 when NaN, causing null replacement character
						
						if (0xDC00 <= nextcode && nextcode <= 0xDFFF) {
							read = read + 1|0;
							//point = ((point - 0xD800)<<10) + nextcode - 0xDC00 + 0x10000|0;
							point = (point<<10) + nextcode - 0x35fdc00|0;
							if (point > 0xffff) {
								u8Arr[i=i+1|0] = (0x1e<<3) | (point>>>18);
								u8Arr[i=i+1|0] = (0x2<<6) | ((point>>>12)&0x3f);
								u8Arr[i=i+1|0] = (0x2<<6) | ((point>>>6)&0x3f);
								u8Arr[i=i+1|0] = (0x2<<6) | (point&0x3f);
								continue;
							}
						} else if (nextcode === 0 && encodedLen <= read) {
							break; // we have reached the end of the string
						} else {
							point = 65533;//0b1111111111111101; // invalid replacement character
						}
					}
					u8Arr[i=i+1|0] = (0xe<<4) | (point>>>12);
					u8Arr[i=i+1|0] = (0x2<<6) | ((point>>>6)&0x3f);
					u8Arr[i=i+1|0] = (0x2<<6) | (point&0x3f);
					if (u8LenLeft < (i + ((encodedLen - read) << 1)|0)) {
						// These 3x chars are the only way to inflate the size to 3x
						u8LenLeft = u8LenLeft - i|0;
						break tryFast;
					}
				}
			}
			u8LenLeft = 0; // skip the next for-loop 
		}
		
		
		for (; 0 < u8LenLeft; ) {		// make the UTF string into a binary UTF-8 encoded string
			point = encodedString.charCodeAt(read = read + 1|0)|0;
			
			if (point <= 0x007f) {
				if (point === 0 && encodedLen <= read) {
					read = read - 1|0;
					break; // we have reached the end of the string
				}
				u8LenLeft = u8LenLeft - 1|0;
				u8Arr[i=i+1|0] = point;
			} else if (point <= 0x07ff) {
				u8LenLeft = u8LenLeft - 2|0;
				if (0 <= u8LenLeft) {
					u8Arr[i=i+1|0] = (0x6<<5)|(point>>>6);
					u8Arr[i=i+1|0] = (0x2<<6)|(point&0x3f);
				}
			} else {
				if (0xD800 <= point && point <= 0xDBFF) {
					nextcode = encodedString.charCodeAt(read = read + 1|0)|0; // defaults to 0 when NaN, causing null replacement character
					
					if (0xDC00 <= nextcode && nextcode <= 0xDFFF) {
						read = read + 1|0;
						//point = ((point - 0xD800)<<10) + nextcode - 0xDC00 + 0x10000|0;
						point = (point<<10) + nextcode - 0x35fdc00|0;
						if (point > 0xffff) {
							u8LenLeft = u8LenLeft - 4|0;
							if (0 <= u8LenLeft) {
								u8Arr[i=i+1|0] = (0x1e<<3) | (point>>>18);
								u8Arr[i=i+1|0] = (0x2<<6) | ((point>>>12)&0x3f);
								u8Arr[i=i+1|0] = (0x2<<6) | ((point>>>6)&0x3f);
								u8Arr[i=i+1|0] = (0x2<<6) | (point&0x3f);
							}
							continue;
						}
					} else if (nextcode === 0 && encodedLen <= read) {
						break; // we have reached the end of the string
					} else {
						point = 65533;//0b1111111111111101; // invalid replacement character
					}
				}
				u8LenLeft = u8LenLeft - 3|0;
				if (0 <= u8LenLeft) {
					u8Arr[i=i+1|0] = (0xe<<<4) | (point>>>12);
					u8Arr[i=i+1|0] = (0x2<<6) | ((point>>>6)&0x3f);
					u8Arr[i=i+1|0] = (0x2<<6) | (point&0x3f);
				}
			}
		} 
		return {"read": read < 0 ? 0 : u8LenLeft < 0 ? read : read+1|0, "written": i < 0 ? 0 : i+1|0};*/
	};
	if (ENCODEINTO_BUILD) {
		TextEncoderPrototype["encodeInto"] = polyfill_encodeInto;
	}
	
	if (!GlobalTextEncoder) {
		window["TextEncoder"] = TextEncoder;
	} else if (ENCODEINTO_BUILD && !(globalTextEncoderPrototype = GlobalTextEncoder["prototype"])["encodeInto"]) {
		globalTextEncoderInstance = new GlobalTextEncoder;
		globalTextEncoderPrototype["encodeInto"] = function(string, u8arr) {
			// Unfortunately, there's no way I can think of to quickly extract the number of bits written and the number of bytes read and such
			var strLen = string.length|0, u8Len = u8arr.length|0;
			if (strLen < (u8Len >> 1)) { // in most circumstances, this means its safe. there are still edge-cases which are possible
				// in many circumstances, we can use the faster native TextEncoder
				var res8 = globalTextEncoderInstance["encode"](string);
				var res8Len = res8.length|0;
				if (res8Len < u8Len) { // if we dont have to worry about read/written
					u8arr.set( res8 ); // every browser that supports TextEncoder also supports typedarray.prototype.set
					return {
						"read": strLen,
						"written": res8.length|0
					};
				}
			}
			return polyfill_encodeInto(string, u8arr);
		};
	}
})(typeof global == "" + void 0 ? typeof self == "" + void 0 ? this : self : global);
