/* 慢慢軍火庫｜Combo Streak State 1.0.0
 * 來源：打地鼠、節奏點擊的連擊累積／失誤中斷。
 * 不內建分數、排行榜、時鐘、計時器或命中判定。
 */
(function (global) {
  "use strict";

  function time(value, label) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      throw new RangeError(label + " must be a non-negative finite number.");
    }
    return value;
  }

  function create(options = {}) {
    const timeout_ms = options.timeout_ms == null ? null : time(options.timeout_ms, "timeout_ms");
    let current_streak = 0;
    let best_streak = 0;
    let last_success_ms = null;
    let latest_time_ms = null;

    function advance(now_ms) {
      const next = time(now_ms, "now_ms");
      if (latest_time_ms !== null && next < latest_time_ms) {
        throw new RangeError("now_ms cannot move backwards; reset before restarting the game clock.");
      }
      latest_time_ms = next;
      return next;
    }

    function snapshot() {
      return Object.freeze({ current_streak, best_streak, last_success_ms, latest_time_ms, timeout_ms });
    }

    function timeout_if_needed(now_ms) {
      const now = advance(now_ms);
      if (timeout_ms === null || current_streak === 0 || last_success_ms === null) {
        return false;
      }
      if (now - last_success_ms >= timeout_ms) {
        current_streak = 0;
        last_success_ms = null;
        return true;
      }
      return false;
    }

    function success(now_ms) {
      timeout_if_needed(now_ms);
      current_streak += 1;
      best_streak = Math.max(best_streak, current_streak);
      last_success_ms = now_ms;
      return snapshot();
    }

    function failure(now_ms) {
      advance(now_ms);
      current_streak = 0;
      last_success_ms = null;
      return snapshot();
    }

    function check_timeout(now_ms) {
      return Object.freeze({ timed_out: timeout_if_needed(now_ms), state: snapshot() });
    }

    function reset(options_for_reset = {}) {
      current_streak = 0;
      last_success_ms = null;
      latest_time_ms = null;
      if (options_for_reset.keep_best === false) best_streak = 0;
      return snapshot();
    }

    function clear_best() {
      best_streak = current_streak;
      return snapshot();
    }

    return Object.freeze({ success, failure, check_timeout, reset, clear_best, snapshot });
  }

  global.SlowlyComboStreakState = Object.freeze({ version: "1.0.0", create });
})(window);
