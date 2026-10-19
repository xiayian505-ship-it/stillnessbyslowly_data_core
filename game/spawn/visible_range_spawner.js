/* 慢慢軍火庫｜Visible Range Spawner 1.0.0
 * 來源：小朋友下樓梯依世界相機窗進行前沿生成、後方淘汰。
 * 輸出純計畫，不更動物件清單、不抽亂數核心、不設計任何攝影機。
 */
(function (global) {
  "use strict";

  function finite_number(value, label) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new TypeError(label + " must be finite.");
    }
    return value;
  }

  function non_negative(value, label) {
    const number = finite_number(value, label);
    if (number < 0) throw new RangeError(label + " must be non-negative.");
    return number;
  }

  function plan_range(options = {}) {
    const frontier = finite_number(options.frontier, "frontier");
    const view_min = finite_number(options.view_min, "view_min");
    const view_max = finite_number(options.view_max, "view_max");
    if (view_max < view_min) throw new RangeError("view_max must be >= view_min.");
    const preload_distance = non_negative(options.preload_distance ?? 0, "preload_distance");
    const retain_distance = non_negative(options.retain_distance ?? 0, "retain_distance");
    const spacing_min = finite_number(options.spacing_min ?? 1, "spacing_min");
    const spacing_max = finite_number(options.spacing_max ?? spacing_min, "spacing_max");
    if (!Number.isSafeInteger(spacing_min) || !Number.isSafeInteger(spacing_max) ||
        spacing_min <= 0 || spacing_max < spacing_min) {
      throw new RangeError("Spacing must be positive integers with spacing_max >= spacing_min.");
    }
    const max_spawn_count = options.max_spawn_count ?? 100;
    if (!Number.isSafeInteger(max_spawn_count) || max_spawn_count < 1) {
      throw new RangeError("max_spawn_count must be a positive safe integer.");
    }
    const existing = options.existing ?? [];
    if (!Array.isArray(existing)) throw new TypeError("existing must be an array.");
    const random_int = options.random_int ?? global.SlowlyRandom?.int;
    if (typeof random_int !== "function") {
      throw new Error("SlowlyRandom.int or random_int is required.");
    }
    const removal_threshold = view_min - retain_distance;
    const remove_ids = [];
    for (const entry of existing) {
      if (!entry || (typeof entry.id !== "string" && typeof entry.id !== "number")) {
        throw new TypeError("existing entries must contain an id.");
      }
      if (finite_number(entry.position, "existing.position") < removal_threshold) {
        remove_ids.push(entry.id);
      }
    }
    const generation_limit = view_max + preload_distance;
    if (!Number.isFinite(generation_limit)) throw new RangeError("generation limit must be finite.");
    const spawn_positions = [];
    let next_frontier = frontier;
    while (next_frontier < generation_limit && spawn_positions.length < max_spawn_count) {
      const gap = random_int(spacing_min, spacing_max);
      if (!Number.isSafeInteger(gap) || gap < spacing_min || gap > spacing_max) {
        throw new RangeError("random_int must return an integer in the requested range.");
      }
      const next_position = next_frontier + gap;
      if (!Number.isFinite(next_position)) throw new RangeError("generated position must be finite.");
      if (next_position > generation_limit) break;
      spawn_positions.push(next_position);
      next_frontier = next_position;
    }
    return Object.freeze({
      spawn_positions: Object.freeze(spawn_positions),
      remove_ids: Object.freeze(remove_ids),
      next_frontier,
      truncated: spawn_positions.length >= max_spawn_count && next_frontier < generation_limit,
      removal_threshold,
      generation_limit
    });
  }

  global.SlowlyVisibleRangeSpawner = Object.freeze({ version: "1.0.0", plan_range });
})(window);
