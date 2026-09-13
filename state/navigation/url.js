/*
 * Navigation URL v1.0.0
 * 慢慢的倉庫｜stillness by slowly
 *
 * 通用 URL 解析與判斷工具。
 * - 以原生 URL 為基礎
 * - 不執行頁面跳轉
 * - 不綁 UI
 * - 不綁 Router / SPA
 * - 不處理瀏覽紀錄
 *
 * 全域：
 * window.SlowlyNavigationURL
 */

(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function normalizeValue(value, name) {
    if (value === null || value === undefined) {
      throw new TypeError(`SlowlyNavigationURL ${name} is required.`);
    }

    const text = String(value).trim();
    if (!text) {
      throw new TypeError(`SlowlyNavigationURL ${name} cannot be empty.`);
    }

    return text;
  }

  function defaultBase() {
    if (global && global.location && global.location.href) {
      return global.location.href;
    }
    return undefined;
  }

  function parse(value, base) {
    const input = normalizeValue(value, "value");
    const resolvedBase = base === undefined || base === null
      ? defaultBase()
      : normalizeValue(base, "base");

    return resolvedBase ? new URL(input, resolvedBase) : new URL(input);
  }

  function resolve(value, base) {
    return parse(value, base).href;
  }

  function isAbsolute(value) {
    const input = normalizeValue(value, "value");
    try {
      new URL(input);
      return true;
    } catch (_) {
      return false;
    }
  }

  function isExternal(value, base) {
    const target = parse(value, base);
    const baseUrl = base === undefined || base === null
      ? (defaultBase() ? parse(defaultBase()) : null)
      : parse(base);

    if (!baseUrl) return false;
    return target.origin !== baseUrl.origin;
  }

  function sameOrigin(a, b) {
    return parse(a).origin === parse(b).origin;
  }

  function info(value, base) {
    const url = parse(value, base);

    return {
      href: url.href,
      origin: url.origin,
      protocol: url.protocol,
      host: url.host,
      hostname: url.hostname,
      port: url.port,
      pathname: url.pathname,
      search: url.search,
      hash: url.hash
    };
  }

  function current() {
    if (!defaultBase()) {
      throw new Error("SlowlyNavigationURL current location is unavailable.");
    }
    return info(defaultBase());
  }

  const SlowlyNavigationURL = {
    version: VERSION,
    parse,
    resolve,
    isAbsolute,
    isExternal,
    sameOrigin,
    info,
    current
  };

  global.SlowlyNavigationURL = SlowlyNavigationURL;

})(typeof window !== "undefined" ? window : globalThis);
