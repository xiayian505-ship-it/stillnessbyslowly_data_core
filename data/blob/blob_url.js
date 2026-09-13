"use strict";

/* =========================================================
   慢慢的倉庫｜Blob URL v1.0.0

   用途：
   - 將 Blob / File 建立為暫時 Object URL
   - 使用完畢後回收 Object URL
   - 不負責 Blob 建立、預覽、下載或儲存
========================================================= */

(function (global) {
  const VERSION = "1.0.0";

  function assertBlob(blob) {
    if (!(blob instanceof Blob)) {
      throw new TypeError("SlowlyBlobURL requires a Blob or File");
    }
  }

  function create(blob) {
    assertBlob(blob);
    return URL.createObjectURL(blob);
  }

  function revoke(url) {
    if (typeof url !== "string" || !url) return false;
    URL.revokeObjectURL(url);
    return true;
  }

  global.SlowlyBlobURL = Object.freeze({
    version: VERSION,
    create,
    revoke
  });
})(typeof window !== "undefined" ? window : globalThis);
