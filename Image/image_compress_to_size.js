// image_compress_to_size.js
// 慢慢的倉庫｜Image｜Compress To Size 1.0.0
// 將圖片 Blob 壓向指定檔案大小：先限制尺寸，再降低品質；必要時再縮尺寸。
// 不依賴 ImageResize、不綁 Storage / UI / DataURL。
(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function positive(value, name) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) {
      throw new RangeError(name + " must be > 0.");
    }
    return number;
  }

  function ratio(value, name) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0 || number >= 1) {
      throw new RangeError(name + " must be > 0 and < 1.");
    }
    return number;
  }

  function loadImage(blob) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const image = new Image();

      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };

      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("圖片解碼失敗。"));
      };

      image.src = url;
    });
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        blob => blob
          ? resolve(blob)
          : reject(new Error("圖片輸出失敗。")),
        type,
        quality
      );
    });
  }

  function fitSize(width, height, maxWidth, maxHeight) {
    const scale = Math.min(
      1,
      maxWidth / width,
      maxHeight / height
    );

    return {
      width: Math.max(1, Math.round(width * scale)),
      height: Math.max(1, Math.round(height * scale))
    };
  }

  async function compress(blob, options = {}) {
    if (!(blob instanceof Blob)) {
      throw new TypeError("image must be a File or Blob.");
    }

    if (blob.type && !blob.type.startsWith("image/")) {
      throw new TypeError("image must be an image Blob.");
    }

    const maxBytes = positive(
      options.maxBytes ?? 150 * 1024,
      "maxBytes"
    );

    const maxWidth = positive(
      options.maxWidth ?? 800,
      "maxWidth"
    );

    const maxHeight = positive(
      options.maxHeight ?? 800,
      "maxHeight"
    );

    const type = options.type || "image/webp";
    const startQuality = Number(options.startQuality ?? 0.82);
    const minQuality = Number(options.minQuality ?? 0.36);
    const qualityStep = positive(
      options.qualityStep ?? 0.07,
      "qualityStep"
    );
    const shrinkFactor = ratio(
      options.shrinkFactor ?? 0.75,
      "shrinkFactor"
    );
    const minLongEdge = positive(
      options.minLongEdge ?? 320,
      "minLongEdge"
    );

    if (
      !Number.isFinite(startQuality) ||
      !Number.isFinite(minQuality) ||
      startQuality <= 0 ||
      startQuality > 1 ||
      minQuality <= 0 ||
      minQuality > startQuality
    ) {
      throw new RangeError(
        "quality must satisfy 0 < minQuality <= startQuality <= 1."
      );
    }

    const image = await loadImage(blob);
    const sourceWidth = image.naturalWidth;
    const sourceHeight = image.naturalHeight;

    if (!sourceWidth || !sourceHeight) {
      throw new Error("無法取得圖片尺寸。");
    }

    let size = fitSize(
      sourceWidth,
      sourceHeight,
      maxWidth,
      maxHeight
    );

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("瀏覽器不支援 Canvas 2D。");
    }

    let attempts = 0;
    let smallest = null;

    async function encode(width, height, quality) {
      canvas.width = width;
      canvas.height = height;

      ctx.clearRect(0, 0, width, height);

      if (type === "image/jpeg") {
        ctx.fillStyle = options.background || "#ffffff";
        ctx.fillRect(0, 0, width, height);
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(image, 0, 0, width, height);

      attempts += 1;

      return canvasToBlob(
        canvas,
        type,
        quality
      );
    }

    while (true) {
      for (
        let quality = startQuality;
        quality >= minQuality - 0.000001;
        quality -= qualityStep
      ) {
        const q = Math.max(minQuality, quality);
        const output = await encode(
          size.width,
          size.height,
          q
        );

        if (!smallest || output.size < smallest.blob.size) {
          smallest = {
            blob: output,
            width: size.width,
            height: size.height,
            quality: q
          };
        }

        if (output.size <= maxBytes) {
          return Object.freeze({
            blob: output,
            metTarget: true,
            maxBytes,
            width: size.width,
            height: size.height,
            quality: q,
            sourceWidth,
            sourceHeight,
            sourceBytes: blob.size,
            outputBytes: output.size,
            attempts,
            type: output.type
          });
        }

        if (q === minQuality) {
          break;
        }
      }

      const currentLongEdge = Math.max(
        size.width,
        size.height
      );

      if (currentLongEdge <= minLongEdge) {
        break;
      }

      const nextLongEdge = Math.max(
        minLongEdge,
        Math.round(currentLongEdge * shrinkFactor)
      );

      const scale = nextLongEdge / currentLongEdge;

      const nextWidth = Math.max(
        1,
        Math.round(size.width * scale)
      );

      const nextHeight = Math.max(
        1,
        Math.round(size.height * scale)
      );

      if (
        nextWidth === size.width &&
        nextHeight === size.height
      ) {
        break;
      }

      size = {
        width: nextWidth,
        height: nextHeight
      };
    }

    return Object.freeze({
      blob: smallest.blob,
      metTarget: false,
      maxBytes,
      width: smallest.width,
      height: smallest.height,
      quality: smallest.quality,
      sourceWidth,
      sourceHeight,
      sourceBytes: blob.size,
      outputBytes: smallest.blob.size,
      attempts,
      type: smallest.blob.type
    });
  }

  global.ImageCompressToSize = Object.freeze({
    version: VERSION,
    compress
  });

})(typeof window !== "undefined" ? window : globalThis);
