/* 慢慢的倉庫｜Image｜Canvas Content Normalize v1.0.0
   找出 Canvas 中的內容邊界，裁出後等比例放進新的 Canvas。
   預設把「深色且非透明」像素視為內容，適合 QRCode；
   宿主可注入 isContentPixel 改成其他判定。
   不產生 QRCode、不依賴 QRious。
*/
(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function assertCanvas(canvas) {
    if (!canvas || typeof canvas.getContext !== "function") {
      throw new TypeError("canvas must provide getContext().");
    }
    return canvas;
  }

  function defaultIsContentPixel(r, g, b, a) {
    return a > 0 && r < 128 && g < 128 && b < 128;
  }

  function findBounds(canvas, options = {}) {
    assertCanvas(canvas);

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context is unavailable.");

    const predicate =
      typeof options.isContentPixel === "function"
        ? options.isContentPixel
        : defaultIsContentPixel;

    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = image.data;

    let minX = canvas.width;
    let minY = canvas.height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < canvas.height; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        const i = (y * canvas.width + x) * 4;

        if (
          predicate(
            data[i],
            data[i + 1],
            data[i + 2],
            data[i + 3],
            x,
            y
          )
        ) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < minX || maxY < minY) {
      return null;
    }

    return Object.freeze({
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1
    });
  }

  function normalize(source, options = {}) {
    assertCanvas(source);

    const bounds = findBounds(source, options);

    const outputWidth = Math.max(
      1,
      Math.round(Number(options.width ?? options.size ?? source.width))
    );

    const outputHeight = Math.max(
      1,
      Math.round(Number(options.height ?? options.size ?? source.height))
    );

    if (!Number.isFinite(outputWidth) || !Number.isFinite(outputHeight)) {
      throw new TypeError("output width and height must be finite.");
    }

    const quietRatio = Number(options.quietRatio ?? 0.06);

    if (
      !Number.isFinite(quietRatio) ||
      quietRatio < 0 ||
      quietRatio >= 0.5
    ) {
      throw new RangeError("quietRatio must be >= 0 and < 0.5.");
    }

    const doc = source.ownerDocument || global.document;

    if (!doc || typeof doc.createElement !== "function") {
      throw new Error("normalize() requires a document to create Canvas.");
    }

    const canvas = doc.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context is unavailable.");

    ctx.fillStyle = options.background ?? "#ffffff";
    ctx.fillRect(0, 0, outputWidth, outputHeight);
    ctx.imageSmoothingEnabled = options.imageSmoothing === true;

    if (!bounds) {
      return Object.freeze({ canvas, bounds: null });
    }

    const quietX = Math.round(outputWidth * quietRatio);
    const quietY = Math.round(outputHeight * quietRatio);
    const availableW = Math.max(1, outputWidth - quietX * 2);
    const availableH = Math.max(1, outputHeight - quietY * 2);

    const scale = Math.min(
      availableW / bounds.width,
      availableH / bounds.height
    );

    const targetW = Math.max(1, Math.round(bounds.width * scale));
    const targetH = Math.max(1, Math.round(bounds.height * scale));
    const targetX = Math.round((outputWidth - targetW) / 2);
    const targetY = Math.round((outputHeight - targetH) / 2);

    ctx.drawImage(
      source,
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height,
      targetX,
      targetY,
      targetW,
      targetH
    );

    return Object.freeze({
      canvas,
      bounds,
      target: Object.freeze({
        x: targetX,
        y: targetY,
        width: targetW,
        height: targetH
      })
    });
  }

  global.CanvasContentNormalize = Object.freeze({
    version: VERSION,
    defaultIsContentPixel,
    findBounds,
    normalize
  });

})(typeof window !== "undefined" ? window : globalThis);
