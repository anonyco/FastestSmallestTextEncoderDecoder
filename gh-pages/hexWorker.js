importScripts("encoderAndDecoderForced.src.js");
onmessage= (function() {
  var timingOut = false, binaryDataString="", hexadecimalString="", currentTextBuffer=null, currentHexBuffer=null;
  
  const Uint8Array = self.Uint8Array;
  const Object_prototype_toString = ({}).toString;
  const ArrayBufferString = Object_prototype_toString.call(ArrayBuffer.prototype);
  const setTimeout = self.setTimeout;
  
  const TextEncoder_encode = (new TextEncoder).encode;
  const TextDecoder_decode = (new TextEncoder).decode;
  
  function convertToOrFromHex(){
    timingOut = false;
    
    if (currentHexBuffer !== null) {
        hexadecimalString = TextDecoder_decode(currentHexBuffer);
        currentHexBuffer = null;
        postMessage({
            "type": "hex",
            "value": hexadecimalString
        });
    }
    
    if (currentTextBuffer !== null) {
        postMessage({
            "type": "text",
            "value": TextDecoder_decode(currentTextBuffer)
        });
        
        const inputAsU8Array = new Uint8Array(currentTextBuffer);
        const len = inputAsU8Array.length|0;
        
        currentTextBuffer = null; // reset it
        
        let resultingString = "";
        for (let i=0; i<len; i=i+1|0) resultingString += (i === 0 ? "" : " ") + (inputAsU8Array[i]|0).toString(16);
        postMessage({
            "type": "hex",
            "value": resultingString
        });
    } else if (binaryDataString !== "") {
        const inputAsU8Array = TextEncoder_encode(binaryDataString);
        const len = inputAsU8Array.length|0;
        
        binaryDataString = ""; // reset it
        
        let resultingString = "";
        for (let i=0; i<len; i=i+1|0) resultingString += (i === 0 ? "" : " ") + (inputAsU8Array[i]|0).toString(16);
        postMessage({
            "type": "hex",
            "value": resultingString
        });
    } else if (hexadecimalString !== "") {
        const strLen = hexadecimalString.length|0;
        
        let hexadecimals = 0;
        for (let i=0, code=0; i<strLen; i=i+1|0) {
            code = hexadecimalString.charCodeAt(i)|0;
            hexadecimals = hexadecimals + (
                (48 <= code && code <= 57) | (
                    65 <= (code & 0xffdf/*0b11011111*/) &&
                   (code & 0xffdf/*0b11011111*/) <= 90
                )
            )|0;
        }
        const arrayLength = (hexadecimals+1) >> 1;
        const resultingArray = new Uint8Array(arrayLength);
        let resultingIndex = 0;
        
        outer: for (let i=0, code=0, lo=0, hi=0; i<strLen; i=i+1|0) {
            code = hexadecimalString.charCodeAt(i)|0;
            if (48 <= code && code <= 57) {
                hi = code - 48 |0;
            } else if (
               65 <= (code & 0xffdf/*0b11011111*/) &&
               (code & 0xffdf/*0b11011111*/) <= 90
            ) {
                hi = (code & 0xffdf/*0b11011111*/) - 65 + 10 |0;
            } else {
                continue;
            }
            for (; i<strLen; i=i+1|0) {
                if (48 <= code && code <= 57) {
                    hi <<= 4;
                    lo = code - 48|0;
                    break;
                } else if (
                    65 <= (code & 0xffdf/*0b11011111*/) &&
                    (code & 0xffdf/*0b11011111*/) <= 90
                ) {
                    hi <<= 4;
                    lo = (code & 0xffdf/*0b11011111*/) - 65 + 10|0;
                    break;
                }
            }
            resultingArray[resultingIndex] = hi | lo;
            resultingIndex = resultingIndex + 1|0;
        }
        
        postMessage({
            "type": "hex",
            "value": TextDecoder_decode(resultingArray)
        });
    }
    binaryDataString = hexadecimalString = "";
    currentTextBuffer = currentHexBuffer = null;
  }
  
  return function(evt){
      var data = evt.data;
      if (data && data["type"] === "text-buffer" && ArrayBufferString === Object_prototype_toString.call(data["value"])) {
          binaryDataString = hexadecimalString = "";
          currentHexBuffer = null;
          currentTextBuffer = data["value"];
      } else if (data && data["type"] === "hex-buffer" && ArrayBufferString === Object_prototype_toString.call(data["value"])) {
          binaryDataString = hexadecimalString = "";
          currentHexBuffer = null;
          currentTextBuffer = data["value"];
      } else if (data && data["type"] === "text" && typeof data["value"] === "string") {
          currentTextBuffer = currentHexBuffer = null;
          hexadecimalString = "";
          binaryDataString = data["value"];
      } else if (data && data["type"] === "hex" && typeof data["value"] === "string") {
          currentTextBuffer = currentHexBuffer = null;
          binaryDataString = "";
          hexadecimalString = data["value"];
      }
      if (!timingOut) {
          setTimeout(convertToOrFromHex, 1);
          timingOut = true;
      }
  };
})();
