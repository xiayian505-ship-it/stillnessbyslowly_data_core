"use strict";

/* =========================================================
   慢慢的倉庫｜Canvas PNG v1.0.0

   用途：
   - 將 HTMLCanvasElement 輸出為 PNG
   - 僅處理 Canvas → PNG，不負責畫面、預覽、下載或儲存
   - 使用瀏覽器原生 Canvas API，不依賴第三方套件
========================================================= */

(function (global) {
  const VERSION = "1.0.0";

  function assertCanvas(canvas) {
    if (!canvas || typeof canvas.toBlob !== "function" || typeof canvas.toDataURL !== "function") {
      throw new TypeError("SlowlyCanvasPNG requires a canvas-like object with toBlob() and toDataURL()");
    }
  }

  function toBlob(canvas, options = {}) {
    assertCanvas(canvas);

    const quality = options.quality;

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        blob => {
          if (!blob) {
            reject(new Error("SlowlyCanvasPNG failed to create PNG Blob"));
            return;
          }
          resolve(blob);
        },
        "image/png",
        quality
      );
    });
  }

  function toDataURL(canvas, options = {}) {
    assertCanvas(canvas);
    return canvas.toDataURL("image/png", options.quality);
  }

  global.SlowlyCanvasPNG = Object.freeze({
    version: VERSION,
    toBlob,
    toDataURL
  });
})(typeof window !== "undefined" ? window : globalThis);
