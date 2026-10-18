/*
 * Slowly Circle Segment Collision 1.0.0
 * 來源：《Space Cadet Pinball》 hitSeg 的幾何段。
 * 純幾何：不改座標或速度，也不處理圓形對圓形碰撞。
 */
(function (global) {
  "use strict";

  function finite_number(value, label) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new TypeError(label + " must be a finite number.");
    }
    return value;
  }

  function point(value, label) {
    if (!value || typeof value !== "object") {
      throw new TypeError(label + " must be an object.");
    }
    return {
      x: finite_number(value.x, label + ".x"),
      y: finite_number(value.y, label + ".y")
    };
  }

  function inspect(options = {}) {
    const circle = options.circle;
    const segment = options.segment;
    if (!circle || !segment) {
      throw new TypeError("circle and segment are required.");
    }
    const center = point(circle, "circle");
    const radius = finite_number(circle.radius, "circle.radius");
    const start = point(segment.start, "segment.start");
    const end = point(segment.end, "segment.end");
    const thickness = finite_number(options.thickness ?? 0, "thickness");
    if (radius < 0 || thickness < 0) {
      throw new RangeError("radius and thickness must be non-negative.");
    }

    const segment_x = end.x - start.x;
    const segment_y = end.y - start.y;
    const squared_length = segment_x * segment_x + segment_y * segment_y;
    const raw_parameter = squared_length === 0
      ? 0
      : ((center.x - start.x) * segment_x + (center.y - start.y) * segment_y) / squared_length;
    const segment_parameter = Math.max(0, Math.min(1, raw_parameter));
    const closest_point = {
      x: start.x + segment_x * segment_parameter,
      y: start.y + segment_y * segment_parameter
    };
    const delta_x = center.x - closest_point.x;
    const delta_y = center.y - closest_point.y;
    const distance = Math.hypot(delta_x, delta_y);
    const collision_distance = radius + thickness;
    const touching = options.inclusive === false
      ? distance < collision_distance
      : distance <= collision_distance;

    // 圓心與最近點重疊：先採用宿主提供的備援法線；
    // 否則採用線段左法線；若線段也退化為點，固定使用 (1, 0)。
    let normal;
    let normal_was_fallback = false;
    if (distance > 0) {
      normal = { x: delta_x / distance, y: delta_y / distance };
    } else {
      normal_was_fallback = true;
      if (options.fallback_normal !== undefined) {
        const supplied = point(options.fallback_normal, "fallback_normal");
        const magnitude = Math.hypot(supplied.x, supplied.y);
        if (magnitude === 0) {
          throw new RangeError("fallback_normal must not be zero.");
        }
        normal = { x: supplied.x / magnitude, y: supplied.y / magnitude };
      } else if (squared_length > 0) {
        const length = Math.sqrt(squared_length);
        normal = { x: -segment_y / length, y: segment_x / length };
      } else {
        normal = { x: 1, y: 0 };
      }
    }

    return Object.freeze({
      touching,
      distance,
      collision_distance,
      overlap_depth: Math.max(0, collision_distance - distance),
      exactly_tangent: distance === collision_distance,
      segment_parameter,
      closest_point: Object.freeze(closest_point),
      normal: Object.freeze(normal),
      degenerate_segment: squared_length === 0,
      normal_was_fallback
    });
  }

  function touches(options) {
    return inspect(options).touching;
  }

  global.SlowlyCircleSegmentCollision = Object.freeze({
    version: "1.0.0",
    inspect,
    touches
  });
})(window);
