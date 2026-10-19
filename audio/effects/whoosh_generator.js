/*
 * Whoosh Generator 1.0.0｜慢慢軍火庫
 * 使用既有 Noise、BiquadFilter、Gain、Envelope 與共用 AudioContext，
 * 排程單次呼嘯聲。沒有獨立音源、濾波演算法或 UI。
 * 公開 API：window.SlowlyAudioWhooshGenerator.play(options)
 */
(function (global) {
  "use strict";

  const VERSION = "1.0.0";
  const MINIMUM_GAIN = 0.0001;
  const MAXIMUM_DURATION_SECONDS = 8;

  function finite_number(value, name, minimum, maximum, default_value) {
    const number = value === undefined ? default_value : value;
    if (typeof number !== "number" || !Number.isFinite(number)) {
      throw new TypeError(name + " must be a finite number");
    }
    if (number < minimum || number > maximum) {
      throw new RangeError(name + " must be within [" + minimum + ", " + maximum + "]");
    }
    return number;
  }

  function require_dependencies() {
    const required_names = [
      "SlowlyAudioContext",
      "SlowlyAudioNoise",
      "SlowlyAudioBiquadFilter",
      "SlowlyAudioGain",
      "SlowlyAudioEnvelope"
    ];
    const missing_names = required_names.filter(function (name) {
      return !global[name];
    });
    if (missing_names.length) {
      throw new Error("Whoosh Generator missing dependencies: " + missing_names.join(", "));
    }
  }

  function normalize_options(options) {
    if (!options || typeof options !== "object" || Array.isArray(options)) {
      throw new TypeError("options must be an object");
    }
    const duration_seconds = finite_number(options.duration_seconds, "duration_seconds", 0.02, MAXIMUM_DURATION_SECONDS, 0.45);
    const volume = finite_number(options.volume, "volume", 0, 1, 0.15);
    const noise_type = options.noise_type === undefined ? "white" : options.noise_type;
    if (!["white", "pink", "brown"].includes(noise_type)) {
      throw new RangeError("noise_type must be white, pink, or brown");
    }
    const frequency_start_hz = finite_number(options.frequency_start_hz, "frequency_start_hz", 0.001, Infinity, 350);
    const frequency_peak_hz = finite_number(options.frequency_peak_hz, "frequency_peak_hz", 0.001, Infinity, 2600);
    const frequency_end_hz = finite_number(options.frequency_end_hz, "frequency_end_hz", 0.001, Infinity, 600);
    const peak_position = finite_number(options.peak_position, "peak_position", 0, 1, 0.5);
    if (peak_position === 0 || peak_position === 1) {
      throw new RangeError("peak_position must be strictly between 0 and 1");
    }
    const filter_q = finite_number(options.filter_q, "filter_q", 0.001, 100, 0.7);
    const attack_seconds = finite_number(options.attack_seconds, "attack_seconds", 0, duration_seconds, Math.min(0.06, duration_seconds * 0.25));
    const release_seconds = finite_number(options.release_seconds, "release_seconds", 0, duration_seconds, Math.min(0.14, duration_seconds * 0.5));
    if (attack_seconds + release_seconds > duration_seconds + 1e-9) {
      throw new RangeError("attack_seconds + release_seconds must not exceed duration_seconds");
    }
    const start_delay_seconds = finite_number(options.start_delay_seconds, "start_delay_seconds", 0, 3600, 0);
    if (options.random !== undefined && typeof options.random !== "function") {
      throw new TypeError("random must be a function");
    }
    if (options.destination !== undefined && (!options.destination || typeof options.destination.connect !== "function")) {
      throw new TypeError("destination must be an AudioNode");
    }
    return {
      duration_seconds,
      volume,
      noise_type,
      frequency_start_hz,
      frequency_peak_hz,
      frequency_end_hz,
      peak_position,
      filter_q,
      attack_seconds,
      release_seconds,
      start_delay_seconds,
      random: options.random,
      destination: options.destination
    };
  }

  function silent_result(context, start_at_seconds, duration_seconds) {
    return {
      context,
      start_at_seconds,
      end_at_seconds: start_at_seconds + duration_seconds,
      silent: true,
      stop: function () {}
    };
  }

  async function play(options = {}) {
    require_dependencies();
    const settings = normalize_options(options);
    const context = await global.SlowlyAudioContext.resume();
    if (!context || !Number.isFinite(context.currentTime) || !(context.sampleRate > 0)) {
      throw new Error("AudioContext is not ready");
    }
    const maximum_frequency = context.sampleRate * 0.475;
    ["frequency_start_hz", "frequency_peak_hz", "frequency_end_hz"].forEach(function (name) {
      if (settings[name] > maximum_frequency) {
        throw new RangeError(name + " exceeds the safe Nyquist limit");
      }
    });
    const start_at_seconds = context.currentTime + 0.005 + settings.start_delay_seconds;
    const end_at_seconds = start_at_seconds + settings.duration_seconds;
    if (settings.volume === 0) {
      return silent_result(context, start_at_seconds, settings.duration_seconds);
    }

    const connected_nodes = [];
    const started_sources = [];
    let source = null;
    let completed = false;
    let stopped = false;
    let stop_gain = null;

    function clean_up() {
      if (completed) return;
      completed = true;
      connected_nodes.forEach(function (node) {
        try { node.disconnect(); } catch (error) { /* Node may already be disconnected. */ }
      });
      connected_nodes.length = 0;
      started_sources.length = 0;
      source = null;
      stop_gain = null;
    }

    function stop() {
      if (stopped || completed) return;
      stopped = true;
      const current_time = context.currentTime;
      const fade_start_seconds = Math.max(current_time, 0);
      const fade_end_seconds = fade_start_seconds + 0.018;
      if (stop_gain) {
        // 獨立的停止閘門，不覆蓋正常播放音量包絡。
        global.SlowlyAudioEnvelope.cancel(stop_gain.gain, fade_start_seconds);
        global.SlowlyAudioEnvelope.set(stop_gain.gain, 1, fade_start_seconds);
        global.SlowlyAudioEnvelope.linear(stop_gain.gain, 0, fade_end_seconds);
      }
      started_sources.slice().forEach(function (audio_source) {
        try {
          audio_source.stop(Math.max(start_at_seconds, fade_end_seconds));
        } catch (error) {
          // 原生 AudioScheduledSourceNode 已經停止時不用再次排程。
        }
      });
    }

    try {
      source = global.SlowlyAudioNoise.create(context, {
        type: settings.noise_type,
        duration: settings.duration_seconds,
        loop: false,
        random: settings.random
      });
      const filter = global.SlowlyAudioBiquadFilter.create(context, {
        type: "bandpass",
        frequency: settings.frequency_start_hz,
        q: settings.filter_q
      });
      const gain = global.SlowlyAudioGain.create(context, MINIMUM_GAIN);
      stop_gain = global.SlowlyAudioGain.create(context, 1);
      connected_nodes.push(source, filter, gain, stop_gain);

      source.connect(filter);
      global.SlowlyAudioBiquadFilter.connect(filter, gain);
      global.SlowlyAudioGain.connect(gain, stop_gain);
      global.SlowlyAudioGain.connect(stop_gain, settings.destination || context.destination);

      const peak_at_seconds = start_at_seconds + settings.duration_seconds * settings.peak_position;
      global.SlowlyAudioEnvelope.set(filter.frequency, settings.frequency_start_hz, start_at_seconds);
      global.SlowlyAudioEnvelope.linear(filter.frequency, settings.frequency_peak_hz, peak_at_seconds);
      global.SlowlyAudioEnvelope.linear(filter.frequency, settings.frequency_end_hz, end_at_seconds);

      const attack_end_seconds = start_at_seconds + settings.attack_seconds;
      const release_start_seconds = end_at_seconds - settings.release_seconds;
      if (settings.attack_seconds > 0) {
        global.SlowlyAudioEnvelope.attack(gain.gain, {
          startAt: start_at_seconds,
          duration: settings.attack_seconds,
          from: MINIMUM_GAIN,
          to: settings.volume,
          curve: "linear"
        });
      } else {
        global.SlowlyAudioEnvelope.set(gain.gain, settings.volume, start_at_seconds);
      }
      if (settings.release_seconds > 0) {
        global.SlowlyAudioEnvelope.release(gain.gain, {
          startAt: release_start_seconds,
          duration: settings.release_seconds,
          from: settings.volume,
          to: MINIMUM_GAIN,
          curve: "linear"
        });
      }

      source.onended = clean_up;
      source.start(start_at_seconds);
      started_sources.push(source);
      source.stop(end_at_seconds);

      return { context, start_at_seconds, end_at_seconds, silent: false, stop };
    } catch (error) {
      started_sources.forEach(function (audio_source) {
        try { audio_source.stop(Math.max(context.currentTime, start_at_seconds)); } catch (ignored) {}
      });
      clean_up();
      throw error;
    }
  }

  global.SlowlyAudioWhooshGenerator = Object.freeze({ version: VERSION, play });
})(typeof window !== "undefined" ? window : globalThis);
