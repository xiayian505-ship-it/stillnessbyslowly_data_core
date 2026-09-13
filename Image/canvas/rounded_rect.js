"use strict";

/* =========================================================
   慢慢的倉庫｜Canvas Rounded Rect v1.0.0

   用途：
   - 在 Canvas 2D context 建立圓角矩形 path
   - 僅建立 path，不自動 fill / stroke
========================================================= */

(function (global) {
  const VERSION = "1.0.0";

  function createPath(ctx, x, y, width, height, radius) {
    if (!ctx || typeof ctx.beginPath !== "function") {
      throw new TypeError("SlowlyCanvasRoundedRect requires a CanvasRenderingContext2D-like object");
    }

    const w = Number(width);
    const h = Number(height);
    const r = Math.max(0, Number(radius) || 0);

    if (!Number.isFinite(w) || !Number.isFinite(h) || w < 0 || h < 0) {
      throw new RangeError("width and height must be finite numbers >= 0");
    }

    const safeRadius = Math.min(r, w / 2, h / 2);

    ctx.beginPath();
    ctx.moveTo(x + safeRadius, y);
    ctx.arcTo(x + w, y, x + w, y + h, safeRadius);
    ctx.arcTo(x + w, y + h, x, y + h, safeRadius);
    ctx.arcTo(x, y + h, x, y, safeRadius);
    ctx.arcTo(x, y, x + w, y, safeRadius);
    ctx.closePath();

    return ctx;
  }

  global.SlowlyCanvasRoundedRect = Object.freeze({
    version: VERSION,
    createPath
  });
})(typeof window !== "undefined" ? window : globalThis);
