// safe_url.js
// 慢慢的倉庫｜Data / Validation｜Safe URL 1.0.0
// 依允許的 protocol 驗證並正規化 URL 字串。
// 不自動補 https、不碰 DOM、不依賴 SlowlyDataValidation。
(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function normalizeProtocols(protocols) {
    const list = Array.isArray(protocols)
      ? protocols
      : ["http", "https"];

    const normalized = [];
    const seen = new Set();

    for (const value of list) {
      let protocol = String(value == null ? "" : value)
        .trim()
        .toLowerCase();

      if (!protocol) continue;

      protocol = protocol.replace(/:$/, "");

      if (!/^[a-z][a-z0-9+.-]*$/.test(protocol)) {
        throw new TypeError(
          "protocol must be a valid URI scheme name."
        );
      }

      if (!seen.has(protocol)) {
        seen.add(protocol);
        normalized.push(protocol);
      }
    }

    if (normalized.length === 0) {
      throw new RangeError(
        "at least one allowed protocol is required."
      );
    }

    return normalized;
  }

  function getProtocol(value) {
    const text = String(value == null ? "" : value).trim();
    const match = /^([a-z][a-z0-9+.-]*):/i.exec(text);

    return match
      ? match[1].toLowerCase()
      : null;
  }

  function isAllowed(value, options = {}) {
    const text = String(value == null ? "" : value).trim();

    if (!text) return false;

    const protocol = getProtocol(text);

    if (!protocol) return false;

    const allowed = normalizeProtocols(
      options.protocols
    );

    return allowed.includes(protocol);
  }

  function normalize(value, options = {}) {
    const text = String(value == null ? "" : value).trim();
    const fallback =
      options.fallback === undefined
        ? ""
        : String(options.fallback);

    return isAllowed(text, options)
      ? text
      : fallback;
  }

  global.SafeURL = Object.freeze({
    version: VERSION,
    getProtocol,
    isAllowed,
    normalize
  });

})(typeof window !== "undefined" ? window : globalThis);
