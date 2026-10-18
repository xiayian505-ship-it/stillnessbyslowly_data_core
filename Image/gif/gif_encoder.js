"use strict";

/* =============================================================
 * 慢慢軍火庫｜GIF Encoder v1.0.0
 * 職責：將 RGBA 影格編碼為 GIF Blob，不處理 SVG、下載或 UI。
 * 抽離自慢慢藝術字站的 SVG GIF 編碼器，沿用原始 LZW 流程。
 * GIF 最多 256 色；alpha 小於 128 的像素視為透明。
 * ============================================================= */
(function (global) {
  const PALETTE_SIZE = 256;
  const TRANSPARENT_INDEX = 255;

  function rgbKey(red, green, blue) {
    return ((red >> 3) << 10) | ((green >> 3) << 5) | (blue >> 3);
  }

  function put16(output, value) {
    output.push(value & 255, (value >> 8) & 255);
  }

  function lzwCompress(indices) {
    const CLEAR_CODE = 256;
    const END_CODE = 257;
    const MAX_DICTIONARY = 4096;
    let codeBits = 9;
    let nextCode = 258;
    let bitBuffer = 0;
    let bufferedBits = 0;
    const dictionary = new Map();
    const compressed = [];

    function writeCode(code) {
      bitBuffer |= code << bufferedBits;
      bufferedBits += codeBits;
      while (bufferedBits >= 8) {
        compressed.push(bitBuffer & 255);
        bitBuffer >>>= 8;
        bufferedBits -= 8;
      }
    }

    writeCode(CLEAR_CODE);
    let current = indices[0];

    for (let index = 1; index < indices.length; index++) {
      const nextPixel = indices[index];
      const key = (current << 8) | nextPixel;
      const existingCode = dictionary.get(key);

      if (existingCode !== undefined) {
        current = existingCode;
        continue;
      }
      writeCode(current);
      if (nextCode < MAX_DICTIONARY) {
        dictionary.set(key, nextCode++);
        if (nextCode > (1 << codeBits) && codeBits < 12) {
          codeBits++;
        }
      } else {
        writeCode(CLEAR_CODE);
        dictionary.clear();
        codeBits = 9;
        nextCode = 258;
      }
      current = nextPixel;
    }

    writeCode(current);
    if (nextCode >= (1 << codeBits) && codeBits < 12) {
      codeBits++;
    }
    writeCode(END_CODE);
    if (bufferedBits > 0) {
      compressed.push(bitBuffer & 255);
    }

    // GIF 規範使用最多 255 bytes 的資料子區塊。
    const bytes = [8]; // minimum LZW code size
    for (let index = 0; index < compressed.length; index += 255) {
      const length = Math.min(255, compressed.length - index);
      bytes.push(length);
      for (let i = 0; i < length; i++) bytes.push(compressed[index + i]);
    }
    bytes.push(0); // block terminator
    return new Uint8Array(bytes);
  }

  function makePalette(frames) {
    const histogram = new Map();
    for (const pixels of frames) {
      // 使用格點取樣建立共用調色盤，避免每幀顏色閃爍。
      for (let index = 0; index < pixels.length; index += 28) {
        if (pixels[index + 3] < 128) continue;
        const key = rgbKey(pixels[index], pixels[index + 1], pixels[index + 2]);
        histogram.set(key, (histogram.get(key) || 0) + 1);
      }
    }
    const keys = Array.from(histogram.entries())
      .sort((first, second) => second[1] - first[1])
      .slice(0, 255)
      .map(item => item[0]);

    const palette = keys.map(key => [
      ((key >> 10) & 31) * 8 + 4,
      ((key >> 5) & 31) * 8 + 4,
      (key & 31) * 8 + 4
    ]);
    if (palette.length === 0) {
      palette.push([0, 0, 0]);
    }
    return palette;
  }

  function makeColorMapper(palette) {
    const cache = new Map();
    palette.forEach((color, index) => {
      cache.set(rgbKey(...color), index);
    });

    return (red, green, blue) => {
      const key = rgbKey(red, green, blue);
      const cached = cache.get(key);
      if (cached !== undefined) return cached;

      let nearestIndex = 0;
      let nearestDistance = Infinity;
      for (let index = 0; index < palette.length; index++) {
        const color = palette[index];
        const distance = (red - color[0]) ** 2 +
          (green - color[1]) ** 2 + (blue - color[2]) ** 2;
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      }
      cache.set(key, nearestIndex);
      return nearestIndex;
    };
  }

  function frameIndices(pixels, width, height, colorIndex) {
    const indices = new Uint8Array(width * height);
    for (let pixel = 0; pixel < indices.length; pixel++) {
      const index = pixel * 4;
      indices[pixel] = pixels[index + 3] < 128
        ? TRANSPARENT_INDEX
        : colorIndex(pixels[index], pixels[index + 1], pixels[index + 2]);
    }
    return indices;
  }

  async function encode(options) {
    if (!options || typeof options !== "object") {
      throw new TypeError("GIF 編碼設定不可為空。");
    }
    const { frames, width, height, fps, transparent = false, onProgress } = options;
    if (!Number.isFinite(fps) || fps <= 0 || fps > 100) {
      throw new RangeError("GIF fps 必須大於 0 且不超過 100。");
    }
    if (onProgress !== undefined && typeof onProgress !== "function") {
      throw new TypeError("onProgress 必須是函式。");
    }
    if (!Array.isArray(frames) || frames.length === 0 ||
        !Number.isInteger(width) || !Number.isInteger(height) ||
        width < 1 || width > 65535 || height < 1 || height > 65535) {
      throw new Error("GIF 編碼需要正確尺寸及非空影格陣列。");
    }
    for (const frame of frames) {
      if (!(frame instanceof Uint8ClampedArray) || frame.length !== width * height * 4) {
        throw new Error("GIF 每個影格必須包含完整 RGBA 像素。");
      }
    }

    const palette = makePalette(frames);
    const colorIndex = makeColorMapper(palette);
    const output = [];
    const header = [];

    // GIF89a header + logical screen descriptor + 共用調色盤。
    header.push(71, 73, 70, 56, 57, 97);
    put16(header, width);
    put16(header, height);
    header.push(0xF7, 0, 0);
    for (let index = 0; index < PALETTE_SIZE; index++) {
      const color = palette[index] || [0, 0, 0];
      header.push(color[0], color[1], color[2]);
    }

    // NETSCAPE 2.0 Extension：設定無限循環播放。
    header.push(0x21, 0xFF, 11, 78, 69, 84, 83, 67, 65, 80, 69, 50, 46, 48, 3, 1, 0, 0, 0);
    output.push(new Uint8Array(header));
    const delay = Math.max(2, Math.round(100 / fps));

    for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
      const pixels = frames[frameIndex];
      const indices = frameIndices(pixels, width, height, colorIndex);
      const prefix = [];

      // Disposal=2：下一幀繪製前恢復背景；避免移動元素殘影。
      // 透明模式時透明色使用最後一格調色盤索引。
      prefix.push(0x21, 0xF9, 4, transparent ? 0x09 : 0x08);
      put16(prefix, delay);
      prefix.push(TRANSPARENT_INDEX, 0);
      prefix.push(0x2C);
      put16(prefix, 0);
      put16(prefix, 0);
      put16(prefix, width);
      put16(prefix, height);
      prefix.push(0);

      output.push(new Uint8Array(prefix));
      output.push(lzwCompress(indices));
      onProgress?.((frameIndex + 1) / frames.length);
      if (frameIndex % 2 === 0) {
        await new Promise(resolve => global.setTimeout(resolve, 0));
      }
    }
    output.push(new Uint8Array([0x3B]));
    return new Blob(output, { type: "image/gif" });
  }

  global.SlowlyGIFEncoder = Object.freeze({ version: "1.0.0", encode });
})(typeof window !== "undefined" ? window : globalThis);
