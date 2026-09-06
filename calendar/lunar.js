/**
 * lunar.js
 * 慢慢的倉庫／農曆轉換 API
 *
 * 依賴：lunar_data.js
 * 資料契約：lunar_reference.txt
 *
 * SUPPORTED RANGE
 * ----------------
 * Gregorian: 1901-01-01 ～ 2100-12-31
 *
 * 本模組是有限範圍資料查詢器，不是萬年曆演算法。
 * 支援範圍外一律明確拒絕，不推算、不猜測、不自動補資料。
 * 農曆、節氣、節日是不同責任；本檔只處理國曆／農曆轉換與農曆月份資料。
 */

(function (root) {
  "use strict";

  if (!root.LunarData) {
    throw new Error(
      "Lunar requires lunar_data.js. Please load lunar_data.js before lunar.js."
    );
  }

  const DATA = root.LunarData;
  const RANGE = Object.freeze({
    start: DATA.supportedGregorianRange.start,
    end: DATA.supportedGregorianRange.end
  });

  const MONTH_NAMES = Object.freeze([
    "", "正月", "二月", "三月", "四月", "五月", "六月",
    "七月", "八月", "九月", "十月", "十一月", "十二月"
  ]);

  const DAY_NAMES = Object.freeze([
    "",
    "初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十",
    "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
    "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十"
  ]);

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function daysFromCivil(year, month, day) {
    return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
  }

  function parseGregorian(input) {
    let year;
    let month;
    let day;

    if (typeof input === "string") {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
      if (!match) {
        throw new TypeError("Gregorian date must use YYYY-MM-DD format.");
      }
      year = Number(match[1]);
      month = Number(match[2]);
      day = Number(match[3]);
    } else if (input && typeof input === "object") {
      year = Number(input.year);
      month = Number(input.month);
      day = Number(input.day);
    } else {
      throw new TypeError("Gregorian date must be YYYY-MM-DD or { year, month, day }.");
    }

    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
      throw new TypeError("Gregorian year, month and day must be integers.");
    }

    const time = Date.UTC(year, month - 1, day);
    const date = new Date(time);
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() + 1 !== month ||
      date.getUTCDate() !== day
    ) {
      throw new RangeError("Invalid Gregorian date.");
    }

    const iso = `${year}-${pad2(month)}-${pad2(day)}`;
    return { year, month, day, iso, ordinal: daysFromCivil(year, month, day) };
  }

  function assertGregorianInRange(parsed) {
    if (parsed.iso < RANGE.start || parsed.iso > RANGE.end) {
      throw new RangeError(
        `Unsupported Gregorian date: ${parsed.iso}. Supported range is ${RANGE.start} through ${RANGE.end}.`
      );
    }
  }

  function parseLunar(yearOrObject, month, day, isLeap) {
    let year;
    let lunarMonth;
    let lunarDay;
    let leap;

    if (yearOrObject && typeof yearOrObject === "object") {
      year = Number(yearOrObject.year);
      lunarMonth = Number(yearOrObject.month);
      lunarDay = Number(yearOrObject.day);
      leap = Boolean(yearOrObject.isLeap);
    } else {
      year = Number(yearOrObject);
      lunarMonth = Number(month);
      lunarDay = Number(day);
      leap = Boolean(isLeap);
    }

    if (!Number.isInteger(year) || !Number.isInteger(lunarMonth) || !Number.isInteger(lunarDay)) {
      throw new TypeError("Lunar year, month and day must be integers.");
    }

    if (lunarMonth < 1 || lunarMonth > 12) {
      throw new RangeError("Lunar month must be between 1 and 12.");
    }

    if (lunarDay < 1 || lunarDay > 30) {
      throw new RangeError("Lunar day must be between 1 and 30.");
    }

    return { year, month: lunarMonth, day: lunarDay, isLeap: leap };
  }

  function getYearRecord(year) {
    const record = DATA.years[year];
    if (!record) {
      throw new RangeError(`Unsupported lunar year: ${year}.`);
    }
    return record;
  }

  function getMonthRecord(year, month, isLeap) {
    let months = null;

    if (DATA.years[year]) {
      months = DATA.years[year].months;
    } else {
      const boundaryMonths = DATA.boundaryContext.beforeRangeMonths || [];
      if (boundaryMonths.some((item) => item.year === year)) {
        months = boundaryMonths.filter((item) => item.year === year);
      }
    }

    if (!months) {
      throw new RangeError(`Unsupported lunar year: ${year}.`);
    }

    const record = months.find(
      (item) => item.month === month && item.isLeap === Boolean(isLeap)
    );

    if (!record) {
      const suffix = isLeap ? " leap month" : " month";
      throw new RangeError(`Unsupported lunar${suffix}: ${year}-${month}.`);
    }

    return record;
  }

  // 只建立查詢索引，不修改 LunarData。
  const MONTH_INDEX = [];

  for (const item of DATA.boundaryContext.beforeRangeMonths || []) {
    MONTH_INDEX.push({
      year: item.year,
      month: item.month,
      isLeap: Boolean(item.isLeap),
      days: item.days,
      start: item.start,
      ordinal: parseGregorian(item.start).ordinal,
      boundaryOnly: true
    });
  }

  for (let year = 1901; year <= 2100; year += 1) {
    const yearRecord = DATA.years[year];
    if (!yearRecord) continue;

    for (const item of yearRecord.months) {
      MONTH_INDEX.push({
        year,
        month: item.month,
        isLeap: Boolean(item.isLeap),
        days: item.days,
        start: item.start,
        ordinal: parseGregorian(item.start).ordinal,
        boundaryOnly: false
      });
    }
  }

  MONTH_INDEX.sort((a, b) => a.ordinal - b.ordinal);

  function findMonthForGregorian(ordinal) {
    let low = 0;
    let high = MONTH_INDEX.length - 1;
    let candidate = null;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const item = MONTH_INDEX[mid];

      if (item.ordinal <= ordinal) {
        candidate = item;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    if (!candidate || ordinal >= candidate.ordinal + candidate.days) {
      throw new RangeError("No lunar month data found for this Gregorian date.");
    }

    return candidate;
  }

  function toLunar(input) {
    const gregorian = parseGregorian(input);
    assertGregorianInRange(gregorian);

    const monthRecord = findMonthForGregorian(gregorian.ordinal);
    const lunarDay = gregorian.ordinal - monthRecord.ordinal + 1;

    return Object.freeze({
      year: monthRecord.year,
      month: monthRecord.month,
      day: lunarDay,
      isLeap: monthRecord.isLeap,
      monthDays: monthRecord.days,
      gregorian: gregorian.iso,
      monthName: `${monthRecord.isLeap ? "閏" : ""}${MONTH_NAMES[monthRecord.month]}`,
      dayName: DAY_NAMES[lunarDay]
    });
  }

  function toGregorian(yearOrObject, month, day, isLeap) {
    const lunar = parseLunar(yearOrObject, month, day, isLeap);
    const monthRecord = getMonthRecord(lunar.year, lunar.month, lunar.isLeap);

    if (lunar.day > monthRecord.days) {
      throw new RangeError(
        `Invalid lunar day: ${lunar.year}-${lunar.month}${lunar.isLeap ? " (leap)" : ""} has ${monthRecord.days} days.`
      );
    }

    const ordinal = parseGregorian(monthRecord.start).ordinal + lunar.day - 1;
    const date = new Date(ordinal * 86400000);
    const iso = `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
    const gregorian = parseGregorian(iso);
    assertGregorianInRange(gregorian);

    return Object.freeze({
      year: gregorian.year,
      month: gregorian.month,
      day: gregorian.day,
      iso: gregorian.iso,
      lunarYear: lunar.year,
      lunarMonth: lunar.month,
      lunarDay: lunar.day,
      isLeap: lunar.isLeap
    });
  }

  function getLeapMonth(year) {
    return getYearRecord(Number(year)).leapMonth;
  }

  function getMonthDays(year, month, isLeap) {
    return getMonthRecord(Number(year), Number(month), Boolean(isLeap)).days;
  }

  function getYear(year) {
    const numericYear = Number(year);
    const record = getYearRecord(numericYear);

    return Object.freeze({
      year: numericYear,
      newYear: record.newYear,
      leapMonth: record.leapMonth,
      months: Object.freeze(
        record.months.map((item) => Object.freeze({
          month: item.month,
          isLeap: Boolean(item.isLeap),
          days: item.days,
          start: item.start,
          name: `${item.isLeap ? "閏" : ""}${MONTH_NAMES[item.month]}`
        }))
      )
    });
  }

  function isSupportedGregorian(input) {
    try {
      const parsed = parseGregorian(input);
      return parsed.iso >= RANGE.start && parsed.iso <= RANGE.end;
    } catch (error) {
      return false;
    }
  }

  function formatLunar(input) {
    const lunar = input && input.gregorian ? input : toLunar(input);
    return `${lunar.year}年${lunar.isLeap ? "閏" : ""}${MONTH_NAMES[lunar.month]}${DAY_NAMES[lunar.day]}`;
  }

  const Lunar = Object.freeze({
    VERSION: "1.0.0",
    DATA_VERSION: DATA.VERSION,
    supportedGregorianRange: RANGE,
    toLunar,
    toGregorian,
    getYear,
    getLeapMonth,
    getMonthDays,
    isSupportedGregorian,
    formatLunar
  });

  root.Lunar = Lunar;
})(typeof globalThis !== "undefined" ? globalThis : window);
