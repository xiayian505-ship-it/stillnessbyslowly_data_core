// damage_roll.js
// 慢慢的倉庫｜Game / Combat
// 通用整數傷害擲值核心：依指定範圍產生隨機整數，並可加入額外 bonus。
// 不管理角色、HP、護盾、Charge、回合或 UI。

(function (global) {
  "use strict";

  function toFiniteNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function normalizeRange(min, max) {
    let low = Math.trunc(toFiniteNumber(min, 0));
    let high = Math.trunc(toFiniteNumber(max, low));

    if (low > high) {
      [low, high] = [high, low];
    }

    return { min: low, max: high };
  }

  function normalizeRng(rng) {
    return typeof rng === "function" ? rng : Math.random;
  }

  function clampRandom(value) {
    const number = toFiniteNumber(value, 0);

    if (number <= 0) return 0;
    if (number >= 1) return 0.9999999999999999;

    return number;
  }

  const DamageRoll = {
    roll(min, max, options) {
      const config = options && typeof options === "object" ? options : {};
      const range = normalizeRange(min, max);
      const bonus = toFiniteNumber(config.bonus, 0);
      const rng = normalizeRng(config.rng);
      const random = clampRandom(rng());

      const base = Math.floor(random * (range.max - range.min + 1)) + range.min;
      const total = base + bonus;

      return {
        base,
        bonus,
        total,
        min: range.min,
        max: range.max
      };
    },

    value(min, max, options) {
      return this.roll(min, max, options).total;
    },

    normalizeRange(min, max) {
      return normalizeRange(min, max);
    }
  };

  global.DamageRoll = DamageRoll;
})(window);
