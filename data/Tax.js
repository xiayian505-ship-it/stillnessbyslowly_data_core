/* 慢慢的倉庫｜Tax
 * 通用含稅金額拆分核心。
 *
 * 計算模型：
 *   未稅金額 = 含稅金額 / (1 + 稅率)
 *   稅額     = 含稅金額 - 未稅金額
 *
 * 例如稅率 5%：
 *   1 + 5 / 100 = 1.05
 *
 * 注意：
 * 本模組只實作「單一百分比稅率」的含稅反推模型，
 * 不代表所有國家、地區或稅制的計算與取整規則皆適用。
 */
(function (global) {
  "use strict";

  function toNumber(value, name) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      throw new TypeError(`${name} 必須是有效數字。`);
    }

    return number;
  }

  function round(value, digits) {
    const safeDigits = Number.isInteger(digits) ? digits : 0;
    const factor = 10 ** safeDigits;
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }

  /**
   * 將含稅金額拆分為未稅金額與稅額。
   *
   * @param {number|string} total 含稅金額
   * @param {number|string} ratePercent 稅率百分比，例如 5 代表 5%
   * @param {Object} [options]
   * @param {number} [options.digits=0] 未稅金額四捨五入的小數位數
   * @returns {{ total:number, rate:number, sales:number, tax:number }}
   */
  function splitInclusive(total, ratePercent, options) {
    const amount = toNumber(total, "total");
    const rate = toNumber(ratePercent, "ratePercent");
    const opts = options || {};
    const digits = Number.isInteger(opts.digits) ? opts.digits : 0;

    if (amount < 0) {
      throw new RangeError("total 不可小於 0。");
    }

    if (rate < 0) {
      throw new RangeError("ratePercent 不可小於 0。");
    }

    const divisor = 1 + rate / 100;

    if (divisor <= 0) {
      throw new RangeError("稅率造成無效的除數。");
    }

    const sales = round(amount / divisor, digits);
    const tax = round(amount - sales, digits);

    return {
      total: amount,
      rate,
      sales,
      tax
    };
  }

  global.SlowlyTax = Object.freeze({
    splitInclusive
  });
})(window);
