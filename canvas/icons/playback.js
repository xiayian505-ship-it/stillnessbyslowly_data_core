/* =========================================================
   Slowly Canvas Icons | Playback
   ---------------------------------------------------------
   Playback / media control icon family.
========================================================= */
(() => {
  "use strict";

  if (!window.SlowlyCanvasIcons) {
    throw new Error(
      "[SlowlyCanvasIcons/playback] 請先載入 canvas/icons/core.js。"
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
    const thickness = clamp(number(options.thickness, drawable * 0.12), 1, drawable * 0.34);
    const cx = number(options.x, canvasWidth / 2);
    const cy = number(options.y, canvasHeight / 2);

    return {
      cx,
      cy,
      size,
      drawable,
      thickness,
      padding,
      color: String(options.color || "#111111")
    };
  }

  function setFill(ctx, color) {
    ctx.fillStyle = color;
  }

  function setStroke(ctx, color, width) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }

  function filledTriangle(ctx, points, color) {
    setFill(ctx, color);
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let index = 1; index < points.length; index += 1) {
      ctx.lineTo(points[index][0], points[index][1]);
    }
    ctx.closePath();
    ctx.fill();
  }

  function strokeArrowHead(ctx, x, y, angle, length, halfWidth) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(-halfWidth, length);
    ctx.lineTo(0, 0);
    ctx.lineTo(halfWidth, length);
    ctx.stroke();
    ctx.restore();
  }

  function drawPlayTriangle(ctx, cx, cy, width, height, direction, color) {
    const halfH = height / 2;
    const halfW = width / 2;

    if (direction === "right") {
      filledTriangle(ctx, [
        [cx - halfW, cy - halfH],
        [cx - halfW, cy + halfH],
        [cx + halfW, cy]
      ], color);
      return;
    }

    filledTriangle(ctx, [
      [cx + halfW, cy - halfH],
      [cx + halfW, cy + halfH],
      [cx - halfW, cy]
    ], color);
  }

  function drawPlay(ctx, options) {
    const g = getGeometry(ctx, options);
    drawPlayTriangle(ctx, g.cx, g.cy, g.drawable * 0.46, g.drawable * 0.64, "right", g.color);
  }

  function drawPlayLeft(ctx, options) {
    const g = getGeometry(ctx, options);
    drawPlayTriangle(ctx, g.cx, g.cy, g.drawable * 0.46, g.drawable * 0.64, "left", g.color);
  }

  function drawFastForward(ctx, options) {
    const g = getGeometry(ctx, options);
    const dx = g.drawable * 0.17;
    drawPlayTriangle(ctx, g.cx - dx, g.cy, g.drawable * 0.3, g.drawable * 0.58, "right", g.color);
    drawPlayTriangle(ctx, g.cx + dx, g.cy, g.drawable * 0.3, g.drawable * 0.58, "right", g.color);
  }

  function drawRewind(ctx, options) {
    const g = getGeometry(ctx, options);
    const dx = g.drawable * 0.17;
    drawPlayTriangle(ctx, g.cx - dx, g.cy, g.drawable * 0.3, g.drawable * 0.58, "left", g.color);
    drawPlayTriangle(ctx, g.cx + dx, g.cy, g.drawable * 0.3, g.drawable * 0.58, "left", g.color);
  }

  function drawNext(ctx, options) {
    const g = getGeometry(ctx, options);
    const barW = g.thickness * 0.7;
    const barH = g.drawable * 0.62;
    const triW = g.drawable * 0.32;
    const triH = g.drawable * 0.58;
    const barX = g.cx + g.drawable * 0.2;
    ctx.fillStyle = g.color;
    ctx.fillRect(barX, g.cy - barH / 2, barW, barH);
    drawPlayTriangle(ctx, g.cx - g.drawable * 0.08, g.cy, triW, triH, "right", g.color);
  }

  function drawPrevious(ctx, options) {
    const g = getGeometry(ctx, options);
    const barW = g.thickness * 0.7;
    const barH = g.drawable * 0.62;
    const triW = g.drawable * 0.32;
    const triH = g.drawable * 0.58;
    const barX = g.cx - g.drawable * 0.2 - barW;
    ctx.fillStyle = g.color;
    ctx.fillRect(barX, g.cy - barH / 2, barW, barH);
    drawPlayTriangle(ctx, g.cx + g.drawable * 0.08, g.cy, triW, triH, "left", g.color);
  }

  function drawPlayPause(ctx, options) {
    const g = getGeometry(ctx, options);
    const triW = g.drawable * 0.22;
    const triH = g.drawable * 0.48;
    const barW = g.thickness * 0.62;
    const barH = g.drawable * 0.56;
    ctx.fillStyle = g.color;
    drawPlayTriangle(ctx, g.cx - g.drawable * 0.16, g.cy, triW, triH, "right", g.color);
    ctx.fillRect(g.cx + g.drawable * 0.02, g.cy - barH / 2, barW, barH);
    ctx.fillRect(g.cx + g.drawable * 0.02 + barW + g.drawable * 0.06, g.cy - barH / 2, barW, barH);
  }

  function drawPause(ctx, options) {
    const g = getGeometry(ctx, options);
    const barW = g.drawable * 0.16;
    const barH = g.drawable * 0.62;
    const gap = g.drawable * 0.12;
    ctx.fillStyle = g.color;
    ctx.fillRect(g.cx - gap / 2 - barW, g.cy - barH / 2, barW, barH);
    ctx.fillRect(g.cx + gap / 2, g.cy - barH / 2, barW, barH);
  }

  function drawStop(ctx, options) {
    const g = getGeometry(ctx, options);
    const size = g.drawable * 0.54;
    ctx.fillStyle = g.color;
    ctx.fillRect(g.cx - size / 2, g.cy - size / 2, size, size);
  }

  function drawRecord(ctx, options) {
    const g = getGeometry(ctx, options);
    ctx.fillStyle = g.color;
    ctx.beginPath();
    ctx.arc(g.cx, g.cy, g.drawable * 0.24, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawEject(ctx, options) {
    const g = getGeometry(ctx, options);
    const triW = g.drawable * 0.52;
    const triH = g.drawable * 0.34;
    const lineW = g.drawable * 0.56;
    const lineH = Math.max(4, g.thickness * 0.36);
    drawPlayTriangle(ctx, g.cx, g.cy - g.drawable * 0.08, triW, triH, "up", g.color);
    ctx.fillStyle = g.color;
    ctx.fillRect(g.cx - lineW / 2, g.cy + g.drawable * 0.16, lineW, lineH);
  }

  function drawTriangleUp(ctx, options) {
    const g = getGeometry(ctx, options);
    filledTriangle(ctx, [
      [g.cx, g.cy - g.drawable * 0.28],
      [g.cx - g.drawable * 0.28, g.cy + g.drawable * 0.16],
      [g.cx + g.drawable * 0.28, g.cy + g.drawable * 0.16]
    ], g.color);
  }

  function drawTriangleDown(ctx, options) {
    const g = getGeometry(ctx, options);
    filledTriangle(ctx, [
      [g.cx, g.cy + g.drawable * 0.28],
      [g.cx - g.drawable * 0.28, g.cy - g.drawable * 0.16],
      [g.cx + g.drawable * 0.28, g.cy - g.drawable * 0.16]
    ], g.color);
  }

  function drawDoubleUp(ctx, options) {
    const g = getGeometry(ctx, options);
    const offset = g.drawable * 0.15;
    filledTriangle(ctx, [
      [g.cx, g.cy - g.drawable * 0.32],
      [g.cx - g.drawable * 0.24, g.cy - g.drawable * 0.02],
      [g.cx + g.drawable * 0.24, g.cy - g.drawable * 0.02]
    ], g.color);
    filledTriangle(ctx, [
      [g.cx, g.cy - g.drawable * 0.02],
      [g.cx - g.drawable * 0.24, g.cy + g.drawable * 0.28],
      [g.cx + g.drawable * 0.24, g.cy + g.drawable * 0.28]
    ], g.color);
  }

  function drawDoubleDown(ctx, options) {
    const g = getGeometry(ctx, options);
    filledTriangle(ctx, [
      [g.cx, g.cy + g.drawable * 0.32],
      [g.cx - g.drawable * 0.24, g.cy + g.drawable * 0.02],
      [g.cx + g.drawable * 0.24, g.cy + g.drawable * 0.02]
    ], g.color);
    filledTriangle(ctx, [
      [g.cx, g.cy + g.drawable * 0.02],
      [g.cx - g.drawable * 0.24, g.cy - g.drawable * 0.28],
      [g.cx + g.drawable * 0.24, g.cy - g.drawable * 0.28]
    ], g.color);
  }

  function drawShuffle(ctx, options) {
    const g = getGeometry(ctx, options);
    const left = g.cx - g.drawable * 0.34;
    const right = g.cx + g.drawable * 0.34;
    const top = g.cy - g.drawable * 0.2;
    const bottom = g.cy + g.drawable * 0.2;
    const midX = g.cx - g.drawable * 0.02;
    setStroke(ctx, g.color, g.thickness * 0.34);

    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(midX, top);
    ctx.lineTo(right - g.drawable * 0.12, bottom);
    ctx.stroke();
    strokeArrowHead(ctx, right, bottom, Math.PI / 2, g.drawable * 0.12, g.drawable * 0.08);

    ctx.beginPath();
    ctx.moveTo(left, bottom);
    ctx.lineTo(midX, bottom);
    ctx.lineTo(right - g.drawable * 0.12, top);
    ctx.stroke();
    strokeArrowHead(ctx, right, top, Math.PI / 2, g.drawable * 0.12, g.drawable * 0.08);
  }

  function drawRepeat(ctx, options) {
    const g = getGeometry(ctx, options);
    const left = g.cx - g.drawable * 0.26;
    const right = g.cx + g.drawable * 0.26;
    const top = g.cy - g.drawable * 0.17;
    const bottom = g.cy + g.drawable * 0.17;
    const bend = g.drawable * 0.08;
    setStroke(ctx, g.color, g.thickness * 0.34);

    ctx.beginPath();
    ctx.moveTo(left, bottom);
    ctx.lineTo(left, top + bend);
    ctx.quadraticCurveTo(left, top, left + bend, top);
    ctx.lineTo(right - g.drawable * 0.08, top);
    ctx.stroke();
    strokeArrowHead(ctx, right, top, Math.PI / 2, g.drawable * 0.12, g.drawable * 0.08);

    ctx.beginPath();
    ctx.moveTo(right, top);
    ctx.lineTo(right, bottom - bend);
    ctx.quadraticCurveTo(right, bottom, right - bend, bottom);
    ctx.lineTo(left + g.drawable * 0.08, bottom);
    ctx.stroke();
    strokeArrowHead(ctx, left, bottom, -Math.PI / 2, g.drawable * 0.12, g.drawable * 0.08);
  }

  function drawRepeatOnce(ctx, options) {
    const g = getGeometry(ctx, options);
    drawRepeat(ctx, options);
    setStroke(ctx, g.color, g.thickness * 0.22);
    const x = g.cx;
    const top = g.cy - g.drawable * 0.11;
    const bottom = g.cy + g.drawable * 0.13;
    ctx.beginPath();
    ctx.moveTo(x - g.drawable * 0.04, top + g.drawable * 0.05);
    ctx.lineTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
  }

  function drawVideo(ctx, options) {
    const g = getGeometry(ctx, options);
    const w = g.drawable * 0.66;
    const h = g.drawable * 0.46;
    const x = g.cx - w / 2;
    const y = g.cy - h / 2;
    const notch = g.drawable * 0.07;
    ctx.fillStyle = g.color;
    ctx.beginPath();
    ctx.moveTo(x + notch, y);
    ctx.lineTo(x + w - notch, y);
    ctx.lineTo(x + w, y + notch);
    ctx.lineTo(x + w, y + h - notch);
    ctx.lineTo(x + w - notch, y + h);
    ctx.lineTo(x + notch, y + h);
    ctx.lineTo(x, y + h - notch);
    ctx.lineTo(x, y + notch);
    ctx.closePath();
    ctx.fill();

    drawPlayTriangle(ctx, g.cx + g.drawable * 0.02, g.cy, g.drawable * 0.16, g.drawable * 0.22, "right", "#ffffff");

    const holeW = notch * 0.45;
    const holeH = notch * 0.6;
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 3; i += 1) {
      const dx = x + notch * 0.6 + i * notch * 1.65;
      ctx.fillRect(dx, y + holeH * 0.35, holeW, holeH);
      ctx.fillRect(dx, y + h - holeH * 1.35, holeW, holeH);
    }
  }

  // extend triangle helper to support up in eject; keep function local and simple
  const originalDrawPlayTriangle = drawPlayTriangle;
  drawPlayTriangle = function(ctx, cx, cy, width, height, direction, color) {
    if (direction === "up") {
      filledTriangle(ctx, [
        [cx, cy - height / 2],
        [cx - width / 2, cy + height / 2],
        [cx + width / 2, cy + height / 2]
      ], color);
      return;
    }
    return originalDrawPlayTriangle(ctx, cx, cy, width, height, direction, color);
  };

  window.SlowlyCanvasIcons.registerFamily("playback", {
    label: "播放 / Playback",
    desc: "播放控制、切歌、重播、循環、上下切換與影片相關 Canvas icon。",
    previewOrder: ["play", "playPause", "next", "shuffle", "repeat", "record", "video"],
    defaults: {
      size: 160,
      color: "#111111",
      thickness: 20,
      padding: 10,
      clear: true
    },
    controls: [
      { key: "size", label: "尺寸", type: "range", min: 40, max: 240, step: 1 },
      { key: "color", label: "顏色", type: "color" },
      { key: "thickness", label: "粗細", type: "range", min: 4, max: 56, step: 1 },
      { key: "padding", label: "內距", type: "range", min: 0, max: 40, step: 1 }
    ],
    icons: {
      shuffle: { label: "隨機播放", desc: "模擬 🔀。", draw: drawShuffle },
      repeat: { label: "重播循環", desc: "模擬 🔁。", draw: drawRepeat },
      repeatOnce: { label: "單曲循環", desc: "模擬 🔂。", draw: drawRepeatOnce },
      play: { label: "播放", desc: "模擬 ▶️。", draw: drawPlay },
      fastForward: { label: "快轉", desc: "模擬 ⏩️。", draw: drawFastForward },
      next: { label: "下一首", desc: "模擬 ⏭️。", draw: drawNext },
      playPause: { label: "播放／暫停", desc: "模擬 ⏯️。", draw: drawPlayPause },
      playLeft: { label: "向左播放", desc: "模擬 ◀️。", draw: drawPlayLeft },
      rewind: { label: "倒帶", desc: "模擬 ⏪️。", draw: drawRewind },
      previous: { label: "上一首", desc: "模擬 ⏮️。", draw: drawPrevious },
      up: { label: "上", desc: "模擬 🔼。", draw: drawTriangleUp },
      doubleUp: { label: "快速上移", desc: "模擬 ⏫️。", draw: drawDoubleUp },
      down: { label: "下", desc: "模擬 🔽。", draw: drawTriangleDown },
      doubleDown: { label: "快速下移", desc: "模擬 ⏬️。", draw: drawDoubleDown },
      pause: { label: "暫停", desc: "模擬 ⏸️。", draw: drawPause },
      stop: { label: "停止", desc: "模擬 ⏹️。", draw: drawStop },
      record: { label: "錄製", desc: "模擬 ⏺️。", draw: drawRecord },
      eject: { label: "退出", desc: "模擬 ⏏️。", draw: drawEject },
      video: { label: "影片", desc: "模擬 🎦。", draw: drawVideo }
    }
  });
})();
