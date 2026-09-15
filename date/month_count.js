/* 慢慢的倉庫｜Date｜Month Count v1.0.0
   將資料依日期歸入 YYYY-MM 月份並統計筆數。
   宿主自行提供資料與日期欄位；無效日期會略過。
   不綁委託紀錄、不綁 DOM、不處理儲存或圖表。
*/
(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function toDate(value) {
    if (value instanceof Date) {
      const copy = new Date(value.getTime());
      return Number.isNaN(copy.getTime()) ? null : copy;
    }

    if (value === null || value === undefined || value === "") {
      return null;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function keyOf(value) {
    const date = toDate(value);
    if (!date) return null;

    return (
      date.getFullYear() +
      "-" +
      String(date.getMonth() + 1).padStart(2, "0")
    );
  }

  function count(items, getDate) {
    if (!Array.isArray(items)) {
      throw new TypeError("items must be an array.");
    }

    const resolver =
      typeof getDate === "function"
        ? getDate
        : function (item) { return item; };

    const totals = new Map();

    items.forEach(function (item, index) {
      const key = keyOf(resolver(item, index, items));
      if (!key) return;

      totals.set(key, (totals.get(key) || 0) + 1);
    });

    return Object.freeze(
      Array.from(totals.entries())
        .sort(function (a, b) {
          return b[0].localeCompare(a[0]);
        })
        .map(function (entry) {
          return Object.freeze({
            month: entry[0],
            count: entry[1]
          });
        })
    );
  }

  function get(items, month, getDate) {
    const target = String(month || "").trim();

    if (!/^\d{4}-\d{2}$/.test(target)) {
      throw new TypeError("month must use YYYY-MM format.");
    }

    const found = count(items, getDate).find(function (entry) {
      return entry.month === target;
    });

    return found ? found.count : 0;
  }

  function current(items, getDate, now) {
    const month = keyOf(now === undefined ? new Date() : now);
    if (!month) {
      throw new TypeError("now must be a valid date value.");
    }

    return get(items, month, getDate);
  }

  global.MonthCount = Object.freeze({
    version: VERSION,
    keyOf,
    count,
    get,
    current
  });

})(typeof window !== "undefined" ? window : globalThis);
