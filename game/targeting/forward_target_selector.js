/* 慢慢軍火庫｜Forward Target Selector 1.0.0
 * 來源：植物大戰殭屍的同路線、前方、最近目標搜尋。
 * 不負責碰撞、射擊、傷害或目標物件的狀態更新。
 */
(function (global) {
  "use strict";

  function finite_number(value, label) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new TypeError(label + " must be finite.");
    }
    return value;
  }

  function select(options = {}) {
    if (!Array.isArray(options.candidates)) throw new TypeError("candidates must be an array.");
    const origin_x = finite_number(options.origin_x, "origin_x");
    const direction = options.direction;
    const sign = direction === "right" || direction === 1 ? 1 :
      direction === "left" || direction === -1 ? -1 : null;
    if (sign === null) throw new RangeError("direction must be left, right, 1 or -1.");
    const max_distance = finite_number(options.max_distance ?? Number.MAX_VALUE, "max_distance");
    if (max_distance < 0) throw new RangeError("max_distance must not be negative.");
    const lane_of = options.lane_of ?? (target => target.lane);
    const position_of = options.position_of ?? (target => target.x);
    const is_eligible = options.is_eligible ?? (() => true);
    for (const [label, callback] of [["lane_of", lane_of], ["position_of", position_of], ["is_eligible", is_eligible]]) {
      if (typeof callback !== "function") throw new TypeError(label + " must be a function.");
    }
    const allow_origin = options.allow_origin !== false;
    let selected_target = null;
    let selected_index = -1;
    let best_distance = Infinity;
    for (let index = 0; index < options.candidates.length; index += 1) {
      const candidate = options.candidates[index];
      if (!candidate || !is_eligible(candidate, index) || lane_of(candidate, index) !== options.lane) continue;
      const candidate_x = position_of(candidate, index);
      if (typeof candidate_x !== "number" || !Number.isFinite(candidate_x)) continue;
      const distance = (candidate_x - origin_x) * sign;
      if (distance < 0 || (!allow_origin && distance === 0) || distance > max_distance) continue;
      if (distance < best_distance) {
        best_distance = distance;
        selected_target = candidate;
        selected_index = index;
      }
    }
    return Object.freeze({
      found: selected_index >= 0,
      target: selected_target,
      distance: selected_index >= 0 ? best_distance : null,
      index: selected_index
    });
  }

  global.SlowlyForwardTargetSelector = Object.freeze({ version: "1.0.0", select });
})(window);
