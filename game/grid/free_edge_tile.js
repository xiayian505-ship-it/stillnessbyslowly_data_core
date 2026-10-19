/* 慢慢軍火庫｜Free Edge Tile 1.0.0
 * 來源：平面麻將消消樂 isFree，僅判斷同列左右是否留有出口。
 * 不處理上下層覆蓋、牌面配對、可解布局。
 */
(function (global) {
  "use strict";

  function inspect(board, position, options = {}) {
    if (!Array.isArray(board) || board.length === 0 || !Array.isArray(board[0]) || board[0].length === 0 ||
        board.some(row => !Array.isArray(row) || row.length !== board[0].length)) {
      throw new TypeError("board must be a non-empty rectangular array.");
    }
    if (!position || !Number.isInteger(position.r) || !Number.isInteger(position.c)) {
      throw new TypeError("position must contain integer r and c.");
    }
    if (options.is_removed !== undefined && typeof options.is_removed !== "function") {
      throw new TypeError("is_removed must be a function.");
    }
    const in_bounds = position.r >= 0 && position.r < board.length && position.c >= 0 && position.c < board[0].length;
    const empty_result = { selectable: false, left_open: false, right_open: false, reason: "out_of_bounds" };
    if (!in_bounds) return Object.freeze(empty_result);
    const is_removed = options.is_removed ?? (cell => cell?.removed === true || cell == null);
    const row = board[position.r];
    if (is_removed(row[position.c], position)) {
      return Object.freeze({ ...empty_result, reason: "removed" });
    }
    const left_open = position.c === 0 || Boolean(is_removed(row[position.c - 1], { r: position.r, c: position.c - 1 }));
    const right_open = position.c === row.length - 1 || Boolean(is_removed(row[position.c + 1], { r: position.r, c: position.c + 1 }));
    return Object.freeze({ selectable: left_open || right_open, left_open, right_open,
      reason: left_open || right_open ? "available" : "surrounded" });
  }

  global.SlowlyFreeEdgeTile = Object.freeze({ version: "1.0.0", inspect });
})(window);
