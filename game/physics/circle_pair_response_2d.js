/* 慢慢軍火庫｜Circle Pair Response 2D 1.0.0
 * 來源：大西瓜中兩個動態圓形的穿透分離與碰撞衝量（非合成段）。
 * 使用 SlowlyCircleCollision.inspect 做幾何判斷，不複製碰撞偵測。
 * 與原作不同：此通用版本依各自反質量分配位置校正與碰撞衝量。
 */
(function (global) {
  "use strict";

  function finite(value, label) {
    if (typeof value !== "number" || !Number.isFinite(value)) throw new TypeError(label + " must be finite.");
    return value;
  }

  function body(value, label) {
    if (!value || typeof value !== "object") throw new TypeError(label + " must be an object.");
    const result = {
      x: finite(value.x, label + ".x"), y: finite(value.y, label + ".y"),
      radius: finite(value.radius, label + ".radius"),
      vx: finite(value.vx, label + ".vx"), vy: finite(value.vy, label + ".vy")
    };
    if (result.radius < 0) throw new RangeError(label + ".radius must be non-negative.");
    return result;
  }

  function resolve_pair(first_circle, second_circle, options = {}) {
    if (!global.SlowlyCircleCollision?.inspect) throw new Error("SlowlyCircleCollision.inspect is required.");
    const first = body(first_circle, "first_circle");
    const second = body(second_circle, "second_circle");
    const restitution = finite(options.restitution ?? 0.4, "restitution");
    if (restitution < 0 || restitution > 1) throw new RangeError("restitution must be 0..1.");
    const first_mass = options.first_mass ?? Math.max(first.radius ** 2, 1);
    const second_mass = options.second_mass ?? Math.max(second.radius ** 2, 1);
    // Infinity explicitly represents an immovable body; zero is invalid.
    for (const [name, mass] of [["first_mass", first_mass], ["second_mass", second_mass]]) {
      if (typeof mass !== "number" || mass <= 0 || Number.isNaN(mass)) {
        throw new RangeError(name + " must be positive or Infinity.");
      }
    }
    const contact = global.SlowlyCircleCollision.inspect(first, second);
    if (!contact.touching) {
      return Object.freeze({ collided: false, first: Object.freeze(first), second: Object.freeze(second),
        penetration: 0, impact_speed: 0 });
    }
    const distance = contact.distance;
    const normal = distance > 0
      ? { x: (second.x - first.x) / distance, y: (second.y - first.y) / distance }
      : options.fallback_normal;
    if (!normal || !Number.isFinite(normal.x) || !Number.isFinite(normal.y) || Math.hypot(normal.x, normal.y) === 0) {
      throw new RangeError("Coincident centers require a non-zero fallback_normal.");
    }
    const normal_size = Math.hypot(normal.x, normal.y);
    const normal_x = normal.x / normal_size;
    const normal_y = normal.y / normal_size;
    const inverse_first = first_mass === Infinity ? 0 : 1 / first_mass;
    const inverse_second = second_mass === Infinity ? 0 : 1 / second_mass;
    const inverse_total = inverse_first + inverse_second;
    const penetration = contact.overlap_depth;
    if (inverse_total > 0 && penetration > 0) {
      first.x -= normal_x * penetration * inverse_first / inverse_total;
      first.y -= normal_y * penetration * inverse_first / inverse_total;
      second.x += normal_x * penetration * inverse_second / inverse_total;
      second.y += normal_y * penetration * inverse_second / inverse_total;
    }
    const relative_normal_speed = (second.vx - first.vx) * normal_x + (second.vy - first.vy) * normal_y;
    const impact_speed = Math.max(0, -relative_normal_speed);
    if (inverse_total > 0 && impact_speed > 0) {
      const impulse = (1 + restitution) * impact_speed / inverse_total;
      first.vx -= impulse * inverse_first * normal_x;
      first.vy -= impulse * inverse_first * normal_y;
      second.vx += impulse * inverse_second * normal_x;
      second.vy += impulse * inverse_second * normal_y;
    }
    return Object.freeze({ collided: true, first: Object.freeze(first), second: Object.freeze(second), penetration,
      impact_speed });
  }

  global.SlowlyCirclePairResponse2D = Object.freeze({ version: "1.0.0", resolve_pair });
})(window);
