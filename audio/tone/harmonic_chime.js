// harmonic_chime.js
// 慢慢的倉庫｜Audio / Tone｜Harmonic Chime 1.0.0
// 一次性多頻率和聲提示音。
// 不管理 AudioContext、不綁 UI、不綁特定頻率或情境。
(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function requireContext(context) {
    if (!context || typeof context.createOscillator !== "function") {
      throw new TypeError("A valid AudioContext is required");
    }
  }

  function finite(value, fallback, name) {
    if (value === undefined) return fallback;
    const number = Number(value);
    if (!Number.isFinite(number)) {
      throw new TypeError(name + " must be a finite number");
    }
    return number;
  }

  function positive(value, fallback, name) {
    const number = finite(value, fallback, name);
    if (number <= 0) throw new RangeError(name + " must be > 0");
    return number;
  }

  function normalizeFrequencies(value) {
    const source = Array.isArray(value) && value.length ? value : [528, 792, 1056];
    const result = source.map(function (item) {
      const number = Number(item);
      if (!Number.isFinite(number) || number <= 0) {
        throw new RangeError("frequencies must contain only values > 0");
      }
      return number;
    });
    return result;
  }

  function normalizeGains(value, count) {
    if (!Array.isArray(value) || value.length === 0) {
      return Array.from({ length: count }, function (_, index) {
        return 0.2 / Math.pow(2, index);
      });
    }

    return Array.from({ length: count }, function (_, index) {
      const number = Number(value[index] ?? value[value.length - 1]);
      return Number.isFinite(number) && number > 0 ? number : 0.05;
    });
  }

  function play(context, options = {}) {
    requireContext(context);

    const frequencies = normalizeFrequencies(options.frequencies);
    const gains = normalizeGains(options.gains, frequencies.length);
    const destination = options.destination || context.destination;
    const waveform = options.waveform || "sine";
    const startAt = finite(options.startAt, context.currentTime, "startAt");
    const stagger = Math.max(0, finite(options.stagger, 0.15, "stagger"));
    const attack = positive(options.attack, 0.05, "attack");
    const decay = positive(options.decay, 1.8, "decay");
    const floor = positive(options.floor, 0.0001, "floor");

    const voices = frequencies.map(function (frequency, index) {
      const osc = context.createOscillator();
      const gain = context.createGain();
      const voiceStart = startAt + stagger * index;
      const peakAt = voiceStart + attack;
      const stopAt = peakAt + decay + 0.05;

      osc.type = waveform;
      osc.frequency.setValueAtTime(frequency, voiceStart);

      gain.gain.setValueAtTime(floor, voiceStart);
      gain.gain.linearRampToValueAtTime(gains[index], peakAt);
      gain.gain.exponentialRampToValueAtTime(floor, peakAt + decay);

      osc.connect(gain);
      gain.connect(destination);
      osc.start(voiceStart);
      osc.stop(stopAt);

      return { oscillator: osc, gain: gain, stopAt: stopAt };
    });

    return {
      voices: voices.slice(),
      stop: function () {
        voices.forEach(function (voice) {
          try { voice.oscillator.stop(); } catch (e) {}
          try { voice.oscillator.disconnect(); } catch (e) {}
          try { voice.gain.disconnect(); } catch (e) {}
        });
      }
    };
  }

  global.SlowlyHarmonicChime = Object.freeze({
    version: VERSION,
    play
  });

})(typeof window !== "undefined" ? window : globalThis);
