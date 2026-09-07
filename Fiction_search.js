/*!
 * Fiction_search.js
 * stillness by slowly
 *
 * 從 Fiction_data.js 拆出的獨立搜尋功能。
 */

(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function normalizeText(value) {
    return String(value ?? "").trim();
  }

  function getByPath(object, path) {
    if (!path) return object;

    return String(path)
      .split(".")
      .reduce((current, key) => {
        if (current == null) return undefined;
        return current[key];
      }, object);
  }

  function search(items, keyword, fields = []) {
    const q = normalizeText(keyword)
      .toLocaleLowerCase("zh-Hant");

    if (!q) return [...items];

    return items.filter(item => {
      const values =
        fields.length > 0
          ? fields.map(field => getByPath(item, field))
          : Object.values(item || {});

      const blob = values
        .flatMap(value => {
          if (Array.isArray(value)) return value;
          if (value && typeof value === "object") {
            return Object.values(value);
          }
          return [value];
        })
        .map(value => String(value ?? ""))
        .join(" ")
        .toLocaleLowerCase("zh-Hant");

      return blob.includes(q);
    });
  }

  const FictionSearch = Object.freeze({
    version: VERSION,
    search
  });

  Object.defineProperty(global, "FictionSearch", {
    value: FictionSearch,
    writable: false,
    configurable: false,
    enumerable: true
  });

})(window);
