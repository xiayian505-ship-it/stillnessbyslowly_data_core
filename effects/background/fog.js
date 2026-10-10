/*
 * 慢慢軍火庫｜Canvas Fog（流動霧氣）
 * 路徑：effects/background/fog.js
 *
 * 使用：
 *   const fog = SlowlyCanvasFog.create({ canvas: '#fog', count: 24 });
 *   fog.start();
 *   fog.stop();
 *   fog.destroy();
 *
 * canvas 的尺寸、定位及層級由宿主決定。
 * 可設定 count、color、opacity、speed、size、maxDpr、autoStart、autoResize。
 * 只繪製霧團，不繪製森林、雨幕或其他效果；不依賴外部零件。
 */
(function (global) {
  'use strict';

  function resolveCanvas(value) {
    return typeof value === 'string' ? document.querySelector(value) : value;
  }

  function clamp(value, low, high) {
    return Math.min(high, Math.max(low, value));
  }

  function makeSprite(color) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);

    gradient.addColorStop(0, 'rgba(255,255,255,0.56)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.22)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    // source-in 保留原有透明度，可直接接受 CSS 顏色。
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 256, 256);
    ctx.globalCompositeOperation = 'source-over';
    return canvas;
  }

  function create(options = {}) {
    const canvas = resolveCanvas(options.canvas);
    if (!canvas || typeof canvas.getContext !== 'function') {
      throw new TypeError('SlowlyCanvasFog.create(): canvas 必須是 Canvas 元素或選擇器。');
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas Fog 無法取得 2D Canvas context。');

    const count = clamp(Math.floor(Number(options.count ?? 24)), 0, 150);
    const opacity = clamp(Number(options.opacity ?? 0.8), 0, 1);
    const speed = Math.max(0, Number(options.speed ?? 1));
    const size = Math.max(0.05, Number(options.size ?? 1));
    const maxDpr = Math.max(1, Number(options.maxDpr ?? 1.5));
    const sprite = makeSprite(options.color || '#c3ddd4');
    const reduced = global.matchMedia?.('(prefers-reduced-motion: reduce)');

    let width = 0;
    let height = 0;
    let ratio = 1;
    let puffs = [];
    let observer = null;
    let raf = 0;
    let last = 0;
    let running = false;
    let destroyed = false;

    function spawn() {
      const span = height * (0.25 + Math.random() * 0.35) * size;
      return {
        x: Math.random() * width,
        y: height * (0.2 + Math.random() * 0.75),
        span,
        velocity: (5 + Math.random() * 16) * (Math.random() < 0.7 ? 1 : -1),
        alpha: 0.32 + Math.random() * 0.65,
        phase: Math.random() * Math.PI * 2
      };
    }

    function draw(timestamp = 0) {
      if (destroyed) return;
      ctx.clearRect(0, 0, width, height);

      for (const puff of puffs) {
        const radius = puff.span * 1.4;
        ctx.globalAlpha = clamp(
          opacity * puff.alpha * (0.75 + 0.25 * Math.sin(timestamp * 0.00025 + puff.phase)),
          0, 1
        );
        ctx.drawImage(sprite, puff.x - radius, puff.y - puff.span / 2, radius * 2, puff.span);
      }

      ctx.globalAlpha = 1;
    }

    function advance(deltaSeconds) {
      if (destroyed) return;
      const delta = clamp(Number(deltaSeconds) || 0, 0, 0.05);
      for (const puff of puffs) {
        const radius = puff.span * 1.4;
        puff.x += puff.velocity * speed * delta;
        if (puff.x > width + radius) puff.x = -radius;
        if (puff.x < -radius) puff.x = width + radius;
      }
    }

    function frame(timestamp) {
      raf = 0;
      if (!running || destroyed || global.document.hidden || reduced?.matches) return;
      const delta = last === 0 ? 0 : (timestamp - last) / 1000;
      last = timestamp;
      advance(delta);
      draw(timestamp);
      raf = global.requestAnimationFrame(frame);
    }

    function schedule() {
      if (!running || destroyed || global.document.hidden || reduced?.matches || raf) return;
      last = 0;
      raf = global.requestAnimationFrame(frame);
    }

    function resize() {
      if (destroyed) return;
      const bounds = canvas.getBoundingClientRect();
      const nextWidth = Math.max(1, Number(options.width) || bounds.width || canvas.clientWidth || 1);
      const nextHeight = Math.max(1, Number(options.height) || bounds.height || canvas.clientHeight || 1);
      const nextRatio = Math.min(global.devicePixelRatio || 1, maxDpr);
      const pixelsW = Math.round(nextWidth * nextRatio);
      const pixelsH = Math.round(nextHeight * nextRatio);
      if (width === nextWidth && height === nextHeight && ratio === nextRatio && canvas.width === pixelsW && canvas.height === pixelsH) return;

      width = nextWidth;
      height = nextHeight;
      ratio = nextRatio;
      canvas.width = pixelsW;
      canvas.height = pixelsH;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      puffs = Array.from({ length: count }, spawn);
      draw();
    }

    function start() {
      if (destroyed || running) return;
      running = true;
      draw();
      schedule();
    }

    function stop() {
      running = false;
      global.cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
    }

    function onVisibility() {
      if (global.document.hidden) {
        global.cancelAnimationFrame(raf);
        raf = 0;
        last = 0;
      } else {
        schedule();
      }
    }

    function onMotion() {
      global.cancelAnimationFrame(raf);
      raf = 0;
      draw();
      schedule();
    }

    function destroy() {
      if (destroyed) return;
      stop();
      destroyed = true;
      observer?.disconnect();
      global.removeEventListener('resize', resize);
      global.document.removeEventListener('visibilitychange', onVisibility);
      reduced?.removeEventListener?.('change', onMotion);
      puffs = [];
    }

    if (options.autoResize !== false) {
      if (typeof global.ResizeObserver === 'function') {
        observer = new global.ResizeObserver(resize);
        observer.observe(canvas);
      } else {
        global.addEventListener('resize', resize);
      }
    }

    global.document.addEventListener('visibilitychange', onVisibility);
    reduced?.addEventListener?.('change', onMotion);
    resize();
    if (options.autoStart === true) start();

    return Object.freeze({ start, stop, draw, advance, resize, destroy });
  }

  global.SlowlyCanvasFog = Object.freeze({ version: '1.0.0', create });
})(window);
