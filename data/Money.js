"use strict";

/* =========================================================
   慢慢的倉庫｜Money v1.0.0
   通用金額與數值工具：
   - 加總
   - 四捨五入
   - 正規化數字
   - 格式化金額 / 數字
========================================================= */

(function(global){
  function toNumber(value, fallback = 0){
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function roundTo(value, digits = 2){
    const number = Number(value);
    const precision = Number(digits);

    if(!Number.isFinite(number)) return NaN;
    if(!Number.isInteger(precision) || precision < 0){
      throw new RangeError("digits must be a non-negative integer");
    }

    const factor = 10 ** precision;
    return Math.round((number + Number.EPSILON) * factor) / factor;
  }

  function cleanNumber(value){
    const number = Number(value);
    if(!Number.isFinite(number)) return "";
    return String(number);
  }

  function sum(items, selector){
    if(!Array.isArray(items)) return 0;

    return items.reduce((total, item, index) => {
      let value;

      if(typeof selector === "function"){
        value = selector(item, index);
      }else if(typeof selector === "string" && selector){
        value = item?.[selector];
      }else{
        value = item;
      }

      const number = Number(value);
      return total + (Number.isFinite(number) ? number : 0);
    }, 0);
  }

  function formatNumber(value, {
    locale = "zh-TW",
    minimumFractionDigits = 0,
    maximumFractionDigits = 2
  } = {}){
    const number = toNumber(value, 0);

    return new Intl.NumberFormat(locale, {
      minimumFractionDigits,
      maximumFractionDigits
    }).format(number);
  }

  function formatMoney(value, currency = "TWD", options = {}){
    const {
      locale = "zh-TW",
      prefixCurrency = true,
      minimumFractionDigits = 0,
      maximumFractionDigits =
        currency === "TWD" || currency === "JPY" ? 2 : 4
    } = options;

    const formatted = formatNumber(value, {
      locale,
      minimumFractionDigits,
      maximumFractionDigits
    });

    return prefixCurrency ? `${currency} ${formatted}` : formatted;
  }

  global.Money = Object.freeze({
    version: "1.0.0",
    toNumber,
    roundTo,
    cleanNumber,
    sum,
    formatNumber,
    formatMoney
  });
})(window);