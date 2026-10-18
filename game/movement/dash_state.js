/*
 * 慢慢軍火庫｜Dash State 1.0.0
 * 抽離自燐珣的禮物的衝刺方向、速度與持續時間控制。
 * 冷卻判斷直接委託軍火庫既有 CooldownGate；不實作第二套冷卻器。
 * update() 的時間單位為秒；CooldownGate 的內部時間單位為毫秒。
 */
(function (global) {
  "use strict";

  function positive_number(value, name) {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      throw new RangeError(name + " must be a positive finite number.");
    }
    return value;
  }

  function non_negative(value, name) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      throw new RangeError(name + " must be a non-negative finite number.");
    }
    return value;
  }

  function normalized_direction(direction) {
    if (!direction || !Number.isFinite(direction.x) || !Number.isFinite(direction.y)) {
      throw new TypeError("direction must contain finite x and y.");
    }
    const magnitude = Math.hypot(direction.x, direction.y);
    return magnitude === 0 ? null : { x: direction.x / magnitude, y: direction.y / magnitude };
  }

  function create(options = {}) {
    if (!global.CooldownGate?.create) {
      throw new Error("CooldownGate must be loaded before Dash State.");
    }
    const duration_seconds = positive_number(options.duration_seconds ?? 0.18, "duration_seconds");
    const speed_multiplier = positive_number(options.speed_multiplier ?? 3, "speed_multiplier");
    const cooldown_seconds = non_negative(options.cooldown_seconds ?? 1.6, "cooldown_seconds");
    const allow_steering = options.allow_steering === true;
    // 時間由宿主逐幀提供；遊戲暫停時，模擬冷卻也會暫停。
    let elapsed_milliseconds = 0;
    const cooldown = global.CooldownGate.create({
      duration: cooldown_seconds * 1000,
      now: () => elapsed_milliseconds
    });
    let remaining_seconds = 0;
    let direction = { x: 0, y: 0 };
    let destroyed = false;

    function assert_alive() {
      if (destroyed) throw new Error("Dash State is destroyed.");
    }

    function snapshot() {
      const cooldown_snapshot = cooldown.snapshot(elapsed_milliseconds);
      return Object.freeze({
        active: remaining_seconds > 0 && !destroyed,
        remaining_seconds,
        cooldown_remaining_seconds: cooldown_snapshot.remaining / 1000,
        ready: remaining_seconds === 0 && !cooldown_snapshot.locked && !destroyed,
        direction: Object.freeze({ ...direction }),
        speed_multiplier: remaining_seconds > 0 && !destroyed ? speed_multiplier : 1
      });
    }

    function try_start(next_direction, fallback_direction = null) {
      assert_alive();
      if (remaining_seconds > 0) return Object.freeze({ allowed: false, reason: "already_active", snapshot: snapshot() });
      const chosen = normalized_direction(next_direction) || (fallback_direction ? normalized_direction(fallback_direction) : null);
      if (!chosen) return Object.freeze({ allowed: false, reason: "zero_direction", snapshot: snapshot() });
      const result = cooldown.tryTrigger(elapsed_milliseconds);
      if (!result.allowed) return Object.freeze({ allowed: false, reason: "cooldown", snapshot: snapshot() });
      direction = chosen;
      remaining_seconds = duration_seconds;
      return Object.freeze({ allowed: true, reason: "started", snapshot: snapshot() });
    }

    function update(delta_seconds, steering_direction = null) {
      assert_alive();
      non_negative(delta_seconds, "delta_seconds");
      elapsed_milliseconds += delta_seconds * 1000;
      if (allow_steering && steering_direction && remaining_seconds > 0) {
        const updated = normalized_direction(steering_direction);
        if (updated) direction = updated;
      }
      remaining_seconds = Math.max(0, remaining_seconds - delta_seconds);
      return snapshot();
    }

    function cancel() {
      assert_alive();
      remaining_seconds = 0;
      return snapshot();
    }

    function reset() {
      assert_alive();
      remaining_seconds = 0;
      direction = { x: 0, y: 0 };
      cooldown.reset();
      return snapshot();
    }

    function destroy() {
      remaining_seconds = 0;
      destroyed = true;
    }

    return Object.freeze({ version: "1.0.0", snapshot, try_start, update, cancel, reset, destroy });
  }

  global.SlowlyDashState = Object.freeze({ version: "1.0.0", create });
})(window);
