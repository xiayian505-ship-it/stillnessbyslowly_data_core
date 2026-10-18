/*
 * 慢慢軍火庫｜Movement Patterns 2D 1.0.0
 * 由燐珣的禮物的反彈、追蹤、巡邏行為抽離。
 * 各操作均為純計算，不更動宿主傳入的物件。
 */
(function (global) {
  "use strict";

  function finite_number(value, name) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new TypeError(name + " must be a finite number.");
    }
    return value;
  }

  function non_negative(value, name) {
    const number = finite_number(value, name);
    if (number < 0) {
      throw new RangeError(name + " must be >= 0.");
    }
    return number;
  }

  function point(value, name) {
    if (!value || typeof value !== "object") {
      throw new TypeError(name + " must be an object.");
    }
    return { x: finite_number(value.x, name + ".x"), y: finite_number(value.y, name + ".y") };
  }

  // 把超出兩端點的位移鏡射回範圍，支援單幀跨越多個邊界。
  function reflect(position, velocity, minimum, maximum, elapsed_seconds) {
    const span = maximum - minimum;
    if (span === 0) {
      return { position: minimum, velocity: 0 };
    }
    const travel = position + velocity * elapsed_seconds - minimum;
    const period = 2 * span;
    const within_period = ((travel % period) + period) % period;
    const reflected = within_period <= span ? within_period : period - within_period;
    let boundary_direction = within_period < span ? 1 : -1;
    // 正好抵達端點，也要依原行進方向判斷是否折返。
    if (within_period === 0 && velocity < 0) boundary_direction = -1;
    if (within_period === span && velocity < 0) boundary_direction = 1;
    return {
      position: minimum + reflected,
      velocity: velocity * boundary_direction
    };
  }

  function bounce(position, bounds, delta_seconds) {
    const current = point(position, "position");
    const velocity_x = finite_number(position.velocity_x, "position.velocity_x");
    const velocity_y = finite_number(position.velocity_y, "position.velocity_y");
    const radius = non_negative(position.radius ?? 0, "position.radius");
    const elapsed = non_negative(delta_seconds, "delta_seconds");
    if (!bounds) {
      throw new TypeError("bounds is required.");
    }
    const minimum_x = finite_number(bounds.min_x, "bounds.min_x") + radius;
    const maximum_x = finite_number(bounds.max_x, "bounds.max_x") - radius;
    const minimum_y = finite_number(bounds.min_y, "bounds.min_y") + radius;
    const maximum_y = finite_number(bounds.max_y, "bounds.max_y") - radius;
    if (minimum_x > maximum_x || minimum_y > maximum_y) {
      throw new RangeError("bounds must fit the moving circle.");
    }
    if (current.x < minimum_x || current.x > maximum_x || current.y < minimum_y || current.y > maximum_y) {
      throw new RangeError("position must be inside bounds.");
    }
    const horizontal = reflect(current.x, velocity_x, minimum_x, maximum_x, elapsed);
    const vertical = reflect(current.y, velocity_y, minimum_y, maximum_y, elapsed);
    return Object.freeze({
      x: horizontal.position,
      y: vertical.position,
      velocity_x: horizontal.velocity,
      velocity_y: vertical.velocity,
      radius
    });
  }

  function chase(position, target, options = {}) {
    const current = point(position, "position");
    const destination = point(target, "target");
    const speed = non_negative(options.speed, "options.speed");
    const elapsed = non_negative(options.delta_seconds, "options.delta_seconds");
    const stopping_distance = non_negative(options.stopping_distance ?? 0, "options.stopping_distance");
    const delta_x = destination.x - current.x;
    const delta_y = destination.y - current.y;
    const distance = Math.hypot(delta_x, delta_y);
    const travel = Math.min(Math.max(0, distance - stopping_distance), speed * elapsed);
    const direction_x = distance === 0 ? 0 : delta_x / distance;
    const direction_y = distance === 0 ? 0 : delta_y / distance;
    return Object.freeze({
      x: current.x + direction_x * travel,
      y: current.y + direction_y * travel,
      direction_x,
      direction_y,
      velocity_x: direction_x * speed,
      velocity_y: direction_y * speed,
      reached: distance <= stopping_distance + travel
    });
  }

  // position.direction = 1 代表朝 end 前進，-1 代表朝 start 前進。
  function patrol(position, start, end, options = {}) {
    const current = point(position, "position");
    const origin = point(start, "start");
    const destination = point(end, "end");
    const speed = non_negative(options.speed, "options.speed");
    const elapsed = non_negative(options.delta_seconds, "options.delta_seconds");
    const direction = options.direction ?? position.direction ?? 1;
    if (direction !== 1 && direction !== -1) {
      throw new RangeError("direction must be 1 or -1.");
    }
    const span_x = destination.x - origin.x;
    const span_y = destination.y - origin.y;
    const length = Math.hypot(span_x, span_y);
    if (length === 0) {
      return Object.freeze({ x: origin.x, y: origin.y, direction: 1 });
    }
    const projection = ((current.x - origin.x) * span_x + (current.y - origin.y) * span_y) / length;
    if (projection < -1e-7 || projection > length + 1e-7) {
      throw new RangeError("position must project inside the patrol segment.");
    }
    const segment = reflect(Math.max(0, Math.min(length, projection)), direction * speed, 0, length, elapsed);
    const final_direction = speed === 0 ? direction : Math.sign(segment.velocity) || direction;
    return Object.freeze({
      x: origin.x + span_x * segment.position / length,
      y: origin.y + span_y * segment.position / length,
      direction: final_direction
    });
  }

  global.SlowlyMovementPatterns2D = Object.freeze({
    version: "1.0.0",
    bounce,
    chase,
    patrol
  });
})(window);
