/*
 * Grid Row Push 1.0.0｜慢慢軍火庫
 * 將規則矩形格子全體向下推一列；插入宿主提供的頂列，回報底列溢位。
 * 純資料計算，不修改原陣列、不選色、不決定 Game Over。
 * API: window.SlowlyGridRowPush.push_down(grid, new_row, options)
 */
(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function push_down(grid, new_row, options = {}) {
    if (!Array.isArray(grid) || !grid.every(Array.isArray)) {
      throw new TypeError("grid 必須是二維列陣列。");
    }
    if (!Array.isArray(new_row)) {
      throw new TypeError("new_row 必須是陣列。");
    }
    if (!options || typeof options !== "object" || Array.isArray(options)) {
      throw new TypeError("options 必須是物件。");
    }

    const height = grid.length;
    const width = height > 0 ? grid[0].length : 0;
    if (grid.some(function (row) { return row.length !== width; })) {
      throw new RangeError("grid 必須是每一列長度相同的矩形。");
    }
    if (new_row.length !== width) {
      throw new RangeError("new_row 長度必須與 grid 寬度相同；空 grid 只能配空 new_row。");
    }

    const is_empty = options.is_empty === undefined
      ? function (cell) { return cell === null || cell === undefined; }
      : options.is_empty;
    const clone_cell = options.clone_cell === undefined
      ? function (cell) { return cell; }
      : options.clone_cell;
    if (typeof is_empty !== "function") {
      throw new TypeError("is_empty 必須是函式。");
    }
    if (typeof clone_cell !== "function") {
      throw new TypeError("clone_cell 必須是函式。");
    }

    // 預設只複製列陣列，不深拷貝單格物件；如需巢狀資料隔離，宿主必須提供 clone_cell。
    const copy_row = function (row) {
      return row.map(function (cell) { return clone_cell(cell); });
    };

    if (height === 0) {
      return { grid: [], overflow: [], overflow_occupied: false, shifted_rows: 0 };
    }

    // 僅在舊底列評估溢位；0、false、空字串預設都視為佔用格。
    const original_overflow = grid[height - 1];
    const overflow_occupied = original_overflow.some(function (cell, index) {
      return !is_empty(cell, index, height - 1);
    });
    const overflow = copy_row(original_overflow);
    const next_grid = [copy_row(new_row)];

    for (let row_index = 1; row_index < height; row_index += 1) {
      next_grid.push(copy_row(grid[row_index - 1]));
    }

    return {
      grid: next_grid,
      overflow,
      overflow_occupied,
      shifted_rows: height - 1
    };
  }

  global.SlowlyGridRowPush = Object.freeze({ version: VERSION, push_down });
})(typeof window !== "undefined" ? window : globalThis);
