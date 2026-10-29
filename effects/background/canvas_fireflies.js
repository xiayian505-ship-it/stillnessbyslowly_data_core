/*
 * Canvas Fireflies 1.0.0｜慢慢軍火庫
 * 從《霧林之契》的局部光點抽出；不含雨絲、開場 UI 或場景素材。
 * 一個實例管理一張獨立 Canvas；如需同畫布疊畫，請停用 clearCanvas 並由宿主安排繪製。
 */
(function (global) {
  "use strict";

  const defaults = Object.freeze({
    count: 16, color: "#ffefa6", glowColor: "#ffe199", minSize: 1.2,
    maxSize: 2.6, glowRadius: 13, driftX: 11, driftY: 8,
    speed: 1, opacity: 0.75, maxDpr: 1.5, autoResize: true,
    clearCanvas: true, reducedMotion: "system"
  });

  function validate(next) {
    const options = { ...defaults, ...next };
    if (!options.canvas || typeof options.canvas.getContext !== "function") {
      throw new TypeError("canvas must be a Canvas element with a 2D context");
    }
    const numberRanges = {
      count: [0, 2000], minSize: [0, 1000], maxSize: [0, 1000],
      glowRadius: [0.01, 10000], driftX: [0, 10000], driftY: [0, 10000],
      speed: [0, 100], opacity: [0, 1], maxDpr: [0.1, 8]
    };
    Object.keys(numberRanges).forEach(function (key) {
      const value = options[key];
      const limits = numberRanges[key];
      if (typeof value !== "number" || !Number.isFinite(value) || value < limits[0] || value > limits[1]) {
        throw new RangeError(key + " must be in [" + limits.join(", ") + "]");
      }
    });
    if (!Number.isInteger(options.count)) throw new RangeError("count must be an integer");
    if (options.minSize > options.maxSize) throw new RangeError("minSize cannot exceed maxSize");
    if (typeof options.color !== "string" || !options.color.trim() ||
        typeof options.glowColor !== "string" || !options.glowColor.trim()) {
      throw new TypeError("color and glowColor must be non-empty CSS colors");
    }
    if (typeof options.autoResize !== "boolean" || typeof options.clearCanvas !== "boolean") {
      throw new TypeError("autoResize and clearCanvas must be boolean");
    }
    if (!["system", true, false].includes(options.reducedMotion)) {
      throw new TypeError("reducedMotion must be system, true or false");
    }
    return options;
  }

  function create(options = {}) {
    let settings = validate(options);
    const canvas = settings.canvas;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D context is unavailable");
    const media = global.matchMedia ? global.matchMedia("(prefers-reduced-motion: reduce)") : null;
    let destroyed = false;
    let active = false;
    let frameId = null;
    let particles = [];
    let width = 1;
    let height = 1;
    let lastDpr = 1;

    function prefersLessMotion() {
      return settings.reducedMotion === true ||
        (settings.reducedMotion === "system" && !!media && media.matches);
    }

    function createParticles() {
      particles = Array.from({ length: settings.count }, function () {
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          phase: Math.random() * Math.PI * 2,
          radius: settings.minSize + Math.random() * (settings.maxSize - settings.minSize),
          twinkleSpeed: 0.25 + Math.random() * 0.6
        };
      });
    }

    function resize() {
      if (destroyed) throw new Error("Fireflies instance has been destroyed");
      const rect = typeof canvas.getBoundingClientRect === "function" ? canvas.getBoundingClientRect() : null;
      const sourceWidth = (rect && rect.width) || canvas.clientWidth || canvas.width || 1;
      const sourceHeight = (rect && rect.height) || canvas.clientHeight || canvas.height || 1;
      width = Math.max(1, sourceWidth);
      height = Math.max(1, sourceHeight);
      lastDpr = Math.min(Math.max(1, global.devicePixelRatio || 1), settings.maxDpr);
      if (settings.autoResize) {
        canvas.width = Math.max(1, Math.round(width * lastDpr));
        canvas.height = Math.max(1, Math.round(height * lastDpr));
        context.setTransform(lastDpr, 0, 0, lastDpr, 0, 0);
      }
      createParticles();
      draw();
    }

    function draw(time = 0) {
      if (destroyed) return;
      const reduce = prefersLessMotion();
      context.save();
      if (settings.clearCanvas) context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = "screen";
      particles.forEach(function (particle) {
        const x = particle.x + (reduce ? 0 : Math.sin(time * 0.00035 * settings.speed + particle.phase) * settings.driftX);
        const y = particle.y + (reduce ? 0 : Math.cos(time * 0.00047 * settings.speed + particle.phase) * settings.driftY);
        const brightness = reduce ? 0.6 : 0.42 + 0.30 * Math.sin(time * 0.001 * particle.twinkleSpeed * settings.speed + particle.phase);
        context.globalAlpha = Math.max(0, Math.min(1, brightness * settings.opacity));
        const gradient = context.createRadialGradient(x, y, 0, x, y, settings.glowRadius);
        gradient.addColorStop(0, settings.glowColor);
        gradient.addColorStop(0.2, settings.glowColor);
        gradient.addColorStop(1, "transparent");
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(x, y, settings.glowRadius, 0, Math.PI * 2);
        context.fill();
        context.globalAlpha = settings.opacity;
        context.fillStyle = settings.color;
        context.beginPath();
        context.arc(x, y, particle.radius, 0, Math.PI * 2);
        context.fill();
      });
      context.restore();
    }

    function cancelFrame() {
      if (frameId !== null) global.cancelAnimationFrame(frameId);
      frameId = null;
    }

    function tick(time) {
      frameId = null;
      if (!active || destroyed || (global.document && global.document.hidden)) return;
      draw(time);
      if (!prefersLessMotion()) frameId = global.requestAnimationFrame(tick);
    }

    function schedule() {
      cancelFrame();
      if (!active || (global.document && global.document.hidden)) return;
      if (prefersLessMotion()) draw();
      else frameId = global.requestAnimationFrame(tick);
    }

    function start() {
      if (destroyed) throw new Error("Fireflies instance has been destroyed");
      if (!active) {
        active = true;
        schedule();
      }
      return true;
    }

    function stop() {
      active = false;
      cancelFrame();
    }

    function setOptions(next) {
      if (destroyed) throw new Error("Fireflies instance has been destroyed");
      if (!next || typeof next !== "object" || Array.isArray(next) || (next.canvas && next.canvas !== canvas)) {
        throw new TypeError("setOptions requires an object and cannot change canvas");
      }
      const previous = settings;
      settings = validate({ ...settings, ...next });
      if (previous.count !== settings.count || previous.minSize !== settings.minSize || previous.maxSize !== settings.maxSize) {
        createParticles();
      }
      if (previous.autoResize !== settings.autoResize && global.addEventListener && global.removeEventListener) {
        if (settings.autoResize) global.addEventListener("resize", resize);
        else global.removeEventListener("resize", resize);
      }
      if (previous.maxDpr !== settings.maxDpr || previous.autoResize !== settings.autoResize) resize();
      schedule();
      if (!active) draw();
    }

    function onVisibility() { schedule(); }
    function onMotionChange() { schedule(); }
    if (global.document) global.document.addEventListener("visibilitychange", onVisibility);
    if (media && typeof media.addEventListener === "function") media.addEventListener("change", onMotionChange);
    if (global.addEventListener && settings.autoResize) global.addEventListener("resize", resize);
    resize();

    function destroy() {
      if (destroyed) return;
      stop();
      if (global.document) global.document.removeEventListener("visibilitychange", onVisibility);
      if (media && typeof media.removeEventListener === "function") media.removeEventListener("change", onMotionChange);
      if (global.removeEventListener) global.removeEventListener("resize", resize);
      particles = [];
      destroyed = true;
    }

    return Object.freeze({ start, stop, resize, draw, setOptions, destroy,
      getState: function () { return { active, destroyed, count: particles.length, width, height, dpr: lastDpr }; }
    });
  }

  global.SlowlyCanvasFireflies = Object.freeze({ version: "1.0.0", create });
})(typeof window !== "undefined" ? window : globalThis);
