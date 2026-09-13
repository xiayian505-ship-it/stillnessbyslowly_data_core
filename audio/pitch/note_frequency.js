/*
 * Note Frequency v1.0.0
 * 慢慢的倉庫｜stillness by slowly
 *
 * 音名與頻率換算。
 * - 支援 A-G、#、b 與 octave
 * - 不綁 AudioContext
 * - 不建立音源
 * - 預設 A4 = 440 Hz
 *
 * 例：
 * C4, F#5, Bb3
 *
 * 全域：
 * window.SlowlyAudioNoteFrequency
 */
(function (global) {
  "use strict";

  const VERSION = "1.0.0";
  const DEFAULT_A4 = 440;

  const NOTE_OFFSETS = {
    C: -9,
    D: -7,
    E: -5,
    F: -4,
    G: -2,
    A: 0,
    B: 2
  };

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

  function parse(note) {
    const input = String(note ?? "").trim();
    const match = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(input);

    if (!match) {
      throw new TypeError("note must look like C4, F#5, or Bb3");
    }

    const letter = match[1].toUpperCase();
    const accidental = match[2];
    const octave = Number(match[3]);

    let semitone = NOTE_OFFSETS[letter];
    if (accidental === "#") semitone += 1;
    if (accidental === "b") semitone -= 1;

    const midi = 69 + semitone + (octave - 4) * 12;

    return {
      note: `${letter}${accidental}${octave}`,
      letter,
      accidental,
      octave,
      midi
    };
  }

  function toMidi(note) {
    return parse(note).midi;
  }

  function toFrequency(note, options = {}) {
    const midi = toMidi(note);
    const a4 = normalizeA4(options.a4);
    return a4 * Math.pow(2, (midi - 69) / 12);
  }

  const SlowlyAudioNoteFrequency = {
    version: VERSION,
    defaultA4: DEFAULT_A4,
    parse,
    toMidi,
    toFrequency
  };

  global.SlowlyAudioNoteFrequency = SlowlyAudioNoteFrequency;
})(typeof window !== "undefined" ? window : globalThis);
