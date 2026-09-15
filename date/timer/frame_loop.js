/* =========================================================
   Frame Loop v1.0.0
   Stillness by Slowly - 慢慢的倉庫

   用途：
   - 通用 requestAnimationFrame 迴圈
   - 每一幀呼叫宿主提供的 callback
   - 提供 start / pause / resume / stop / reset / step

   責任：
   - requestAnimationFrame / cancelAnimationFrame 生命週期
   - 避免重複啟動
   - 暫停期間不計入 delta / elapsed
   - 提供 frame、delta、elapsed、timestamp

   不負責：
   - DOM 更新
   - 動畫公式
   - 遊戲規則
   - 儲存
   - UI
========================================================= */

(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function defaultRequest(callback) {
    if (typeof global.requestAnimationFrame !== "function") {
      throw new Error("FrameLoop requires requestAnimationFrame().");
    }

    return global.requestAnimationFrame(callback);
  }

  function defaultCancel(id) {
    if (typeof global.cancelAnimationFrame === "function") {
      global.cancelAnimationFrame(id);
    }
  }

  function normalizeCallback(callback) {
    if (typeof callback !== "function") {
      throw new TypeError("FrameLoop.create(): callback must be a function.");
    }

    return callback;
  }

  function create(options = {}) {
    let callback = normalizeCallback(options.callback);

    const request =
      typeof options.request === "function"
        ? options.request
        : defaultRequest;

    const cancel =
      typeof options.cancel === "function"
        ? options.cancel
        : defaultCancel;

    let state = "idle";
    let frameId = null;
    let frame = 0;
    let elapsed = 0;
    let lastTimestamp = null;

    function snapshot() {
      return {
        state,
        running: state === "running",
        paused: state === "paused",
        stopped: state === "stopped",
        frame,
        elapsed
      };
    }

    function cancelPendingFrame() {
      if (frameId === null) return;

      cancel(frameId);
      frameId = null;
    }

    function schedule() {
      if (state !== "running" || frameId !== null) return;
      frameId = request(onFrame);
    }

    function onFrame(timestamp) {
      frameId = null;

      if (state !== "running") return;

      const currentTimestamp = Number(timestamp);

      if (!Number.isFinite(currentTimestamp)) {
        throw new TypeError(
          "FrameLoop received a non-finite animation frame timestamp."
        );
      }

      const delta =
        lastTimestamp === null
          ? 0
          : Math.max(0, currentTimestamp - lastTimestamp);

      lastTimestamp = currentTimestamp;
      elapsed += delta;
      frame += 1;

      callback({
        timestamp: currentTimestamp,
        delta,
        elapsed,
        frame
      });

      schedule();
    }

    function start() {
      if (state === "running") return snapshot();

      cancelPendingFrame();

      state = "running";
      frame = 0;
      elapsed = 0;
      lastTimestamp = null;

      schedule();
      return snapshot();
    }

    function pause() {
      if (state !== "running") return snapshot();

      cancelPendingFrame();
      state = "paused";
      lastTimestamp = null;

      return snapshot();
    }

    function resume() {
      if (state !== "paused") return snapshot();

      state = "running";
      lastTimestamp = null;

      schedule();
      return snapshot();
    }

    function stop() {
      cancelPendingFrame();

      state = "stopped";
      lastTimestamp = null;

      return snapshot();
    }

    function reset() {
      cancelPendingFrame();

      state = "idle";
      frame = 0;
      elapsed = 0;
      lastTimestamp = null;

      return snapshot();
    }

    function step(timestamp = 0) {
      const currentTimestamp = Number(timestamp);

      if (!Number.isFinite(currentTimestamp)) {
        throw new TypeError("FrameLoop.step(): timestamp must be finite.");
      }

      const delta =
        lastTimestamp === null
          ? 0
          : Math.max(0, currentTimestamp - lastTimestamp);

      lastTimestamp = currentTimestamp;
      elapsed += delta;
      frame += 1;

      callback({
        timestamp: currentTimestamp,
        delta,
        elapsed,
        frame
      });

      return snapshot();
    }

    function setCallback(nextCallback) {
      callback = normalizeCallback(nextCallback);
      return callback;
    }

    function getState() {
      return snapshot();
    }

    return Object.freeze({
      start,
      pause,
      resume,
      stop,
      reset,
      step,
      setCallback,
      getState
    });
  }

  const FrameLoop = Object.freeze({
    version: VERSION,
    create
  });

  Object.defineProperty(global, "FrameLoop", {
    value: FrameLoop,
    writable: false,
    configurable: false,
    enumerable: true
  });
})(typeof window !== "undefined" ? window : globalThis);
