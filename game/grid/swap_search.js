"use strict";

/* =========================================================
   慢慢的倉庫｜Grid Swap Search v1.0.0

   通用二維格狀相鄰交換搜尋核心。

   API：
   - SlowlyGridSwapSearch.findFirst(grid, options?)

   options：
   - directions: 要檢查的相鄰方向，預設右、下，避免重複 pair
   - isBlocked(cell, r, c, grid): true 時該格不參與搜尋
   - isImmediate(context): 不需試交換即可判定此 pair 合法
   - testAfterSwap(context): 暫時交換後判定此 pair 是否合法

   context：
   - grid
   - a / b：{ r, c }
   - aCell / bCell：交換前兩格內容

   行為：
   - 依 row-major 順序掃描相鄰 pair
   - isImmediate() 成功時直接回傳該 pair
   - 否則暫時交換兩格，呼叫 testAfterSwap()，之後一定還原
   - 找到第一個合法 pair 時回傳 [a, b]；找不到回傳 null

   不負責：
   - DOM / Render / 動畫
   - 何謂「合法移動」的遊戲規則
   - 配對 / 消除 / 分數 / Combo
   - 特殊格子語意
   - 實際執行玩家交換
========================================================= */
(function (global) {
  "use strict";

  const VERSION = "1.0.0";
  const DEFAULT_DIRECTIONS = Object.freeze([
    Object.freeze([0, 1]),
    Object.freeze([1, 0])
  ]);

  function validateGrid(grid) {
    if (!Array.isArray(grid)) {
      throw new TypeError("[SlowlyGridSwapSearch] grid must be an array.");
    }

    if (grid.length === 0) {
      return { rows: 0, cols: 0 };
    }

    if (!Array.isArray(grid[0])) {
      throw new TypeError("[SlowlyGridSwapSearch] grid rows must be arrays.");
    }

    const cols = grid[0].length;

    for (let r = 0; r < grid.length; r += 1) {
      if (!Array.isArray(grid[r]) || grid[r].length !== cols) {
        throw new TypeError("[SlowlyGridSwapSearch] grid must be rectangular.");
      }
    }

    return { rows: grid.length, cols };
  }

  function normalizeDirections(value) {
    if (value == null) {
      return DEFAULT_DIRECTIONS;
    }

    if (!Array.isArray(value) || value.length === 0) {
      throw new TypeError("[SlowlyGridSwapSearch] directions must be a non-empty array.");
    }

    return value.map((direction) => {
      if (
        !Array.isArray(direction) ||
        direction.length !== 2 ||
        !Number.isInteger(direction[0]) ||
        !Number.isInteger(direction[1]) ||
        (direction[0] === 0 && direction[1] === 0)
      ) {
        throw new TypeError("[SlowlyGridSwapSearch] each direction must be [dr, dc] integers and not [0, 0].");
      }

      return [direction[0], direction[1]];
    });
  }

  function normalizeOptions(options = {}) {
    return {
      directions: normalizeDirections(options.directions),
      isBlocked: typeof options.isBlocked === "function"
        ? options.isBlocked
        : null,
      isImmediate: typeof options.isImmediate === "function"
        ? options.isImmediate
        : null,
      testAfterSwap: typeof options.testAfterSwap === "function"
        ? options.testAfterSwap
        : null
    };
  }

  function inBounds(r, c, rows, cols) {
    return r >= 0 && r < rows && c >= 0 && c < cols;
  }

  function swap(grid, a, b) {
    const temp = grid[a.r][a.c];
    grid[a.r][a.c] = grid[b.r][b.c];
    grid[b.r][b.c] = temp;
  }

  function findFirst(grid, options = {}) {
    const { rows, cols } = validateGrid(grid);
    const settings = normalizeOptions(options);

    if (!settings.isImmediate && !settings.testAfterSwap) {
      throw new TypeError(
        "[SlowlyGridSwapSearch] isImmediate or testAfterSwap is required."
      );
    }

    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const a = { r, c };
        const aCell = grid[r][c];

        if (
          settings.isBlocked &&
          settings.isBlocked(aCell, r, c, grid)
        ) {
          continue;
        }

        for (const [dr, dc] of settings.directions) {
          const rr = r + dr;
          const cc = c + dc;

          if (!inBounds(rr, cc, rows, cols)) {
            continue;
          }

          const b = { r: rr, c: cc };
          const bCell = grid[rr][cc];

          if (
            settings.isBlocked &&
            settings.isBlocked(bCell, rr, cc, grid)
          ) {
            continue;
          }

          const context = {
            grid,
            a,
            b,
            aCell,
            bCell
          };

          if (
            settings.isImmediate &&
            settings.isImmediate(context)
          ) {
            return [a, b];
          }

          if (!settings.testAfterSwap) {
            continue;
          }

          let valid = false;
          swap(grid, a, b);

          try {
            valid = Boolean(
              settings.testAfterSwap(context)
            );
          } finally {
            swap(grid, a, b);
          }

          if (valid) {
            return [a, b];
          }
        }
      }
    }

    return null;
  }

  global.SlowlyGridSwapSearch = Object.freeze({
    version: VERSION,
    findFirst
  });
})(window);
