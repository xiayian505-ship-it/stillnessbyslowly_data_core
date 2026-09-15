"use strict";

/* =========================================================
   慢慢的倉庫｜Grid Line Match v1.0.0

   通用二維格狀連線掃描核心。

   API：
   - SlowlyGridLineMatch.find(grid, options?)

   options：
   - minLength: 最短連線長度，預設 3
   - getValue(cell, r, c): 取得比對值，預設回傳 cell
   - isBlocked(cell, r, c): 是否中斷連線，預設 false
   - equals(a, b): 值是否相同，預設 Object.is

   回傳：
   {
     groups: [
       {
         type: "h" | "v",
         len: Number,
         value: any,
         cells: [{ r, c }, ...]
       }
     ]
   }

   不負責：
   - DOM / Render
   - 交換是否合法
   - 特殊物件建立
   - 消除、掉落、補格
   - 分數、Combo、提示
========================================================= */
(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function validateGrid(grid) {
    if (!Array.isArray(grid)) {
      throw new TypeError("[SlowlyGridLineMatch] grid must be an array.");
    }

    if (grid.length === 0) {
      return { rows: 0, cols: 0 };
    }

    if (!Array.isArray(grid[0])) {
      throw new TypeError("[SlowlyGridLineMatch] grid rows must be arrays.");
    }

    const cols = grid[0].length;

    for (let r = 0; r < grid.length; r += 1) {
      if (!Array.isArray(grid[r]) || grid[r].length !== cols) {
        throw new TypeError("[SlowlyGridLineMatch] grid must be rectangular.");
      }
    }

    return {
      rows: grid.length,
      cols
    };
  }

  function normalizeOptions(options = {}) {
    const rawMinLength = Number(options.minLength);

    return {
      minLength: Number.isFinite(rawMinLength)
        ? Math.max(2, Math.floor(rawMinLength))
        : 3,
      getValue: typeof options.getValue === "function"
        ? options.getValue
        : (cell) => cell,
      isBlocked: typeof options.isBlocked === "function"
        ? options.isBlocked
        : () => false,
      equals: typeof options.equals === "function"
        ? options.equals
        : Object.is
    };
  }

  function find(grid, options = {}) {
    const { rows, cols } = validateGrid(grid);
    const settings = normalizeOptions(options);
    const groups = [];

    function read(r, c) {
      const cell = grid[r][c];

      return {
        cell,
        blocked: Boolean(settings.isBlocked(cell, r, c)),
        value: settings.getValue(cell, r, c)
      };
    }

    for (let r = 0; r < rows; r += 1) {
      let c = 0;

      while (c < cols) {
        const start = read(r, c);

        if (start.blocked) {
          c += 1;
          continue;
        }

        let end = c + 1;

        while (end < cols) {
          const next = read(r, end);

          if (
            next.blocked ||
            !settings.equals(start.value, next.value)
          ) {
            break;
          }

          end += 1;
        }

        const len = end - c;

        if (len >= settings.minLength) {
          const cells = [];

          for (let x = c; x < end; x += 1) {
            cells.push({ r, c: x });
          }

          groups.push({
            type: "h",
            len,
            value: start.value,
            cells
          });
        }

        c = end;
      }
    }

    for (let c = 0; c < cols; c += 1) {
      let r = 0;

      while (r < rows) {
        const start = read(r, c);

        if (start.blocked) {
          r += 1;
          continue;
        }

        let end = r + 1;

        while (end < rows) {
          const next = read(end, c);

          if (
            next.blocked ||
            !settings.equals(start.value, next.value)
          ) {
            break;
          }

          end += 1;
        }

        const len = end - r;

        if (len >= settings.minLength) {
          const cells = [];

          for (let x = r; x < end; x += 1) {
            cells.push({ r: x, c });
          }

          groups.push({
            type: "v",
            len,
            value: start.value,
            cells
          });
        }

        r = end;
      }
    }

    return { groups };
  }

  global.SlowlyGridLineMatch = Object.freeze({
    version: VERSION,
    find
  });
})(window);
