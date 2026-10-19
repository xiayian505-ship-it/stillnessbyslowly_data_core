/* 慢慢軍火庫｜Hex Grid Geometry 1.0.0
 * 來源：泡泡龍 center / neighbors，row-offset 奇偶列水平交錯排列。
 * 單位：radius 對應圓泡泡半徑；水平間距 2r，垂直間距 √3r。
 * odd_row_offset=true 時奇數列向右移動一個半徑；false 時偶數列移動。
 */
(function (global) {
  "use strict";

  function settings(options = {}) {
    const { rows, columns, radius } = options;
    if (!Number.isInteger(rows) || rows <= 0 || !Number.isInteger(columns) || columns <= 0) {
      throw new RangeError("rows and columns must be positive integers.");
    }
    if (typeof radius !== "number" || !Number.isFinite(radius) || radius <= 0) {
      throw new RangeError("radius must be a finite positive number.");
    }
    return { rows, columns, radius, odd_row_offset: options.odd_row_offset !== false,
      origin_x: options.origin_x ?? radius, origin_y: options.origin_y ?? radius };
  }

  function point(position) {
    if (!position || !Number.isInteger(position.r) || !Number.isInteger(position.c)) {
      throw new TypeError("position must contain integer r and c.");
    }
    return position;
  }

  function in_bounds(position, options = {}) {
    const cell = point(position);
    const config = settings(options);
    return cell.r >= 0 && cell.r < config.rows && cell.c >= 0 && cell.c < config.columns;
  }

  function cell_center(position, options = {}) {
    const cell = point(position);
    const config = settings(options);
    if (!in_bounds(cell, options)) throw new RangeError("position is outside the hex grid.");
    if (![config.origin_x, config.origin_y].every(v => typeof v === "number" && Number.isFinite(v))) {
      throw new TypeError("origin coordinates must be finite numbers.");
    }
    const is_offset_row = (cell.r % 2 === 1) === config.odd_row_offset;
    return Object.freeze({
      x: config.origin_x + cell.c * config.radius * 2 + (is_offset_row ? config.radius : 0),
      y: config.origin_y + cell.r * Math.sqrt(3) * config.radius
    });
  }

  function neighbors(position, options = {}) {
    const cell = point(position);
    const config = settings(options);
    if (!in_bounds(cell, options)) return [];
    const offset_row = (cell.r % 2 === 1) === config.odd_row_offset;
    const diagonal_columns = offset_row ? [cell.c, cell.c + 1] : [cell.c - 1, cell.c];
    const candidates = [
      { r: cell.r, c: cell.c - 1 },
      { r: cell.r, c: cell.c + 1 },
      { r: cell.r - 1, c: diagonal_columns[0] },
      { r: cell.r - 1, c: diagonal_columns[1] },
      { r: cell.r + 1, c: diagonal_columns[0] },
      { r: cell.r + 1, c: diagonal_columns[1] }
    ];
    return candidates.filter(candidate => in_bounds(candidate, options));
  }

  global.SlowlyHexGridGeometry = Object.freeze({ version: "1.0.0", in_bounds, cell_center, neighbors });
})(window);
