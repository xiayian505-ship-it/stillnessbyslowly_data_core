// once_per_key.js
// 慢慢的倉庫｜State｜Once Per Key 1.0.0
// 通用「同一個 key 只能成功一次」狀態核心。
// 可選擇注入 Storage-like 物件做跨頁持久化。
// 不綁日期、不綁 UI、不綁抽籤、不依賴 FictionStorage / Preference / CooldownGate。
(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function normalizeKey(value, name) {
    if (typeof value !== "string" || !value.trim()) {
      throw new TypeError(name + " must be a non-empty string.");
    }

    return value.trim();
  }

  function normalizeStorage(storage) {
    if (storage == null) {
      return null;
    }

    if (
      typeof storage.getItem !== "function" ||
      typeof storage.setItem !== "function" ||
      typeof storage.removeItem !== "function"
    ) {
      throw new TypeError(
        "storage must provide getItem, setItem, and removeItem."
      );
    }

    return storage;
  }

  function create(options = {}) {
    const storage = normalizeStorage(options.storage || null);
    const storageKey = storage
      ? normalizeKey(options.storageKey, "storageKey")
      : null;

    let memory = Object.create(null);

    function readAll() {
      if (!storage) {
        return { ...memory };
      }

      const raw = storage.getItem(storageKey);

      if (raw == null || raw === "") {
        return {};
      }

      const parsed = JSON.parse(raw);

      if (
        !parsed ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
      ) {
        throw new TypeError(
          "stored claim data must be a JSON object."
        );
      }

      return parsed;
    }

    function writeAll(data) {
      if (!storage) {
        memory = Object.assign(Object.create(null), data);
        return;
      }

      storage.setItem(storageKey, JSON.stringify(data));
    }

    function has(key) {
      const normalized = normalizeKey(key, "key");
      const data = readAll();

      return Object.prototype.hasOwnProperty.call(data, normalized);
    }

    function get(key) {
      const normalized = normalizeKey(key, "key");
      const data = readAll();

      return Object.prototype.hasOwnProperty.call(data, normalized)
        ? data[normalized]
        : null;
    }

    function claim(key, value = true) {
      const normalized = normalizeKey(key, "key");
      const data = readAll();

      if (Object.prototype.hasOwnProperty.call(data, normalized)) {
        return Object.freeze({
          claimed: false,
          key: normalized,
          value: data[normalized]
        });
      }

      data[normalized] = value;
      writeAll(data);

      return Object.freeze({
        claimed: true,
        key: normalized,
        value
      });
    }

    function release(key) {
      const normalized = normalizeKey(key, "key");
      const data = readAll();

      if (!Object.prototype.hasOwnProperty.call(data, normalized)) {
        return false;
      }

      delete data[normalized];
      writeAll(data);

      return true;
    }

    function keys() {
      return Object.freeze(Object.keys(readAll()));
    }

    function clear() {
      if (storage) {
        storage.removeItem(storageKey);
      } else {
        memory = Object.create(null);
      }
    }

    return Object.freeze({
      version: VERSION,
      has,
      get,
      claim,
      release,
      keys,
      clear
    });
  }

  global.OncePerKey = Object.freeze({
    version: VERSION,
    create
  });

})(typeof window !== "undefined" ? window : globalThis);
