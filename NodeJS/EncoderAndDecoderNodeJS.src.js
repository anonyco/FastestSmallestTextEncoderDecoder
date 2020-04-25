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
	var encodeRegExp = /[\x80-\uD7ff\uDC00-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]?/g;
	var tmpBufferU16 = new Uint16Array(8192);
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
		
		/** @constructor */
		function TextDecoder(){}
		function decode(inputArrayOrBuffer){
			var buffer = (inputArrayOrBuffer && inputArrayOrBuffer.buffer) || inputArrayOrBuffer;
			var asString = Object_prototype_toString.call(buffer);
			if (asString !== arrayBufferPrototypeString && asString !== globalBufferPrototypeString && asString !== sharedArrayBufferString && asString !== "[object ArrayBuffer]" && inputArrayOrBuffer !== undefined)
				throw TypeError("Failed to execute 'decode' on 'TextDecoder': The provided value is not of type '(ArrayBuffer or ArrayBufferView)'");
			var inputAs8 = NativeBufferHasArrayBuffer ? new NativeUint8Array(buffer) : buffer || [];
		
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
				resultingString += fromCharCode.apply(null, pos === 8192 ? tmpBufferU16 : tmpBufferU16.subarray(0,pos));
				tmpBufferU16[0] = tmp;
				pos = tmp !== -1 ? 1 : 0;
				tmp = -1;
			}

			return resultingString//.replace(decoderRegexp, decoderReplacer);
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
			var encodedString = inputString === void 0 ?  "" : ("" + inputString).replace(encodeRegExp, encoderReplacer);
			var len=encodedString.length|0, result = usingTypedArrays ? new NativeUint8Array(len) : NativeBuffer["allocUnsafe"] ? NativeBuffer["allocUnsafe"](len) : new NativeBuffer(len);
			var i=0;
			for (; i<len; i=i+1|0)
				result[i] = encodedString.charCodeAt(i)|0;
			return result;
		}
		function polyfill_encodeInto(inputString, u8Arr) {
			var encodedString = inputString === void 0 ?  "" : ("" + inputString).replace(encodeRegExp, encoderReplacer);
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
