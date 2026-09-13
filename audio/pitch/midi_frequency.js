/*
 * MIDI Frequency v1.0.0
 * 慢慢的倉庫｜stillness by slowly
 *
 * MIDI 音高編號與頻率換算。
 * - 不綁 AudioContext
 * - 不建立音源
 * - 預設 A4 = MIDI 69 = 440 Hz
 *
 * 全域：
 * window.SlowlyAudioMidiFrequency
 */
(function (global) {
  "use strict";

  const VERSION = "1.0.0";
  const DEFAULT_A4 = 440;

  function finiteNumber(value, name) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      throw new TypeError(`${name} must be a finite number`);
    }
    return number;
  }

  function normalizeA4(value) {
    const frequency = finiteNumber(value ?? DEFAULT_A4, "a4");
    if (frequency <= 0) {
      throw new RangeError("a4 must be > 0");
    }
    return frequency;
  }

  function midiToFrequency(midi, options = {}) {
    const midiNumber = finiteNumber(midi, "midi");
    const a4 = normalizeA4(options.a4);
    return a4 * Math.pow(2, (midiNumber - 69) / 12);
  }

  function frequencyToMidi(frequency, options = {}) {
    const hz = finiteNumber(frequency, "frequency");
    if (hz <= 0) {
      throw new RangeError("frequency must be > 0");
    }

    const a4 = normalizeA4(options.a4);
    const midi = 69 + 12 * Math.log2(hz / a4);

    if (options.round === true) {
      return Math.round(midi);
    }

    return midi;
  }

  const SlowlyAudioMidiFrequency = {
    version: VERSION,
    defaultA4: DEFAULT_A4,
    midiToFrequency,
    frequencyToMidi
  };

  global.SlowlyAudioMidiFrequency = SlowlyAudioMidiFrequency;
})(typeof window !== "undefined" ? window : globalThis);
