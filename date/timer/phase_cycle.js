// phase_cycle.js
// 慢慢的倉庫｜Date / Timer｜Phase Cycle 1.0.0
// 不同時長的階段循環核心。
// 不綁 UI、不綁呼吸法、不綁音效、不依賴 Countdown / Timer / Ticker。
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

  function normalizePhases(value) {
    if (!Array.isArray(value) || value.length === 0) {
      throw new TypeError("phases must be a non-empty array");
    }

    return value.map(function (phase, index) {
      if (!phase || typeof phase !== "object") {
        throw new TypeError("phase at index " + index + " must be an object");
      }

      const duration = Number(phase.duration);
      if (!Number.isFinite(duration) || duration <= 0) {
        throw new RangeError("phase.duration must be > 0");
      }

      return Object.assign({}, phase, {
        duration: duration
      });
    });
  }

  function create(options = {}) {
    let phases = normalizePhases(options.phases);
    const loop = options.loop !== false;
    const now = typeof options.now === "function" ? options.now : defaultNow;
    const onPhase = typeof options.onPhase === "function" ? options.onPhase : function(){};
    const onComplete = typeof options.onComplete === "function" ? options.onComplete : function(){};

    let index = 0;
    let cycleCount = 0;
    let state = "idle";
    let timerId = null;
    let startedAt = null;
    let remaining = phases[0].duration;

    function clearTimer() {
      if (timerId !== null) {
        global.clearTimeout(timerId);
        timerId = null;
      }
    }

    function currentRemaining() {
      if (state !== "running" || startedAt === null) {
        return remaining;
      }

      return Math.max(0, remaining - Math.max(0, now() - startedAt));
    }

    function snapshot() {
      return {
        state: state,
        running: state === "running",
        paused: state === "paused",
        finished: state === "finished",
        index: index,
        cycleCount: cycleCount,
        phase: Object.assign({}, phases[index]),
        remaining: currentRemaining(),
        phaseCount: phases.length
      };
    }

    function notifyPhase() {
      onPhase(snapshot());
    }

    function schedule() {
      clearTimer();
      startedAt = now();
      timerId = global.setTimeout(advance, Math.max(0, remaining));
    }

    function advance() {
      clearTimer();

      const nextIndex = index + 1;

      if (nextIndex >= phases.length) {
        cycleCount += 1;

        if (!loop) {
          state = "finished";
          startedAt = null;
          remaining = 0;
          onComplete(snapshot());
          return snapshot();
        }

        index = 0;
      } else {
        index = nextIndex;
      }

      remaining = phases[index].duration;

      if (state === "running") {
        notifyPhase();
        schedule();
      }

      return snapshot();
    }

    function start() {
      if (state === "running") return snapshot();

      if (state === "finished" || state === "stopped") {
        index = 0;
        cycleCount = 0;
        remaining = phases[0].duration;
      }

      state = "running";
      notifyPhase();
      schedule();
      return snapshot();
    }

    function pause() {
      if (state !== "running") return snapshot();

      remaining = currentRemaining();
      clearTimer();
      startedAt = null;
      state = "paused";
      return snapshot();
    }

    function resume() {
      if (state !== "paused") return snapshot();

      state = "running";
      schedule();
      return snapshot();
    }

    function stop() {
      if (state === "running") {
        remaining = currentRemaining();
      }

      clearTimer();
      startedAt = null;
      state = "stopped";
      return snapshot();
    }

    function reset(nextPhases) {
      clearTimer();

      if (nextPhases !== undefined) {
        phases = normalizePhases(nextPhases);
      }

      index = 0;
      cycleCount = 0;
      state = "idle";
      startedAt = null;
      remaining = phases[0].duration;
      return snapshot();
    }

    function next() {
      if (state !== "running" && state !== "paused") {
        return snapshot();
      }

      const wasRunning = state === "running";
      clearTimer();
      startedAt = null;

      const result = advance();

      if (!wasRunning && result.state !== "finished") {
        state = "paused";
      }

      return snapshot();
    }

    function getState() {
      return snapshot();
    }

    const api = {
      version: VERSION,
      start,
      pause,
      resume,
      stop,
      reset,
      next,
      getState
    };

    return api;
  }

  global.PhaseCycle = Object.freeze({
    version: VERSION,
    create
  });

})(typeof window !== "undefined" ? window : globalThis);
