/* 慢慢的倉庫｜Data / File｜Filename Sanitize v1.0.0
   將任意文字整理成較安全的檔名。
   處理常見不可用字元、頭尾空白與 fallback。
   不負責副檔名、不下載檔案、不碰 DOM。
*/
(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function sanitize(value, options = {}) {
    const replacement =
      options.replacement === undefined
        ? "_"
        : String(options.replacement);

    const fallback =
      options.fallback === undefined
        ? "file"
        : String(options.fallback);

    let result = String(value ?? "")
      .replace(/[\\/:*?"<>|]/g, replacement)
      .trim();

    if (options.trimTrailingDots !== false) {
      result = result.replace(/[. ]+$/g, "");
    }

    if (!result) {
      result = fallback;
    }

    if (
      options.maxLength !== undefined &&
      Number.isInteger(Number(options.maxLength)) &&
      Number(options.maxLength) > 0
    ) {
      result = [...result]
        .slice(0, Number(options.maxLength))
        .join("");
    }

    return result || fallback;
  }

  global.FilenameSanitize = Object.freeze({
    version: VERSION,
    sanitize
  });

})(typeof window !== "undefined" ? window : globalThis);
