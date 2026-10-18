/*
 * Slowly Hold Charge Control 1.0.0
 * 來源：《Space Cadet Pinball》 G.charging / update / launch 按放狀態。
 * 蓄力數值委託軍火庫既有 ChargeState；本零件只管理按住與釋放生命週期。
 * 依賴：https://lib.stillnessbyslowly.com/game/combat/charge_state.js
 */
(function (global) {
  "use strict";

  function finite_number(value, name) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new TypeError(name + " must be a finite number.");
    }
    return value;
  }

  function progress_value(value, name) {
    const number = finite_number(value, name);
    if (number < 0 || number > 1) {
      throw new RangeError(name + " must be between 0 and 1.");
    }
    return number;
  }

  function create(options = {}) {
    if (!global.ChargeState || typeof global.ChargeState.create !== "function") {
      throw new Error("ChargeState.create is required before Hold Charge Control.");
    }
    const duration_seconds = finite_number(options.duration_seconds ?? 1, "duration_seconds");
    const minimum_progress = progress_value(options.minimum_progress ?? 0, "minimum_progress");
    const maximum_progress = progress_value(options.maximum_progress ?? 1, "maximum_progress");
    const on_release = options.on_release;
    if (duration_seconds <= 0 || maximum_progress < minimum_progress) {
      throw new RangeError("duration_seconds must be > 0; maximum_progress must be >= minimum_progress.");
    }
    if (on_release != null && typeof on_release !== "function") {
      throw new TypeError("on_release must be a function.");
    }

    const charge_state = global.ChargeState.create({ initial: 0 });
    let charging = false;
    let elapsed_seconds = 0;
    let last_release_progress = null;

    function get_state() {
      return Object.freeze({
        charging,
        elapsed_seconds,
        progress: charge_state.get(),
        last_release_progress
      });
    }

    function press() {
      if (charging) return false;
      charge_state.clear();
      elapsed_seconds = 0;
      last_release_progress = null;
      charging = true;
      return true;
    }

    function update(delta_seconds) {
      const delta = finite_number(delta_seconds, "delta_seconds");
      if (delta < 0) throw new RangeError("delta_seconds must be non-negative.");
      if (charging) {
        elapsed_seconds += delta;
        charge_state.set(Math.min(1, elapsed_seconds / duration_seconds));
      }
      return get_state();
    }

    function release() {
      if (!charging) return null;
      charging = false;
      const progress = minimum_progress +
        (maximum_progress - minimum_progress) * charge_state.get();
      last_release_progress = progress;
      charge_state.clear();
      const result = Object.freeze({ progress, elapsed_seconds });
      if (on_release) on_release(result);
      return result;
    }

    function cancel() {
      const was_charging = charging;
      charging = false;
      elapsed_seconds = 0;
      charge_state.clear();
      return was_charging;
    }

    function reset() {
      cancel();
      last_release_progress = null;
      return get_state();
    }

    return Object.freeze({
      version: "1.0.0",
      press,
      update,
      release,
      cancel,
      reset,
      get_state
    });
  }

  global.SlowlyHoldChargeControl = Object.freeze({
    version: "1.0.0",
    create
  });
})(window);
