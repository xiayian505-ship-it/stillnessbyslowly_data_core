// next_occurrence.js
// 慢慢的倉庫｜Date｜Next Occurrence 1.0.0
// 尋找「從指定日期起，下一次符合條件的民用日期」。
// - 不綁 UI
// - 不綁 Calendar / Lunar / DateTime
// - 不處理顯示文案
// - 支援固定月日，以及由宿主提供 resolver(year) 的年度規則
(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function parseDateKey(value) {
    if (typeof value !== "string") {
      throw new TypeError("date must be a YYYY-MM-DD string.");
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (!match) {
      throw new TypeError("date must use YYYY-MM-DD format.");
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    const check = new Date(Date.UTC(year, month - 1, day));

    if (
      check.getUTCFullYear() !== year ||
      check.getUTCMonth() + 1 !== month ||
      check.getUTCDate() !== day
    ) {
      throw new RangeError("date is not a valid Gregorian date.");
    }

    return {
      year,
      month,
      day,
      key: `${year}-${pad2(month)}-${pad2(day)}`
    };
  }

  function normalizeFrom(value) {
    if (value === undefined || value === null) {
      const now = new Date();
      return {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: now.getDate(),
        key:
          now.getFullYear() +
          "-" +
          pad2(now.getMonth() + 1) +
          "-" +
          pad2(now.getDate())
      };
    }

    return parseDateKey(value);
  }

  function normalizeMaxYears(value, fallback) {
    if (value === undefined) return fallback;

    const number = Number(value);

    if (!Number.isInteger(number) || number < 0) {
      throw new RangeError("maxYears must be an integer >= 0.");
    }

    return number;
  }

  function makeDateKey(year, month, day) {
    const y = Number(year);
    const m = Number(month);
    const d = Number(day);

    if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) {
      return null;
    }

    const check = new Date(Date.UTC(y, m - 1, d));

    if (
      check.getUTCFullYear() !== y ||
      check.getUTCMonth() + 1 !== m ||
      check.getUTCDate() !== d
    ) {
      return null;
    }

    return `${y}-${pad2(m)}-${pad2(d)}`;
  }

  function fixedMonthDay(options = {}) {
    const month = Number(options.month);
    const day = Number(options.day);
    const from = normalizeFrom(options.from);
    const maxYears = normalizeMaxYears(options.maxYears, 8);

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new RangeError("month must be an integer from 1 to 12.");
    }

    if (!Number.isInteger(day) || day < 1 || day > 31) {
      throw new RangeError("day must be an integer from 1 to 31.");
    }

    for (let offset = 0; offset <= maxYears; offset += 1) {
      const year = from.year + offset;
      const candidate = makeDateKey(year, month, day);

      if (!candidate) continue;
      if (candidate >= from.key) return candidate;
    }

    return null;
  }

  function resolvedYear(options = {}) {
    const from = normalizeFrom(options.from);
    const resolver = options.resolver;
    const startYear =
      options.startYear === undefined
        ? from.year
        : Number(options.startYear);
    const maxYears = normalizeMaxYears(options.maxYears, 8);

    if (typeof resolver !== "function") {
      throw new TypeError("resolver must be a function.");
    }

    if (!Number.isInteger(startYear)) {
      throw new TypeError("startYear must be an integer.");
    }

    for (let offset = 0; offset <= maxYears; offset += 1) {
      const year = startYear + offset;
      let value = null;

      try {
        value = resolver(year);
      } catch (error) {
        continue;
      }

      if (value == null || value === "") continue;

      let parsed;
      try {
        parsed = parseDateKey(String(value));
      } catch (error) {
        continue;
      }

      if (parsed.key >= from.key) {
        return parsed.key;
      }
    }

    return null;
  }

  global.NextOccurrence = Object.freeze({
    version: VERSION,
    fixedMonthDay,
    resolvedYear
  });

})(typeof window !== "undefined" ? window : globalThis);
