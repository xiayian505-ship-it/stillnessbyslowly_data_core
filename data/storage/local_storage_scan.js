// local_storage_scan.js
// 慢慢的倉庫｜Data / Storage｜Local Storage Scan 1.0.0
// 唯讀掃描 localStorage / Storage-like 物件。
// 不修改資料、不依賴 FictionStorage、不綁 JSON Viewer 或 DOM。
(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function requireStorage(storage) {
    if (
      !storage ||
      typeof storage.length !== "number" ||
      typeof storage.key !== "function" ||
      typeof storage.getItem !== "function"
    ) {
      throw new TypeError(
        "storage must provide length, key(index), and getItem(key)."
      );
    }

    return storage;
  }

  function valueType(value) {
    if (value === null) return "null";
    if (Array.isArray(value)) return "array";
    return typeof value === "object" ? "object" : typeof value;
  }

  function inspectRaw(raw) {
    if (raw === null) {
      return Object.freeze({
        raw: null,
        isJson: false,
        value: null,
        type: "missing",
        count: null,
        parseError: null
      });
    }

    try {
      const value = JSON.parse(raw);
      const type = valueType(value);

      return Object.freeze({
        raw,
        isJson: true,
        value,
        type,
        count: Array.isArray(value) ? value.length : 1,
        parseError: null
      });
    } catch (error) {
      return Object.freeze({
        raw,
        isJson: false,
        value: raw,
        type: "text",
        count: null,
        parseError: error instanceof Error
          ? error.message
          : String(error)
      });
    }
  }

  function scan(storage = global.localStorage) {
    const source = requireStorage(storage);
    const entries = [];

    for (let index = 0; index < source.length; index += 1) {
      const key = source.key(index);

      if (typeof key !== "string") continue;

      const info = inspectRaw(source.getItem(key));

      entries.push(Object.freeze({
        key,
        index,
        raw: info.raw,
        isJson: info.isJson,
        value: info.value,
        type: info.type,
        count: info.count,
        parseError: info.parseError
      }));
    }

    return Object.freeze(entries);
  }

  function splitKey(key, options = {}) {
    if (typeof key !== "string") {
      throw new TypeError("key must be a string.");
    }

    const delimiter =
      typeof options.delimiter === "string" && options.delimiter.length > 0
        ? options.delimiter
        : ":";

    const mode = options.mode === "first" ? "first" : "last";
    const index = mode === "first"
      ? key.indexOf(delimiter)
      : key.lastIndexOf(delimiter);

    if (index <= 0 || index + delimiter.length >= key.length) {
      return Object.freeze({
        matched: false,
        key,
        namespace: null,
        name: key
      });
    }

    return Object.freeze({
      matched: true,
      key,
      namespace: key.slice(0, index),
      name: key.slice(index + delimiter.length)
    });
  }

  function groupByNamespace(entries, options = {}) {
    if (!Array.isArray(entries)) {
      throw new TypeError("entries must be an array.");
    }

    const groups = new Map();
    const unmatched = [];

    entries.forEach((entry) => {
      if (!entry || typeof entry.key !== "string") {
        throw new TypeError("each entry must contain a string key.");
      }

      const parts = splitKey(entry.key, options);

      if (!parts.matched) {
        unmatched.push(entry);
        return;
      }

      if (!groups.has(parts.namespace)) {
        groups.set(parts.namespace, []);
      }

      groups.get(parts.namespace).push(
        Object.freeze({
          ...entry,
          namespace: parts.namespace,
          name: parts.name
        })
      );
    });

    return Object.freeze({
      groups,
      unmatched: Object.freeze(unmatched.slice())
    });
  }

  global.LocalStorageScan = Object.freeze({
    version: VERSION,
    inspectRaw,
    scan,
    splitKey,
    groupByNamespace
  });

})(typeof window !== "undefined" ? window : globalThis);
