/* 慢慢軍火庫｜Rectangle Overlap 2D 1.0.0
 * 來源：小蜜蜂的 axis-aligned rectanglesOverlap。
 * 不包含物理反彈、旋轉矩形、DOM 碰撞事件。
 */
(function (global) {
  "use strict";

  function rectangle(value, label) {
    if (!value || typeof value !== "object") throw new TypeError(label + " must be an object.");
    const fields = {};
    for (const name of ["x", "y", "width", "height"]) {
      if (typeof value[name] !== "number" || !Number.isFinite(value[name])) {
        throw new TypeError(label + "." + name + " must be finite.");
      }
      fields[name] = value[name];
    }
    if (fields.width < 0 || fields.height < 0) throw new RangeError("Dimensions must be non-negative.");
    return fields;
  }

  function inspect(first_rectangle, second_rectangle, options = {}) {
    const first = rectangle(first_rectangle, "first_rectangle");
    const second = rectangle(second_rectangle, "second_rectangle");
    const overlap_x = Math.max(0, Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x));
    const overlap_y = Math.max(0, Math.min(first.y + first.height, second.y + second.height) - Math.max(first.y, second.y));
    const intersects_x = first.x <= second.x + second.width && second.x <= first.x + first.width;
    const intersects_y = first.y <= second.y + second.height && second.y <= first.y + first.height;
    const positive_area = first.width > 0 && first.height > 0 && second.width > 0 && second.height > 0;
    const inclusive = options.inclusive === true;
    const overlapping = positive_area && (inclusive ? intersects_x && intersects_y : overlap_x > 0 && overlap_y > 0);
    return Object.freeze({ overlapping, overlap_x, overlap_y, touching: positive_area && intersects_x && intersects_y &&
      (overlap_x === 0 || overlap_y === 0) });
  }

  function overlaps(first_rectangle, second_rectangle, options = {}) {
    return inspect(first_rectangle, second_rectangle, options).overlapping;
  }

  global.SlowlyRectangleOverlap2D = Object.freeze({ version: "1.0.0", inspect, overlaps });
})(window);
