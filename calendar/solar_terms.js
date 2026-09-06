/**
 * SolarTerms
 * 24 節氣查詢 API
 *
 * Version: 1.0.0
 * Supported Gregorian range: 1901-01-01 through 2100-12-31
 *
 * 資料來源與驗證契約：
 *   solar_terms_reference.txt
 *
 * 資料：
 *   solar_terms_data.js
 *
 * 設計原則：
 * 1. 本模組只負責 24 節氣，不從農曆推導節氣。
 * 2. 不外推 1901–2100 以外的資料。
 * 3. 日期以 solar_terms_data.js 已選定的民用日期為準。
 * 4. 已知午夜邊界案例保留 data 檔的 boundaryCase / note。
 * 5. v1.0.0 不宣稱提供完整歷史 Asia/Taipei 精確時刻。
 */
(function (global) {
  "use strict";

  const DATA = global.SolarTermsData;

  if (!DATA || !DATA.years) {
    throw new Error(
      "SolarTerms 載入失敗：請先載入 solar_terms_data.js。"
    );
  }

  const START_YEAR = DATA.SUPPORTED_RANGE.startYear;
  const END_YEAR = DATA.SUPPORTED_RANGE.endYear;
  const START_DATE = `${START_YEAR}-01-01`;
  const END_DATE = `${END_YEAR}-12-31`;

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function normalizeDate(input) {
    if (input instanceof Date) {
      if (Number.isNaN(input.getTime())) {
        throw new TypeError("無效的 Date。");
      }

      // 使用呼叫端的本地年月日；本 API 是「民用日期」查詢，不把 Date 偷轉 UTC 日。
      return [
        input.getFullYear(),
        pad2(input.getMonth() + 1),
        pad2(input.getDate())
      ].join("-");
    }

    if (typeof input !== "string") {
      throw new TypeError("日期必須是 YYYY-MM-DD 字串或 Date。");
    }

    const match = input.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
      throw new TypeError("日期格式必須是 YYYY-MM-DD。");
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
      throw new RangeError("不存在的國曆日期。");
    }

    return `${year}-${pad2(month)}-${pad2(day)}`;
  }

  function assertYear(year) {
    const y = Number(year);

    if (!Number.isInteger(y)) {
      throw new TypeError("年份必須是整數。");
    }

    if (y < START_YEAR || y > END_YEAR) {
      throw new RangeError(
        `SolarTerms 僅支援 ${START_YEAR}–${END_YEAR}。`
      );
    }

    return y;
  }

  function assertDate(input) {
    const date = normalizeDate(input);

    if (date < START_DATE || date > END_DATE) {
      throw new RangeError(
        `SolarTerms 僅支援 ${START_DATE} ～ ${END_DATE}。`
      );
    }

    return date;
  }

  function cloneTerm(term, year) {
    return Object.freeze({
      year,
      name: term.name,
      longitude: term.longitude,
      date: term.date,
      boundaryCase: term.boundaryCase === true,
      note: term.note || ""
    });
  }

  function get(year) {
    const y = assertYear(year);
    const rows = DATA.years[String(y)];

    if (!Array.isArray(rows) || rows.length !== 24) {
      throw new Error(`SolarTermsData 的 ${y} 年資料不完整。`);
    }

    return Object.freeze(rows.map((term) => cloneTerm(term, y)));
  }

  function getTerm(year, name) {
    const y = assertYear(year);

    if (typeof name !== "string" || !name.trim()) {
      throw new TypeError("節氣名稱不可為空。");
    }

    const term = DATA.years[String(y)].find(
      (item) => item.name === name.trim()
    );

    if (!term) {
      throw new RangeError(`不存在的節氣名稱：${name}`);
    }

    return cloneTerm(term, y);
  }

  function getByDate(input) {
    const date = assertDate(input);
    const year = Number(date.slice(0, 4));

    return Object.freeze(
      DATA.years[String(year)]
        .filter((term) => term.date === date)
        .map((term) => cloneTerm(term, year))
    );
  }

  function next(input) {
    const date = assertDate(input);
    const year = Number(date.slice(0, 4));

    for (let y = year; y <= END_YEAR; y += 1) {
      const rows = DATA.years[String(y)];

      for (const term of rows) {
        // 「after」：同日節氣不算下一個。
        if (term.date > date) {
          return cloneTerm(term, y);
        }
      }
    }

    return null;
  }

  function nextOrSame(input) {
    const date = assertDate(input);
    const year = Number(date.slice(0, 4));

    for (let y = year; y <= END_YEAR; y += 1) {
      const rows = DATA.years[String(y)];

      for (const term of rows) {
        if (term.date >= date) {
          return cloneTerm(term, y);
        }
      }
    }

    return null;
  }

  function isSupportedDate(input) {
    try {
      assertDate(input);
      return true;
    } catch (_) {
      return false;
    }
  }

  function isSupportedYear(year) {
    const y = Number(year);
    return Number.isInteger(y) && y >= START_YEAR && y <= END_YEAR;
  }

  const SolarTerms = Object.freeze({
    VERSION: "1.0.0",

    SUPPORTED_RANGE: Object.freeze({
      start: START_DATE,
      end: END_DATE,
      startYear: START_YEAR,
      endYear: END_YEAR
    }),

    TERM_ORDER: DATA.TERM_ORDER,

    get,
    getTerm,
    getByDate,
    next,
    nextOrSame,
    isSupportedDate,
    isSupportedYear
  });

  global.SolarTerms = SolarTerms;
})(typeof window !== "undefined" ? window : globalThis);
