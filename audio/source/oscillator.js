/*
 * Audio Oscillator v1.0.0
 * 慢慢的倉庫｜stillness by slowly
 *
 * OscillatorNode 建立與基本控制。
 * - 不管理 AudioContext
 * - 不建立 GainNode
 * - 不處理 envelope
 *
 * 全域：
 * window.SlowlyAudioOscillator
 */
(function (global) {
  "use strict";

  const VERSION = "1.0.0";
  const TYPES = new Set(["sine", "square", "sawtooth", "triangle"]);

  function requireContext(context) {
    if (!context || typeof context.createOscillator !== "function") {
      throw new TypeError("A valid AudioContext is required");
    }
  }

  function create(context, options = {}) {
    requireContext(context);
    const node = context.createOscillator();

    if (options.type !== undefined) setType(node, options.type);
    if (options.frequency !== undefined) setFrequency(node, options.frequency, options.at);
    if (options.detune !== undefined) setDetune(node, options.detune, options.at);

    return node;
  }

  function setType(node, type) {
    if (!node) throw new TypeError("OscillatorNode is required");
    const value = String(type);
    if (!TYPES.has(value)) {
      throw new RangeError("Oscillator type must be sine, square, sawtooth, or triangle");
    }
    node.type = value;
    return node;
  }

  function setFrequency(node, frequency, at) {
    if (!node || !node.frequency) throw new TypeError("OscillatorNode is required");
    const value = Number(frequency);
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError("frequency must be a finite number >= 0");
    }
    if (at === undefined) node.frequency.value = value;
    else node.frequency.setValueAtTime(value, Number(at));
    return node;
  }

  function setDetune(node, detune, at) {
    if (!node || !node.detune) throw new TypeError("OscillatorNode is required");
    const value = Number(detune);
    if (!Number.isFinite(value)) throw new TypeError("detune must be a finite number");
    if (at === undefined) node.detune.value = value;
    else node.detune.setValueAtTime(value, Number(at));
    return node;
  }

  function start(node, at) {
    if (!node || typeof node.start !== "function") throw new TypeError("OscillatorNode is required");
    at === undefined ? node.start() : node.start(Number(at));
    return node;
  }

  function stop(node, at) {
    if (!node || typeof node.stop !== "function") throw new TypeError("OscillatorNode is required");
    at === undefined ? node.stop() : node.stop(Number(at));
    return node;
  }

  function connect(node, destination) {
    if (!node || typeof node.connect !== "function") throw new TypeError("OscillatorNode is required");
    if (!destination) throw new TypeError("destination is required");
    node.connect(destination);
    return node;
  }

  const SlowlyAudioOscillator = {
    version: VERSION,
    create,
    setType,
    setFrequency,
    setDetune,
    start,
    stop,
    connect
  };

  global.SlowlyAudioOscillator = SlowlyAudioOscillator;
})(typeof window !== "undefined" ? window : globalThis);
