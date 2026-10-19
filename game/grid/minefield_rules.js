/* 慢慢軍火庫｜Minefield Rules 1.0.0
 * 來源：掃雷的首次安全布雷、8 鄰居雷數。
 * 只保證首格本身安全，不保證首格周圍安全；零格開啟交給 ChainExpand。
 */
(function (global) {
  "use strict";

  function create_board(options = {}) {
    const { rows, columns, mines, first_position } = options;
    if (!Number.isInteger(rows) || rows <= 0 || !Number.isInteger(columns) || columns <= 0 ||
        !Number.isSafeInteger(rows * columns)) {
      throw new RangeError("rows and columns must be positive integers forming a safe cell count.");
    }
    if (!first_position || !Number.isInteger(first_position.r) || !Number.isInteger(first_position.c) ||
        first_position.r < 0 || first_position.r >= rows || first_position.c < 0 || first_position.c >= columns) {
      throw new RangeError("first_position must be an in-bounds { r, c }.");
    }
    if (!Number.isInteger(mines) || mines < 0 || mines >= rows * columns) {
      throw new RangeError("mines must be 0 through rows * columns - 1.");
    }
    if (options.random_int !== undefined && typeof options.random_int !== "function") {
      throw new TypeError("random_int must be a function.");
    }
    const random_int = options.random_int ?? function (lower, upper) {
      if (!global.SlowlyRandom?.int) throw new Error("SlowlyRandom.int is required.");
      return global.SlowlyRandom.int(lower, upper);
    };
    const forbidden_index = first_position.r * columns + first_position.c;
    const eligible_indices = [];
    for (let index = 0; index < rows * columns; index += 1) {
      if (index !== forbidden_index) eligible_indices.push(index);
    }
    // Partial Fisher-Yates chooses each mine without duplicate positions.
    for (let index = 0; index < mines; index += 1) {
      const choice = random_int(index, eligible_indices.length - 1);
      if (!Number.isInteger(choice) || choice < index || choice >= eligible_indices.length) {
        throw new RangeError("random_int must return an integer within its supplied bounds.");
      }
      [eligible_indices[index], eligible_indices[choice]] =
        [eligible_indices[choice], eligible_indices[index]];
    }
    const mine_indices = new Set(eligible_indices.slice(0, mines));
    const grid = Array.from({ length: rows }, (_, row) =>
      Array.from({ length: columns }, (_, column) => {
        const index = row * columns + column;
        if (mine_indices.has(index)) return Object.freeze({ mine: true, around: null });
        let around = 0;
        for (let offset_row = -1; offset_row <= 1; offset_row += 1) {
          for (let offset_column = -1; offset_column <= 1; offset_column += 1) {
            if (offset_row === 0 && offset_column === 0) continue;
            const neighbor_row = row + offset_row;
            const neighbor_column = column + offset_column;
            if (neighbor_row >= 0 && neighbor_row < rows && neighbor_column >= 0 && neighbor_column < columns &&
                mine_indices.has(neighbor_row * columns + neighbor_column)) around += 1;
          }
        }
        return Object.freeze({ mine: false, around });
      })
    );
    grid.forEach(Object.freeze);
    return Object.freeze({ rows, columns, mines, first_position: Object.freeze({ ...first_position }), grid: Object.freeze(grid) });
  }

  global.SlowlyMinefieldRules = Object.freeze({ version: "1.0.0", create_board });
})(window);
