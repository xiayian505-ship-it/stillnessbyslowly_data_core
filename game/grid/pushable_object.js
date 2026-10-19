/* 慢慢軍火庫｜Pushable Object 1.0.0
 * 來源：推箱子的單格箱子推動分支。
 * 始終透過 SlowlyGridOccupancy.inspect 檢查通道；只回傳計畫，不改地圖。
 */
(function (global) {
  "use strict";

  function plan_push(options = {}) {
    if (!global.SlowlyGridOccupancy?.inspect) {
      throw new Error("SlowlyGridOccupancy.inspect is required.");
    }
    const position = options.position;
    const direction = options.direction;
    if (!position || !Number.isInteger(position.r) || !Number.isInteger(position.c)) {
      throw new TypeError("position must contain integer r and c.");
    }
    if (!direction || !Number.isInteger(direction.r) || !Number.isInteger(direction.c) ||
        Math.abs(direction.r) + Math.abs(direction.c) !== 1) {
      throw new RangeError("direction must be a single orthogonal step, as { r, c }.");
    }
    const from = Object.freeze({ r: position.r, c: position.c });
    const to = Object.freeze({ r: from.r + direction.r, c: from.c + direction.c });
    const occupancy_options = options.occupancy_options;
    const source = global.SlowlyGridOccupancy.inspect(from, occupancy_options);
    const destination = global.SlowlyGridOccupancy.inspect(to, occupancy_options);
    let reason = "allowed";
    if (!source.in_bounds) reason = "source_out_of_bounds";
    else if (source.blocked) reason = "source_blocked";
    else if (!source.occupied) reason = "source_not_occupied";
    else if (!destination.in_bounds) reason = "destination_out_of_bounds";
    else if (destination.blocked) reason = "destination_blocked";
    else if (destination.occupied) reason = "destination_occupied";
    return Object.freeze({ allowed: reason === "allowed", from, to, reason });
  }

  global.SlowlyPushableObject = Object.freeze({ version: "1.0.0", plan_push });
})(window);
