/*
 * Ticker v1.0.0
 * 慢慢的倉庫｜stillness by slowly
 *
 * 通用固定週期觸發核心。
 * - 不綁 UI
 * - 不綁遊戲
 * - 不綁儲存方式
 * - 由宿主提供 callback
 * - 支援 start / pause / resume / stop / reset
 *
 * 全域：
 * window.Ticker
 */

(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function normalizeInterval(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : 1000;
  }

  function create(options) {
    const opts = options || {};

    let interval = normalizeInterval(opts.interval);
    let callback = typeof opts.callback === "function" ? opts.callback : function () {};
    let timerId = null;
    let state = "idle";
    let tickCount = 0;

    function snapshot() {
      return {
        state,
        running: state === "running",
        paused: state === "paused",
        interval,
        tickCount
      };
    }

    function clearTimer() {
      if (timerId !== null) {
        global.clearInterval(timerId);
        timerId = null;
      }
    }

    function fire() {
      tickCount += 1;
      callback({
        count: tickCount,
        interval
      });
    }

    function beginInterval() {
      clearTimer();
      timerId = global.setInterval(fire, interval);
    }

    function start() {
      if (state === "running") return snapshot();

      if (state === "stopped") {
        tickCount = 0;
      }

      state = "running";
      beginInterval();

      return snapshot();
    }

    function pause() {
      if (state !== "running") return snapshot();

      clearTimer();
      state = "paused";

      return snapshot();
    }

    function resume() {
      if (state !== "paused") return snapshot();

      state = "running";
      beginInterval();

      return snapshot();
    }

    function stop() {
      clearTimer();
      state = "stopped";

      return snapshot();
    }

    function reset() {
      clearTimer();
      tickCount = 0;
      state = "idle";

      return snapshot();
    }

    function tick() {
      fire();
      return snapshot();
    }

    function setIntervalMs(nextInterval) {
      interval = normalizeInterval(nextInterval);

      if (state === "running") {
        beginInterval();
      }

      return snapshot();
    }

    function setCallback(nextCallback) {
      callback = typeof nextCallback === "function" ? nextCallback : function () {};
      return snapshot();
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
      tick,
      setInterval: setIntervalMs,
      setCallback,
      getState
    };
  }

  const Ticker = {
    version: VERSION,
    create
  };

  global.Ticker = Ticker;

})(typeof window !== "undefined" ? window : globalThis);
