/*!
 * Fiction_sort.js
 * stillness by slowly
 *
 * 從 Fiction_data.js 拆出的獨立排序功能。
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

  function sort(items, options = {}) {
    const {
      field = "createdAt",
      direction = "asc",
      type = "auto",
      compare
    } = options;

    const sign = direction === "desc" ? -1 : 1;
    const result = [...items];

    result.sort((a, b) => {
      if (typeof compare === "function") {
        return compare(a, b) * sign;
      }

      const av = getByPath(a, field);
      const bv = getByPath(b, field);

      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;

      if (type === "number") {
        return (Number(av) - Number(bv)) * sign;
      }

      if (type === "date") {
        return (
          new Date(av).getTime() -
          new Date(bv).getTime()
        ) * sign;
      }

      if (type === "string") {
        return String(av).localeCompare(
          String(bv),
          "zh-Hant"
        ) * sign;
      }

      const aNumber = Number(av);
      const bNumber = Number(bv);

      if (
        av !== "" &&
        bv !== "" &&
        Number.isFinite(aNumber) &&
        Number.isFinite(bNumber)
      ) {
        return (aNumber - bNumber) * sign;
      }

      const aDate = new Date(av);
      const bDate = new Date(bv);

      if (
        !Number.isNaN(aDate.getTime()) &&
        !Number.isNaN(bDate.getTime())
      ) {
        return (
          aDate.getTime() - bDate.getTime()
        ) * sign;
      }

      return String(av).localeCompare(
        String(bv),
        "zh-Hant"
      ) * sign;
    });

    return result;
  }

  const FictionSort = Object.freeze({
    version: VERSION,
    sort
  });

  Object.defineProperty(global, "FictionSort", {
    value: FictionSort,
    writable: false,
    configurable: false,
    enumerable: true
  });

})(window);
