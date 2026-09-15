"use strict";

/* =========================================================
   慢慢的倉庫｜Grid Shuffle Until v1.0.0

   通用二維格狀「反覆洗牌直到符合條件」核心。

   API：
   - SlowlyGridShuffleUntil.run(grid, options)

   options：
   - shuffle(values, context): 必要。回傳重新排列後的一維陣列
   - accept(grid, context): 必要。回傳 true 表示目前排列可接受
   - maxAttempts: 最多嘗試次數，預設 5

   context：
   - attempt：目前第幾次嘗試（從 1 開始）
   - maxAttempts
   - values：本次套用到 grid 的一維排列

   行為：
   - 將矩形二維 grid 以 row-major 攤平成一維
   - 每次呼叫宿主 shuffle() 取得新排列
   - 將排列寫回原 grid
   - 每次寫回後呼叫 accept() 驗收
   - 通過即停止；否則最多嘗試 maxAttempts 次
   - 保留 cell 本身的物件參考，只重新排列位置

   不負責：
   - 隨機演算法 / RNG
   - Match / 可走步 / 勝負等遊戲規則
   - DOM / Render / 動畫
   - 自動補格或建立新 cell
========================================================= */
(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function validateGrid(grid) {
    if (!Array.isArray(grid)) {
      throw new TypeError("[SlowlyGridShuffleUntil] grid must be an array.");
    }

    if (grid.length === 0) {
      return { rows: 0, cols: 0 };
    }

    if (!Array.isArray(grid[0])) {
      throw new TypeError("[SlowlyGridShuffleUntil] grid rows must be arrays.");
    }

    const cols = grid[0].length;

    for (let r = 0; r < grid.length; r += 1) {
      if (!Array.isArray(grid[r]) || grid[r].length !== cols) {
        throw new TypeError("[SlowlyGridShuffleUntil] grid must be rectangular.");
      }
    }

    return { rows: grid.length, cols };
  }

  function normalizeMaxAttempts(value) {
    if (value == null) return 5;

    const number = Number(value);

    if (!Number.isInteger(number) || number < 1) {
      throw new TypeError(
        "[SlowlyGridShuffleUntil] maxAttempts must be a positive integer."
      );
    }

    return number;
  }

  function flatten(grid, rows, cols) {
    const values = [];

    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        values.push(grid[r][c]);
      }
    }

    return values;
  }

  function apply(grid, values, rows, cols) {
    let index = 0;

    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        grid[r][c] = values[index];
        index += 1;
      }
    }
  }

  function validateShuffled(values, expectedLength) {
    if (!Array.isArray(values)) {
      throw new TypeError(
        "[SlowlyGridShuffleUntil] shuffle() must return an array."
      );
    }

    if (values.length !== expectedLength) {
      throw new RangeError(
        "[SlowlyGridShuffleUntil] shuffle() must preserve item count."
      );
    }
  }

  function run(grid, options = {}) {
    const { rows, cols } = validateGrid(grid);
    const shuffle = options.shuffle;
    const accept = options.accept;
    const maxAttempts = normalizeMaxAttempts(options.maxAttempts);

    if (typeof shuffle !== "function") {
      throw new TypeError(
        "[SlowlyGridShuffleUntil] options.shuffle is required."
      );
    }

    if (typeof accept !== "function") {
      throw new TypeError(
        "[SlowlyGridShuffleUntil] options.accept is required."
      );
    }

    let values = flatten(grid, rows, cols);
    const itemCount = values.length;
    let attempts = 0;
    let accepted = false;

    while (attempts < maxAttempts) {
      attempts += 1;

      const shuffled = shuffle(values.slice(), {
        attempt: attempts,
        maxAttempts,
        grid
      });

      validateShuffled(shuffled, itemCount);
      values = shuffled.slice();
      apply(grid, values, rows, cols);

      accepted = Boolean(
        accept(grid, {
          attempt: attempts,
          maxAttempts,
          values: values.slice()
        })
      );

      if (accepted) {
        break;
      }
    }

    return Object.freeze({
      accepted,
      attempts,
      maxAttempts,
      values: values.slice()
    });
  }

  global.SlowlyGridShuffleUntil = Object.freeze({
    version: VERSION,
    run
  });
})(window);
