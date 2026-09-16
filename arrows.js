/* =========================================================
   Slowly Canvas Icons | Arrows
   ---------------------------------------------------------
   Arrow family.
   Current icons:
   - horizontal : ↔
   - vertical   : ↕
========================================================= */
(() => {
  "use strict";

  if (!window.SlowlyCanvasIcons) {
    throw new Error(
      "[SlowlyCanvasIcons/arrows] 請先載入 canvas/icons/core.js。"
    );
  }

  function number(value, fallback) {
    const result = Number(value);
    return Number.isFinite(result) ? result : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function getGeometry(ctx, options) {
    const canvasWidth = ctx.canvas.width;
    const canvasHeight = ctx.canvas.height;
    const maxSize = Math.max(1, Math.min(canvasWidth, canvasHeight));

    const size = clamp(number(options.size, maxSize * 0.72), 1, maxSize);
    const padding = clamp(number(options.padding, size * 0.08), 0, size * 0.35);

    const drawable = Math.max(1, size - padding * 2);
    const thickness = clamp(
      number(options.thickness, drawable * 0.16),
      1,
      drawable * 0.45
    );

    const headRatio = clamp(number(options.headRatio, 1.55), 1, 3);
    const headHalf = clamp(thickness * headRatio, thickness * 0.75, drawable * 0.48);
    const headLength = clamp(
      number(options.headLength, drawable * 0.28),
      thickness,
      drawable * 0.44
    );

    const cx = number(options.x, canvasWidth / 2);
    const cy = number(options.y, canvasHeight / 2);

    return {
      cx,
      cy,
      drawable,
      thickness,
      headHalf,
      headLength,
      color: String(options.color || "#111111")
    };
  }

  function fillHorizontal(ctx, options) {
    const g = getGeometry(ctx, options);
    const half = g.drawable / 2;
    const shaftHalf = g.thickness / 2;

    const left = g.cx - half;
    const right = g.cx + half;
    const leftBase = left + g.headLength;
    const rightBase = right - g.headLength;

    ctx.fillStyle = g.color;
    ctx.beginPath();
    ctx.moveTo(left, g.cy);

    ctx.lineTo(leftBase, g.cy - g.headHalf);
    ctx.lineTo(leftBase, g.cy - shaftHalf);
    ctx.lineTo(rightBase, g.cy - shaftHalf);

    ctx.lineTo(rightBase, g.cy - g.headHalf);
    ctx.lineTo(right, g.cy);
    ctx.lineTo(rightBase, g.cy + g.headHalf);

    ctx.lineTo(rightBase, g.cy + shaftHalf);
    ctx.lineTo(leftBase, g.cy + shaftHalf);
    ctx.lineTo(leftBase, g.cy + g.headHalf);

    ctx.closePath();
    ctx.fill();
  }

  function fillVertical(ctx, options) {
    const g = getGeometry(ctx, options);
    const half = g.drawable / 2;
    const shaftHalf = g.thickness / 2;

    const top = g.cy - half;
    const bottom = g.cy + half;
    const topBase = top + g.headLength;
    const bottomBase = bottom - g.headLength;

    ctx.fillStyle = g.color;
    ctx.beginPath();
    ctx.moveTo(g.cx, top);

    ctx.lineTo(g.cx + g.headHalf, topBase);
    ctx.lineTo(g.cx + shaftHalf, topBase);
    ctx.lineTo(g.cx + shaftHalf, bottomBase);

    ctx.lineTo(g.cx + g.headHalf, bottomBase);
    ctx.lineTo(g.cx, bottom);
    ctx.lineTo(g.cx - g.headHalf, bottomBase);

    ctx.lineTo(g.cx - shaftHalf, bottomBase);
    ctx.lineTo(g.cx - shaftHalf, topBase);
    ctx.lineTo(g.cx - g.headHalf, topBase);

    ctx.closePath();
    ctx.fill();
  }

  window.SlowlyCanvasIcons.registerFamily("arrows", {
    label: "方向 / Arrows",
    desc: "方向與箭頭類 Canvas icon。宿主可覆寫尺寸、顏色、粗細與箭頭比例。",
    defaults: {
      size: 160,
      color: "#111111",
      thickness: 24,
      headRatio: 1.55,
      headLength: 42,
      padding: 8,
      clear: true
    },
    controls: [
      {
        key: "size",
        label: "尺寸",
        type: "range",
        min: 40,
        max: 240,
        step: 1
      },
      {
        key: "color",
        label: "顏色",
        type: "color"
      },
      {
        key: "thickness",
        label: "粗細",
        type: "range",
        min: 4,
        max: 72,
        step: 1
      },
      {
        key: "headRatio",
        label: "箭頭寬度比例",
        type: "range",
        min: 1,
        max: 2.8,
        step: 0.05
      },
      {
        key: "headLength",
        label: "箭頭長度",
        type: "range",
        min: 12,
        max: 90,
        step: 1
      },
      {
        key: "padding",
        label: "內距",
        type: "range",
        min: 0,
        max: 40,
        step: 1
      }
    ],
    icons: {
      horizontal: {
        label: "左右雙向箭頭",
        desc: "模擬 ↔ 的左右雙向箭頭。",
        draw: fillHorizontal
      },
      vertical: {
        label: "上下雙向箭頭",
        desc: "模擬 ↕ 的上下雙向箭頭。",
        draw: fillVertical
      }
    }
  });
})();
