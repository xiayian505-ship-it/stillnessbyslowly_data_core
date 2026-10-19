/* 慢慢軍火庫｜Spawn Lifecycle 1.0.0
 * 來源：打地鼠的洞口生成、存活與過期處理。
 * 僅管理識別碼的占用和到期時間；宿主提供時鐘，不啟動計時器。
 */
(function (global) {
  "use strict";

  function non_negative_number(value, label) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      throw new RangeError(label + " must be a non-negative finite number.");
    }
    return value;
  }

  function capacity_number(value) {
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new RangeError("capacity must be a positive safe integer.");
    }
    return value;
  }

  function identifier(value) {
    if (!(typeof value === "string" && value.length > 0) &&
        !(typeof value === "number" && Number.isFinite(value))) {
      throw new TypeError("id must be a non-empty string or finite number.");
    }
    return value;
  }

  function create(options = {}) {
    const capacity = capacity_number(options.capacity ?? 1);
    const lifetime_ms = non_negative_number(options.lifetime_ms ?? 1000, "lifetime_ms");
    const active = new Map();
    let latest_time_ms = null;

    function accept_time(now_ms) {
      const next = non_negative_number(now_ms, "now_ms");
      if (latest_time_ms !== null && next < latest_time_ms) {
        throw new RangeError("now_ms cannot move backwards; reset before restarting the game clock.");
      }
      latest_time_ms = next;
      return next;
    }

    function snapshot() {
      return Object.freeze({
        capacity,
        lifetime_ms,
        active_count: active.size,
        latest_time_ms,
        entries: Object.freeze(Array.from(active, ([id, entry]) => Object.freeze({
          id,
          started_ms: entry.started_ms,
          expires_at_ms: entry.expires_at_ms
        })))
      });
    }

    function spawn(options_for_spawn = {}) {
      const id = identifier(options_for_spawn.id);
      const now_ms = non_negative_number(options_for_spawn.now_ms, "now_ms");
      const duration_ms = non_negative_number(
        options_for_spawn.lifetime_ms ?? lifetime_ms,
        "lifetime_ms"
      );
      accept_time(now_ms);
      if (active.has(id)) {
        return Object.freeze({ allowed: false, reason: "occupied", id });
      }
      if (active.size >= capacity) {
        return Object.freeze({ allowed: false, reason: "capacity_full", id });
      }
      const expires_at_ms = now_ms + duration_ms;
      if (!Number.isFinite(expires_at_ms)) {
        throw new RangeError("expires_at_ms must be finite.");
      }
      active.set(id, { started_ms: now_ms, expires_at_ms });
      return Object.freeze({ allowed: true, reason: "spawned", id, expires_at_ms });
    }

    function expire(now_ms) {
      const timestamp = accept_time(now_ms);
      const expired_ids = [];
      for (const [id, entry] of active) {
        if (timestamp >= entry.expires_at_ms) {
          expired_ids.push(id);
          active.delete(id);
        }
      }
      return Object.freeze({ expired_ids: Object.freeze(expired_ids), active_count: active.size });
    }

    function release(id) {
      return active.delete(identifier(id));
    }

    function reset() {
      active.clear();
      latest_time_ms = null;
      return snapshot();
    }

    return Object.freeze({ spawn, register: spawn, expire, release, reset, snapshot });
  }

  global.SlowlySpawnLifecycle = Object.freeze({ version: "1.0.0", create });
})(window);
