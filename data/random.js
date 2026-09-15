"use strict";

/* =========================================================
   慢慢的倉庫｜Random v1.0.0

   用途：
   - 產生指定範圍的隨機浮點數
   - 產生指定範圍的隨機整數（含上下界）
   - 依指定機率回傳 true / false

   不負責：
   - UI
   - 業務規則
   - 狀態保存
   - 決定專案應使用的範圍或機率
========================================================= */

(function (global) {
  const VERSION = "1.0.0";

  function assertFiniteNumber(value, name) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      throw new TypeError(`${name} must be a finite number`);
    }

    return number;
  }

  function float(min = 0, max = 1) {
    const lower = assertFiniteNumber(min, "min");
    const upper = assertFiniteNumber(max, "max");

    if (upper < lower) {
      throw new RangeError("max must be greater than or equal to min");
    }

    if (upper === lower) return lower;
    return lower + Math.random() * (upper - lower);
  }

  function int(min, max) {
    const lower = assertFiniteNumber(min, "min");
    const upper = assertFiniteNumber(max, "max");

    if (!Number.isInteger(lower) || !Number.isInteger(upper)) {
      throw new TypeError("SlowlyRandom.int requires integer boundaries");
    }

    if (upper < lower) {
      throw new RangeError("max must be greater than or equal to min");
    }

    return Math.floor(Math.random() * (upper - lower + 1)) + lower;
  }

  function chance(probability = 0.5) {
    const value = assertFiniteNumber(probability, "probability");

    if (value < 0 || value > 1) {
      throw new RangeError("probability must be between 0 and 1");
    }

    return Math.random() < value;
  }

  global.SlowlyRandom = Object.freeze({
    version: VERSION,
    float,
    int,
    chance
  });
})(typeof window !== "undefined" ? window : globalThis);
