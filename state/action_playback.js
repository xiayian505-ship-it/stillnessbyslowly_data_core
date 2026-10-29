/*
 * Action Playback 1.0.0｜慢慢軍火庫
 * 從霧林 Boss 逐張即時結算的演出流程抽出。僅協調「取得已結算動作、播放、命中、呈現」。
 * 不預先向宿主要求後續動作；沒有傷害計算、動畫、佇列、DOM 或遊戲存檔。
 */
(function (global) {
  "use strict";

  function create(options = {}) {
    ["nextAction", "playAction", "presentState"].forEach(function (name) {
      if (typeof options[name] !== "function") throw new TypeError(name + " callback is required");
    });
    ["onImpact", "shouldStop", "onComplete", "onCancel", "onError"].forEach(function (name) {
      if (options[name] !== undefined && typeof options[name] !== "function") {
        throw new TypeError(name + " must be a function");
      }
    });
    const animationError = options.animationError === undefined ? "present" : options.animationError;
    if (animationError !== "present" && animationError !== "stop") {
      throw new RangeError("animationError must be present or stop");
    }

    let running = false;
    let status = "idle";
    let index = 0;
    let cancelRequested = false;
    let controller = null;
    let currentPromise = null;

    function getState() { return { status, running, index, cancelRequested }; }
    function isRunning() { return running; }
    function cancel() {
      if (!running) return false;
      cancelRequested = true;
      if (controller) controller.abort();
      return true;
    }

    async function execute() {
      let terminal = "complete";
      let error = null;
      let lastAnimationError = null;
      try {
        while (!cancelRequested) {
          // 每一個 nextAction 都可能真的執行傷害計算，因此絕不批次預先取得。
          const action = await options.nextAction({ index, signal: controller.signal });
          if (cancelRequested) { terminal = "cancelled"; break; }
          if (action == null) break;

          let impactCalled = false;
          let impactPromise = null;
          const controls = Object.freeze({
            signal: controller.signal,
            impact: function () {
              if (impactCalled || cancelRequested) return impactPromise || Promise.resolve(false);
              impactCalled = true;
              // Promise 在首次呼叫當下就保存，重複的命中只能取回同一結果。
              impactPromise = Promise.resolve().then(function () {
                if (cancelRequested || !options.onImpact) return false;
                return options.onImpact(action, { index, signal: controller.signal });
              });
              return impactPromise;
            }
          });

          try {
            await options.playAction(action, controls);
            if (impactPromise) await impactPromise;
          } catch (animationErrorCaught) {
            lastAnimationError = animationErrorCaught;
            if (animationError === "stop") throw animationErrorCaught;
            // 動畫失敗時仍可呈現「已結算」的狀態，但不會重新呼叫 nextAction 或補做命中。
            if (impactPromise) await impactPromise;
          }
          if (cancelRequested) { terminal = "cancelled"; break; }
          await options.presentState(action, { index, signal: controller.signal, animationError: lastAnimationError });
          if (cancelRequested) { terminal = "cancelled"; break; }
          index += 1;
          if (options.shouldStop && await options.shouldStop(action, { index, signal: controller.signal })) break;
        }
        if (cancelRequested) terminal = "cancelled";
      } catch (caught) {
        terminal = cancelRequested ? "cancelled" : "error";
        if (terminal === "error") error = caught;
      } finally {
        running = false;
        status = terminal;
        controller = null;
      }

      const result = { status: terminal, count: index, error };
      // 三條互斥通知路徑；宿主 callback 拋錯不會讓鎖永遠卡住。
      if (terminal === "complete" && options.onComplete) await options.onComplete(result);
      if (terminal === "cancelled" && options.onCancel) await options.onCancel(result);
      if (terminal === "error" && options.onError) await options.onError(error, result);
      return result;
    }

    function start() {
      if (running) return currentPromise;
      running = true;
      cancelRequested = false;
      status = "running";
      index = 0;
      controller = new AbortController();
      currentPromise = execute();
      return currentPromise;
    }

    return Object.freeze({ start, cancel, isRunning, getState });
  }

  global.SlowlyActionPlayback = Object.freeze({ version: "1.0.0", create });
})(typeof window !== "undefined" ? window : globalThis);
