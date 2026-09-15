/* 慢慢的倉庫｜Data｜Numeric Text v1.0.0
   從任意文字中擷取正負整數／小數，並提供加總摘要。
   不綁貨幣、不綁 DOM、不負責分組。
*/
(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  const NUMBER_PATTERN =
    /[-+]?(?:(?:\d{1,3}(?:,\d{3})+)|\d+)(?:\.\d+)?|[-+]?\.\d+/g;

  function extract(value) {
    const text = String(value ?? "");
    const matches = text.match(NUMBER_PATTERN) || [];

    return Object.freeze(
      matches
        .map(item => Number(item.replaceAll(",", "")))
        .filter(Number.isFinite)
    );
  }

  function sum(value) {
    return extract(value).reduce(
      (total, number) => total + number,
      0
    );
  }

  function summarize(value) {
    const numbers = extract(value);
    const total = numbers.reduce(
      (result, number) => result + number,
      0
    );

    return Object.freeze({
      numbers,
      count: numbers.length,
      total
    });
  }

  global.NumericText = Object.freeze({
    version: VERSION,
    extract,
    sum,
    summarize
  });

})(typeof window !== "undefined" ? window : globalThis);
