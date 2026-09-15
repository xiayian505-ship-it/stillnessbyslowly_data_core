// noise.js
// 慢慢的倉庫｜Audio / Source｜Noise 1.0.0
// 通用 Web Audio 噪音音源：white / pink / brown。
// 不管理 AudioContext、不管理音量、不自動 connect、不自動 start。
(function (global) {
  "use strict";

  const VERSION = "1.0.0";
  const TYPES = new Set(["white", "pink", "brown"]);

  function requireContext(context) {
    if (
      !context ||
      typeof context.createBuffer !== "function" ||
      typeof context.createBufferSource !== "function"
    ) {
      throw new TypeError("A valid AudioContext is required");
    }
  }

  function finitePositive(value, fallback, name) {
    if (value === undefined) return fallback;
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) {
      throw new RangeError(name + " must be > 0");
    }
    return number;
  }

  function clampSample(value) {
    return Math.max(-1, Math.min(1, value));
  }

  function fillWhite(data, random) {
    for (let i = 0; i < data.length; i += 1) {
      data[i] = random() * 2 - 1;
    }
  }

  function fillPink(data, random) {
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;

    for (let i = 0; i < data.length; i += 1) {
      const white = random() * 2 - 1;

      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;

      const sample =
        (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;

      b6 = white * 0.115926;
      data[i] = clampSample(sample);
    }
  }

  function fillBrown(data, random) {
    let lastOut = 0;

    for (let i = 0; i < data.length; i += 1) {
      const white = random() * 2 - 1;
      const next = (lastOut + 0.02 * white) / 1.02;
      lastOut = next;
      data[i] = clampSample(next * 3.5);
    }
  }

  function createBuffer(context, options = {}) {
    requireContext(context);

    const type = String(options.type || "white").toLowerCase();
    if (!TYPES.has(type)) {
      throw new RangeError("Unsupported noise type: " + type);
    }

    const duration = finitePositive(options.duration, 2, "duration");
    const random = typeof options.random === "function" ? options.random : Math.random;
    const frameCount = Math.max(1, Math.round(context.sampleRate * duration));
    const buffer = context.createBuffer(1, frameCount, context.sampleRate);
    const data = buffer.getChannelData(0);

    if (type === "white") fillWhite(data, random);
    else if (type === "pink") fillPink(data, random);
    else fillBrown(data, random);

    return buffer;
  }

  function create(context, options = {}) {
    requireContext(context);

    const source = context.createBufferSource();
    source.buffer = createBuffer(context, options);
    source.loop = options.loop !== false;

    return source;
  }

  global.SlowlyAudioNoise = Object.freeze({
    version: VERSION,
    types: Object.freeze(Array.from(TYPES)),
    createBuffer,
    create
  });

})(typeof window !== "undefined" ? window : globalThis);
