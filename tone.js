/*
 * Audio Tone v1.0.0
 * 慢慢的倉庫｜stillness by slowly
 *
 * 單次合成音工具。
 * - 組合 AudioContext + Oscillator + Gain + Envelope
 * - 適合 beep、按鈕聲、提示聲、簡單效果音
 * - 不包含遊戲語意、樂譜、節拍或播放器
 *
 * 依賴：
 * SlowlyAudioContext
 * SlowlyAudioOscillator
 * SlowlyAudioGain
 * SlowlyAudioEnvelope
 *
 * 全域：
 * window.SlowlyAudioTone
 */
(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function requireDependencies() {
    const names = [
      "SlowlyAudioContext",
      "SlowlyAudioOscillator",
      "SlowlyAudioGain",
      "SlowlyAudioEnvelope"
    ];
    const missing = names.filter((name) => !global[name]);
    if (missing.length) {
      throw new Error(`Audio Tone missing dependencies: ${missing.join(", ")}`);
    }
  }

  async function play(options = {}) {
    requireDependencies();

    const frequency = Number(options.frequency ?? options.freq ?? 440);
    const duration = Number(options.duration ?? options.dur ?? 0.08);
    const type = options.type ?? "sine";
    const gainValue = Number(options.gain ?? 0.12);
    const attack = Math.max(0, Number(options.attack ?? 0.01));
    const floor = Number(options.floor ?? global.SlowlyAudioEnvelope.floor);
    const slide = Number(options.slide ?? 0);

    if (!Number.isFinite(frequency) || frequency <= 0) throw new RangeError("frequency must be > 0");
    if (!Number.isFinite(duration) || duration <= 0) throw new RangeError("duration must be > 0");
    if (!Number.isFinite(gainValue) || gainValue <= 0) throw new RangeError("gain must be > 0");
    if (!Number.isFinite(floor) || floor <= 0) throw new RangeError("floor must be > 0");

    const ctx = await global.SlowlyAudioContext.resume();
    const t0 = ctx.currentTime;
    const endAt = t0 + duration;

    const oscillator = global.SlowlyAudioOscillator.create(ctx, {
      type,
      frequency
    });
    const gainNode = global.SlowlyAudioGain.create(ctx, floor);

    global.SlowlyAudioOscillator.connect(oscillator, gainNode);
    global.SlowlyAudioGain.connect(gainNode, ctx.destination);

    global.SlowlyAudioEnvelope.attack(gainNode.gain, {
      startAt: t0,
      duration: Math.min(attack, duration),
      from: floor,
      to: gainValue,
      curve: "exponential"
    });

    const releaseStart = Math.min(t0 + attack, endAt);
    global.SlowlyAudioEnvelope.release(gainNode.gain, {
      startAt: releaseStart,
      duration: Math.max(0, endAt - releaseStart),
      from: gainValue,
      to: floor,
      curve: "exponential"
    });

    if (slide) {
      const target = Math.max(40, frequency * slide);
      oscillator.frequency.setValueAtTime(frequency, t0);
      oscillator.frequency.exponentialRampToValueAtTime(target, endAt);
    }

    global.SlowlyAudioOscillator.start(oscillator, t0);
    global.SlowlyAudioOscillator.stop(oscillator, endAt + 0.02);

    return { context: ctx, oscillator, gain: gainNode, startAt: t0, endAt };
  }

  const SlowlyAudioTone = {
    version: VERSION,
    play
  };

  global.SlowlyAudioTone = SlowlyAudioTone;
})(typeof window !== "undefined" ? window : globalThis);
