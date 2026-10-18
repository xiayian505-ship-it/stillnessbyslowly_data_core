/*
 * 慢慢軍火庫｜Circle Collision 1.0.0
 * 來源：燐珣的禮物中的圓形接觸判斷。
 * 純幾何計算，不包含遊戲規則、繪圖或物理反應。
 */
(function (global) {
  "use strict";

  function finite_number(value, label) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new TypeError(label + " must be a finite number.");
    }
    return value;
  }

  function normalize_circle(circle, label) {
    if (!circle || typeof circle !== "object") {
      throw new TypeError(label + " must be a circle object.");
    }
    const x = finite_number(circle.x, label + ".x");
    const y = finite_number(circle.y, label + ".y");
    const radius = finite_number(circle.radius, label + ".radius");
    if (radius < 0) {
      throw new RangeError(label + ".radius must be >= 0.");
    }
    return { x, y, radius };
  }

  function inspect(first_circle, second_circle, options = {}) {
    const first = normalize_circle(first_circle, "first_circle");
    const second = normalize_circle(second_circle, "second_circle");
    const distance = Math.hypot(first.x - second.x, first.y - second.y);
    const radius_sum = first.radius + second.radius;
    const inclusive = options.inclusive !== false;

    return Object.freeze({
      distance,
      radius_sum,
      touching: inclusive ? distance <= radius_sum : distance < radius_sum,
      exactly_tangent: distance === radius_sum,
      overlap_depth: Math.max(0, radius_sum - distance)
    });
  }

  function touches(first_circle, second_circle, options = {}) {
    return inspect(first_circle, second_circle, options).touching;
  }

  global.SlowlyCircleCollision = Object.freeze({
    version: "1.0.0",
    inspect,
    touches
  });
})(window);
