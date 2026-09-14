// charge_state.js
// 慢慢的倉庫｜Game / Combat
// 通用 Charge / Bonus 累積狀態核心。
// 只管理數值的累積、設定、消耗與清除，不負責傷害、角色、回合或 UI。

(function (global) {
  "use strict";

  function toFiniteNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function normalizeNonNegative(value) {
    return Math.max(0, toFiniteNumber(value, 0));
  }

  const ChargeState = {
    create(options) {
      const config = options && typeof options === "object" ? options : {};

      let value = normalizeNonNegative(config.initial);

      return {
        get() {
          return value;
        },

        set(nextValue) {
          value = normalizeNonNegative(nextValue);
          return value;
        },

        add(amount) {
          value += normalizeNonNegative(amount);
          return value;
        },

        clear() {
          const previous = value;
          value = 0;
          return previous;
        },

        consume(amount) {
          if (amount === undefined || amount === null) {
            return this.clear();
          }

          const requested = normalizeNonNegative(amount);
          const consumed = Math.min(value, requested);

          value -= consumed;
          return consumed;
        },

        has(amount) {
          const required = amount === undefined
            ? 1
            : normalizeNonNegative(amount);

          return value >= required;
        },

        isEmpty() {
          return value <= 0;
        },

        getState() {
          return {
            value
          };
        }
      };
    }
  };

  global.ChargeState = ChargeState;
})(window);
