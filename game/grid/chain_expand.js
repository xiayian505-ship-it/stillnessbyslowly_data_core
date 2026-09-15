"use strict";

/* =========================================================
   慢慢的倉庫｜Grid Chain Expand v1.0.0

   通用二維格子連鎖擴散核心。

   API：
   - SlowlyGridChainExpand.expand(grid, seeds, options)

   options：
   - expandAt(context)   必要。回傳下一批要加入的座標。
   - maxWaves            可選。最多擴散波數，預設 Infinity。

   context：
   - r / c               目前座標
   - cell                grid[r][c]
   - grid                原 grid
   - rows / cols         grid 尺寸
   - wave                目前波次（0 起算）

   回傳：
   {
     positions,          // 去重後的所有座標，依首次加入順序
     waves,              // 實際執行波數
     exhausted           // true = 已自然收斂；false = 因 maxWaves 停止
   }

   不負責：
   - 判斷什麼格子會觸發擴散
   - 決定炸整列、整行、範圍、顏色或其他遊戲規則
   - 修改 grid
   - DOM / 動畫 / 分數 / 音效
========================================================= */

(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function assertRectangularGrid(grid) {
    if (!Array.isArray(grid) || grid.length === 0) {
      throw new TypeError("[SlowlyGridChainExpand] grid must be a non-empty 2D array.");
    }

    if (!Array.isArray(grid[0]) || grid[0].length === 0) {
      throw new TypeError("[SlowlyGridChainExpand] grid must have at least one column.");
    }

    const cols = grid[0].length;

    for (const row of grid) {
      if (!Array.isArray(row) || row.length !== cols) {
        throw new TypeError("[SlowlyGridChainExpand] grid must be rectangular.");
      }
    }

    return { rows: grid.length, cols };
  }

  function normalizeMaxWaves(value) {
    if (value === undefined || value === null) return Infinity;

    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) {
      throw new TypeError("[SlowlyGridChainExpand] maxWaves must be a non-negative finite number.");
    }

    return Math.floor(number);
  }

  function normalizePosition(value) {
    if (!value || typeof value !== "object") return null;

    const r = Number(value.r);
    const c = Number(value.c);

    if (!Number.isInteger(r) || !Number.isInteger(c)) return null;
    return { r, c };
  }

  function toIterable(value) {
    if (value == null) return [];
    if (typeof value[Symbol.iterator] === "function") return value;

    throw new TypeError("[SlowlyGridChainExpand] expandAt() must return an iterable of positions, null, or undefined.");
  }

  function expand(grid, seeds, options = {}) {
    const { rows, cols } = assertRectangularGrid(grid);

    if (typeof options.expandAt !== "function") {
      throw new TypeError("[SlowlyGridChainExpand] options.expandAt is required.");
    }

    const maxWaves = normalizeMaxWaves(options.maxWaves);
    const seen = new Map();
    let frontier = [];

    function addPosition(value, nextFrontier) {
      const pos = normalizePosition(value);
      if (!pos) return false;
      if (pos.r < 0 || pos.r >= rows || pos.c < 0 || pos.c >= cols) return false;

      const key = `${pos.r}:${pos.c}`;
      if (seen.has(key)) return false;

      seen.set(key, pos);
      nextFrontier.push(pos);
      return true;
    }

    for (const seed of toIterable(seeds)) {
      addPosition(seed, frontier);
    }

    let waves = 0;

    while (frontier.length > 0 && waves < maxWaves) {
      const current = frontier;
      const next = [];

      for (const pos of current) {
        const produced = options.expandAt({
          r: pos.r,
          c: pos.c,
          cell: grid[pos.r][pos.c],
          grid,
          rows,
          cols,
          wave: waves
        });

        for (const candidate of toIterable(produced)) {
          addPosition(candidate, next);
        }
      }

      frontier = next;
      waves += 1;
    }

    return {
      positions: Array.from(seen.values()),
      waves,
      exhausted: frontier.length === 0
    };
  }

  global.SlowlyGridChainExpand = Object.freeze({
    version: VERSION,
    expand
  });
})(window);
