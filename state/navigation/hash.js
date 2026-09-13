/*
 * Navigation Hash v1.0.0
 * 慢慢的倉庫｜stillness by slowly
 *
 * 通用 URL hash 處理工具。
 * - 可讀取、設定、清除與比對 hash
 * - 可更新目前頁面的 location.hash
 * - 不綁 DOM 元素
 * - 不綁 UI
 * - 不綁 Router / SPA
 *
 * 全域：
 * window.SlowlyNavigationHash
 */

(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function normalizeHash(value) {
    if (value === null || value === undefined) return "";

    const text = String(value).trim();
    if (!text) return "";

    return text.startsWith("#") ? text : `#${text}`;
  }

  function get(input) {
    if (input === undefined) {
      if (!global || !global.location) return "";
      return global.location.hash || "";
    }

    const value = String(input).trim();
    if (!value) return "";

    if (value.startsWith("#")) return normalizeHash(value);

    try {
      const base = global && global.location && global.location.href
        ? global.location.href
        : "http://localhost/";
      return new URL(value, base).hash || "";
    } catch (_) {
      const index = value.indexOf("#");
      return index === -1 ? "" : normalizeHash(value.slice(index));
    }
  }

  function value(input) {
    const hash = get(input);
    return hash ? hash.slice(1) : "";
  }

  function set(url, hash) {
    const base = global && global.location && global.location.href
      ? global.location.href
      : "http://localhost/";
    const target = new URL(String(url), base);
    target.hash = normalizeHash(hash);
    return target.href;
  }

  function remove(url) {
    const base = global && global.location && global.location.href
      ? global.location.href
      : "http://localhost/";
    const target = new URL(String(url), base);
    target.hash = "";
    return target.href;
  }

  function matches(a, b) {
    return normalizeHash(a) === normalizeHash(b);
  }

  function go(hash) {
    if (!global || !global.location) {
      throw new Error("SlowlyNavigationHash requires window.location.");
    }

    global.location.hash = normalizeHash(hash);
  }

  function clear() {
    if (!global || !global.location) {
      throw new Error("SlowlyNavigationHash requires window.location.");
    }

    const url = new URL(global.location.href);
    url.hash = "";

    if (global.history && typeof global.history.replaceState === "function") {
      global.history.replaceState(global.history.state, "", url.href);
      return;
    }

    global.location.hash = "";
  }

  const SlowlyNavigationHash = {
    version: VERSION,
    normalizeHash,
    get,
    value,
    set,
    remove,
    matches,
    go,
    clear
  };

  global.SlowlyNavigationHash = SlowlyNavigationHash;

})(typeof window !== "undefined" ? window : globalThis);
