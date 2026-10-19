/* 慢慢軍火庫｜Merge Level Rules 1.0.0
 * 來源：Emoji 合併與合成大西瓜的「同級提升一級」。
 * 不關心觸發方式、位置、圓形碰撞、分數或生成物件。
 */
(function (global) {
  "use strict";

  function level(value, label) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new RangeError(label + " must be a non-negative safe integer.");
    }
    return value;
  }

  function inspect_merge(options = {}) {
    const max_level = level(options.max_level, "max_level");
    const empty_level = options.empty_level === undefined ? null : options.empty_level;
    if (empty_level !== null && !Number.isSafeInteger(empty_level)) {
      throw new TypeError("empty_level must be an integer or null.");
    }
    if (options.first_level === empty_level || options.second_level === empty_level ||
        options.first_level == null || options.second_level == null) {
      return Object.freeze({ mergeable: false, next_level: null, reason: "empty" });
    }
    const first_level = level(options.first_level, "first_level");
    const second_level = level(options.second_level, "second_level");
    if (typeof options.eligible_first !== "undefined" && typeof options.eligible_first !== "boolean" ||
        typeof options.eligible_second !== "undefined" && typeof options.eligible_second !== "boolean") {
      throw new TypeError("eligible_first and eligible_second must be boolean when supplied.");
    }
    if (options.eligible_first === false || options.eligible_second === false) {
      return Object.freeze({ mergeable: false, next_level: null, reason: "ineligible" });
    }
    if (first_level !== second_level) {
      return Object.freeze({ mergeable: false, next_level: null, reason: "different_levels" });
    }
    if (first_level >= max_level) {
      return Object.freeze({ mergeable: false, next_level: null, reason: "max_level" });
    }
    return Object.freeze({ mergeable: true, next_level: first_level + 1, reason: "mergeable" });
  }

  global.SlowlyMergeLevelRules = Object.freeze({ version: "1.0.0", inspect_merge });
})(window);
