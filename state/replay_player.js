/* 慢慢軍火庫｜Replay Player 1.0.0
 * 重播已記錄的動作序列：播放／暫停／逐步進退／任意定位／調速。
 * 不計算遊戲規則、不重建畫面、不執行動作、不寫入資料庫，也不提供固定 UI。
 * 宿主依 position（已完成的動作數）自行重建狀態與處理動畫。
 */
(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function checkPositiveNumber(value, label) {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      throw new RangeError(label + " must be a positive finite number");
    }
    return value;
  }

  // D1／JSON 等重播紀錄使用可序列化資料；防止宿主改動原陣列影響重播。
  function copyActions(value) {
    if (!Array.isArray(value)) throw new TypeError("actions must be an array");
    for (const action of value) {
      if (action === undefined || typeof action === "function" || typeof action === "symbol") {
        throw new TypeError("actions must contain JSON-serializable entries");
      }
    }
    try {
      const serialized = JSON.stringify(value);
      const result = JSON.parse(serialized);
      if (!Array.isArray(result) || result.length !== value.length) {
        throw new TypeError("Invalid actions array");
      }
      return result;
    } catch (error) {
      throw new TypeError("actions must be JSON-serializable: " + error.message);
    }
  }

  function copyAction(value) {
    return value === undefined ? null : JSON.parse(JSON.stringify(value));
  }

  function create(options = {}) {
    const intervalMs = checkPositiveNumber(options.intervalMs === undefined ? 800 : options.intervalMs, "intervalMs");
    const initialRate = checkPositiveNumber(options.rate === undefined ? 1 : options.rate, "rate");
    const scheduler = options.scheduler || global;
    if (!scheduler || typeof scheduler.setTimeout !== "function" ||
        typeof scheduler.clearTimeout !== "function") {
      throw new TypeError("scheduler must supply setTimeout and clearTimeout");
    }

    let actions = [];
    let loaded = false;
    let position = 0;
    let status = "idle";
    let rate = initialRate;
    let stepIntervalMs = intervalMs;
    let timeoutId = null;
    const listeners = new Set();

    function ensureActive() {
      if (status === "destroyed") throw new Error("Replay Player is destroyed");
    }

    function ensureLoaded() {
      ensureActive();
      if (!loaded) throw new Error("Load actions before controlling playback");
    }

    function clearScheduledStep() {
      if (timeoutId === null) return;
      scheduler.clearTimeout(timeoutId);
      timeoutId = null;
    }

    function snapshot() {
      const total = actions.length;
      return Object.freeze({
        status,
        position,
        total,
        progress: total === 0 ? 0 : position / total,
        rate,
        intervalMs: stepIntervalMs,
        hasPrevious: loaded && position > 0,
        hasNext: loaded && position < total,
        loaded
      });
    }

    function emit(type) {
      const state = snapshot();
      // 宿主的顯示錯誤不應破壞播放核心或其他訂閱者。
      for (const listener of Array.from(listeners)) {
        try {
          listener(state, type);
        } catch (error) {
          // 訂閱 callback 的錯誤由宿主自行處理。
        }
      }
      return state;
    }

    function scheduleNext() {
      if (status !== "playing" || timeoutId !== null || position >= actions.length) return;
      timeoutId = scheduler.setTimeout(function () {
        timeoutId = null;
        if (status !== "playing") return;

        position += 1;
        if (position === actions.length) {
          status = "ended";
          emit("complete");
        } else {
          emit("tick");
          scheduleNext();
        }
      }, stepIntervalMs / rate);
    }

    function load(input) {
      ensureActive();
      // 先完成驗證，避免壞資料清除正在播放的紀錄。
      const nextActions = copyActions(input);
      clearScheduledStep();
      actions = nextActions;
      loaded = true;
      position = 0;
      status = "paused";
      return emit("load");
    }

    function play() {
      ensureLoaded();
      if (status === "playing" || actions.length === 0) return snapshot();
      if (position >= actions.length) position = 0;
      status = "playing";
      const result = emit("play");
      scheduleNext();
      return result;
    }

    function pause() {
      ensureActive();
      if (status !== "playing") return snapshot();
      clearScheduledStep();
      status = "paused";
      return emit("pause");
    }

    function toggle() {
      return status === "playing" ? pause() : play();
    }

    function seek(target) {
      ensureLoaded();
      if (!Number.isInteger(target) || target < 0 || target > actions.length) {
        throw new RangeError("position must be an integer between 0 and total");
      }
      clearScheduledStep();
      position = target;
      status = position === actions.length && actions.length > 0 ? "ended" : "paused";
      return emit("seek");
    }

    function previous() {
      ensureLoaded();
      return seek(Math.max(0, position - 1));
    }

    function next() {
      ensureLoaded();
      return seek(Math.min(actions.length, position + 1));
    }

    function restart() {
      return seek(0);
    }

    function toEnd() {
      ensureLoaded();
      return seek(actions.length);
    }

    function setRate(value) {
      ensureActive();
      rate = checkPositiveNumber(value, "rate");
      if (status === "playing") clearScheduledStep();
      const result = emit("rate");
      scheduleNext();
      return result;
    }

    function setIntervalMs(value) {
      ensureActive();
      stepIntervalMs = checkPositiveNumber(value, "intervalMs");
      if (status === "playing") clearScheduledStep();
      const result = emit("interval");
      scheduleNext();
      return result;
    }

    // 位置 0 代表初始狀態；位置 N 對應已套用前 N 個動作。
    function currentAction() {
      ensureLoaded();
      return position === 0 ? null : copyAction(actions[position - 1]);
    }

    function actionAt(index) {
      ensureLoaded();
      if (!Number.isInteger(index) || index < 0 || index >= actions.length) {
        throw new RangeError("action index out of range");
      }
      return copyAction(actions[index]);
    }

    function subscribe(listener) {
      ensureActive();
      if (typeof listener !== "function") throw new TypeError("listener must be a function");
      listeners.add(listener);
      return function unsubscribe() {
        listeners.delete(listener);
      };
    }

    function destroy() {
      if (status === "destroyed") return snapshot();
      clearScheduledStep();
      status = "destroyed";
      actions = [];
      loaded = false;
      position = 0;
      const result = emit("destroy");
      listeners.clear();
      return result;
    }

    return Object.freeze({
      load,
      play,
      pause,
      toggle,
      seek,
      previous,
      next,
      restart,
      toEnd,
      setRate,
      setIntervalMs,
      snapshot,
      currentAction,
      actionAt,
      subscribe,
      destroy
    });
  }

  global.SlowlyReplayPlayer = Object.freeze({ version: VERSION, create });
})(typeof window !== "undefined" ? window : globalThis);
