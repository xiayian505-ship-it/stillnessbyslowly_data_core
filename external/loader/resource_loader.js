// resource_loader.js
// 慢慢的倉庫｜External / Loader｜Resource Loader 1.0.0
// 瀏覽器 CSS / JS 動態載入核心。
// 不綁 UI、不讀模組索引、不自動呼叫 init/render、不吞載入錯誤。
(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function requireDocument() {
    if (!global.document || typeof global.document.createElement !== "function") {
      throw new Error("ResourceLoader requires a browser document.");
    }
    return global.document;
  }

  function resolveUrl(value, baseUrl) {
    if (typeof value !== "string" || !value.trim()) {
      throw new TypeError("resource URL must be a non-empty string.");
    }

    const raw = value.trim();

    try {
      if (baseUrl) {
        return new URL(raw, String(baseUrl)).href;
      }

      const doc = requireDocument();
      return new URL(raw, doc.baseURI || global.location?.href || undefined).href;
    } catch (error) {
      throw new TypeError("invalid resource URL: " + raw);
    }
  }

  function findStyle(doc, url) {
    return Array.from(
      doc.querySelectorAll('link[rel="stylesheet"][href]')
    ).find(function (node) {
      return node.href === url;
    }) || null;
  }

  function findScript(doc, url) {
    return Array.from(
      doc.querySelectorAll("script[src]")
    ).find(function (node) {
      return node.src === url;
    }) || null;
  }

  function waitForExisting(node, type, url) {
    if (node.dataset.resourceLoaderReady === "true") {
      return Promise.resolve(node);
    }

    // 頁面原本就存在的資源通常已載入；沒有可可靠追溯的 loaded 狀態。
    // 若它不是由本元件建立，視為已存在並直接重用。
    if (node.dataset.resourceLoaderOwned !== "true") {
      return Promise.resolve(node);
    }

    return new Promise(function (resolve, reject) {
      node.addEventListener("load", function handleLoad() {
        node.dataset.resourceLoaderReady = "true";
        resolve(node);
      }, { once: true });

      node.addEventListener("error", function handleError() {
        reject(new Error(type + " failed to load: " + url));
      }, { once: true });
    });
  }

  function loadStyle(value, options = {}) {
    const doc = requireDocument();
    const url = resolveUrl(value, options.baseUrl);
    const existing = findStyle(doc, url);

    if (existing) {
      return waitForExisting(existing, "CSS", url);
    }

    return new Promise(function (resolve, reject) {
      const link = doc.createElement("link");
      link.rel = "stylesheet";
      link.href = url;
      link.dataset.resourceLoaderOwned = "true";

      if (options.media) {
        link.media = String(options.media);
      }

      link.addEventListener("load", function () {
        link.dataset.resourceLoaderReady = "true";
        resolve(link);
      }, { once: true });

      link.addEventListener("error", function () {
        reject(new Error("CSS failed to load: " + url));
      }, { once: true });

      (options.target || doc.head).appendChild(link);
    });
  }

  function loadScript(value, options = {}) {
    const doc = requireDocument();
    const url = resolveUrl(value, options.baseUrl);
    const existing = findScript(doc, url);

    if (existing) {
      return waitForExisting(existing, "JS", url);
    }

    return new Promise(function (resolve, reject) {
      const script = doc.createElement("script");
      script.src = url;
      script.dataset.resourceLoaderOwned = "true";

      if (options.type) {
        script.type = String(options.type);
      }

      if (options.async !== undefined) {
        script.async = Boolean(options.async);
      } else {
        script.async = false;
      }

      if (options.defer !== undefined) {
        script.defer = Boolean(options.defer);
      }

      script.addEventListener("load", function () {
        script.dataset.resourceLoaderReady = "true";
        resolve(script);
      }, { once: true });

      script.addEventListener("error", function () {
        reject(new Error("JS failed to load: " + url));
      }, { once: true });

      (options.target || doc.head).appendChild(script);
    });
  }

  async function loadStyles(values, options = {}) {
    const list = Array.isArray(values) ? values : [values];
    const result = [];

    for (const value of list) {
      if (value == null || value === "") continue;
      result.push(await loadStyle(value, options));
    }

    return result;
  }

  async function loadScripts(values, options = {}) {
    const list = Array.isArray(values) ? values : [values];
    const result = [];

    // 明確依序 await，避免有相依關係的普通 script 亂序執行。
    for (const value of list) {
      if (value == null || value === "") continue;
      result.push(await loadScript(value, options));
    }

    return result;
  }

  global.ResourceLoader = Object.freeze({
    version: VERSION,
    resolveUrl,
    loadStyle,
    loadScript,
    loadStyles,
    loadScripts
  });

})(typeof window !== "undefined" ? window : globalThis);
