/*
 * Timer v1.0.0
 * 慢慢的倉庫｜stillness by slowly
 *
 * 通用經過時間計時核心。
 * - 不綁 UI
 * - 不綁遊戲
 * - 不綁儲存方式
 * - 使用 performance.now()（可用時）計算經過時間
 * - 暫停期間不計入 elapsed
 *
 * 全域：
 * window.Timer
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

  function normalizeNow(now) {
    return typeof now === "function" ? now : defaultNow;
  }

  function create(options) {
    const opts = options || {};
    const now = normalizeNow(opts.now);

    let state = "idle";
    let startedAt = null;
    let elapsedBeforeStart = 0;

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
        stopped: state === "stopped",
        elapsed: currentElapsed()
      };
    }

    function start() {
      if (state === "running") return snapshot();

      if (state === "stopped") {
        elapsedBeforeStart = 0;
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
      state = "idle";

      return snapshot();
    }

    function elapsed() {
      return currentElapsed();
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
      elapsed,
      getState
    };
  }

  const Timer = {
    version: VERSION,
    create
  };

  global.Timer = Timer;

})(typeof window !== "undefined" ? window : globalThis);
