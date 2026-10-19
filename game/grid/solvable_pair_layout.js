/* 慢慢軍火庫｜Solvable Pair Layout 1.0.0
 * 來源：平面麻將消消樂的每列左右鏡射配對布局。
 * 只保證沿每列兩端逐對消除的平面可解性；不支援立體上海麻將。
 */
(function (global) {
  "use strict";

  function positive_integer(value, label) {
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new RangeError(label + " must be a positive safe integer.");
    }
    return value;
  }

  function generate(options = {}) {
    const rows = positive_integer(options.rows, "rows");
    const columns = positive_integer(options.columns, "columns");
    if (columns % 2 !== 0) throw new RangeError("columns must be even.");
    const types = options.types;
    if (!Array.isArray(types) || types.length === 0 ||
        types.some(type => typeof type !== "string" && typeof type !== "number")) {
      throw new TypeError("types must be a non-empty array of strings or numbers.");
    }
    const unique_per_row = options.unique_per_row !== false;
    if (unique_per_row && new Set(types).size < columns / 2) {
      throw new RangeError("type pool contains too few distinct types for one row.");
    }
    const random_int = options.random_int ?? global.SlowlyRandom?.int;
    if (typeof random_int !== "function") throw new Error("SlowlyRandom.int or random_int is required.");
    function draw(max) {
      const index = random_int(0, max);
      if (!Number.isSafeInteger(index) || index < 0 || index > max) {
        throw new RangeError("random_int must return an integer in the requested range.");
      }
      return index;
    }

    const board = [];
    const removal_plan = [];
    for (let row = 0; row < rows; row += 1) {
      const pool = [...new Set(types)];
      const first_half = [];
      for (let index = 0; index < columns / 2; index += 1) {
        const position = draw(pool.length - 1);
        first_half.push(pool[position]);
        if (unique_per_row) pool.splice(position, 1);
      }
      const row_types = first_half.concat([...first_half].reverse());
      board.push(row_types.map(type_id => ({ type_id, removed: false })));
      for (let index = 0; index < columns / 2; index += 1) {
        removal_plan.push(Object.freeze({
          type_id: row_types[index],
          first: Object.freeze({ r: row, c: index }),
          second: Object.freeze({ r: row, c: columns - 1 - index })
        }));
      }
    }
    return Object.freeze({ board, removal_plan: Object.freeze(removal_plan) });
  }

  /* 獨立驗證頁也可呼叫：必須使用既有 FreeEdgeTile 的公開 API，
   * 不能於此處自行再寫一份左右開放規則。
   */
  function verify_removal_plan(layout) {
    if (typeof global.SlowlyFreeEdgeTile?.inspect !== "function") {
      throw new Error("SlowlyFreeEdgeTile.inspect is required for verification.");
    }
    if (!layout || !Array.isArray(layout.board) || !Array.isArray(layout.removal_plan)) {
      throw new TypeError("layout must contain board and removal_plan arrays.");
    }
    const board = layout.board.map(row => row.map(cell => ({ ...cell })));
    for (let index = 0; index < layout.removal_plan.length; index += 1) {
      const step = layout.removal_plan[index];
      for (const position of [step.first, step.second]) {
        const cell = board[position.r]?.[position.c];
        if (!cell || cell.removed || cell.type_id !== step.type_id ||
            !global.SlowlyFreeEdgeTile.inspect(board, position).selectable) {
          return Object.freeze({ solvable: false, failed_step: index });
        }
      }
      board[step.first.r][step.first.c].removed = true;
      board[step.second.r][step.second.c].removed = true;
    }
    const all_removed = board.every(row => row.every(cell => cell.removed));
    return Object.freeze({ solvable: all_removed, failed_step: all_removed ? null : layout.removal_plan.length });
  }

  global.SlowlySolvablePairLayout = Object.freeze({ version: "1.0.0", generate, verify_removal_plan });
})(window);
