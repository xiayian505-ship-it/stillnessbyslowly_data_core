/* 慢慢軍火庫｜Hex Cell Attachment 1.0.0
 * 來源：泡泡龍的 attachNextTo / attachAtTop / placeBest。
 * 幾何與六鄰接全部使用 SlowlyHexGridGeometry；不更動 grid。
 */
(function (global) {
  "use strict";

  function find_attachment(options = {}) {
    const geometry = global.SlowlyHexGridGeometry;
    if (!geometry?.cell_center || !geometry?.neighbors) {
      throw new Error("SlowlyHexGridGeometry is required.");
    }
    const grid = options.grid;
    if (!Array.isArray(grid) || grid.length === 0 || !Array.isArray(grid[0]) || grid[0].length === 0 ||
        grid.some(row => !Array.isArray(row) || row.length !== grid[0].length)) {
      throw new TypeError("grid must be a non-empty rectangular array.");
    }
    const point = options.point;
    if (!point || typeof point.x !== "number" || !Number.isFinite(point.x) ||
        typeof point.y !== "number" || !Number.isFinite(point.y)) {
      throw new TypeError("point must be a finite { x, y }.");
    }
    if (options.is_occupied !== undefined && typeof options.is_occupied !== "function") {
      throw new TypeError("is_occupied must be a function.");
    }
    const is_occupied = options.is_occupied ?? (cell => cell != null);
    const geometry_options = { ...options.geometry_options, rows: grid.length, columns: grid[0].length };
    // Validate geometry configuration even if grid is full.
    geometry.cell_center({ r: 0, c: 0 }, geometry_options);
    const hit_position = options.hit_position;
    if (hit_position !== undefined && (!geometry.in_bounds(hit_position, geometry_options) ||
        !is_occupied(grid[hit_position.r][hit_position.c], hit_position))) {
      throw new RangeError("hit_position must be an occupied in-bounds cell.");
    }

    const suitable = candidate => !is_occupied(grid[candidate.r][candidate.c], candidate);
    let candidates = hit_position
      ? geometry.neighbors(hit_position, geometry_options).filter(suitable)
      : [];
    let reason = "near_hit";
    if (candidates.length === 0) {
      reason = "anchored_fallback";
      candidates = [];
      for (let row = 0; row < grid.length; row += 1) {
        for (let column = 0; column < grid[0].length; column += 1) {
          const candidate = { r: row, c: column };
          if (!suitable(candidate)) continue;
          if (row === 0 || geometry.neighbors(candidate, geometry_options)
            .some(neighbor => is_occupied(grid[neighbor.r][neighbor.c], neighbor))) {
            candidates.push(candidate);
          }
        }
      }
    }
    if (candidates.length === 0) {
      return Object.freeze({ found: false, position: null, distance: null, reason: "no_available_cell" });
    }
    const ranked = candidates.map(position => {
      const center = geometry.cell_center(position, geometry_options);
      return { position, distance: Math.hypot(center.x - point.x, center.y - point.y) };
    }).sort((first, second) => first.distance - second.distance ||
      first.position.r - second.position.r || first.position.c - second.position.c);
    return Object.freeze({ found: true, position: Object.freeze({ ...ranked[0].position }),
      distance: ranked[0].distance, reason });
  }

  global.SlowlyHexCellAttachment = Object.freeze({ version: "1.0.0", find_attachment });
})(window);
