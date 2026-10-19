/* 慢慢軍火庫｜Grid Occupancy 1.0.0
 * 來源：推箱子的 inBounds / isWall / hasBox / canStand。
 * 只查詢矩形格子的邊界、障礙物與動態佔位；不移動也不修改宿主地圖。
 */
(function (global) {
  "use strict";

  function dimensions(options) {
    const rows = options.rows;
    const columns = options.columns;
    if (!Number.isInteger(rows) || rows <= 0 || !Number.isInteger(columns) || columns <= 0) {
      throw new RangeError("rows and columns must be positive integers.");
    }
    for (const property of ["is_blocked", "is_occupied"]) {
      if (options[property] !== undefined && typeof options[property] !== "function") {
        throw new TypeError(property + " must be a function.");
      }
    }
    return { rows, columns };
  }

  function position_of(position) {
    if (!position || !Number.isInteger(position.r) || !Number.isInteger(position.c)) {
      throw new TypeError("position must contain integer r and c.");
    }
    return { r: position.r, c: position.c };
  }

  function inspect(position, options = {}) {
    const { rows, columns } = dimensions(options);
    const cell = position_of(position);
    const in_bounds = cell.r >= 0 && cell.r < rows && cell.c >= 0 && cell.c < columns;
    const blocked = in_bounds && Boolean(options.is_blocked?.(cell));
    const occupied = in_bounds && Boolean(options.is_occupied?.(cell));
    return Object.freeze({
      in_bounds,
      blocked,
      occupied,
      can_enter: in_bounds && !blocked && !occupied
    });
  }

  function can_enter(position, options = {}) {
    return inspect(position, options).can_enter;
  }

  global.SlowlyGridOccupancy = Object.freeze({ version: "1.0.0", inspect, can_enter });
})(window);
