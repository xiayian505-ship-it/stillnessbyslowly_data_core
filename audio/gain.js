/*
 * Audio Gain v1.0.0
 * 慢慢的倉庫｜stillness by slowly
 *
 * GainNode 建立與基本增益控制。
 * - 不管理 AudioContext
 * - 不排程 attack / release
 * - 不代表 master volume 或 mute
 *
 * 全域：
 * window.SlowlyAudioGain
 */
(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function requireContext(context) {
    if (!context || typeof context.createGain !== "function") {
      throw new TypeError("A valid AudioContext is required");
    }
  }

  function normalizeValue(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new TypeError("gain must be a finite number");
    return number;
  }

  function create(context, value = 1) {
    requireContext(context);
    const node = context.createGain();
    node.gain.value = normalizeValue(value);
    return node;
  }

  function set(node, value, at) {
    if (!node || !node.gain) throw new TypeError("GainNode is required");
    const number = normalizeValue(value);
    if (at === undefined) node.gain.value = number;
    else node.gain.setValueAtTime(number, Number(at));
    return node;
  }

  function value(node) {
    if (!node || !node.gain) throw new TypeError("GainNode is required");
    return node.gain.value;
  }

  function connect(node, destination) {
    if (!node || typeof node.connect !== "function") throw new TypeError("GainNode is required");
    if (!destination) throw new TypeError("destination is required");
    node.connect(destination);
    return node;
  }

  function disconnect(node) {
    if (!node || typeof node.disconnect !== "function") throw new TypeError("GainNode is required");
    node.disconnect();
    return node;
  }

  const SlowlyAudioGain = {
    version: VERSION,
    create,
    set,
    value,
    connect,
    disconnect
  };

  global.SlowlyAudioGain = SlowlyAudioGain;
})(typeof window !== "undefined" ? window : globalThis);
