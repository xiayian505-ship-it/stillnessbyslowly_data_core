/*
 * Navigation Query v1.0.0
 * 慢慢的倉庫｜stillness by slowly
 *
 * 通用 query string 處理工具。
 * - 以 URLSearchParams 為基礎
 * - 可讀取、設定、追加、刪除與轉換 query
 * - 不執行頁面跳轉
 * - 不綁 UI
 * - 不綁 Router / SPA
 *
 * 全域：
 * window.SlowlyNavigationQuery
 */

(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function extractSearch(input) {
    if (input === null || input === undefined || input === "") return "";

    const value = String(input).trim();
    if (!value) return "";

    if (value.startsWith("?")) {
      return value.slice(1);
    }

    if (!value.includes("?") && !value.includes("://") && !value.startsWith("/")) {
      return value;
    }

    try {
      const base = global && global.location && global.location.href
        ? global.location.href
        : "http://localhost/";
      return new URL(value, base).search.slice(1);
    } catch (_) {
      const questionIndex = value.indexOf("?");
      if (questionIndex === -1) return value;

      const hashIndex = value.indexOf("#", questionIndex);
      return value.slice(
        questionIndex + 1,
        hashIndex === -1 ? undefined : hashIndex
      );
    }
  }

  function toParams(input) {
    if (input instanceof URLSearchParams) {
      return new URLSearchParams(input);
    }
    return new URLSearchParams(extractSearch(input));
  }

  function toString(input, options) {
    const opts = options || {};
    const value = toParams(input).toString();

    if (!value) return "";
    return opts.prefix === false ? value : `?${value}`;
  }

  function get(input, key) {
    return toParams(input).get(String(key));
  }

  function getAll(input, key) {
    return toParams(input).getAll(String(key));
  }

  function has(input, key) {
    return toParams(input).has(String(key));
  }

  function set(input, key, value) {
    const params = toParams(input);
    params.set(String(key), String(value));
    return toString(params);
  }

  function append(input, key, value) {
    const params = toParams(input);
    params.append(String(key), String(value));
    return toString(params);
  }

  function remove(input, key) {
    const params = toParams(input);
    params.delete(String(key));
    return toString(params);
  }

  function toObject(input) {
    const params = toParams(input);
    const result = {};

    for (const [key, value] of params.entries()) {
      if (!(key in result)) {
        result[key] = value;
        continue;
      }

      if (!Array.isArray(result[key])) {
        result[key] = [result[key]];
      }

      result[key].push(value);
    }

    return result;
  }

  function fromObject(object, options) {
    const params = new URLSearchParams();

    if (!object || typeof object !== "object") {
      return toString(params, options);
    }

    for (const [key, rawValue] of Object.entries(object)) {
      if (rawValue === undefined || rawValue === null) continue;

      const values = Array.isArray(rawValue) ? rawValue : [rawValue];
      for (const value of values) {
        params.append(key, String(value));
      }
    }

    return toString(params, options);
  }

  const SlowlyNavigationQuery = {
    version: VERSION,
    toParams,
    toString,
    get,
    getAll,
    has,
    set,
    append,
    remove,
    toObject,
    fromObject
  };

  global.SlowlyNavigationQuery = SlowlyNavigationQuery;

})(typeof window !== "undefined" ? window : globalThis);
