/** @define {boolean} */
var ENCODEINTO_BUILD = false;

(function(global){
	"use strict";
	// In this NodeJS version, Buffers are supported and used as fallback in versions that do not support Typed Arrays
	var log = Math.log;
	var LN2 = Math.LN2;
	var clz32 = Math.clz32 || function(x) {return 31 - log(x >>> 0) / LN2 | 0};
	var fromCharCode = String["fromCharCode"];
	var Object_prototype_toString = ({})["toString"];

	var NativeSharedArrayBuffer = global["SharedArrayBuffer"];
	var sharedArrayBufferString = NativeSharedArrayBuffer ? Object_prototype_toString.call(NativeSharedArrayBuffer) : "";
	var NativeUint8Array = global["Uint8Array"];
	var arrayBufferPrototypeString = NativeUint8Array ? Object_prototype_toString.call(ArrayBuffer.prototype) : "";
	var NativeBuffer = global["Buffer"];
	var TextEncoderPrototype, NativeBufferPrototype, globalBufferPrototypeString;
	try {
		if (!NativeBuffer && global["require"]) NativeBuffer=global["require"]("Buffer");
		NativeBufferPrototype = NativeBuffer.prototype;
		globalBufferPrototypeString = NativeBuffer ? Object_prototype_toString.call(NativeBufferPrototype) : "";
	} catch(e){}
	var usingTypedArrays = !!NativeUint8Array && !NativeBuffer;

	// NativeBufferHasArrayBuffer is true if there is no global.Buffer or if native global.Buffer instances have a Buffer property for the internal ArrayBuffer
	var NativeBufferHasArrayBuffer = !NativeBuffer || (!!NativeUint8Array && NativeUint8Array.prototype.isPrototypeOf(NativeBufferPrototype));

	var GlobalTextEncoder = global["TextEncoder"], GlobalTextDecoder = global["TextDecoder"];
	
	var globalTextEncoderInstance, globalTextEncoderEncodeInto;
	
	if (usingTypedArrays || NativeBuffer) {
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
		//for (var i=54; i; i=i-2|0) decoderReplacer(fromCharCode(192+i|0, 0x85, 0x87, 0x83)); // help with presampling => up to 33% speed boost
		
		
		/** @constructor */
		function TextDecoder(){}
		function decode(inputArrayOrBuffer){
			var buffer = (inputArrayOrBuffer && inputArrayOrBuffer.buffer) || inputArrayOrBuffer;
			var asString = Object_prototype_toString.call(buffer);
			if (asString !== arrayBufferPrototypeString && asString !== globalBufferPrototypeString && asString !== sharedArrayBufferString && asString !== "[object ArrayBuffer]" && inputArrayOrBuffer !== undefined)
				throw TypeError("Failed to execute 'decode' on 'TextDecoder': The provided value is not of type '(ArrayBuffer or ArrayBufferView)'");
			var inputAs8 = NativeBufferHasArrayBuffer ? new NativeUint8Array(buffer) : buffer || [];
			var resultingString = "";
			var index=0,len=inputAs8.length|0;
			for (; index<len; index=index+32768|0)
				resultingString += fromCharCode.apply(0, inputAs8[NativeBufferHasArrayBuffer ? "subarray" : "slice"](index,index+32768|0));

			return resultingString.replace(/[\xc0-\xf7][\x80-\xbf]+|[\x80-\xff]/g, decoderReplacer);
		}
		TextDecoder.prototype["decode"] = decode;
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
		/** @constructor */
		function TextEncoder(){}
		function encode(inputString){
			// 0xc0 => 0b11000000; 0xff => 0b11111111; 0xc0-0xff => 0b11xxxxxx
			// 0x80 => 0b10000000; 0xbf => 0b10111111; 0x80-0xbf => 0b10xxxxxx
			var encodedString = inputString === void 0 ?  "" : ("" + inputString).replace(/[\x80-\uD7ff\uDC00-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]?/g, encoderReplacer);
			var len=encodedString.length|0, result = usingTypedArrays ? new NativeUint8Array(len) : NativeBuffer["allocUnsafe"] ? NativeBuffer["allocUnsafe"](len) : new NativeBuffer(len);
			var i=0;
			for (; i<len; i=i+1|0)
				result[i] = encodedString.charCodeAt(i)|0;
			return result;
		}
		function polyfill_encodeInto(inputString, u8Arr) {
			var encodedString = inputString === void 0 ?  "" : ("" + inputString).replace(/[\x80-\uD7ff\uDC00-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]?/g, encoderReplacer);
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
		}
		TextEncoderPrototype = TextEncoder["prototype"];
		TextEncoderPrototype["encode"] = encode;
		if (ENCODEINTO_BUILD) {
			TextEncoderPrototype["encodeInto"] = polyfill_encodeInto;
		}
		
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
		
		if (ENCODEINTO_BUILD) {
			globalTextEncoderEncodeInto = polyfill_encodeInto;

			if (GlobalTextEncoder) {
				globalTextEncoderInstance = new GlobalTextEncoder;
				globalTextEncoderEncodeInto = (
					globalTextEncoderInstance["encodeInto"] ?
					bindMethod(globalTextEncoderInstance, "encode") :
					GlobalTextEncoder["prototype"]["encodeInto"] = function(string, u8arr) {
						// Unfortunately, there's no way I can think of to quickly extract the number of bits written and the number of bytes read and such
						var strLen = string.length|0, u8Len = u8arr.length|0;
						if (strLen < (u8Len >> 1)) { // in most circumstances, this means its safe. there are still edge-cases which are possible
							// in many circumstances, we can use the faster native TextEncoder
							var res8 = globalTextEncoderInstance["encode"](string);
							var res8Len = res8.length|0;
							if (res8Len < u8Len) { // if we dont have to worry about read/written
								u8arr.set( res8 );
								return {
									"read": strLen,
									"written": res8.length|0
								};
							}
						}
						return polyfill_encodeInto(string, u8arr);
					}
				);
			} // else globalTextEncoderEncodeInto is polyfill_encodeInto
		}
		
		function factory(obj) {
			obj["TextDecoder"] = GlobalTextDecoder || TextDecoder;
			obj["TextEncoder"] = GlobalTextEncoder || TextEncoder;
			if (obj !== global) {
				obj["decode"] = GlobalTextDecoder ? bindMethod(new GlobalTextDecoder, "decode") : decode;
				obj["encode"] = GlobalTextEncoder ? bindMethod(ENCODEINTO_BUILD ? globalTextEncoderInstance : new GlobalTextEncoder, "encode") : encode;
				if (ENCODEINTO_BUILD) obj["encodeInto"] = globalTextEncoderEncodeInto;
			}
			return obj;
		}

		typeof exports === 'object' && typeof module !== 'undefined' ? factory(module["exports"]) :
			typeof define == typeof factory && typeof define === "function" && define["amd"] ? define(function(){
				return factory({});
			}) :
			factory(global);
	}
})(typeof global == "" + void 0 ? typeof self == "" + void 0 ? this || {} : self : global);
