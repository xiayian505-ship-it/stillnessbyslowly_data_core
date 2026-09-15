// cooldown_gate.js
// 慢慢的倉庫｜State｜Cooldown Gate 1.0.0
// 通用冷卻／時間鎖狀態核心。
// 不綁 UI、不綁 reload、不綁特定用途；可選擇注入 Storage-like 物件做跨頁持久化。
(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function finiteNumber(value, name) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      throw new TypeError(name + " must be a finite number.");
    }

    return number;
  }

  function nonNegative(value, name) {
    const number = finiteNumber(value, name);

    if (number < 0) {
      throw new RangeError(name + " must be >= 0.");
    }

    return number;
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
    const duration = nonNegative(options.duration, "duration");
    const now = typeof options.now === "function"
      ? options.now
      : Date.now;

    const storage = normalizeStorage(options.storage || null);
    const key = options.key == null ? "" : String(options.key).trim();

    if (storage && !key) {
      throw new Error("key is required when storage is provided.");
    }

    let memoryTimestamp = null;

    function readTimestamp() {
      let raw;

      if (storage) {
        raw = storage.getItem(key);
      } else {
        raw = memoryTimestamp;
      }

      if (raw == null || raw === "") {
        return null;
      }

      const value = Number(raw);

      if (!Number.isFinite(value)) {
        return null;
      }

      return value;
    }

    function writeTimestamp(value) {
      if (storage) {
        storage.setItem(key, String(value));
      } else {
        memoryTimestamp = value;
      }
    }

    function clearTimestamp() {
      if (storage) {
        storage.removeItem(key);
      } else {
        memoryTimestamp = null;
      }
    }

    function currentTime() {
      return finiteNumber(now(), "now()");
    }

    function remaining(at = currentTime()) {
      const last = readTimestamp();

      if (last == null) {
        return 0;
      }

      const elapsed = Math.max(0, at - last);
      return Math.max(0, duration - elapsed);
    }

    function isLocked(at = currentTime()) {
      return remaining(at) > 0;
    }

    function snapshot(at = currentTime()) {
      const last = readTimestamp();
      const left = remaining(at);

      return Object.freeze({
        duration,
        lastTriggeredAt: last,
        remaining: left,
        locked: left > 0,
        availableAt: last == null ? null : last + duration
      });
    }

    function trigger(at = currentTime()) {
      const timestamp = finiteNumber(at, "at");
      writeTimestamp(timestamp);
      return snapshot(timestamp);
    }

    function tryTrigger(at = currentTime()) {
      const timestamp = finiteNumber(at, "at");
      const before = snapshot(timestamp);

      if (before.locked) {
        return Object.freeze({
          allowed: false,
          snapshot: before
        });
      }

      const after = trigger(timestamp);

      return Object.freeze({
        allowed: true,
        snapshot: after
      });
    }

    function reset() {
      clearTimestamp();
      return snapshot();
    }

    return Object.freeze({
      version: VERSION,
      duration,
      isLocked,
      remaining,
      snapshot,
      trigger,
      tryTrigger,
      reset
    });
  }

  global.CooldownGate = Object.freeze({
    version: VERSION,
    create
  });

})(typeof window !== "undefined" ? window : globalThis);
