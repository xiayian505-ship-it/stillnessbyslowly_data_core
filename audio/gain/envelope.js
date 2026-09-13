/*
 * Audio Envelope v1.0.0
 * 慢慢的倉庫｜stillness by slowly
 *
 * AudioParam 的時間變化排程工具。
 * - 不建立 GainNode
 * - 不產生聲音
 * - 可用於 gain、frequency 等 AudioParam
 *
 * 全域：
 * window.SlowlyAudioEnvelope
 */
(function (global) {
  "use strict";

  const VERSION = "1.0.0";
  const DEFAULT_FLOOR = 0.0001;

  function requireParam(param) {
    if (!param ||
        typeof param.setValueAtTime !== "function" ||
        typeof param.linearRampToValueAtTime !== "function" ||
        typeof param.exponentialRampToValueAtTime !== "function") {
      throw new TypeError("A valid AudioParam is required");
    }
  }

  function number(value, name) {
    const n = Number(value);
    if (!Number.isFinite(n)) throw new TypeError(`${name} must be a finite number`);
    return n;
  }

  function positive(value, name) {
    const n = number(value, name);
    if (n <= 0) throw new RangeError(`${name} must be > 0 for exponential ramps`);
    return n;
  }

  function cancel(param, at = 0) {
    requireParam(param);
    param.cancelScheduledValues(number(at, "at"));
    return param;
  }

  function set(param, value, at) {
    requireParam(param);
    param.setValueAtTime(number(value, "value"), number(at, "at"));
    return param;
  }

  function linear(param, value, endAt) {
    requireParam(param);
    param.linearRampToValueAtTime(number(value, "value"), number(endAt, "endAt"));
    return param;
  }

  function exponential(param, value, endAt) {
    requireParam(param);
    param.exponentialRampToValueAtTime(
      positive(value, "value"),
      number(endAt, "endAt")
    );
    return param;
  }

  function attack(param, options = {}) {
    requireParam(param);
    const startAt = number(options.startAt ?? 0, "startAt");
    const duration = Math.max(0, number(options.duration ?? 0.01, "duration"));
    const from = positive(options.from ?? DEFAULT_FLOOR, "from");
    const to = positive(options.to ?? 1, "to");
    const curve = options.curve ?? "exponential";

    param.setValueAtTime(from, startAt);
    if (curve === "linear") param.linearRampToValueAtTime(to, startAt + duration);
    else if (curve === "exponential") param.exponentialRampToValueAtTime(to, startAt + duration);
    else throw new RangeError("curve must be linear or exponential");
    return param;
  }

  function release(param, options = {}) {
    requireParam(param);
    const startAt = number(options.startAt ?? 0, "startAt");
    const duration = Math.max(0, number(options.duration ?? 0.08, "duration"));
    const from = positive(options.from ?? Math.max(param.value || DEFAULT_FLOOR, DEFAULT_FLOOR), "from");
    const to = positive(options.to ?? DEFAULT_FLOOR, "to");
    const curve = options.curve ?? "exponential";

    param.setValueAtTime(from, startAt);
    if (curve === "linear") param.linearRampToValueAtTime(to, startAt + duration);
    else if (curve === "exponential") param.exponentialRampToValueAtTime(to, startAt + duration);
    else throw new RangeError("curve must be linear or exponential");
    return param;
  }

  const SlowlyAudioEnvelope = {
    version: VERSION,
    floor: DEFAULT_FLOOR,
    cancel,
    set,
    linear,
    exponential,
    attack,
    release
  };

  global.SlowlyAudioEnvelope = SlowlyAudioEnvelope;
})(typeof window !== "undefined" ? window : globalThis);
