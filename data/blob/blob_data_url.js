"use strict";

/* =========================================================
   慢慢的倉庫｜Blob Data URL v1.0.0

   通用 Blob ↔ Data URL 轉換工具。

   API：
   - BlobDataUrl.toDataUrl(blob)
   - BlobDataUrl.toBlob(dataUrl)

   不負責：
   - 圖片壓縮
   - IndexedDB
   - JSON 備份流程
   - UI
========================================================= */

(function(global){
  "use strict";

  const VERSION = "1.0.0";

  function toDataUrl(blob){
    if(!(blob instanceof Blob)){
      return Promise.reject(
        new TypeError("blob must be a Blob")
      );
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        resolve(String(reader.result || ""));
      };

      reader.onerror = () => {
        reject(
          reader.error ||
          new Error("Blob 轉 Data URL 失敗。")
        );
      };

      reader.readAsDataURL(blob);
    });
  }

  function toBlob(dataUrl){
    if(typeof dataUrl !== "string"){
      throw new TypeError("dataUrl must be a string");
    }

    const value = dataUrl.trim();

    if(!value.startsWith("data:")){
      throw new TypeError("dataUrl must be a valid Data URL");
    }

    const commaIndex = value.indexOf(",");

    if(commaIndex < 0){
      throw new TypeError("dataUrl must contain data");
    }

    const head = value.slice(0, commaIndex);
    const body = value.slice(commaIndex + 1);

    const mime =
      head.match(/^data:([^;,]*)/)?.[1] ||
      "application/octet-stream";

    const isBase64 = /;base64(?:;|$)/i.test(head);

    let bytes;

    if(isBase64){
      const binary = atob(body);

      bytes = new Uint8Array(binary.length);

      for(let index = 0; index < binary.length; index += 1){
        bytes[index] = binary.charCodeAt(index);
      }
    }else{
      const text = decodeURIComponent(body);

      bytes = new TextEncoder().encode(text);
    }

    return new Blob([bytes], {
      type: mime
    });
  }

  global.BlobDataUrl = Object.freeze({
    version: VERSION,
    toDataUrl,
    toBlob
  });
})(window);
