/*
 * Countdown v1.0.0
 * 慢慢的倉庫｜stillness by slowly
 *
 * 通用倒數狀態核心。
 * - 不綁 UI
 * - 不綁遊戲
 * - 不綁儲存方式
 * - duration 與 remaining 單位皆為毫秒
 * - 只負責時間狀態，不主動建立 setInterval
 *
 * 全域：
 * window.Countdown
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

  function normalizeDuration(value) {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  function create(options) {
    const opts = options || {};
    const now = typeof opts.now === "function" ? opts.now : defaultNow;

    let duration = normalizeDuration(opts.duration);
    let remainingBeforeStart = duration;
    let startedAt = null;
    let state = "idle";
    let finished = duration === 0;

    function currentRemaining() {
      if (finished) return 0;

      if (state !== "running" || startedAt === null) {
        return remainingBeforeStart;
      }

      const left = remainingBeforeStart - Math.max(0, now() - startedAt);
      return left > 0 ? left : 0;
    }

    function syncFinished() {
      if (state === "running" && currentRemaining() <= 0) {
        remainingBeforeStart = 0;
        startedAt = null;
        state = "finished";
        finished = true;
      }
    }

    function snapshot() {
      syncFinished();

      const remaining = currentRemaining();

      return {
        state,
        running: state === "running",
        paused: state === "paused",
        finished,
        duration,
        remaining,
        elapsed: Math.max(0, duration - remaining),
        progress: duration > 0 ? Math.min(1, Math.max(0, (duration - remaining) / duration)) : 1
      };
    }

    function start() {
      if (state === "running") return snapshot();

      if (finished || state === "finished" || state === "stopped") {
        remainingBeforeStart = duration;
        finished = duration === 0;
      }

      if (finished) {
        state = "finished";
        return snapshot();
      }

      startedAt = now();
      state = "running";

      return snapshot();
    }

    function pause() {
      syncFinished();
      if (state !== "running") return snapshot();

      remainingBeforeStart = currentRemaining();
      startedAt = null;
      state = "paused";

      return snapshot();
    }

    function resume() {
      syncFinished();
      if (state !== "paused") return snapshot();

      if (remainingBeforeStart <= 0) {
        state = "finished";
        finished = true;
        return snapshot();
      }

      startedAt = now();
      state = "running";

      return snapshot();
    }

    function stop() {
      syncFinished();

      if (state === "running") {
        remainingBeforeStart = currentRemaining();
      }

      startedAt = null;

      if (!finished) {
        state = "stopped";
      }

      return snapshot();
    }

    function reset(nextDuration) {
      if (nextDuration !== undefined) {
        duration = normalizeDuration(nextDuration);
      }

      remainingBeforeStart = duration;
      startedAt = null;
      finished = duration === 0;
      state = finished ? "finished" : "idle";

      return snapshot();
    }

    function setDuration(nextDuration) {
      return reset(nextDuration);
    }

    function remaining() {
      syncFinished();
      return currentRemaining();
    }

    function elapsed() {
      const left = remaining();
      return Math.max(0, duration - left);
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
      setDuration,
      remaining,
      elapsed,
      getState
    };
  }

  const Countdown = {
    version: VERSION,
    create
  };

  global.Countdown = Countdown;

})(typeof window !== "undefined" ? window : globalThis);
