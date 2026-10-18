/*
 * Slowly Collision Response 2D 1.0.0
 * 來源：《Space Cadet Pinball》 hitSeg 的法線反彈段。
 * 純速度反應，不執行幾何命中、座標穿透修正、碰撞搜尋。
 */
(function (global) {
  "use strict";

  function finite_number(value, label) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new TypeError(label + " must be a finite number.");
    }
    return value;
  }

  function vector(value, label) {
    if (!value || typeof value !== "object") {
      throw new TypeError(label + " must be an object.");
    }
    return {
      x: finite_number(value.x, label + ".x"),
      y: finite_number(value.y, label + ".y")
    };
  }

  function calculate(options = {}) {
    const velocity = vector(options.velocity, "velocity");
    const surface_velocity = vector(options.surface_velocity ?? { x: 0, y: 0 }, "surface_velocity");
    const supplied_normal = vector(options.normal, "normal");
    const normal_length = Math.hypot(supplied_normal.x, supplied_normal.y);
    if (normal_length <= 0) {
      throw new RangeError("normal must be non-zero.");
    }
    const normal = {
      x: supplied_normal.x / normal_length,
      y: supplied_normal.y / normal_length
    };
    const restitution = finite_number(options.restitution ?? 0.5, "restitution");
    const minimum_bounce_speed = finite_number(
      options.minimum_bounce_speed ?? 0, "minimum_bounce_speed"
    );
    if (restitution < 0 || restitution > 1 || minimum_bounce_speed < 0) {
      throw new RangeError("restitution must be 0..1; minimum_bounce_speed must be >= 0.");
    }

    const relative_x = velocity.x - surface_velocity.x;
    const relative_y = velocity.y - surface_velocity.y;
    const normal_speed = relative_x * normal.x + relative_y * normal.y;
    const collided = normal_speed < 0;
    const impact_speed = collided ? -normal_speed : 0;
    const restitution_applied = impact_speed < minimum_bounce_speed ? 0 : restitution;
    const impulse_per_unit_mass = collided ? (1 + restitution_applied) * impact_speed : 0;
    const result_velocity = collided ? {
      x: velocity.x + impulse_per_unit_mass * normal.x,
      y: velocity.y + impulse_per_unit_mass * normal.y
    } : { ...velocity };

    return Object.freeze({
      collided,
      impact_speed,
      normal_speed,
      restitution_applied: collided ? restitution_applied : 0,
      impulse_per_unit_mass,
      velocity: Object.freeze(result_velocity),
      normal: Object.freeze(normal)
    });
  }

  global.SlowlyCollisionResponse2D = Object.freeze({
    version: "1.0.0",
    calculate
  });
})(window);
