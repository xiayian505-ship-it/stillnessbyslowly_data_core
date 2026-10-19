/* 慢慢軍火庫｜Rhythm Chart Generator 1.0.0
 * 來源：節奏點擊固定 BPM／Ramp 的候選時間槽與軌道選擇。
 * 只生成譜面資料；BeatTime 負責 BPM 換算，TimingJudgement 負責命中判定。
 */
(function (global) {
  "use strict";

  function finite_number(value, label) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new TypeError(label + " must be finite.");
    }
    return value;
  }

  function positive_integer(value, label) {
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new RangeError(label + " must be a positive safe integer.");
    }
    return value;
  }

  function generate(options = {}) {
    if (typeof global.BeatTime?.secondsPerBeat !== "function") {
      throw new Error("BeatTime.secondsPerBeat is required.");
    }
    const duration_ms = finite_number(options.duration_ms, "duration_ms");
    const start_offset_ms = finite_number(options.start_offset_ms ?? 0, "start_offset_ms");
    if (duration_ms < 0) throw new RangeError("duration_ms must not be negative.");
    const lanes = positive_integer(options.lanes ?? 4, "lanes");
    const subdivide = positive_integer(options.subdivide ?? 1, "subdivide");
    const density = finite_number(options.density ?? 1, "density");
    if (density < 0 || density > 1) throw new RangeError("density must be between 0 and 1.");
    const bpm = finite_number(options.bpm ?? 120, "bpm");
    if (bpm <= 0) throw new RangeError("bpm must be positive.");
    const bpm_at = options.bpm_at ?? (() => bpm);
    if (typeof bpm_at !== "function") throw new TypeError("bpm_at must be a function.");
    const avoid_repeat_within_ms = finite_number(options.avoid_repeat_within_ms ?? 150, "avoid_repeat_within_ms");
    if (avoid_repeat_within_ms < 0) throw new RangeError("avoid_repeat_within_ms must not be negative.");
    const max_slots = positive_integer(options.max_slots ?? 50000, "max_slots");
    const max_notes = positive_integer(options.max_notes ?? 10000, "max_notes");
    const random_int = options.random_int ?? global.SlowlyRandom?.int;
    if (typeof random_int !== "function") throw new Error("SlowlyRandom.int or random_int is required.");

    function draw(min, max) {
      const value = random_int(min, max);
      if (!Number.isSafeInteger(value) || value < min || value > max) {
        throw new RangeError("random_int must return an integer within the supplied bounds.");
      }
      return value;
    }

    const notes = [];
    let slot_count = 0;
    let last_lane = null;
    let last_note_time_ms = -Infinity;
    let beat_start_ms = 0;
    let truncated = false;

    outer: while (beat_start_ms < duration_ms) {
      const current_bpm = finite_number(bpm_at(beat_start_ms), "bpm_at result");
      if (current_bpm <= 0) throw new RangeError("bpm_at must return positive BPM.");
      const beat_duration_ms = global.BeatTime.secondsPerBeat(current_bpm) * 1000;
      if (!Number.isFinite(beat_duration_ms) || beat_duration_ms <= 0) {
        throw new RangeError("Beat duration must be finite and positive.");
      }
      const slot_duration_ms = beat_duration_ms / subdivide;
      if (!(slot_duration_ms >= 1e-9) || beat_start_ms + beat_duration_ms <= beat_start_ms) {
        throw new RangeError("BPM/subdivision is too extreme to advance the chart clock.");
      }
      for (let index = 0; index < subdivide; index += 1) {
        const slot_time_ms = beat_start_ms + index * slot_duration_ms;
        if (slot_time_ms >= duration_ms) break outer;
        if (slot_count >= max_slots || notes.length >= max_notes) {
          truncated = true;
          break outer;
        }
        slot_count += 1;
        const selected = density === 1 || (density > 0 && draw(0, 999) < Math.round(density * 1000));
        if (!selected) continue;
        let lane = draw(0, lanes - 1);
        if (lanes > 1 && last_lane === lane && slot_time_ms - last_note_time_ms < avoid_repeat_within_ms) {
          lane = (last_lane + 1 + draw(0, lanes - 2)) % lanes;
        }
        notes.push(Object.freeze({ lane, hit_time_ms: slot_time_ms + start_offset_ms }));
        last_lane = lane;
        last_note_time_ms = slot_time_ms;
      }
      beat_start_ms += beat_duration_ms;
    }
    return Object.freeze({ notes: Object.freeze(notes), slot_count, truncated });
  }

  global.SlowlyRhythmChartGenerator = Object.freeze({ version: "1.0.0", generate });
})(window);
