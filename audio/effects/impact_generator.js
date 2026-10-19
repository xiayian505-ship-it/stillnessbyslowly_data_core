/*
 * Impact Generator 1.0.0｜慢慢軍火庫
 * 使用既有 Oscillator 與 Noise，分層混合短促撞擊聲；
 * Gain、Envelope、Filter 和 AudioContext 均引用軍火庫公開 API。
 * 公開 API：window.SlowlyAudioImpactGenerator.play(options)
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
    const names = [
      "SlowlyAudioContext", "SlowlyAudioOscillator", "SlowlyAudioNoise",
      "SlowlyAudioGain", "SlowlyAudioEnvelope", "SlowlyAudioBiquadFilter"
    ];
    const missing_names = names.filter(function (name) { return !global[name]; });
    if (missing_names.length) {
      throw new Error("Impact Generator missing dependencies: " + missing_names.join(", "));
    }
  }

  function normalize_options(options) {
    if (!options || typeof options !== "object" || Array.isArray(options)) {
      throw new TypeError("options must be an object");
    }
    const duration_seconds = finite_number(options.duration_seconds, "duration_seconds", 0.02, MAXIMUM_DURATION_SECONDS, 0.25);
    const noise_duration_seconds = finite_number(options.noise_duration_seconds, "noise_duration_seconds", 0.006, duration_seconds, Math.min(0.06, duration_seconds));
    const volume = finite_number(options.volume, "volume", 0, 1, 0.12);
    const body_mix = finite_number(options.body_mix, "body_mix", 0, 1, 0.75);
    const noise_mix = finite_number(options.noise_mix, "noise_mix", 0, 1, 0.55);
    const body_waveform = options.body_waveform === undefined ? "sine" : options.body_waveform;
    if (!["sine", "triangle", "square", "sawtooth"].includes(body_waveform)) {
      throw new RangeError("Unsupported body_waveform");
    }
    const body_frequency_start_hz = finite_number(options.body_frequency_start_hz, "body_frequency_start_hz", 0.001, Infinity, 150);
    const body_frequency_end_hz = finite_number(options.body_frequency_end_hz, "body_frequency_end_hz", 0.001, Infinity, 45);
    const noise_filter_frequency_hz = finite_number(options.noise_filter_frequency_hz, "noise_filter_frequency_hz", 0.001, Infinity, 2600);
    const noise_type = options.noise_type === undefined ? "white" : options.noise_type;
    if (!["white", "pink", "brown"].includes(noise_type)) {
      throw new RangeError("Unsupported noise_type");
    }
    const start_delay_seconds = finite_number(options.start_delay_seconds, "start_delay_seconds", 0, 3600, 0);
    if (options.random !== undefined && typeof options.random !== "function") {
      throw new TypeError("random must be a function");
    }
    if (options.destination !== undefined && (!options.destination || typeof options.destination.connect !== "function")) {
      throw new TypeError("destination must be an AudioNode");
    }
    return {
      duration_seconds, noise_duration_seconds, volume, body_mix, noise_mix,
      body_waveform, body_frequency_start_hz, body_frequency_end_hz,
      noise_filter_frequency_hz, noise_type, start_delay_seconds,
      random: options.random, destination: options.destination
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
    ["body_frequency_start_hz", "body_frequency_end_hz", "noise_filter_frequency_hz"].forEach(function (name) {
      if (settings[name] > maximum_frequency) {
        throw new RangeError(name + " exceeds the safe Nyquist limit");
      }
    });
    const start_at_seconds = context.currentTime + 0.005 + settings.start_delay_seconds;
    const end_at_seconds = start_at_seconds + settings.duration_seconds;
    if (settings.volume === 0 || (settings.body_mix === 0 && settings.noise_mix === 0)) {
      return {
        context, start_at_seconds, end_at_seconds, silent: true,
        stop: function () {}
      };
    }

    const connected_nodes = [];
    const started_sources = [];
    let pending_sources = 0;
    let stop_gain = null;
    let completed = false;
    let stopped = false;

    function clean_up() {
      if (completed) return;
      completed = true;
      connected_nodes.forEach(function (node) {
        try { node.disconnect(); } catch (error) { /* Node may already be disconnected. */ }
      });
      connected_nodes.length = 0;
      started_sources.length = 0;
      stop_gain = null;
    }

    function mark_source_ended() {
      pending_sources -= 1;
      if (pending_sources <= 0) clean_up();
    }

    function stop() {
      if (stopped || completed) return;
      stopped = true;
      const fade_start_seconds = Math.max(context.currentTime, 0);
      const fade_end_seconds = fade_start_seconds + 0.018;
      if (stop_gain) {
        global.SlowlyAudioEnvelope.cancel(stop_gain.gain, fade_start_seconds);
        global.SlowlyAudioEnvelope.set(stop_gain.gain, 1, fade_start_seconds);
        global.SlowlyAudioEnvelope.linear(stop_gain.gain, 0, fade_end_seconds);
      }
      started_sources.slice().forEach(function (source) {
        try { source.stop(Math.max(start_at_seconds, fade_end_seconds)); } catch (ignored) {}
      });
    }

    try {
      const master_gain = global.SlowlyAudioGain.create(context, settings.volume);
      stop_gain = global.SlowlyAudioGain.create(context, 1);
      connected_nodes.push(master_gain, stop_gain);
      global.SlowlyAudioGain.connect(master_gain, stop_gain);
      global.SlowlyAudioGain.connect(stop_gain, settings.destination || context.destination);

      if (settings.body_mix > 0) {
        const oscillator = global.SlowlyAudioOscillator.create(context, {
          type: settings.body_waveform,
          frequency: settings.body_frequency_start_hz
        });
        const body_gain = global.SlowlyAudioGain.create(context, MINIMUM_GAIN);
        connected_nodes.push(oscillator, body_gain);
        global.SlowlyAudioOscillator.connect(oscillator, body_gain);
        global.SlowlyAudioGain.connect(body_gain, master_gain);

        // 低頻主體的音高滑落及響度衰減，皆交由既有 Envelope 排程。
        global.SlowlyAudioEnvelope.set(oscillator.frequency, settings.body_frequency_start_hz, start_at_seconds);
        global.SlowlyAudioEnvelope.exponential(oscillator.frequency, settings.body_frequency_end_hz, end_at_seconds);
        const body_attack_seconds = Math.min(0.005, settings.duration_seconds * 0.2);
        global.SlowlyAudioEnvelope.attack(body_gain.gain, {
          startAt: start_at_seconds,
          duration: body_attack_seconds,
          from: MINIMUM_GAIN,
          to: settings.body_mix,
          curve: "linear"
        });
        global.SlowlyAudioEnvelope.release(body_gain.gain, {
          startAt: start_at_seconds + body_attack_seconds,
          duration: settings.duration_seconds - body_attack_seconds,
          from: settings.body_mix,
          to: MINIMUM_GAIN,
          curve: "exponential"
        });
        oscillator.onended = mark_source_ended;
        global.SlowlyAudioOscillator.start(oscillator, start_at_seconds);
        started_sources.push(oscillator);
        pending_sources += 1;
        global.SlowlyAudioOscillator.stop(oscillator, end_at_seconds);
      }

      if (settings.noise_mix > 0) {
        const noise = global.SlowlyAudioNoise.create(context, {
          type: settings.noise_type,
          duration: settings.noise_duration_seconds,
          loop: false,
          random: settings.random
        });
        const filter = global.SlowlyAudioBiquadFilter.create(context, {
          type: "lowpass",
          frequency: settings.noise_filter_frequency_hz
        });
        const noise_gain = global.SlowlyAudioGain.create(context, MINIMUM_GAIN);
        connected_nodes.push(noise, filter, noise_gain);
        noise.connect(filter);
        global.SlowlyAudioBiquadFilter.connect(filter, noise_gain);
        global.SlowlyAudioGain.connect(noise_gain, master_gain);
        const noise_attack_seconds = Math.min(0.002, settings.noise_duration_seconds * 0.25);
        global.SlowlyAudioEnvelope.attack(noise_gain.gain, {
          startAt: start_at_seconds,
          duration: noise_attack_seconds,
          from: MINIMUM_GAIN,
          to: settings.noise_mix,
          curve: "linear"
        });
        global.SlowlyAudioEnvelope.release(noise_gain.gain, {
          startAt: start_at_seconds + noise_attack_seconds,
          duration: settings.noise_duration_seconds - noise_attack_seconds,
          from: settings.noise_mix,
          to: MINIMUM_GAIN,
          curve: "exponential"
        });
        noise.onended = mark_source_ended;
        noise.start(start_at_seconds);
        started_sources.push(noise);
        pending_sources += 1;
        noise.stop(start_at_seconds + settings.noise_duration_seconds);
      }

      return { context, start_at_seconds, end_at_seconds, silent: false, stop };
    } catch (error) {
      started_sources.forEach(function (source) {
        try { source.stop(Math.max(start_at_seconds, context.currentTime)); } catch (ignored) {}
      });
      clean_up();
      throw error;
    }
  }

  global.SlowlyAudioImpactGenerator = Object.freeze({ version: VERSION, play });
})(typeof window !== "undefined" ? window : globalThis);
