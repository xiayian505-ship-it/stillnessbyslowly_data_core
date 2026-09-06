/**
 * Calendar
 * 西曆年曆／月曆資料生成與整合模組
 *
 * Version: 1.0.0
 *
 * --------------------------------------------------------------------------
 * 一、目的
 * --------------------------------------------------------------------------
 *
 * Calendar 的工作不是「計算農曆」或「計算二十四節氣」。
 *
 * 它的工作是：
 * 將西曆年月日整理成穩定、可重複使用的日曆資料結構，
 * 並在既有模組存在時，整合 Lunar 與 SolarTerms 的結果，
 * 交給 HTML / UI / 其他程式自由決定如何顯示。
 *
 * 換句話說：
 *
 *   Lunar       → 回答「這一天的農曆是什麼？」
 *   SolarTerms  → 回答「這一天是不是節氣？」
 *   Calendar    → 回答「這個月／這一年有哪些日期資料？」
 *   HTML / CSS  → 回答「這些資料要長什麼樣子？」
 *
 * --------------------------------------------------------------------------
 * 二、本模組負責
 * --------------------------------------------------------------------------
 *
 * - 產生指定西曆年份的 12 個月資料
 * - 產生指定西曆月份的每日資料
 * - 計算西曆月份天數
 * - 計算每月第一天星期幾
 * - 提供每一天的 ISO 日期、年、月、日、星期
 * - 若 Lunar 已載入，整合農曆資料
 * - 若 SolarTerms 已載入，整合二十四節氣資料
 * - 驗證年份、月份與支援範圍
 *
 * --------------------------------------------------------------------------
 * 三、本模組不負責
 * --------------------------------------------------------------------------
 *
 * - 不實作農曆換算規則
 * - 不複製 lunar.js 的演算法或資料
 * - 不實作二十四節氣計算
 * - 不複製 solar_terms.js 的演算法或資料
 * - 不定義節日
 * - 不定義台灣國定假日
 * - 不定義放假日、補班日、連假或政府辦公日曆
 * - 不處理使用者行程、提醒、事件
 * - 不產生 HTML
 * - 不產生 CSS
 * - 不決定任何日曆視覺、顏色、排版或顯示文字
 *
 * Calendar 只組裝資料，不擁有底層曆法規則，也不擁有 UI。
 *
 * --------------------------------------------------------------------------
 * 四、依賴關係
 * --------------------------------------------------------------------------
 *
 * 可選依賴：
 *
 *   Lunar
 *   SolarTerms
 *
 * Calendar 本身可以只產生純西曆資料。
 *
 * 若頁面在載入 calendar.js 前已載入 Lunar，
 * 每日資料會附帶 lunar。
 *
 * 若頁面在載入 calendar.js 前已載入 SolarTerms，
 * 每日資料會附帶 solarTerm。
 *
 * 建議完整載入順序：
 *
 *   lunar_data.js
 *   lunar.js
 *   solar_terms_data.js
 *   solar_terms.js
 *   calendar.js
 *
 * Calendar 不會因為缺少 Lunar 或 SolarTerms 而自行推算其資料。
 *
 * --------------------------------------------------------------------------
 * 五、支援範圍
 * --------------------------------------------------------------------------
 *
 * Calendar 的西曆結構本身可由 JavaScript Date 處理更多年份，
 * 但本專案公開契約固定為：
 *
 *   1901-01-01 ～ 2100-12-31
 *
 * 原因是目前 Lunar 與 SolarTerms 的可信資料範圍皆為 1901–2100。
 *
 * 為避免上層誤以為超出範圍仍具有完整曆法資料，
 * Calendar 不自行擴張支援年份。
 *
 * 超出範圍時必須明確拒絕。
 *
 * --------------------------------------------------------------------------
 * 六、時間與日期原則
 * --------------------------------------------------------------------------
 *
 * 本模組處理的是「民用日期」，不是時間瞬間。
 *
 * ISO 日期固定使用：
 *
 *   YYYY-MM-DD
 *
 * 星期與月份結構使用 UTC 建構日期，
 * 避免執行環境的本地時區或 DST 造成日期偏移。
 *
 * weekday 定義：
 *
 *   0 = 星期日
 *   1 = 星期一
 *   2 = 星期二
 *   3 = 星期三
 *   4 = 星期四
 *   5 = 星期五
 *   6 = 星期六
 *
 * --------------------------------------------------------------------------
 * 七、資料結構
 * --------------------------------------------------------------------------
 *
 * Calendar.getMonth(2027, 1) 回傳概念：
 *
 * {
 *   year: 2027,
 *   month: 1,
 *   firstWeekday: 5,
 *   daysInMonth: 31,
 *   days: [
 *     {
 *       date: "2027-01-01",
 *       year: 2027,
 *       month: 1,
 *       day: 1,
 *       weekday: 5,
 *       lunar: { ... } | null,
 *       solarTerm: { ... } | null
 *     }
 *   ]
 * }
 *
 * Calendar.getYear(2027) 回傳概念：
 *
 * {
 *   year: 2027,
 *   months: [ ...12 個 month record... ]
 * }
 *
 * 注意：
 * lunar 與 solarTerm 保留底層模組提供的資料，
 * Calendar 不應擅自改寫其語意。
 *
 * --------------------------------------------------------------------------
 * 八、UI 使用原則
 * --------------------------------------------------------------------------
 *
 * UI 可以自由決定：
 *
 * - 顯示全年或單月
 * - 顯示「初一」或月份名稱
 * - 是否顯示完整農曆
 * - 是否顯示節氣
 * - 星期從星期日或星期一開始排版
 * - 手機、桌面、列印版如何布局
 *
 * 這些都不應寫進 Calendar。
 *
 * 同一份 Calendar 資料應能被不同 UI 重複使用。
 *
 * --------------------------------------------------------------------------
 * 九、維護規則
 * --------------------------------------------------------------------------
 *
 * 1. 不因 UI 需求修改底層曆法資料。
 * 2. 不因某個專案需要節日，就把節日塞進 Calendar。
 * 3. 不因缺少 Lunar / SolarTerms，就在本檔自行重寫其邏輯。
 * 4. 若底層模組 API 改版，應調整整合層，而不是複製資料。
 * 5. 新功能若屬於獨立領域，優先建立獨立模組再由 Calendar 整合。
 * 6. 支援範圍若要擴張，必須先確認底層資料的可信範圍。
 *
 * --------------------------------------------------------------------------
 * 十、設計核心
 * --------------------------------------------------------------------------
 *
 * Calendar 是「組裝層」，不是「萬用日曆大包」。
 *
 * 它的價值在於提供穩定資料結構，
 * 讓未來任何介面都可以：
 *
 *   呼叫資料 → 自己決定怎麼畫
 *
 * 而不必重新處理年月日、農曆與節氣整合。
 */

