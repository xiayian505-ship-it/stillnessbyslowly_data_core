/* Slowly Library | CSV Parse / Stringify
 * 通用 CSV 解析與輸出核心。
 * 支援 BOM、引號、欄位內逗號、換行、雙引號跳脫、header/object 轉換。
 * 不負責檔案讀取、DOM、下載、Schema 驗證或資料儲存。
 */
(function (global) {
  "use strict";

  function normalizeText(input) {
    if (typeof input !== "string") {
      throw new TypeError("CSV 輸入必須是字串。");
    }

    return input.charCodeAt(0) === 0xFEFF
      ? input.slice(1)
      : input;
  }

  function parseRows(input, options) {
    const settings = options || {};
    const delimiter = settings.delimiter === undefined ? "," : String(settings.delimiter);

    if (delimiter.length !== 1) {
      throw new TypeError("delimiter 必須是單一字元。");
    }

    const text = normalizeText(input);
    const rows = [];
    let row = [];
    let field = "";
    let index = 0;
    let inQuotes = false;

    while (index < text.length) {
      const char = text[index];

      if (inQuotes) {
        if (char === '"') {
          if (text[index + 1] === '"') {
            field += '"';
            index += 2;
            continue;
          }

          inQuotes = false;
          index += 1;
          continue;
        }

        field += char;
        index += 1;
        continue;
      }

      if (char === '"') {
        if (field.length !== 0) {
          throw new SyntaxError("CSV 欄位中的引號位置不合法。");
        }

        inQuotes = true;
        index += 1;
        continue;
      }

      if (char === delimiter) {
        row.push(field);
        field = "";
        index += 1;
        continue;
      }

      if (char === "\r" || char === "\n") {
        row.push(field);
        field = "";

        rows.push(row);
        row = [];

        if (char === "\r" && text[index + 1] === "\n") {
          index += 2;
        } else {
          index += 1;
        }

        continue;
      }

      field += char;
      index += 1;
    }

    if (inQuotes) {
      throw new SyntaxError("CSV 引號欄位未正確結束。");
    }

    if (field.length > 0 || row.length > 0 || text.length === 0) {
      row.push(field);
      rows.push(row);
    }

    if (settings.skipEmptyLines === true) {
      return rows.filter(function (currentRow) {
        return currentRow.some(function (value) {
          return value !== "";
        });
      });
    }

    return rows;
  }

  function rowsToObjects(rows, options) {
    const settings = options || {};

    if (!Array.isArray(rows)) {
      throw new TypeError("rows 必須是陣列。");
    }

    if (rows.length === 0) {
      return [];
    }

    const headers = Array.isArray(settings.headers)
      ? settings.headers.map(String)
      : rows[0].map(String);

    const dataRows = Array.isArray(settings.headers)
      ? rows
      : rows.slice(1);

    return dataRows.map(function (row) {
      const object = {};

      headers.forEach(function (header, index) {
        object[header] = row[index] === undefined ? "" : row[index];
      });

      return object;
    });
  }

  function parse(input, options) {
    const settings = options || {};

    try {
      const rows = parseRows(input, settings);
      const value = settings.header === true
        ? rowsToObjects(rows, settings)
        : rows;

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
            name: error && error.name ? error.name : "Error",
            message: error && error.message ? error.message : "CSV 解析失敗。"
          }
        };
      }

      throw error;
    }
  }

  function escapeField(value, delimiter) {
    const text = value === null || value === undefined
      ? ""
      : String(value);

    const mustQuote =
      text.includes(delimiter) ||
      text.includes('"') ||
      text.includes("\n") ||
      text.includes("\r");

    if (!mustQuote) {
      return text;
    }

    return '"' + text.replace(/"/g, '""') + '"';
  }

  function objectsToRows(data, options) {
    const settings = options || {};

    if (!Array.isArray(data)) {
      throw new TypeError("data 必須是陣列。");
    }

    if (data.length === 0) {
      return {
        headers: Array.isArray(settings.headers) ? settings.headers.map(String) : [],
        rows: []
      };
    }

    const headers = Array.isArray(settings.headers)
      ? settings.headers.map(String)
      : Array.from(
          data.reduce(function (set, item) {
            if (item === null || typeof item !== "object" || Array.isArray(item)) {
              throw new TypeError("object 模式中的每筆資料都必須是一般物件。");
            }

            Object.keys(item).forEach(function (key) {
              set.add(key);
            });

            return set;
          }, new Set())
        );

    const rows = data.map(function (item) {
      return headers.map(function (header) {
        return item[header] === undefined ? "" : item[header];
      });
    });

    return {
      headers,
      rows
    };
  }

  function stringify(data, options) {
    const settings = options || {};
    const delimiter = settings.delimiter === undefined ? "," : String(settings.delimiter);
    const newline = settings.newline === undefined ? "\r\n" : String(settings.newline);

    if (delimiter.length !== 1) {
      throw new TypeError("delimiter 必須是單一字元。");
    }

    try {
      let rows;

      if (settings.header === true) {
        const converted = objectsToRows(data, settings);
        rows = [converted.headers].concat(converted.rows);
      } else {
        if (!Array.isArray(data)) {
          throw new TypeError("data 必須是二維陣列。");
        }

        rows = data.map(function (row) {
          if (!Array.isArray(row)) {
            throw new TypeError("data 必須是二維陣列。");
          }
          return row;
        });
      }

      const text = rows
        .map(function (row) {
          return row
            .map(function (value) {
              return escapeField(value, delimiter);
            })
            .join(delimiter);
        })
        .join(newline);

      const output = settings.bom === true ? "\uFEFF" + text : text;

      if (settings.safe === true) {
        return {
          ok: true,
          value: output,
          error: null
        };
      }

      return output;
    } catch (error) {
      if (settings.safe === true) {
        return {
          ok: false,
          value: undefined,
          error: {
            name: error && error.name ? error.name : "Error",
            message: error && error.message ? error.message : "CSV 輸出失敗。"
          }
        };
      }

      throw error;
    }
  }

  global.SlowlyCSV = Object.freeze({
    parse,
    stringify,
    parseRows,
    rowsToObjects,
    objectsToRows,
    normalizeText
  });
})(window);
