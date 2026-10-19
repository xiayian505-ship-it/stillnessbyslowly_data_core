/* 慢慢軍火庫｜Moving Platform Carrier 1.0.0
 * 來源：青蛙過街的木頭承載水平位移。新增通用二維位移輸出。
 * 零件不模擬載具運動，亦不判定未受支撐時的死亡規則。
 */
(function (global) {
  "use strict";

  function point(value, label) {
    if (!value || typeof value !== "object" ||
        typeof value.x !== "number" || !Number.isFinite(value.x) ||
        typeof value.y !== "number" || !Number.isFinite(value.y)) {
      throw new TypeError(label + " must contain finite x and y numbers.");
    }
    return { x: value.x, y: value.y };
  }

  function carry(options = {}) {
    if (typeof options.supported !== "boolean") {
      throw new TypeError("supported must be a boolean determined by the host.");
    }
    const position = point(options.position, "position");
    const previous = point(options.platform_previous, "platform_previous");
    const current = point(options.platform_current, "platform_current");
    const displacement = options.supported
      ? { x: current.x - previous.x, y: current.y - previous.y }
      : { x: 0, y: 0 };
    return Object.freeze({
      supported: options.supported,
      displacement: Object.freeze(displacement),
      carried_position: Object.freeze({
        x: position.x + displacement.x,
        y: position.y + displacement.y
      })
    });
  }

  /* 僅是可選的支撐候選搜尋；真正的著地、承載邏輯仍由宿主判斷。
   * 同分距離時按候選陣列先後順序決勝，宿主可自行排序決定優先級。
   */
  function find_support(options = {}) {
    if (!Array.isArray(options.candidates)) throw new TypeError("candidates must be an array.");
    if (typeof global.SlowlyRectangleOverlap2D?.inspect !== "function") {
      throw new Error("SlowlyRectangleOverlap2D.inspect is required for find_support.");
    }
    const actor_rectangle = options.actor_rectangle;
    const rectangle_of = options.rectangle_of ?? (item => item.rectangle);
    const eligible = options.is_eligible ?? (() => true);
    if (typeof rectangle_of !== "function" || typeof eligible !== "function") {
      throw new TypeError("rectangle_of and is_eligible must be functions.");
    }
    let chosen = null;
    let chosen_index = -1;
    let smallest_distance = Infinity;
    for (let index = 0; index < options.candidates.length; index += 1) {
      const candidate = options.candidates[index];
      if (!eligible(candidate, index)) continue;
      const rectangle = rectangle_of(candidate, index);
      if (!global.SlowlyRectangleOverlap2D.inspect(actor_rectangle, rectangle, { inclusive: true }).overlapping) {
        continue;
      }
      const midpoint_x = rectangle.x + rectangle.width / 2;
      const actor_midpoint_x = actor_rectangle.x + actor_rectangle.width / 2;
      const distance = Math.abs(midpoint_x - actor_midpoint_x);
      if (distance < smallest_distance) {
        smallest_distance = distance;
        chosen = candidate;
        chosen_index = index;
      }
    }
    return Object.freeze({ supported: chosen_index !== -1, platform: chosen, index: chosen_index });
  }

  global.SlowlyMovingPlatformCarrier = Object.freeze({ version: "1.0.0", carry, find_support });
})(window);
