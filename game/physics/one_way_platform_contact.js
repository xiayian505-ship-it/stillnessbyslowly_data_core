/* 慢慢軍火庫｜One Way Platform Contact 1.0.0
 * 來源：小朋友下樓梯的「上一幀腳底跨越平台頂面」判斷。
 * 使用 SlowlyRectangleOverlap2D 判斷橫向接觸；不做角色重力積分。
 */
(function (global) {
  "use strict";

  function inspect_landing(options = {}) {
    if (!global.SlowlyRectangleOverlap2D?.overlaps) {
      throw new Error("SlowlyRectangleOverlap2D.overlaps is required.");
    }
    const { previous_body, current_body, platform } = options;
    const margin = options.horizontal_margin ?? 0;
    const velocity_y = options.velocity_y;
    if (typeof margin !== "number" || !Number.isFinite(margin) || margin < 0) {
      throw new RangeError("horizontal_margin must be finite and non-negative.");
    }
    if (typeof velocity_y !== "number" || !Number.isFinite(velocity_y)) {
      throw new TypeError("velocity_y must be finite.");
    }
    for (const [label, rectangle] of [["previous_body", previous_body], ["current_body", current_body], ["platform", platform]]) {
      if (!rectangle || ["x", "y", "width", "height"].some(key => typeof rectangle[key] !== "number" || !Number.isFinite(rectangle[key])) ||
          rectangle.width < 0 || rectangle.height < 0) {
        throw new TypeError(label + " must be a finite rectangle with non-negative dimensions.");
      }
    }
    const previous_bottom = previous_body.y + previous_body.height;
    const current_bottom = current_body.y + current_body.height;
    const platform_top = platform.y;
    // Vertical spans overlap even when the horizontal shape is only a narrow projection.
    const horizontal_overlap = global.SlowlyRectangleOverlap2D.overlaps(
      { x: current_body.x - margin, y: 0, width: current_body.width + margin * 2, height: 1 },
      { x: platform.x, y: 0, width: platform.width, height: 1 }
    );
    const landed = velocity_y > 0 && current_bottom >= previous_bottom &&
      previous_bottom <= platform_top && current_bottom >= platform_top && horizontal_overlap;
    return Object.freeze({ landed, corrected_y: landed ? platform_top - current_body.height : null,
      suggested_velocity_y: landed ? 0 : null, platform_top });
  }

  global.SlowlyOneWayPlatformContact = Object.freeze({ version: "1.0.0", inspect_landing });
})(window);