(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  const SUPPORTED_RANGE = Object.freeze({
    start: "1901-01-01",
    end: "2100-12-31",
    startYear: 1901,
    endYear: 2100
  });

  const WEEKDAY_NAMES = Object.freeze([
    "星期日",
    "星期一",
    "星期二",
    "星期三",
    "星期四",
    "星期五",
    "星期六"
  ]);

  /**
   * 確認年份是否為 Calendar 公開支援範圍。
   *
   * @param {number} year 西曆年份
   * @returns {boolean}
   */
  function isSupportedYear(year) {
    return Number.isInteger(year) &&
      year >= SUPPORTED_RANGE.startYear &&
      year <= SUPPORTED_RANGE.endYear;
  }

  /**
   * 驗證年份。
   *
   * Calendar 不允許默默超出 1901–2100。
   */
  function assertYear(year) {
    if (!Number.isInteger(year)) {
      throw new TypeError("Calendar: year 必須是整數。");
    }

    if (!isSupportedYear(year)) {
      throw new RangeError(
        "Calendar: 僅支援 " +
        SUPPORTED_RANGE.startYear +
        "–" +
        SUPPORTED_RANGE.endYear +
        "。"
      );
    }
  }

  /**
   * 驗證月份。
   */
  function assertMonth(month) {
    if (!Number.isInteger(month)) {
      throw new TypeError("Calendar: month 必須是整數。");
    }

    if (month < 1 || month > 12) {
      throw new RangeError("Calendar: month 必須介於 1–12。");
    }
  }

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  /**
   * 建立 YYYY-MM-DD。
   *
   * 此函式只負責格式化已驗證的年月日。
   */
  function toISODate(year, month, day) {
    return year + "-" + pad2(month) + "-" + pad2(day);
  }

  /**
   * 取得指定西曆月份的天數。
   *
   * 使用 UTC，避免本地時區與 DST 影響。
   *
   * @param {number} year
   * @param {number} month 1–12
   * @returns {number}
   */
  function getDaysInMonth(year, month) {
    assertYear(year);
    assertMonth(month);

    return new Date(Date.UTC(year, month, 0)).getUTCDate();
  }

  /**
   * 取得指定月份第一天的星期。
   *
   * 0 = 星期日 ... 6 = 星期六
   *
   * @param {number} year
   * @param {number} month 1–12
   * @returns {number}
   */
  function getFirstWeekday(year, month) {
    assertYear(year);
    assertMonth(month);

    return new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  }

  /**
   * 從 Lunar 取得某日農曆資料。
   *
   * Lunar 是可選依賴。
   * 若未載入，回傳 null。
   *
   * Calendar 不會自行補算農曆。
   */
  function getLunar(date) {
    if (!global.Lunar || typeof global.Lunar.toLunar !== "function") {
      return null;
    }

    return global.Lunar.toLunar(date);
  }

  /**
   * 從 SolarTerms 取得某日節氣資料。
   *
   * SolarTerms 是可選依賴。
   * 若未載入，回傳 null。
   *
   * getByDate 若回傳陣列，Calendar 保留完整陣列；
   * 若回傳單筆資料，則保留單筆。
   * 不在此層重新解釋節氣資料。
   */
  function getSolarTerm(date) {
    if (
      !global.SolarTerms ||
      typeof global.SolarTerms.getByDate !== "function"
    ) {
      return null;
    }

    const result = global.SolarTerms.getByDate(date);

    if (Array.isArray(result)) {
      if (result.length === 0) {
        return null;
      }

      if (result.length === 1) {
        return result[0];
      }

      return result.slice();
    }

    return result || null;
  }

  /**
   * 建立單日資料。
   *
   * @param {number} year
   * @param {number} month
   * @param {number} day
   * @returns {Object}
   */
  function createDay(year, month, day) {
    assertYear(year);
    assertMonth(month);

    const maxDay = getDaysInMonth(year, month);

    if (!Number.isInteger(day)) {
      throw new TypeError("Calendar: day 必須是整數。");
    }

    if (day < 1 || day > maxDay) {
      throw new RangeError(
        "Calendar: " + year + "-" + pad2(month) +
        " 的日期必須介於 1–" + maxDay + "。"
      );
    }

    const date = toISODate(year, month, day);
    const weekday = new Date(
      Date.UTC(year, month - 1, day)
    ).getUTCDay();

    return Object.freeze({
      date: date,
      year: year,
      month: month,
      day: day,
      weekday: weekday,
      weekdayName: WEEKDAY_NAMES[weekday],
      lunar: getLunar(date),
      solarTerm: getSolarTerm(date)
    });
  }

  /**
   * 取得指定月份的完整日曆資料。
   *
   * @param {number} year 西曆年份
   * @param {number} month 西曆月份，1–12
   * @returns {Object}
   *
   * 回傳：
   * {
   *   year,
   *   month,
   *   firstWeekday,
   *   daysInMonth,
   *   days
   * }
   *
   * firstWeekday 可由 UI 用來決定月曆前方需要幾個空格。
   * Calendar 本身不產生那些 UI 空格。
   */
  function getMonth(year, month) {
    assertYear(year);
    assertMonth(month);

    const count = getDaysInMonth(year, month);
    const days = [];

    for (let day = 1; day <= count; day += 1) {
      days.push(createDay(year, month, day));
    }

    return Object.freeze({
      year: year,
      month: month,
      firstWeekday: getFirstWeekday(year, month),
      daysInMonth: count,
      days: Object.freeze(days)
    });
  }

  /**
   * 取得指定年份的完整日曆資料。
   *
   * @param {number} year 西曆年份
   * @returns {Object}
   *
   * 回傳：
   * {
   *   year,
   *   months: [12 個 month record]
   * }
   *
   * 此函式只生成資料，不建立任何 HTML。
   */
  function getYear(year) {
    assertYear(year);

    const months = [];

    for (let month = 1; month <= 12; month += 1) {
      months.push(getMonth(year, month));
    }

    return Object.freeze({
      year: year,
      months: Object.freeze(months)
    });
  }

  /**
   * 公開 API
   *
   * API 保持小而明確。
   * 若未來需要節日、假日、事件等功能，
   * 應先判斷是否屬於另一個獨立模組，
   * 不要直接把 Calendar 擴張成所有日期功能的集合。
   */
  const Calendar = Object.freeze({
    VERSION: VERSION,
    SUPPORTED_RANGE: SUPPORTED_RANGE,
    WEEKDAY_NAMES: WEEKDAY_NAMES,

    isSupportedYear: isSupportedYear,
    getDaysInMonth: getDaysInMonth,
    getFirstWeekday: getFirstWeekday,
    createDay: createDay,
    getMonth: getMonth,
    getYear: getYear
  });

  global.Calendar = Calendar;

})(typeof window !== "undefined" ? window : globalThis);
