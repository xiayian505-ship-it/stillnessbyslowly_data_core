// next_sequence.js
// 慢慢的倉庫｜Data｜Next Sequence 1.0.0
// 從既有數值或帶前綴的序號字串中找出下一個整數序號。
// 不儲存 counter、不產生 ID、不修改資料，也不決定前綴格式。
(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function parseSequence(value, prefix = "") {
    if (typeof value === "number") {
      return Number.isInteger(value) && value >= 0 ? value : null;
    }

    const text = String(value == null ? "" : value).trim();
    if (!text) return null;

    if (prefix && !text.startsWith(prefix)) {
      return null;
    }

    const body = prefix ? text.slice(prefix.length) : text;
    if (!/^\d+$/.test(body)) return null;

    const number = Number(body);
    return Number.isSafeInteger(number) ? number : null;
  }

  function next(values, options = {}) {
    if (!Array.isArray(values)) {
      throw new TypeError("NextSequence.next: values 必須是陣列。");
    }

    const start = Number.isInteger(options.start) && options.start >= 0
      ? options.start
      : 1;
    const prefix = String(options.prefix || "");
    const getValue = typeof options.getValue === "function"
      ? options.getValue
      : value => value;

    let max = start - 1;

    for (let index = 0; index < values.length; index += 1) {
      const raw = getValue(values[index], index);
      const sequence = parseSequence(raw, prefix);

      if (sequence !== null && sequence > max) {
        max = sequence;
      }
    }

    return Math.max(start, max + 1);
  }

  global.NextSequence = Object.freeze({
    version: VERSION,
    parse: parseSequence,
    next
  });

})(typeof window !== "undefined" ? window : globalThis);
