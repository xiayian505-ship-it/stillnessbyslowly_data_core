"use strict";

/* =========================================================
   慢慢的倉庫｜Blob URL Scope v1.0.0

   用途：
   - 管理由 URL.createObjectURL() 建立的暫時 URL
   - 將 URL 綁定到單一 scope
   - 支援單筆 revoke、整批 clear、scope destroy
   - 讓舊 render / 舊工作流程能透過 scope.active 判斷是否已失效

   注意：
   - 本模組只管理 Object URL 的生命週期。
   - 不負責 DOM render、圖片載入、非同步排程或 race condition。
   - Blob / File 以外的值不可建立 Object URL。
========================================================= */

(function (global) {
  const VERSION = "1.0.0";

  function create(options = {}) {
    const urlApi = options.urlApi || global.URL;

    if (
      !urlApi ||
      typeof urlApi.createObjectURL !== "function" ||
      typeof urlApi.revokeObjectURL !== "function"
    ) {
      throw new Error("BlobUrlScope requires URL.createObjectURL / URL.revokeObjectURL");
    }

    const urls = new Set();
    let destroyed = false;

    function assertActive() {
      if (destroyed) {
        throw new Error("BlobUrlScope has been destroyed");
      }
    }

    function createUrl(blob) {
      assertActive();

      if (!(blob instanceof Blob)) {
        throw new TypeError("BlobUrlScope.create(blob) requires a Blob or File");
      }

      const url = urlApi.createObjectURL(blob);
      urls.add(url);
      return url;
    }

    function revoke(url) {
      if (!url || !urls.has(url)) {
        return false;
      }

      urlApi.revokeObjectURL(url);
      urls.delete(url);
      return true;
    }

    function clear() {
      const count = urls.size;

      urls.forEach(url => {
        urlApi.revokeObjectURL(url);
      });

      urls.clear();
      return count;
    }

    function destroy() {
      if (destroyed) {
        return 0;
      }

      const count = clear();
      destroyed = true;
      return count;
    }

    function has(url) {
      return urls.has(url);
    }

    const api = {
      version: VERSION,
      create: createUrl,
      revoke,
      clear,
      destroy,
      has,
      get size() {
        return urls.size;
      },
      get active() {
        return !destroyed;
      }
    };

    return Object.freeze(api);
  }

  global.BlobUrlScope = Object.freeze({
    version: VERSION,
    create
  });
})(window);
