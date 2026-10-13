/* ===============================================================
 * 慢慢軍火庫 | 完成品使用 / Text Generator Component v1.0.0
 *
 * 宿主決定：字形、字體、SVG 模板、色碼、筆畫、特效、UI、輸出尺寸。
 * 本完成品只處理：Unicode 字素、字數上限、呼叫模板、SVG/PNG/
 *                書封輸出、等比例配置、暫時預覽 URL。
 * PNG 依賴既有軍火庫：SlowlyCanvasPNG、SlowlyPNGDownload。
 * 預覽 Blob URL 可使用 SlowlyBlobURL（未載入則原生 API）。
 * 不載入 CSS，不寫入頁面結構，不內建特定視覺風格。
 * =============================================================== */
(function (global) {
  "use strict";

  const VERSION = "1.0.0";
  const MIME = "image/svg+xml;charset=utf-8";
  const INVALID_NAME = /[\\/:*?"<>|\x00-\x1f\x7f]/g;

  function splitCharacters(value) {
    const input = String(value ?? "").replace(/[\r\n\u200b\uFEFF]/g, "").trim();
    if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
      return Array.from(new Intl.Segmenter("zh-Hant", { granularity: "grapheme" }).segment(input), x => x.segment);
    }
    return Array.from(input);
  }

  function escapeXML(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  }

  function fileSafe(value, fallback = "文字藝術字") {
    return String(value || fallback).replace(INVALID_NAME, "_").slice(0, 64).trim() || fallback;
  }

  function applyTemplate(source, variables) {
    if (typeof source !== "string" || !source) throw new TypeError("SVG 模板必須是非空字串。");
    if (!variables || typeof variables !== "object") throw new TypeError("模板變數必須是物件。");
    // 內容由宿主決定：文字請先 escapeXML，SVG 標記則維持原字串。
    return source.replace(/@@([A-Z][A-Z0-9_]*)@@/g, (match, key) =>
      Object.prototype.hasOwnProperty.call(variables, key) ? String(variables[key]) : match);
  }

  function dimensions(value, label = "尺寸") {
    if (!value || typeof value !== "object") throw new TypeError(`${label}設定缺失。`);
    const width = Number(value.width), height = Number(value.height);
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 16384 || height > 16384) {
      throw new RangeError(`${label}必須是 1～16384 的整數像素。`);
    }
    return { width, height };
  }

  function positive(value, name, allowZero = false) {
    const v = Number(value);
    if (!Number.isFinite(v) || v < (allowZero ? 0 : Number.EPSILON)) throw new RangeError(`${name}不可為負數或無效值。`);
    return v;
  }

  function create(options = {}) {
    if (typeof options.renderSVG !== "function") throw new TypeError("請提供 renderSVG(text, helpers) 函式。");
    const maxChars = options.maxChars ?? 4;
    if (!Number.isInteger(maxChars) || maxChars < 1 || maxChars > 1000) throw new RangeError("maxChars 必須是 1～1000 的整數。");
    if (typeof options.sourceSize !== "function" && (!options.sourceSize || typeof options.sourceSize !== "object")) {
      throw new TypeError("請提供 sourceSize 物件或函式。");
    }
    const presets = options.presets || {
      png: { scale: 2 },
      cover: { width: 700, height: 1000, fit: "contain", paddingX: 0, paddingY: 0 }
    };
    if (!presets || typeof presets !== "object") throw new TypeError("presets 應為物件。");
    const names = options.filenames || {};

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
      return dimensions(typeof options.sourceSize === "function" ? options.sourceSize(text) : options.sourceSize, "原始 SVG 尺寸");
    }
    const helpers = Object.freeze({ splitCharacters, escapeXML, applyTemplate, fileSafe });
    function generateSVG(raw) {
      const text = assertText(raw);
      const svg = options.renderSVG(text, helpers);
      if (typeof svg !== "string" || !/<svg(?:\s|>)/i.test(svg)) throw new Error("宿主 renderSVG 必須回傳完整 SVG 字串。");
      return svg;
    }
    function makeURL(svg) {
      const blob = new Blob([svg], { type: MIME });
      return global.SlowlyBlobURL?.create ? global.SlowlyBlobURL.create(blob) : URL.createObjectURL(blob);
    }
    function revokeURL(url) {
      if (!url) return;
      if (global.SlowlyBlobURL?.revoke) global.SlowlyBlobURL.revoke(url);
      else URL.revokeObjectURL(url);
    }
    function filename(text, kind, size) {
      const formatter = names[kind];
      const proposed = typeof formatter === "function" ? formatter(text, size) : formatter;
      const ext = kind === "svg" ? ".svg" : ".png";
      const defaultName = `${fileSafe(text)}_${kind === "svg" ? "藝術字" : kind}${ext}`;
      let result = typeof proposed === "string" && proposed.trim() ? proposed : defaultName;
      result = fileSafe(result, defaultName);
      if (!result.toLowerCase().endsWith(ext)) result += ext;
      return result;
    }
    function triggerSVG(blob, file) {
      const objectURL = global.SlowlyBlobURL?.create ? global.SlowlyBlobURL.create(blob) : URL.createObjectURL(blob);
      try {
        const anchor = document.createElement("a");
        anchor.href = objectURL;
        anchor.download = file;
        anchor.style.display = "none";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      } finally {
        global.setTimeout(() => revokeURL(objectURL), 15000);
      }
    }
    function svgBlob(raw) {
      return new Blob([generateSVG(raw)], { type: MIME });
    }
    function downloadSVG(raw) {
      const text = assertText(raw), size = sourceSize(text), file = filename(text, "svg", size);
      triggerSVG(svgBlob(text), file);
      return { filename: file, ...size };
    }
    function formatSize(raw, preset = "png") {
      const source = sourceSize(raw);
      const config = presets[preset];
      if (!config) throw new Error(`找不到 PNG 輸出格式：${preset}`);
      if (config.scale != null) {
        const scale = positive(config.scale, "縮放倍率");
        return dimensions({ width: Math.round(source.width * scale), height: Math.round(source.height * scale) }, "PNG 輸出尺寸");
      }
      return dimensions(config, "PNG 輸出尺寸");
    }
    function computePlacement(source, target, config) {
      const paddingX = positive(config.paddingX ?? 0, "水平留白", true);
      const paddingY = positive(config.paddingY ?? 0, "垂直留白", true);
      const spaceX = target.width - 2 * paddingX, spaceY = target.height - 2 * paddingY;
      if (spaceX <= 0 || spaceY <= 0) throw new RangeError("輸出留白超過畫布大小。");
      const fit = config.fit || "contain";
      if (fit !== "contain" && fit !== "fill") throw new Error("fit 目前支援 contain 或 fill。");
      let width = spaceX, height = spaceY;
      if (fit === "contain") {
        const s = Math.min(spaceX / source.width, spaceY / source.height);
        width = source.width * s;
        height = source.height * s;
      }
      if (config.roundPlacement === true) {
        width = Math.round(width);
        height = Math.round(height);
      }
      const x = (target.width - width) / 2, y = (target.height - height) / 2;
      return {
        x: config.roundPlacement === true ? Math.round(x) : x,
        y: config.roundPlacement === true ? Math.round(y) : y, width, height
      };
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
      const text = assertText(raw), source = sourceSize(text), config = presets[preset];
      if (!config) throw new Error(`找不到 PNG 輸出格式：${preset}`);
      // 必須經由軍火庫既有的 PNG 轉換零件，不重寫 toBlob。
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
        if (!ctx) throw new Error("瀏覽器無法啟用 Canvas。 ");
        ctx.clearRect(0, 0, target.width, target.height);
        const box = computePlacement(source, target, config);
        ctx.drawImage(image, box.x, box.y, box.width, box.height);
        const blob = await global.SlowlyCanvasPNG.toBlob(canvas);
        if (!(blob instanceof Blob) || !blob.size) throw new Error("PNG 轉換結果為空。");
        return { blob, ...target };
      } finally {
        canvas.width = canvas.height = 0;
      }
    }
    async function downloadPNG(raw, preset = "png") {
      const text = assertText(raw);
      const { blob, width, height } = await pngBlob(text, preset);
      if (typeof global.SlowlyPNGDownload?.fromBlob !== "function") {
        throw new Error("請先載入軍火庫 Image/png/png_download.js。");
      }
      const file = filename(text, preset, { width, height });
      global.SlowlyPNGDownload.fromBlob(blob, file);
      return { filename: file, width, height, bytes: blob.size };
    }
    function createPreview(img) {
      if (!img || typeof img.addEventListener !== "function") throw new TypeError("預覽需要 img 元素。");
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
      function onload() {
        releaseOlder();
      }
      function onerror() {
        releaseOlder();
      }
      img.addEventListener("load", onload);
      img.addEventListener("error", onerror);
      return Object.freeze({
        set(raw) {
          if (destroyed) throw new Error("預覽已銷毀。");
          const svg = generateSVG(raw);
          const url = makeURL(svg);
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
          img.removeEventListener("load", onload);
          img.removeEventListener("error", onerror);
          for (const url of urls) revokeURL(url);
          urls.clear();
          active = "";
          destroyed = true;
        }
      });
    }
    return Object.freeze({
      maxChars, splitCharacters, normalize, sourceSize, generateSVG, svgBlob,
      makeURL, revokeURL, createPreview, formatSize, pngBlob, downloadSVG, downloadPNG,
      downloadCover: raw => downloadPNG(raw, "cover")
    });
  }

  global.SlowlyTextGenerator = Object.freeze({
    version: VERSION, splitCharacters, escapeXML, fileSafe, applyTemplate, create
  });
})(typeof window !== "undefined" ? window : globalThis);
