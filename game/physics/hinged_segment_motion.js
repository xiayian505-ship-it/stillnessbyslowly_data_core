/*
 * Slowly Hinged Segment Motion 1.0.0
 * 來源：《Space Cadet Pinball》 tip / stepFlipper 的一般化轉軸運動。
 * 角度使用弧度，逆時針在數學 y 向上座標為正；Canvas y 向下則正角度看起來順時針。
 */
(function (global) {
  "use strict";

  function finite_number(value, name) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new TypeError(name + " must be a finite number.");
    }
    return value;
  }

  function point(value, name) {
    if (!value || typeof value !== "object") {
      throw new TypeError(name + " must be an object.");
    }
    return {
      x: finite_number(value.x, name + ".x"),
      y: finite_number(value.y, name + ".y")
    };
  }

  function end_point(options = {}) {
    const pivot = point(options.pivot, "pivot");
    const length = finite_number(options.length, "length");
    const angle = finite_number(options.angle, "angle");
    if (length < 0) throw new RangeError("length must be non-negative.");
    return Object.freeze({
      x: pivot.x + Math.cos(angle) * length,
      y: pivot.y + Math.sin(angle) * length
    });
  }

  function point_velocity(options = {}) {
    const pivot = point(options.pivot, "pivot");
    const contact_point = point(options.point, "point");
    const angular_velocity = finite_number(options.angular_velocity, "angular_velocity");
    return Object.freeze({
      x: -(contact_point.y - pivot.y) * angular_velocity,
      y: (contact_point.x - pivot.x) * angular_velocity
    });
  }

  function step(options = {}) {
    const pivot = point(options.pivot, "pivot");
    const length = finite_number(options.length, "length");
    const angle = finite_number(options.angle, "angle");
    const target_angle = finite_number(options.target_angle, "target_angle");
    const maximum_angular_speed = finite_number(options.maximum_angular_speed, "maximum_angular_speed");
    const delta_seconds = finite_number(options.delta_seconds, "delta_seconds");
    if (length < 0 || maximum_angular_speed < 0 || delta_seconds < 0) {
      throw new RangeError("length, maximum_angular_speed and delta_seconds must be non-negative.");
    }
    const remaining = target_angle - angle;
    const maximum_step = maximum_angular_speed * delta_seconds;
    const next_angle = delta_seconds === 0
      ? angle
      : angle + Math.sign(remaining) * Math.min(Math.abs(remaining), maximum_step);
    const angular_velocity = delta_seconds === 0 ? 0 : (next_angle - angle) / delta_seconds;
    const result_point = end_point({ pivot, length, angle: next_angle });
    return Object.freeze({
      angle: next_angle,
      angular_velocity,
      end_point: result_point,
      reached_target: next_angle === target_angle
    });
  }

  global.SlowlyHingedSegmentMotion = Object.freeze({
    version: "1.0.0",
    step,
    end_point,
    point_velocity
  });
})(window);
