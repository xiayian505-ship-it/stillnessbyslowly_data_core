/*!
 * Fiction_filter.js
 * stillness by slowly
 *
 * 從 Fiction_data.js 拆出的獨立篩選功能。
 */

(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function getByPath(object, path) {
    if (!path) return object;

    return String(path)
      .split(".")
      .reduce((current, key) => {
        if (current == null) return undefined;
        return current[key];
      }, object);
  }

  function filter(items, rules = {}) {
    let result = [...items];

    if (typeof rules.predicate === "function") {
      result = result.filter(rules.predicate);
    }

    if (rules.equals) {
      Object.entries(rules.equals).forEach(([field, expected]) => {
        if (
          expected === "" ||
          expected === null ||
          expected === undefined
        ) {
          return;
        }

        result = result.filter(
          item =>
            String(getByPath(item, field)) ===
            String(expected)
        );
      });
    }

    if (rules.boolean) {
      Object.entries(rules.boolean).forEach(([field, expected]) => {
        if (expected === null || expected === undefined) {
          return;
        }

        result = result.filter(
          item =>
            Boolean(getByPath(item, field)) ===
            Boolean(expected)
        );
      });
    }

    if (rules.containsAll) {
      Object.entries(rules.containsAll).forEach(([field, required]) => {
        const wanted = Array.isArray(required) ? required : [];

        if (!wanted.length) return;

        result = result.filter(item => {
          const source = getByPath(item, field);
          const values = Array.isArray(source) ? source : [];

          return wanted.every(value =>
            values.includes(value)
          );
        });
      });
    }

    if (rules.containsAny) {
      Object.entries(rules.containsAny).forEach(([field, required]) => {
        const wanted = Array.isArray(required) ? required : [];

        if (!wanted.length) return;

        result = result.filter(item => {
          const source = getByPath(item, field);
          const values = Array.isArray(source) ? source : [];

          return wanted.some(value =>
            values.includes(value)
          );
        });
      });
    }

    return result;
  }

  const FictionFilter = Object.freeze({
    version: VERSION,
    filter
  });

  Object.defineProperty(global, "FictionFilter", {
    value: FictionFilter,
    writable: false,
    configurable: false,
    enumerable: true
  });

})(window);
