/*
 * 慢慢軍火庫｜Data / Random｜Seeded Random 1.0.0
 *
 * 可重現的非密碼學偽隨機序列：UTF-8（附種子型別前綴）
 * → 32-bit FNV-1a → Mulberry32。
 *
 * 同一 seed、同一 API 呼叫順序與同一版本，產出相同序列。
 * 不負責：密碼／安全 Token、遊戲規則、完整遊戲存檔、畫面或音效。
 * 不覆寫 Math.random，也不依賴既有 SlowlyRandom。
 */
(function (global) {
  "use strict";

  const VERSION = "1.0.0";
  const ALGORITHM = "mulberry32";
  const ALGORITHM_VERSION = 1;
  const UINT32_RANGE = 4294967296;
  const UINT32_MAX = UINT32_RANGE - 1;
  const STATE_INCREMENT = 0x6D2B79F5;
  const FNV_INITIAL = 0x811C9DC5;
  const FNV_PRIME = 0x01000193;

  function normalize_seed(seed) {
    if (typeof seed === "string") {
      return { seed_type: "string", seed_value: seed, encoded: "s:" + seed };
    }

    if (typeof seed === "number" && Number.isSafeInteger(seed)) {
      // -0 與 0 被視為同一個數值 seed。
      const value = seed === 0 ? 0 : seed;
      return { seed_type: "number", seed_value: value, encoded: "n:" + String(value) };
    }

    throw new TypeError("seed must be a string or a safe integer number.");
  }

  function hash_seed(encoded) {
    const bytes = new TextEncoder().encode(encoded);
    let hash = FNV_INITIAL;

    for (const byte of bytes) {
      hash ^= byte;
      hash = Math.imul(hash, FNV_PRIME) >>> 0;
    }

    return hash;
  }

  function finite_number(value, label) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new TypeError(label + " must be a finite number.");
    }
    return value;
  }

  function safe_integer(value, label) {
    if (typeof value !== "number" || !Number.isSafeInteger(value)) {
      throw new TypeError(label + " must be a safe integer.");
    }
    return value;
  }

  function create(seed) {
    const seed_record = normalize_seed(seed);
    const initial_state = hash_seed(seed_record.encoded);
    let state_uint32 = initial_state;
    let draw_count = 0;

    // 原始 32-bit 抽樣。實際消耗次數包含整數拒絕採樣的重試。
    function next_uint32() {
      if (draw_count >= Number.MAX_SAFE_INTEGER) {
        throw new RangeError("draw_count reached the maximum safe integer.");
      }

      state_uint32 = (state_uint32 + STATE_INCREMENT) >>> 0;
      draw_count += 1;

      let mixed = Math.imul(
        state_uint32 ^ (state_uint32 >>> 15),
        state_uint32 | 1
      );
      mixed ^= mixed + Math.imul(
        mixed ^ (mixed >>> 7),
        mixed | 61
      );
      return (mixed ^ (mixed >>> 14)) >>> 0;
    }

    function unit_float() {
      return next_uint32() / UINT32_RANGE;
    }

    function float(min = 0, max = 1) {
      const lower = finite_number(min, "min");
      const upper = finite_number(max, "max");
      if (upper < lower) {
        throw new RangeError("max must be greater than or equal to min.");
      }

      const span = upper - lower;
      if (!Number.isFinite(span)) {
        throw new RangeError("float range must be finite.");
      }
      if (span === 0) return lower;

      // 因 IEEE-754 捨入，極端邊界下計算值可能剛好等於 max。
      return Math.min(upper, lower + unit_float() * span);
    }

    function int(min, max) {
      const lower = safe_integer(min, "min");
      const upper = safe_integer(max, "max");
      if (upper < lower) {
        throw new RangeError("max must be greater than or equal to min.");
      }

      const span = upper - lower + 1;
      if (span > UINT32_RANGE) {
        throw new RangeError("int range must contain no more than 2^32 integers.");
      }
      if (span === 1) return lower;

      // 拒絕採樣：避免 raw % span 直接取模帶來的分布偏差。
      const limit = UINT32_RANGE - (UINT32_RANGE % span);
      let raw;
      do {
        raw = next_uint32();
      } while (raw >= limit);

      return lower + (raw % span);
    }

    function chance(probability = 0.5) {
      const value = finite_number(probability, "probability");
      if (value < 0 || value > 1) {
        throw new RangeError("probability must be between 0 and 1.");
      }
      if (value === 0) return false;
      if (value === 1) return true;
      return unit_float() < value;
    }

    function get_state() {
      // 每次傳回新快照，不暴露可變的內部狀態。
      return {
        algorithm: ALGORITHM,
        algorithm_version: ALGORITHM_VERSION,
        seed_type: seed_record.seed_type,
        seed_value: seed_record.seed_value,
        state_uint32,
        draw_count
      };
    }

    function set_state(snapshot) {
      if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
        throw new TypeError("snapshot must be a state object.");
      }
      if (snapshot.algorithm !== ALGORITHM ||
          snapshot.algorithm_version !== ALGORITHM_VERSION) {
        throw new RangeError("snapshot uses an incompatible algorithm or version.");
      }
      if (snapshot.seed_type !== seed_record.seed_type ||
          snapshot.seed_value !== seed_record.seed_value) {
        throw new RangeError("snapshot belongs to a different seed.");
      }
      if (!Number.isInteger(snapshot.state_uint32) ||
          snapshot.state_uint32 < 0 || snapshot.state_uint32 > UINT32_MAX) {
        throw new TypeError("snapshot.state_uint32 must be a uint32 integer.");
      }
      if (!Number.isSafeInteger(snapshot.draw_count) || snapshot.draw_count < 0) {
        throw new TypeError("snapshot.draw_count must be a non-negative safe integer.");
      }

      // 校驗 state 與抽樣次數的一致性，拒絕被破壞或偽造的快照。
      const expected_state = (
        initial_state + Math.imul(snapshot.draw_count % UINT32_RANGE, STATE_INCREMENT)
      ) >>> 0;
      if (snapshot.state_uint32 !== expected_state) {
        throw new RangeError("snapshot state is inconsistent with draw_count.");
      }

      // 所有驗證都通過後才更新，不允許部分污染當前實例。
      state_uint32 = snapshot.state_uint32;
      draw_count = snapshot.draw_count;
      return get_state();
    }

    function reset() {
      state_uint32 = initial_state;
      draw_count = 0;
      return get_state();
    }

    return Object.freeze({
      float,
      int,
      chance,
      get_state,
      set_state,
      reset
    });
  }

  global.SlowlySeededRandom = Object.freeze({
    version: VERSION,
    create
  });
})(window);
