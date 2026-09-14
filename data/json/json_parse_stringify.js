/* Slowly Library | JSON Parse / Stringify
 * 通用 JSON 解析與輸出核心。
 * 提供 BOM 處理、輸入正規化與一致錯誤結果。
 * 不負責檔案讀取、DOM、Viewer、Storage 或 Schema 驗證。
 */
(function (global) {
  "use strict";

  function normalizeText(input) {
    if (typeof input !== "string") {
      throw new TypeError("JSON 輸入必須是字串。");
    }

    return input.charCodeAt(0) === 0xFEFF
      ? input.slice(1)
      : input;
  }

  function parse(input, options) {
    const settings = options || {};
    const text = normalizeText(input);

    try {
      const value = JSON.parse(text, settings.reviver);

      if (settings.safe === true) {
        return {
          ok: true,
          value,
          error: null
        };
      }

      return value;
    } catch (error) {
      if (settings.safe === true) {
        return {
          ok: false,
          value: undefined,
          error: {
            name: error && error.name ? error.name : "SyntaxError",
            message: error && error.message ? error.message : "JSON 解析失敗。"
          }
        };
      }

      throw error;
    }
  }

  function stringify(value, options) {
    const settings = options || {};
    const space = settings.space === undefined ? 2 : settings.space;

    try {
      const text = JSON.stringify(value, settings.replacer, space);

      if (text === undefined) {
        const error = new TypeError("此值無法轉換為 JSON 字串。");

        if (settings.safe === true) {
          return {
            ok: false,
            value: undefined,
            error: {
              name: error.name,
              message: error.message
            }
          };
        }

        throw error;
      }

      if (settings.safe === true) {
        return {
          ok: true,
          value: text,
          error: null
        };
      }

      return text;
    } catch (error) {
      if (settings.safe === true) {
        return {
          ok: false,
          value: undefined,
          error: {
            name: error && error.name ? error.name : "TypeError",
            message: error && error.message ? error.message : "JSON 輸出失敗。"
          }
        };
      }

      throw error;
    }
  }

  global.SlowlyJSON = Object.freeze({
    parse,
    stringify,
    normalizeText
  });
})(window);
