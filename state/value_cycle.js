// value_cycle.js
// 慢慢的倉庫｜State｜Value Cycle 1.0.0
// 通用有限值循環核心：依目前值計算下一個、上一個或位移後的值。
// 不保存宿主資料、不綁 UI、不綁特定狀態名稱、不執行商業副作用。
(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function normalizeValues(values) {
    if (!Array.isArray(values)) {
      throw new TypeError("values must be an array.");
    }

    if (values.length === 0) {
      throw new RangeError("values must not be empty.");
    }

    return values.slice();
  }

  function requireInteger(value, name) {
    const number = Number(value);

    if (!Number.isInteger(number)) {
      throw new TypeError(name + " must be an integer.");
    }

    return number;
  }

  function indexOf(values, current) {
    const list = normalizeValues(values);
    return list.indexOf(current);
  }

  function normalizeIndex(index, length) {
    return ((index % length) + length) % length;
  }

  function shift(values, current, amount, options = {}) {
    const list = normalizeValues(values);
    const step = requireInteger(amount, "amount");
    const currentIndex = list.indexOf(current);

    if (currentIndex < 0) {
      if (options.onMissing === "throw") {
        throw new RangeError("current value is not present in values.");
      }

      const startIndex = options.onMissing === "last"
        ? list.length - 1
        : 0;

      return list[normalizeIndex(startIndex + step, list.length)];
    }

    return list[normalizeIndex(currentIndex + step, list.length)];
  }

  function next(values, current, options = {}) {
    return shift(values, current, 1, options);
  }

  function previous(values, current, options = {}) {
    return shift(values, current, -1, options);
  }

  function contains(values, value) {
    return normalizeValues(values).includes(value);
  }

  global.ValueCycle = Object.freeze({
    version: VERSION,
    indexOf,
    contains,
    shift,
    next,
    previous
  });

})(typeof window !== "undefined" ? window : globalThis);
