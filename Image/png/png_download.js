"use strict";

/* =========================================================
   慢慢的倉庫｜PNG Download v1.0.0

   用途：
   - 下載 PNG Blob 或 PNG Data URL
   - Blob 下載時自動建立並釋放 Object URL
   - 不負責 Canvas 繪製或 PNG 產生
========================================================= */

(function (global) {
  const VERSION = "1.0.0";
  const INVALID_FILENAME = /[\\/:*?"<>|]/g;

  function sanitizeFilename(name, fallback = "image.png") {
    let filename = String(name ?? "").replace(INVALID_FILENAME, "_").trim();

    if (!filename) filename = fallback;
    if (!/\.png$/i.test(filename)) filename += ".png";

    return filename;
  }

  function triggerDownload(url, filename) {
    if (typeof document === "undefined") {
      throw new Error("SlowlyPNGDownload requires a browser document");
    }

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = "none";

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  function fromBlob(blob, filename = "image.png") {
    if (!(blob instanceof Blob)) {
      throw new TypeError("SlowlyPNGDownload.fromBlob requires a Blob");
    }

    const safeFilename = sanitizeFilename(filename);
    const url = URL.createObjectURL(blob);

    try {
      triggerDownload(url, safeFilename);
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 0);
    }

    return safeFilename;
  }

  function fromDataURL(dataURL, filename = "image.png") {
    const value = String(dataURL ?? "");

    if (!/^data:image\/png(?:;[^,]*)?,/i.test(value)) {
      throw new TypeError("SlowlyPNGDownload.fromDataURL requires a PNG data URL");
    }

    const safeFilename = sanitizeFilename(filename);
    triggerDownload(value, safeFilename);
    return safeFilename;
  }

  global.SlowlyPNGDownload = Object.freeze({
    version: VERSION,
    sanitizeFilename,
    fromBlob,
    fromDataURL
  });
})(typeof window !== "undefined" ? window : globalThis);
