/* 慢慢軍火庫｜Timing Judgement 1.0.0
 * 來源：節奏點擊的 Perfect / Great / Good / Miss 多級時間窗。
 * 毫秒時間差純計算，BPM、音符譜面、連擊與分數由宿主負責。
 */
(function (global) {
  "use strict";

  function judge(options = {}) {
    const expected_ms = options.expected_ms;
    const actual_ms = options.actual_ms;
    if (![expected_ms, actual_ms].every(value => typeof value === "number" && Number.isFinite(value))) {
      throw new TypeError("expected_ms and actual_ms must be finite numbers.");
    }
    const windows = options.windows ?? [
      { label: "perfect", within_ms: 60 },
      { label: "great", within_ms: 120 },
      { label: "good", within_ms: 200 }
    ];
    if (!Array.isArray(windows) || windows.length === 0) {
      throw new TypeError("windows must be a non-empty array.");
    }
    let previous_limit = -1;
    for (const window_definition of windows) {
      if (!window_definition || typeof window_definition.label !== "string" || !window_definition.label.trim() ||
          typeof window_definition.within_ms !== "number" || !Number.isFinite(window_definition.within_ms) ||
          window_definition.within_ms < 0 || window_definition.within_ms <= previous_limit) {
        throw new RangeError("windows require labels and strictly increasing non-negative within_ms values.");
      }
      previous_limit = window_definition.within_ms;
    }
    const delta_ms = actual_ms - expected_ms;
    const absolute_delta_ms = Math.abs(delta_ms);
    const matching_window = windows.find(window_definition => absolute_delta_ms <= window_definition.within_ms);
    return Object.freeze({ label: matching_window?.label ?? "miss", delta_ms, absolute_delta_ms,
      timing: delta_ms === 0 ? "exact" : delta_ms < 0 ? "early" : "late", hit: Boolean(matching_window) });
  }

  global.SlowlyTimingJudgement = Object.freeze({ version: "1.0.0", judge });
})(window);
