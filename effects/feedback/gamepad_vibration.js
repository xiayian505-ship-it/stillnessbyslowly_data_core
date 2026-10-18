/*
 * Slowly Gamepad Vibration 1.0.0
 * 來源：《Space Cadet Pinball》 Haptics.pulse 的遊戲手把部分。
 * 僅處理 Gamepad 震動；手機 navigator.vibrate 請引用 SlowlyDeviceVibration。
 */
(function (global) {
  "use strict";

  function finite_number(value, name) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new TypeError(name + " must be a finite number.");
    }
    return value;
  }

  function normalize_strength(value, name) {
    const number = finite_number(value, name);
    if (number < 0 || number > 1) throw new RangeError(name + " must be 0..1.");
    return number;
  }

  function create(options = {}) {
    if (options.get_gamepads != null && typeof options.get_gamepads !== "function") {
      throw new TypeError("get_gamepads must be a function.");
    }
    const get_gamepads = options.get_gamepads ?? function () {
      return typeof global.navigator?.getGamepads === "function"
        ? global.navigator.getGamepads()
        : [];
    };
    let enabled = options.enabled !== false;

    function actuator_from_gamepad(gamepad) {
      if (!gamepad) return null;
      const candidates = [gamepad.vibrationActuator, ...(gamepad.vibrationActuators ?? [])];
      return candidates.find(actuator => actuator &&
        (typeof actuator.playEffect === "function" || typeof actuator.pulse === "function")) ?? null;
    }

    function available_gamepads() {
      try {
        return Array.from(get_gamepads() ?? []).map((gamepad, index) => ({
          gamepad,
          index,
          actuator: actuator_from_gamepad(gamepad)
        })).filter(entry => entry.actuator);
      } catch (error) {
        return [];
      }
    }

    function find_gamepads() {
      return Object.freeze(available_gamepads().map(entry => entry.index));
    }

    function is_supported() {
      return available_gamepads().length > 0;
    }

    function choose_gamepads(gamepad_index) {
      const all = available_gamepads();
      if (gamepad_index == null) return all;
      const value = finite_number(gamepad_index, "gamepad_index");
      if (!Number.isInteger(value) || value < 0) {
        throw new RangeError("gamepad_index must be a non-negative integer.");
      }
      return all.filter(entry => entry.index === value);
    }

    async function trigger(options = {}) {
      const duration_ms = finite_number(options.duration_ms ?? 100, "duration_ms");
      const strong_magnitude = normalize_strength(options.strong_magnitude ?? 0.6, "strong_magnitude");
      const weak_magnitude = normalize_strength(options.weak_magnitude ?? 0.6, "weak_magnitude");
      if (duration_ms < 0) throw new RangeError("duration_ms must be non-negative.");
      if (!enabled) return Object.freeze({ attempted: 0, succeeded: 0, results: Object.freeze([]) });
      const targets = choose_gamepads(options.gamepad_index);
      const results = await Promise.all(targets.map(async entry => {
        try {
          let outcome;
          if (typeof entry.actuator.playEffect === "function") {
            outcome = await entry.actuator.playEffect("dual-rumble", {
              startDelay: 0,
              duration: duration_ms,
              strongMagnitude: strong_magnitude,
              weakMagnitude: weak_magnitude
            });
          } else {
            outcome = await entry.actuator.pulse(strong_magnitude, duration_ms);
          }
          return Object.freeze({ index: entry.index, success: outcome !== false && outcome !== "preempted" && outcome !== "not-supported", outcome });
        } catch (error) {
          return Object.freeze({ index: entry.index, success: false, error: String(error) });
        }
      }));
      return Object.freeze({
        attempted: results.length,
        succeeded: results.filter(result => result.success).length,
        results: Object.freeze(results)
      });
    }

    async function stop(gamepad_index) {
      const targets = choose_gamepads(gamepad_index);
      const results = await Promise.all(targets.map(async entry => {
        try {
          let outcome;
          if (typeof entry.actuator.reset === "function") {
            outcome = await entry.actuator.reset();
          } else if (typeof entry.actuator.playEffect === "function") {
            outcome = await entry.actuator.playEffect("dual-rumble", {
              startDelay: 0,
              duration: 0,
              strongMagnitude: 0,
              weakMagnitude: 0
            });
          } else {
            outcome = await entry.actuator.pulse(0, 0);
          }
          return Object.freeze({ index: entry.index, success: outcome !== false && outcome !== "preempted" && outcome !== "not-supported" });
        } catch (error) {
          return Object.freeze({ index: entry.index, success: false, error: String(error) });
        }
      }));
      return Object.freeze({
        attempted: results.length,
        succeeded: results.filter(result => result.success).length,
        results: Object.freeze(results)
      });
    }

    async function set_enabled(next_enabled) {
      enabled = Boolean(next_enabled);
      if (!enabled) await stop();
      return enabled;
    }

    function get_state() {
      return Object.freeze({ enabled, gamepad_indexes: find_gamepads() });
    }

    return Object.freeze({ version: "1.0.0", find_gamepads, is_supported, trigger, stop, set_enabled, get_state });
  }

  global.SlowlyGamepadVibration = Object.freeze({ version: "1.0.0", create });
})(window);
