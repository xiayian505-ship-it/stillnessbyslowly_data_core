// action_pattern.js
// 慢慢的倉庫｜Game / AI
// 通用循環行動模式核心：只管理 pattern 與目前索引，不執行任何行動。

(function (global) {
  "use strict";

  function normalizeIndex(index, length) {
    if (length <= 0) return 0;

    const value = Number(index);
    if (!Number.isFinite(value)) return 0;

    const integer = Math.trunc(value);
    return ((integer % length) + length) % length;
  }

  function copyPattern(pattern) {
    return Array.isArray(pattern) ? pattern.slice() : [];
  }

  const ActionPattern = {
    create(pattern, options) {
      const config = options && typeof options === "object" ? options : {};

      let actions = copyPattern(pattern);
      let index = normalizeIndex(config.startIndex, actions.length);
      let fallback = Object.prototype.hasOwnProperty.call(config, "fallback")
        ? config.fallback
        : null;

      function effectivePattern() {
        if (actions.length > 0) return actions;
        return fallback === null || fallback === undefined ? [] : [fallback];
      }

      return {
        next() {
          const current = effectivePattern();
          if (current.length === 0) return null;

          const currentIndex = normalizeIndex(index, current.length);
          const action = current[currentIndex];
          index = (currentIndex + 1) % current.length;

          return action;
        },

        peek() {
          const current = effectivePattern();
          if (current.length === 0) return null;

          return current[normalizeIndex(index, current.length)];
        },

        reset(nextIndex) {
          const current = effectivePattern();
          index = normalizeIndex(nextIndex, current.length);
          return index;
        },

        setPattern(nextPattern, options) {
          const setOptions = options && typeof options === "object" ? options : {};
          actions = copyPattern(nextPattern);

          if (!setOptions.keepIndex) {
            index = 0;
          } else {
            index = normalizeIndex(index, effectivePattern().length);
          }

          return this.getPattern();
        },

        setFallback(nextFallback) {
          fallback = nextFallback;
          index = normalizeIndex(index, effectivePattern().length);
          return fallback;
        },

        getPattern() {
          return actions.slice();
        },

        getIndex() {
          return normalizeIndex(index, effectivePattern().length);
        },

        getState() {
          return {
            pattern: actions.slice(),
            index: normalizeIndex(index, effectivePattern().length),
            fallback
          };
        }
      };
    }
  };

  global.ActionPattern = ActionPattern;
})(window);
