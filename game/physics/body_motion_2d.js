/*
 * Slowly Body Motion 2D 1.0.0
 * 來源：《Space Cadet Pinball》 physics 的運動整合段。
 * 半隱式 Euler：先更新速度，再以更新後速度推進座標；不含碰撞／繪圖。
 */
(function (global) {
  "use strict";

  function finite_number(value, name) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new TypeError(name + " must be a finite number.");
    }
    return value;
  }

  function vector(value, name) {
    if (!value || typeof value !== "object") {
      throw new TypeError(name + " must be an object.");
    }
    return {
      x: finite_number(value.x, name + ".x"),
      y: finite_number(value.y, name + ".y")
    };
  }

  function step(options = {}) {
    const position = vector(options.position, "position");
    const velocity = vector(options.velocity, "velocity");
    const acceleration = vector(options.acceleration ?? { x: 0, y: 0 }, "acceleration");
    const gravity = vector(options.gravity ?? { x: 0, y: 0 }, "gravity");
    const delta_seconds = finite_number(options.delta_seconds, "delta_seconds");
    const maximum_speed = options.maximum_speed === undefined
      ? Infinity
      : finite_number(options.maximum_speed, "maximum_speed");
    if (delta_seconds < 0 || maximum_speed < 0) {
      throw new RangeError("delta_seconds and maximum_speed must be non-negative.");
    }

    let velocity_x = velocity.x + (acceleration.x + gravity.x) * delta_seconds;
    let velocity_y = velocity.y + (acceleration.y + gravity.y) * delta_seconds;
    const calculated_speed = Math.hypot(velocity_x, velocity_y);
    if (calculated_speed > maximum_speed) {
      const factor = maximum_speed / calculated_speed;
      velocity_x *= factor;
      velocity_y *= factor;
    }
    const result_velocity = Object.freeze({ x: velocity_x, y: velocity_y });
    const result_position = Object.freeze({
      x: position.x + velocity_x * delta_seconds,
      y: position.y + velocity_y * delta_seconds
    });
    return Object.freeze({
      position: result_position,
      velocity: result_velocity,
      speed: Math.hypot(velocity_x, velocity_y)
    });
  }

  global.SlowlyBodyMotion2D = Object.freeze({
    version: "1.0.0",
    step
  });
})(window);
