/*
 * Stopwatch v1.0.0
 * 慢慢的倉庫｜stillness by slowly
 *
 * 通用碼表狀態核心。
 * - 不綁 UI
 * - 不綁遊戲
 * - 不綁儲存方式
 * - 支援 start / pause / resume / stop / reset / lap
 * - 所有時間值單位皆為毫秒
 *
 * 全域：
 * window.Stopwatch
 */

(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function defaultNow() {
    if (
      typeof global.performance !== "undefined" &&
      typeof global.performance.now === "function"
    ) {
      return global.performance.now();
    }

    return Date.now();
  }

  function create(options) {
    const opts = options || {};
    const now = typeof opts.now === "function" ? opts.now : defaultNow;

    let state = "idle";
    let startedAt = null;
    let elapsedBeforeStart = 0;
    let laps = [];

    function currentElapsed() {
      if (state !== "running" || startedAt === null) {
        return elapsedBeforeStart;
      }

      return elapsedBeforeStart + Math.max(0, now() - startedAt);
    }

    function snapshot() {
      return {
        state,
        running: state === "running",
        paused: state === "paused",
        elapsed: currentElapsed(),
        laps: laps.map(item => ({ ...item }))
      };
    }

    function start() {
      if (state === "running") return snapshot();

      if (state === "stopped") {
        elapsedBeforeStart = 0;
        laps = [];
      }

      startedAt = now();
      state = "running";

      return snapshot();
    }

    function pause() {
      if (state !== "running") return snapshot();

      elapsedBeforeStart = currentElapsed();
      startedAt = null;
      state = "paused";

      return snapshot();
    }

    function resume() {
      if (state !== "paused") return snapshot();

      startedAt = now();
      state = "running";

      return snapshot();
    }

    function stop() {
      if (state === "running") {
        elapsedBeforeStart = currentElapsed();
      }

      startedAt = null;
      state = "stopped";

      return snapshot();
    }

    function reset() {
      startedAt = null;
      elapsedBeforeStart = 0;
      laps = [];
      state = "idle";

      return snapshot();
    }

    function lap() {
      if (state !== "running") return null;

      const total = currentElapsed();
      const previous = laps.length ? laps[laps.length - 1].total : 0;

      const item = {
        index: laps.length + 1,
        total,
        split: total - previous
      };

      laps.push(item);

      return { ...item };
    }

    function elapsed() {
      return currentElapsed();
    }

    function getLaps() {
      return laps.map(item => ({ ...item }));
    }

    function getState() {
      return snapshot();
    }

    return {
      start,
      pause,
      resume,
      stop,
      reset,
      lap,
      elapsed,
      getLaps,
      getState
    };
  }

  const Stopwatch = {
    version: VERSION,
    create
  };

  global.Stopwatch = Stopwatch;

})(typeof window !== "undefined" ? window : globalThis);
