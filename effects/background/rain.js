/*
 * 慢慢軍火庫｜Canvas Rain（持續雨幕）
 * 路徑：effects/background/rain.js
 *
 * 使用：
 *   const rain = SlowlyCanvasRain.create({ canvas: '#rain', count: 180 });
 *   rain.start();
 *   rain.stop();
 *   rain.destroy();
 *
 * canvas 的尺寸、定位及層級由宿主決定。
 * 可設定 count、color、opacity、speed、wind、length、maxDpr、autoStart、autoResize。
 * 僅繪製雨滴，不處理漣漪、閃電、雨聲；不依賴外部零件。
 */
(function (global) {
  'use strict';

  function resolveCanvas(value) {
    return typeof value === 'string' ? document.querySelector(value) : value;
  }

  function clamp(value, low, high) {
    return Math.min(high, Math.max(low, value));
  }

  function create(options = {}) {
    const canvas = resolveCanvas(options.canvas);
    if (!canvas || typeof canvas.getContext !== 'function') {
      throw new TypeError('SlowlyCanvasRain.create(): canvas 必須是 Canvas 元素或選擇器。');
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas Rain 無法取得 2D Canvas context。');

    const maxDpr = Math.max(1, Number(options.maxDpr ?? 1.5));
    const color = options.color || '#d7f2f1';
    const opacity = clamp(Number(options.opacity ?? 1), 0, 1);
    const speed = Math.max(0, Number(options.speed ?? 1));
    const wind = Number.isFinite(Number(options.wind)) ? Number(options.wind) : 0.2;
    const length = Math.max(0.1, Number(options.length ?? 1));
    const reduced = global.matchMedia?.('(prefers-reduced-motion: reduce)');

    let width = 0;
    let height = 0;
    let ratio = 1;
    let drops = [];
    let observer = null;
    let raf = 0;
    let last = 0;
    let running = false;
    let destroyed = false;

    function spawn(anywhere = false) {
      const depth = Math.random();
      return {
        x: Math.random() * (width + 200) - 100,
        y: anywhere ? Math.random() * height : -50,
        depth,
        speed: (360 + depth * 700),
        length: (13 + depth * 27) * length
      };
    }

    function draw() {
      if (destroyed) return;
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = color;
      ctx.lineCap = 'round';

      // 前後兩層雨線用透明度區分，單次路徑減少繪圖呼叫次數。
      for (let layer = 0; layer < 2; layer += 1) {
        ctx.beginPath();
        for (const drop of drops) {
          if ((drop.depth < 0.5 ? 0 : 1) !== layer) continue;
          ctx.moveTo(drop.x, drop.y);
          ctx.lineTo(drop.x - drop.length * wind, drop.y - drop.length);
        }
        ctx.globalAlpha = opacity * (layer === 0 ? 0.16 : 0.37);
        ctx.lineWidth = layer === 0 ? 0.7 : 1.15;
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
    }

    function advance(deltaSeconds) {
      if (destroyed) return;
      const delta = clamp(Number(deltaSeconds) || 0, 0, 0.05);
      for (let i = 0; i < drops.length; i += 1) {
        const drop = drops[i];
        const distance = drop.speed * speed * delta;
        drop.y += distance;
        drop.x += distance * wind;
        if (drop.y - drop.length > height || drop.x < -120 || drop.x > width + 120) {
          drops[i] = spawn();
        }
      }
    }

    function frame(timestamp) {
      raf = 0;
      if (!running || destroyed || global.document.hidden || reduced?.matches) return;
      const delta = last === 0 ? 0 : (timestamp - last) / 1000;
      last = timestamp;
      advance(delta);
      draw();
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
      const count = clamp(Math.floor(Number(options.count ?? Math.min(320, Math.floor(width / 4)))), 0, 1200);
      drops = Array.from({ length: count }, () => spawn(true));
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
      drops = [];
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

  global.SlowlyCanvasRain = Object.freeze({ version: '1.0.0', create });
})(window);
