/* ================================================================
 * 慢慢軍火庫｜Text Generator Core v2.0.0
 *
 * 共用：文字字素、SVG 預覽、PNG、下載與等比例配置。
 * 不決定：直式／橫式、字形、色碼、背景、動畫與宿主 UI。
 * PNG 依賴 SlowlyCanvasPNG、SlowlyPNGDownload（分別載入）。
 * Blob URL 可選用 SlowlyBlobURL；未載入時使用瀏覽器原生 API。
 * ================================================================ */
(function (global) {
  "use strict";

  const VERSION = "2.0.0";
  const SVG_MIME = "image/svg+xml;charset=utf-8";
  const INVALID_FILENAME = /[\\/:*?"<>|\x00-\x1f\x7f]/g;
  const MAX_PIXEL = 16384;

  function splitCharacters(value) {
    const cleaned = String(value ?? "")
      .replace(/[\r\n\u200b\uFEFF]/g, "")
      .trim();

    if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
      const segmenter = new Intl.Segmenter("zh-Hant", { granularity: "grapheme" });
      return Array.from(segmenter.segment(cleaned), item => item.segment);
    }
    return Array.from(cleaned);
  }

  function escapeXML(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function fileSafe(value, fallback = "文字藝術字") {
    return String(value || fallback)
      .replace(INVALID_FILENAME, "_")
      .slice(0, 64)
      .trim() || fallback;
  }

  function applyTemplate(source, variables) {
    if (typeof source !== "string" || !source) {
      throw new TypeError("SVG 模板必須是非空字串。");
    }
    if (!variables || typeof variables !== "object") {
      throw new TypeError("模板變數必須是物件。");
    }
    // 請宿主對插入的文字先執行 escapeXML；SVG 標記本身不需跳脫。
    return source.replace(/@@([A-Z][A-Z0-9_]*)@@/g, (match, key) => {
      return Object.prototype.hasOwnProperty.call(variables, key)
        ? String(variables[key])
        : match;
    });
  }

  function dimensions(value, label = "尺寸") {
    if (!value || typeof value !== "object") {
      throw new TypeError(`${label}設定缺失。`);
    }
    const width = Number(value.width);
    const height = Number(value.height);
    if (![width, height].every(n => Number.isInteger(n) && n >= 1 && n <= MAX_PIXEL)) {
      throw new RangeError(`${label}必須是 1～${MAX_PIXEL} 的整數像素。`);
    }
    return { width, height };
  }

  function nonnegative(value, label, allowZero = false) {
    const number = Number(value);
    if (!Number.isFinite(number) || (allowZero ? number < 0 : number <= 0)) {
      throw new RangeError(`${label}必須是${allowZero ? "非負" : "正"}有限數值。`);
    }
    return number;
  }

  function computePlacement(source, target, config = {}) {
    const from = dimensions(source, "來源尺寸");
    const to = dimensions(target, "輸出尺寸");
    const paddingX = nonnegative(config.paddingX ?? 0, "水平留白", true);
    const paddingY = nonnegative(config.paddingY ?? 0, "垂直留白", true);
    const spaceX = to.width - 2 * paddingX;
    const spaceY = to.height - 2 * paddingY;
    if (spaceX <= 0 || spaceY <= 0) {
      throw new RangeError("輸出留白超過畫布大小。");
    }

    const fit = config.fit ?? "contain";
    if (fit !== "contain" && fit !== "fill") {
      throw new RangeError("fit 僅支援 contain 或 fill。");
    }

    let width = spaceX;
    let height = spaceY;
    if (fit === "contain") {
      const ratio = Math.min(spaceX / from.width, spaceY / from.height);
      width = from.width * ratio;
      height = from.height * ratio;
    }
    if (config.roundPlacement === true) {
      width = Math.round(width);
      height = Math.round(height);
    }
    const x = (to.width - width) / 2;
    const y = (to.height - height) / 2;
    return {
      x: config.roundPlacement === true ? Math.round(x) : x,
      y: config.roundPlacement === true ? Math.round(y) : y,
      width,
      height
    };
  }

  const helpers = Object.freeze({
    splitCharacters,
    escapeXML,
    fileSafe,
    applyTemplate
  });

  function create(options = {}) {
    if (!options || typeof options !== "object") {
      throw new TypeError("請提供生成器設定物件。");
    }
    if (typeof options.renderSVG !== "function") {
      throw new TypeError("請提供 renderSVG(text, helpers, layout) 函式。");
    }
    if (!options.sourceSize || (
      typeof options.sourceSize !== "function" && typeof options.sourceSize !== "object"
    )) {
      throw new TypeError("請提供 sourceSize 物件或函式。");
    }
    const maxChars = options.maxChars ?? 4;
    if (!Number.isInteger(maxChars) || maxChars < 1 || maxChars > 1000) {
      throw new RangeError("maxChars 必須是 1～1000 的整數。");
    }

    const presets = options.presets ?? {
      png: { scale: 2 },
      cover: { width: 700, height: 1000, fit: "contain" }
    };
    if (!presets || typeof presets !== "object" || Array.isArray(presets)) {
      throw new TypeError("presets 必須是物件。");
    }
    const names = options.filenames ?? {};
    if (!names || typeof names !== "object") {
      throw new TypeError("filenames 必須是物件。");
    }

    function normalize(raw) {
      return splitCharacters(raw).slice(0, maxChars).join("");
    }

    function assertText(raw) {
      const text = normalize(raw);
      if (!text) throw new Error("請輸入至少一個字。");
      return text;
    }

    function sourceSize(raw) {
      const text = assertText(raw);
      const supplied = typeof options.sourceSize === "function"
        ? options.sourceSize(text)
        : options.sourceSize;
      return dimensions(supplied, "原始 SVG 尺寸");
    }

    function generateSVG(raw) {
      const text = assertText(raw);
      const svg = options.renderSVG(text, helpers);
      if (typeof svg !== "string" || !/<svg(?:\s|>)/i.test(svg)) {
        throw new Error("宿主 renderSVG 必須回傳完整 SVG 字串。");
      }
      return svg;
    }

    function svgBlob(raw) {
      return new Blob([generateSVG(raw)], { type: SVG_MIME });
    }

    function makeURL(svg) {
      const blob = new Blob([svg], { type: SVG_MIME });
      if (typeof global.SlowlyBlobURL?.create === "function") {
        return global.SlowlyBlobURL.create(blob);
      }
      return URL.createObjectURL(blob);
    }

    function revokeURL(url) {
      if (!url) return;
      if (typeof global.SlowlyBlobURL?.revoke === "function") {
        global.SlowlyBlobURL.revoke(url);
      } else {
        URL.revokeObjectURL(url);
      }
    }

    function filename(text, kind, size) {
      const formatter = names[kind];
      const proposed = typeof formatter === "function" ? formatter(text, size) : formatter;
      const ext = kind === "svg" ? ".svg" : ".png";
      const fallback = `${fileSafe(text)}_${kind === "svg" ? "藝術字" : kind}${ext}`;
      let result = typeof proposed === "string" && proposed.trim() ? proposed : fallback;
      result = fileSafe(result, fallback);
      if (!result.toLowerCase().endsWith(ext)) result += ext;
      return result;
    }

    function triggerSVG(blob, file) {
      const url = typeof global.SlowlyBlobURL?.create === "function"
        ? global.SlowlyBlobURL.create(blob)
        : URL.createObjectURL(blob);
      try {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = file;
        anchor.style.display = "none";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      } finally {
        global.setTimeout(() => revokeURL(url), 15000);
      }
    }

    function downloadSVG(raw) {
      const text = assertText(raw);
      const size = sourceSize(text);
      const file = filename(text, "svg", size);
      triggerSVG(svgBlob(text), file);
      return { filename: file, ...size };
    }

    function formatSize(raw, preset = "png") {
      const source = sourceSize(raw);
      const config = presets[preset];
      if (!config || typeof config !== "object") {
        throw new Error(`找不到 PNG 輸出格式：${preset}`);
      }
      if (config.scale != null) {
        const scale = nonnegative(config.scale, "縮放倍率");
        return dimensions({
          width: Math.round(source.width * scale),
          height: Math.round(source.height * scale)
        }, "PNG 輸出尺寸");
      }
      return dimensions(config, "PNG 輸出尺寸");
    }

    function imageFromSVG(svg) {
      return new Promise((resolve, reject) => {
        const image = new Image();
        const url = makeURL(svg);
        image.onload = () => {
          revokeURL(url);
          resolve(image);
        };
        image.onerror = () => {
          revokeURL(url);
          reject(new Error("SVG 解析失敗，無法輸出 PNG。"));
        };
        image.src = url;
      });
    }

    async function pngBlob(raw, preset = "png") {
      const text = assertText(raw);
      const source = sourceSize(text);
      const config = presets[preset];
      if (!config) throw new Error(`找不到 PNG 輸出格式：${preset}`);
      if (typeof global.SlowlyCanvasPNG?.toBlob !== "function") {
        throw new Error("請先載入軍火庫 Image/png/canvas_png.js。");
      }

      const target = formatSize(text, preset);
      const svg = generateSVG(text);
      const image = await imageFromSVG(svg);
      const canvas = document.createElement("canvas");
      canvas.width = target.width;
      canvas.height = target.height;
      try {
        const ctx = canvas.getContext("2d", { alpha: true });
        if (!ctx) throw new Error("瀏覽器無法啟用 Canvas。");
        ctx.clearRect(0, 0, target.width, target.height);
        const placement = computePlacement(source, target, config);
        ctx.drawImage(image, placement.x, placement.y, placement.width, placement.height);
        const blob = await global.SlowlyCanvasPNG.toBlob(canvas);
        if (!(blob instanceof Blob) || blob.size === 0) {
          throw new Error("PNG 轉換結果為空。");
        }
        return { blob, ...target };
      } finally {
        canvas.width = 0;
        canvas.height = 0;
      }
    }

    async function downloadPNG(raw, preset = "png") {
      if (typeof global.SlowlyPNGDownload?.fromBlob !== "function") {
        throw new Error("請先載入軍火庫 Image/png/png_download.js。");
      }
      const text = assertText(raw);
      const result = await pngBlob(text, preset);
      const file = filename(text, preset, result);
      global.SlowlyPNGDownload.fromBlob(result.blob, file);
      return {
        filename: file,
        width: result.width,
        height: result.height,
        bytes: result.blob.size
      };
    }

    function createPreview(img) {
      if (!img || typeof img.addEventListener !== "function") {
        throw new TypeError("預覽需要 img 元素。");
      }
      const urls = new Set();
      let active = "";
      let destroyed = false;

      function releaseOlder() {
        for (const url of urls) {
          if (url !== active) {
            revokeURL(url);
            urls.delete(url);
          }
        }
      }
      function onImageDone() {
        releaseOlder();
      }
      img.addEventListener("load", onImageDone);
      img.addEventListener("error", onImageDone);

      return Object.freeze({
        set(raw) {
          if (destroyed) throw new Error("預覽已銷毀。");
          const url = makeURL(generateSVG(raw));
          urls.add(url);
          active = url;
          img.src = url;
          return url;
        },
        clear() {
          if (destroyed) return;
          img.removeAttribute("src");
          for (const url of urls) revokeURL(url);
          urls.clear();
          active = "";
        },
        destroy() {
          if (destroyed) return;
          img.removeEventListener("load", onImageDone);
          img.removeEventListener("error", onImageDone);
          img.removeAttribute("src");
          for (const url of urls) revokeURL(url);
          urls.clear();
          active = "";
          destroyed = true;
        }
      });
    }

    return Object.freeze({
      maxChars,
      splitCharacters,
      normalize,
      sourceSize,
      generateSVG,
      svgBlob,
      makeURL,
      revokeURL,
      createPreview,
      formatSize,
      pngBlob,
      downloadSVG,
      downloadPNG,
      downloadCover: raw => downloadPNG(raw, "cover")
    });
  }

  global.SlowlyTextGeneratorCore = Object.freeze({
    version: VERSION,
    splitCharacters,
    escapeXML,
    fileSafe,
    applyTemplate,
    dimensions,
    computePlacement,
    create
  });
})(typeof window !== "undefined" ? window : globalThis);
