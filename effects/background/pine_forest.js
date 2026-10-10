/*
 * 慢慢軍火庫｜Pine Forest（松樹剪影）
 * 路徑：effects/background/pine_forest.js
 *
 * 獨立 Canvas 繪圖零件；不建立 Canvas、不接管網站背景或其他特效。
 *
 * 使用：
 *   const forest = SlowlyPineForest.create({ canvas: '#forest' });
 *   forest.draw();      // 重新繪製（create 與 resize 時也會繪製）
 *   forest.destroy();   // 停止尺寸監聽
 *
 * canvas 的 CSS 寬度與高度由宿主決定。可設定 seed、layers、
 * background、density、maxDpr、autoResize。
 * 不依賴軍火庫的其他零件，亦不載入任何外部資源。
 */
(function (global) {
  'use strict';

  const DEFAULT_LAYERS = [
    { baseline: 0.72, minHeight: 0.16, maxHeight: 0.31, color: '#254542', width: 0.35 },
    { baseline: 0.85, minHeight: 0.21, maxHeight: 0.40, color: '#153130', width: 0.36 },
    { baseline: 1.03, minHeight: 0.35, maxHeight: 0.58, color: '#081d20', width: 0.38 }
  ];

  function resolveCanvas(value) {
    return typeof value === 'string' ? document.querySelector(value) : value;
  }

  function randomSeed(seed) {
    let state = Math.max(1, (Math.floor(Number(seed) || 11) >>> 0) % 2147483647);
    return function () {
      state = (state * 16807) % 2147483647;
      return (state - 1) / 2147483646;
    };
  }

  function paintPine(ctx, x, base, height, width) {
    const tip = base - height;
    const tiers = 6;
    const branches = [];

    for (let i = 1; i <= tiers; i += 1) {
      const y = tip + height * 0.92 * i / tiers;
      const reach = width * i / tiers / 2;
      branches.push({ x: reach, y: y });
    }

    ctx.beginPath();
    ctx.moveTo(x, tip);

    for (const branch of branches) {
      ctx.lineTo(x + branch.x, branch.y);
      ctx.lineTo(x + branch.x * 0.45, branch.y - height * 0.035);
    }

    ctx.lineTo(x + width * 0.03, base);
    ctx.lineTo(x - width * 0.03, base);

    for (let i = branches.length - 1; i >= 0; i -= 1) {
      const branch = branches[i];
      ctx.lineTo(x - branch.x * 0.45, branch.y - height * 0.035);
      ctx.lineTo(x - branch.x, branch.y);
    }

    ctx.closePath();
    ctx.fill();
  }

  function create(options = {}) {
    const canvas = resolveCanvas(options.canvas);
    if (!canvas || typeof canvas.getContext !== 'function') {
      throw new TypeError('SlowlyPineForest.create(): canvas 必須是 Canvas 元素或選擇器。');
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Pine Forest 無法取得 2D Canvas context。');

    const layers = Array.isArray(options.layers) ? options.layers : DEFAULT_LAYERS;
    const density = Math.max(0.1, Number(options.density) || 1);
    const maxDpr = Math.max(1, Number(options.maxDpr) || 2);
    const seed = options.seed ?? 11;
    let width = 0;
    let height = 0;
    let ratio = 1;
    let destroyed = false;
    let observer = null;

    function draw() {
      if (destroyed || width <= 0 || height <= 0) return;
      const random = randomSeed(seed);
      ctx.clearRect(0, 0, width, height);

      if (options.background) {
        ctx.fillStyle = options.background;
        ctx.fillRect(0, 0, width, height);
      }

      // 每一層使用同一個固定種子序列，resize 後樹形仍可重現。
      for (const layer of layers) {
        const baseline = height * (layer.baseline ?? 0.85);
        const minHeight = Math.max(0.01, Number(layer.minHeight ?? 0.2));
        const maxHeight = Math.max(minHeight, Number(layer.maxHeight ?? 0.4));
        const widthFactor = Math.max(0.05, Number(layer.width ?? 0.36));
        const baseColor = layer.color || '#183a36';

        ctx.fillStyle = baseColor;
        let x = -50;
        let drawn = 0;

        while (x < width + 50 && drawn < 3000) {
          const treeHeight = height * (minHeight + random() * (maxHeight - minHeight));
          const treeWidth = treeHeight * widthFactor;
          paintPine(ctx, x, baseline, treeHeight, treeWidth);
          x += Math.max(3, treeHeight * (0.10 + random() * 0.16) / density);
          drawn += 1;
        }

        if (layer.fillBelow !== false && baseline < height) {
          ctx.fillRect(0, baseline, width, height - baseline);
        }
      }
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
      draw();
    }

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      observer?.disconnect();
      global.removeEventListener('resize', resize);
    }

    if (options.autoResize !== false) {
      if (typeof global.ResizeObserver === 'function') {
        observer = new global.ResizeObserver(resize);
        observer.observe(canvas);
      } else {
        global.addEventListener('resize', resize);
      }
    }

    resize();
    return Object.freeze({ draw, resize, destroy });
  }

  global.SlowlyPineForest = Object.freeze({ version: '1.0.0', create });
})(window);
