// tag_parser.js
// 慢慢的倉庫｜Data｜Tag Parser 1.0.0
// 通用標籤字串解析與標準化。
// 支援 #tag、半形／全形逗號、空白分隔、去空值與去重複。
// 不綁 UI、不綁資料儲存、不綁特定內容類型。
(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function cleanTag(value, options = {}) {
    let tag = String(value == null ? "" : value).trim();

    if (options.stripHash !== false) {
      tag = tag.replace(/^#+/, "");
    }

    if (options.trim !== false) {
      tag = tag.trim();
    }

    return tag;
  }

  function normalize(values, options = {}) {
    const input = Array.isArray(values) ? values : [];
    const seen = new Set();
    const result = [];

    for (const value of input) {
      const tag = cleanTag(value, options);

      if (!tag) continue;

      const key = options.caseSensitive === false
        ? tag.toLocaleLowerCase()
        : tag;

      if (options.unique !== false) {
        if (seen.has(key)) continue;
        seen.add(key);
      }

      result.push(tag);
    }

    return Object.freeze(result);
  }

  function parse(value, options = {}) {
    const text = String(value == null ? "" : value);

    const separator = options.separator instanceof RegExp
      ? options.separator
      : /[\s,，]+/;

    return normalize(
      text.split(separator),
      options
    );
  }

  global.TagParser = Object.freeze({
    version: VERSION,
    parse,
    normalize
  });

})(typeof window !== "undefined" ? window : globalThis);
