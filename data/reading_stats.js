// reading_stats.js
// 慢慢的倉庫｜Data｜Reading Stats 1.0.0
// 通用文章字數與閱讀時間估算核心。
// 預設忽略空白與換行，保留標點；閱讀速度預設為每分鐘 1200 字。
// 不綁 DOM、不綁 UI、不負責顯示格式。
(function (global) {
  "use strict";

  const VERSION = "1.0.0";
  const DEFAULT_CHARACTERS_PER_MINUTE = 1200;

  function positiveNumber(value, name) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      throw new TypeError(name + " must be a finite number.");
    }

    if (number <= 0) {
      throw new RangeError(name + " must be > 0.");
    }

    return number;
  }

  function count(value) {
    const text = String(value == null ? "" : value)
      .replace(/\s+/g, "");

    return Array.from(text).length;
  }

  function estimateMinutes(characterCount, options = {}) {
    const characters = Number(characterCount);

    if (!Number.isFinite(characters)) {
      throw new TypeError("characterCount must be a finite number.");
    }

    if (characters < 0) {
      throw new RangeError("characterCount must be >= 0.");
    }

    const charactersPerMinute = options.charactersPerMinute === undefined
      ? DEFAULT_CHARACTERS_PER_MINUTE
      : positiveNumber(options.charactersPerMinute, "charactersPerMinute");

    if (characters === 0) return 0;

    return Math.ceil(characters / charactersPerMinute);
  }

  function summarize(value, options = {}) {
    const characters = count(value);
    const charactersPerMinute = options.charactersPerMinute === undefined
      ? DEFAULT_CHARACTERS_PER_MINUTE
      : positiveNumber(options.charactersPerMinute, "charactersPerMinute");
    const minutes = estimateMinutes(characters, { charactersPerMinute });

    return Object.freeze({
      characters,
      minutes,
      charactersPerMinute
    });
  }

  global.ReadingStats = Object.freeze({
    version: VERSION,
    defaultCharactersPerMinute: DEFAULT_CHARACTERS_PER_MINUTE,
    count,
    estimateMinutes,
    summarize
  });

})(typeof window !== "undefined" ? window : globalThis);
