"use strict";

/* =========================================================
   慢慢的倉庫｜Grid Gravity v1.0.0

   通用二維格狀向下重力核心。

   API：
   - SlowlyGridGravity.down(grid, options?)

   options：
   - isEmpty(cell, r, c): 判斷格子是否為空，預設 cell == null
   - createCell(r, c, grid): 補入新格子的 factory；未提供時補 null

   行為：
   - 逐欄將非空格子向下壓實
   - 保留同欄格子的原始上下順序
   - 可由宿主決定空格判定與新格子內容
   - 原地修改 grid，並回傳同一個 grid 與統計

   不負責：
   - DOM / Render / 動畫
   - 隨機規則
   - 配對 / 消除 / Combo
   - 特殊格子語意
   - 障礙物 / 固定牆規則
========================================================= */
(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function validateGrid(grid) {
    if (!Array.isArray(grid)) {
      throw new TypeError("[SlowlyGridGravity] grid must be an array.");
    }

    if (grid.length === 0) {
      return { rows: 0, cols: 0 };
    }

    if (!Array.isArray(grid[0])) {
      throw new TypeError("[SlowlyGridGravity] grid rows must be arrays.");
    }

    const cols = grid[0].length;

    for (let r = 0; r < grid.length; r += 1) {
      if (!Array.isArray(grid[r]) || grid[r].length !== cols) {
        throw new TypeError("[SlowlyGridGravity] grid must be rectangular.");
      }
    }

    return {
      rows: grid.length,
      cols
    };
  }

  function normalizeOptions(options = {}) {
    return {
      isEmpty: typeof options.isEmpty === "function"
        ? options.isEmpty
        : (cell) => cell == null,
      createCell: typeof options.createCell === "function"
        ? options.createCell
        : null
    };
  }

  function down(grid, options = {}) {
    const { rows, cols } = validateGrid(grid);
    const settings = normalizeOptions(options);

    let moved = 0;
    let filled = 0;

    for (let c = 0; c < cols; c += 1) {
      const kept = [];

      for (let r = rows - 1; r >= 0; r -= 1) {
        const cell = grid[r][c];

        if (!settings.isEmpty(cell, r, c)) {
          kept.push({
            cell,
            fromRow: r
          });
        }
      }

      let targetRow = rows - 1;

      for (const item of kept) {
        grid[targetRow][c] = item.cell;

        if (item.fromRow !== targetRow) {
          moved += 1;
        }

        targetRow -= 1;
      }

      for (let r = 0; r <= targetRow; r += 1) {
        if (settings.createCell) {
          grid[r][c] = settings.createCell(r, c, grid);
          filled += 1;
        } else {
          grid[r][c] = null;
        }
      }
    }

    return {
      grid,
      moved,
      filled
    };
  }

  global.SlowlyGridGravity = Object.freeze({
    version: VERSION,
    down
  });
})(window);
