/*
 * Weather Ambience 1.0.0｜慢慢軍火庫
 * 霧林風雨聲配方：白噪聲雨聲 + 緩慢調變的低通風聲。
 * 使用軍火庫既有 Noise / Oscillator / BiquadFilter / Gain，不另造基礎音訊工具。
 * AudioContext 一律由宿主提供；destroy() 絕不關閉共用 context。
 */
(function (global) {
  "use strict";

  const DEFAULTS = Object.freeze({
    rainVolume: 0.22, windVolume: 0.29, masterVolume: 0.23,
    fadeIn: 0.6, fadeOut: 0.32, rainHighpass: 900,
    rainLowpass: 6400, windLowpass: 420,
    windVariationFrequency: 0.13, windVariationDepth: 145
  });

  function finiteNumber(value, name, minimum, maximum) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) {
      throw new RangeError(name + " must be between " + minimum + " and " + maximum);
    }
    return value;
  }

  function create(options = {}) {
    const context = options.context;
    if (!context || typeof context.createBufferSource !== "function" ||
        typeof context.createGain !== "function" || typeof context.resume !== "function") {
      throw new TypeError("context must be a valid AudioContext");
    }
    const destination = options.destination || context.destination;
    if (!destination) throw new TypeError("destination is required");
    const settings = { ...DEFAULTS, ...options };
    ["rainVolume", "windVolume", "masterVolume"].forEach(function (name) {
      finiteNumber(settings[name], name, 0, 1);
    });
    ["fadeIn", "fadeOut"].forEach(function (name) { finiteNumber(settings[name], name, 0, 30); });
    ["rainHighpass", "rainLowpass", "windLowpass"].forEach(function (name) {
      finiteNumber(settings[name], name, 1, context.sampleRate / 2);
    });
    finiteNumber(settings.windVariationFrequency, "windVariationFrequency", 0, 10);
    finiteNumber(settings.windVariationDepth, "windVariationDepth", 0, 10000);

    let graph = null;
    let destroyed = false;
    let state = "stopped";
    let command = 0;
    let stopTimer = null;
    let stopResolve = null;
    let startingPromise = null;

    function requireDependencies() {
      ["SlowlyAudioNoise", "SlowlyAudioOscillator", "SlowlyAudioBiquadFilter", "SlowlyAudioGain"].forEach(function (key) {
        if (!global[key]) throw new Error("Missing library dependency: " + key);
      });
    }
    function check() { if (destroyed) throw new Error("Weather Ambience has been destroyed"); }
    function gainRamp(node, target, seconds) {
      const now = context.currentTime;
      const param = node.gain;
      param.cancelScheduledValues(now);
      param.setValueAtTime(param.value, now);
      if (seconds === 0) param.setValueAtTime(target, now);
      else param.setTargetAtTime(target, now, Math.max(0.005, seconds / 4));
    }

    function stopNodes() {
      if (!graph) return;
      graph.sources.forEach(function (source) {
        try { source.stop(); } catch (_) { /* stopped source; safe to release */ }
      });
      graph.nodes.forEach(function (node) {
        try { node.disconnect(); } catch (_) { /* already disconnected */ }
      });
      graph = null;
    }
    function interruptStop() {
      if (stopTimer !== null) global.clearTimeout(stopTimer);
      stopTimer = null;
      if (stopResolve) stopResolve(false);
      stopResolve = null;
    }

    function buildGraph() {
      requireDependencies();
      const noise = global.SlowlyAudioNoise;
      const oscillator = global.SlowlyAudioOscillator;
      const filter = global.SlowlyAudioBiquadFilter;
      const gain = global.SlowlyAudioGain;
      const master = gain.create(context, 0);
      const rainSource = noise.create(context, { type: "white", duration: 2.8 });
      const rainHigh = filter.create(context, { type: "highpass", frequency: settings.rainHighpass });
      const rainLow = filter.create(context, { type: "lowpass", frequency: settings.rainLowpass });
      const rainGain = gain.create(context, settings.rainVolume);
      const windSource = noise.create(context, { type: "white", duration: 3.7 });
      const windLow = filter.create(context, { type: "lowpass", frequency: settings.windLowpass });
      const windGain = gain.create(context, settings.windVolume);
      const variation = oscillator.create(context, { type: "sine", frequency: settings.windVariationFrequency });
      const variationGain = gain.create(context, settings.windVariationDepth);
      const nodes = [master, rainSource, rainHigh, rainLow, rainGain, windSource, windLow, windGain, variation, variationGain];
      const sources = [rainSource, windSource, variation];
      try {
        rainSource.connect(rainHigh);
        rainHigh.connect(rainLow);
        rainLow.connect(rainGain);
        rainGain.connect(master);
        windSource.connect(windLow);
        windLow.connect(windGain);
        windGain.connect(master);
        variation.connect(variationGain);
        variationGain.connect(windLow.frequency);
        master.connect(destination);
        sources.forEach(function (source) { source.start(); });
      } catch (error) {
        sources.forEach(function (source) { try { source.stop(); } catch (_) {} });
        nodes.forEach(function (node) { try { node.disconnect(); } catch (_) {} });
        throw error;
      }
      graph = { master, rainGain, windGain, sources, nodes };
    }

    function start() {
      check();
      if (state === "playing") return Promise.resolve(true);
      if (startingPromise && state === "starting") return startingPromise;
      command += 1;
      const token = command;
      interruptStop();
      state = "starting";
      startingPromise = (async function () {
        try {
          if (context.state === "closed") throw new Error("AudioContext is closed");
          if (context.state !== "running") await context.resume();
          if (context.state !== "running") throw new Error("AudioContext did not resume");
          if (destroyed || token !== command) return false;
          if (!graph) buildGraph();
          gainRamp(graph.master, settings.masterVolume, settings.fadeIn);
          state = "playing";
          return true;
        } catch (error) {
          if (token === command) {
            stopNodes();
            state = "error";
          }
          throw error;
        } finally {
          if (token === command) startingPromise = null;
        }
      })();
      return startingPromise;
    }

    function stop() {
      if (destroyed || (state === "stopped" && !graph)) return Promise.resolve(true);
      command += 1;
      const token = command;
      startingPromise = null;
      interruptStop();
      if (!graph) { state = "stopped"; return Promise.resolve(true); }
      state = "stopping";
      gainRamp(graph.master, 0, settings.fadeOut);
      if (settings.fadeOut === 0) {
        stopNodes();
        state = "stopped";
        return Promise.resolve(true);
      }
      return new Promise(function (resolve) {
        stopResolve = resolve;
        stopTimer = global.setTimeout(function () {
          if (token !== command) return;
          stopNodes();
          state = "stopped";
          stopResolve = null;
          stopTimer = null;
          resolve(true);
        }, settings.fadeOut * 1000);
      });
    }

    function setVolume(value) {
      check();
      settings.masterVolume = finiteNumber(value, "masterVolume", 0, 1);
      if (graph && state === "playing") gainRamp(graph.master, settings.masterVolume, 0.03);
    }
    function setRainVolume(value) {
      check();
      settings.rainVolume = finiteNumber(value, "rainVolume", 0, 1);
      if (graph) gainRamp(graph.rainGain, settings.rainVolume, 0.03);
    }
    function setWindVolume(value) {
      check();
      settings.windVolume = finiteNumber(value, "windVolume", 0, 1);
      if (graph) gainRamp(graph.windGain, settings.windVolume, 0.03);
    }
    function getState() {
      return { status: state, playing: state === "playing", destroyed,
        rainVolume: settings.rainVolume, windVolume: settings.windVolume,
        masterVolume: settings.masterVolume, sourceCount: graph ? graph.sources.length : 0 };
    }
    function destroy() {
      if (destroyed) return;
      destroyed = true;
      command += 1;
      interruptStop();
      stopNodes();
      state = "destroyed";
      // 共用 AudioContext 交由宿主自行關閉。
    }

    return Object.freeze({ start, stop, setVolume, setRainVolume, setWindVolume, getState, destroy });
  }

  global.SlowlyWeatherAmbience = Object.freeze({ version: "1.0.0", create });
})(typeof window !== "undefined" ? window : globalThis);
