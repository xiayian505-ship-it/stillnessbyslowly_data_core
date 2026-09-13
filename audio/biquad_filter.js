/*
 * Biquad Filter v1.0.0
 * 慢慢的倉庫｜stillness by slowly
 *
 * BiquadFilterNode 建立與基本控制。
 * - 不管理 AudioContext
 * - 不建立音源
 * - 不內建木魚、遊戲或音效 preset
 *
 * 全域：
 * window.SlowlyAudioBiquadFilter
 */
(function (global) {
  "use strict";

  const VERSION = "1.0.0";
  const TYPES = new Set([
    "lowpass",
    "highpass",
    "bandpass",
    "lowshelf",
    "highshelf",
    "peaking",
    "notch",
    "allpass"
  ]);

  function requireContext(context) {
    if (!context || typeof context.createBiquadFilter !== "function") {
      throw new TypeError("A valid AudioContext is required");
    }
  }

  function finiteNumber(value, name) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      throw new TypeError(`${name} must be a finite number`);
    }
    return number;
  }

  function setAudioParam(param, value, at, name) {
    const number = finiteNumber(value, name);
    if (at === undefined) param.value = number;
    else param.setValueAtTime(number, finiteNumber(at, "at"));
  }

  function create(context, options = {}) {
    requireContext(context);
    const node = context.createBiquadFilter();

    if (options.type !== undefined) setType(node, options.type);
    if (options.frequency !== undefined) setFrequency(node, options.frequency, options.at);
    if (options.Q !== undefined || options.q !== undefined) {
      setQ(node, options.Q ?? options.q, options.at);
    }
    if (options.gain !== undefined) setGain(node, options.gain, options.at);
    if (options.detune !== undefined) setDetune(node, options.detune, options.at);

    return node;
  }

  function setType(node, type) {
    if (!node) throw new TypeError("BiquadFilterNode is required");
    const value = String(type);
    if (!TYPES.has(value)) {
      throw new RangeError("Unsupported BiquadFilter type");
    }
    node.type = value;
    return node;
  }

  function setFrequency(node, frequency, at) {
    if (!node || !node.frequency) throw new TypeError("BiquadFilterNode is required");
    const value = finiteNumber(frequency, "frequency");
    if (value < 0) throw new RangeError("frequency must be >= 0");
    setAudioParam(node.frequency, value, at, "frequency");
    return node;
  }

  function setQ(node, q, at) {
    if (!node || !node.Q) throw new TypeError("BiquadFilterNode is required");
    setAudioParam(node.Q, q, at, "Q");
    return node;
  }

  function setGain(node, gain, at) {
    if (!node || !node.gain) throw new TypeError("BiquadFilterNode is required");
    setAudioParam(node.gain, gain, at, "gain");
    return node;
  }

  function setDetune(node, detune, at) {
    if (!node || !node.detune) throw new TypeError("BiquadFilterNode is required");
    setAudioParam(node.detune, detune, at, "detune");
    return node;
  }

  function connect(node, destination) {
    if (!node || typeof node.connect !== "function") {
      throw new TypeError("BiquadFilterNode is required");
    }
    if (!destination) throw new TypeError("destination is required");
    node.connect(destination);
    return node;
  }

  function disconnect(node) {
    if (!node || typeof node.disconnect !== "function") {
      throw new TypeError("BiquadFilterNode is required");
    }
    node.disconnect();
    return node;
  }

  const SlowlyAudioBiquadFilter = {
    version: VERSION,
    create,
    setType,
    setFrequency,
    setQ,
    setGain,
    setDetune,
    connect,
    disconnect
  };

  global.SlowlyAudioBiquadFilter = SlowlyAudioBiquadFilter;
})(typeof window !== "undefined" ? window : globalThis);
