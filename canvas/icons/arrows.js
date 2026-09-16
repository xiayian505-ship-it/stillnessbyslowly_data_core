/* =========================================================
   Slowly Canvas Icons | Arrows
   ---------------------------------------------------------
   Arrow family.
   Current icons:
   - up / upRight / right / downRight / down / downLeft / left / upLeft
   - horizontal / vertical
   - turnLeft / turnRight / turnUp / turnDown
   - rotateClockwise / rotateCounterClockwise
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

    const headRatio = clamp(number(options.headRatio, 1.55), 0.9, 3);
    const headHalf = clamp(thickness * headRatio, thickness * 0.65, drawable * 0.48);
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

  function withRotation(ctx, cx, cy, angle, drawFn) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.translate(-cx, -cy);
    drawFn();
    ctx.restore();
  }

  function drawArrowHeadFilled(ctx, x, y, angle, length, halfWidth, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-halfWidth, length);
    ctx.lineTo(halfWidth, length);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawArrowHeadLine(ctx, x, y, angle, length, halfWidth) {
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

  function drawSingleArrowUp(ctx, options) {
    const g = getGeometry(ctx, options);
    const half = g.drawable / 2;
    const shaftHalf = g.thickness / 2;

    const top = g.cy - half;
    const bottom = g.cy + half;
    const base = top + g.headLength;

    ctx.fillStyle = g.color;
    ctx.beginPath();
    ctx.moveTo(g.cx, top);
    ctx.lineTo(g.cx + g.headHalf, base);
    ctx.lineTo(g.cx + shaftHalf, base);
    ctx.lineTo(g.cx + shaftHalf, bottom);
    ctx.lineTo(g.cx - shaftHalf, bottom);
    ctx.lineTo(g.cx - shaftHalf, base);
    ctx.lineTo(g.cx - g.headHalf, base);
    ctx.closePath();
    ctx.fill();
  }

  function makeSingleArrow(angle) {
    return function drawSingleArrow(ctx, options) {
      const g = getGeometry(ctx, options);
      withRotation(ctx, g.cx, g.cy, angle, () => drawSingleArrowUp(ctx, options));
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



  function drawSingleArrowAt(ctx, options, direction, cx, cy, sizeScale = 0.44) {
    const g = getGeometry(ctx, options);
    const angleMap = {
      up: 0,
      upRight: Math.PI / 4,
      right: Math.PI / 2,
      downRight: (Math.PI * 3) / 4,
      down: Math.PI,
      downLeft: (Math.PI * 5) / 4,
      left: (Math.PI * 3) / 2,
      upLeft: (Math.PI * 7) / 4
    };

    const angle = angleMap[direction];
    if (angle === undefined) {
      throw new Error(`[SlowlyCanvasIcons/arrows] 不支援的方向：${direction}`);
    }

    const localSize = g.drawable * sizeScale;
    const localThickness = Math.max(2, g.thickness * 0.58);
    const localHeadHalf = Math.max(localThickness * 1.25, localThickness * number(options.headRatio, 1.55));
    const localHeadLength = Math.max(localThickness * 1.25, localSize * 0.3);
    const half = localSize / 2;
    const shaftHalf = localThickness / 2;
    const top = cy - half;
    const bottom = cy + half;
    const base = top + localHeadLength;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.translate(-cx, -cy);
    ctx.fillStyle = g.color;
    ctx.beginPath();
    ctx.moveTo(cx, top);
    ctx.lineTo(cx + localHeadHalf, base);
    ctx.lineTo(cx + shaftHalf, base);
    ctx.lineTo(cx + shaftHalf, bottom);
    ctx.lineTo(cx - shaftHalf, bottom);
    ctx.lineTo(cx - shaftHalf, base);
    ctx.lineTo(cx - localHeadHalf, base);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function makeStackedPair(topDirection, bottomDirection) {
    return function drawStackedPair(ctx, options) {
      const g = getGeometry(ctx, options);
      const offsetY = g.drawable * 0.24;
      drawSingleArrowAt(ctx, options, topDirection, g.cx, g.cy - offsetY, 0.38);
      drawSingleArrowAt(ctx, options, bottomDirection, g.cx, g.cy + offsetY, 0.38);
    };
  }

  function makeCrossedPair(firstDirection, secondDirection) {
    return function drawCrossedPair(ctx, options) {
      const g = getGeometry(ctx, options);
      drawSingleArrowAt(ctx, options, firstDirection, g.cx, g.cy, 0.56);
      drawSingleArrowAt(ctx, options, secondDirection, g.cx, g.cy, 0.56);
    };
  }

  function drawTurnLeft(ctx, options) {
    const g = getGeometry(ctx, options);
    const half = g.drawable / 2;
    const left = g.cx - half;
    const right = g.cx + half;
    const top = g.cy - half;
    const bottom = g.cy + half;
    const radius = Math.max(g.thickness * 1.8, g.drawable * 0.26);
    const startX = right - g.headLength * 0.45;
    const endX = left + g.headLength * 0.95;
    const turnTop = top + g.headLength * 0.7;
    const turnBottom = bottom - g.headLength * 0.7;

    ctx.strokeStyle = g.color;
    ctx.lineWidth = g.thickness;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(startX, turnBottom);
    ctx.lineTo(startX, turnTop + radius * 0.25);
    ctx.quadraticCurveTo(startX, turnTop, startX - radius * 0.45, turnTop);
    ctx.lineTo(endX, turnTop);
    ctx.stroke();

    drawArrowHeadLine(ctx, endX, turnTop, -Math.PI / 2, g.headLength, g.headHalf);
  }

  function drawTurnRight(ctx, options) {
    const g = getGeometry(ctx, options);
    const half = g.drawable / 2;
    const left = g.cx - half;
    const right = g.cx + half;
    const top = g.cy - half;
    const bottom = g.cy + half;
    const radius = Math.max(g.thickness * 1.8, g.drawable * 0.26);
    const startX = left + g.headLength * 0.45;
    const endX = right - g.headLength * 0.95;
    const turnTop = top + g.headLength * 0.7;
    const turnBottom = bottom - g.headLength * 0.7;

    ctx.strokeStyle = g.color;
    ctx.lineWidth = g.thickness;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(startX, turnBottom);
    ctx.lineTo(startX, turnTop + radius * 0.25);
    ctx.quadraticCurveTo(startX, turnTop, startX + radius * 0.45, turnTop);
    ctx.lineTo(endX, turnTop);
    ctx.stroke();

    drawArrowHeadLine(ctx, endX, turnTop, Math.PI / 2, g.headLength, g.headHalf);
  }

  function drawTurnUp(ctx, options) {
    const g = getGeometry(ctx, options);
    const half = g.drawable / 2;
    const left = g.cx - half;
    const right = g.cx + half;
    const top = g.cy - half;
    const bottom = g.cy + half;
    const endX = right - g.headLength * 0.65;
    const turnY = bottom - g.headLength * 0.95;
    const topY = top + g.headLength * 0.9;

    ctx.strokeStyle = g.color;
    ctx.lineWidth = g.thickness;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(left + g.headLength * 0.8, turnY);
    ctx.lineTo(endX - g.headLength * 0.35, turnY);
    ctx.quadraticCurveTo(endX, turnY, endX, turnY - g.headLength * 0.35);
    ctx.lineTo(endX, topY);
    ctx.stroke();

    drawArrowHeadLine(ctx, endX, topY, 0, g.headLength, g.headHalf);
  }

  function drawTurnDown(ctx, options) {
    const g = getGeometry(ctx, options);
    const half = g.drawable / 2;
    const left = g.cx - half;
    const right = g.cx + half;
    const top = g.cy - half;
    const bottom = g.cy + half;
    const endX = right - g.headLength * 0.65;
    const turnY = top + g.headLength * 0.95;
    const bottomY = bottom - g.headLength * 0.9;

    ctx.strokeStyle = g.color;
    ctx.lineWidth = g.thickness;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(left + g.headLength * 0.8, turnY);
    ctx.lineTo(endX - g.headLength * 0.35, turnY);
    ctx.quadraticCurveTo(endX, turnY, endX, turnY + g.headLength * 0.35);
    ctx.lineTo(endX, bottomY);
    ctx.stroke();

    drawArrowHeadLine(ctx, endX, bottomY, Math.PI, g.headLength, g.headHalf);
  }

  function drawRotateClockwise(ctx, options) {
    const g = getGeometry(ctx, options);
    const radius = g.drawable * 0.29;
    const arcOffset = Math.PI / 7;

    ctx.strokeStyle = g.color;
    ctx.lineWidth = g.thickness;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.arc(g.cx, g.cy, radius, Math.PI + arcOffset, -arcOffset, false);
    ctx.stroke();

    const head1X = g.cx + Math.cos(-arcOffset) * radius;
    const head1Y = g.cy + Math.sin(-arcOffset) * radius;
    drawArrowHeadLine(ctx, head1X, head1Y, Math.PI / 2 - arcOffset, g.headLength * 0.82, g.headHalf * 0.78);

    ctx.beginPath();
    ctx.arc(g.cx, g.cy, radius, arcOffset, Math.PI - arcOffset, false);
    ctx.stroke();

    const head2X = g.cx + Math.cos(Math.PI - arcOffset) * radius;
    const head2Y = g.cy + Math.sin(Math.PI - arcOffset) * radius;
    drawArrowHeadLine(ctx, head2X, head2Y, (Math.PI / 2) + (Math.PI - arcOffset), g.headLength * 0.82, g.headHalf * 0.78);
  }

  function drawRotateCounterClockwise(ctx, options) {
    const g = getGeometry(ctx, options);
    const radius = g.drawable * 0.29;
    const arcOffset = Math.PI / 7;

    ctx.strokeStyle = g.color;
    ctx.lineWidth = g.thickness;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.arc(g.cx, g.cy, radius, -arcOffset, Math.PI + arcOffset, true);
    ctx.stroke();

    const head1X = g.cx + Math.cos(-arcOffset) * radius;
    const head1Y = g.cy + Math.sin(-arcOffset) * radius;
    drawArrowHeadLine(ctx, head1X, head1Y, -Math.PI / 2 - arcOffset, g.headLength * 0.82, g.headHalf * 0.78);

    ctx.beginPath();
    ctx.arc(g.cx, g.cy, radius, Math.PI - arcOffset, arcOffset, true);
    ctx.stroke();

    const head2X = g.cx + Math.cos(Math.PI - arcOffset) * radius;
    const head2Y = g.cy + Math.sin(Math.PI - arcOffset) * radius;
    drawArrowHeadLine(ctx, head2X, head2Y, Math.PI / 2 + (Math.PI - arcOffset), g.headLength * 0.82, g.headHalf * 0.78);
  }

  window.SlowlyCanvasIcons.registerFamily("arrows", {
    label: "方向 / Arrows",
    desc: "方向、雙向、轉彎與旋轉箭頭 Canvas icon。宿主可覆寫尺寸、顏色、粗細與箭頭比例。",
    previewOrder: ["horizontal", "vertical", "rightLeftStack", "upLeftDownRightStack", "crossUpLeftDownRight", "turnRight", "rotateClockwise"],
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
      up: {
        label: "上箭頭",
        desc: "模擬 ⬆ 的單向上箭頭。",
        draw: makeSingleArrow(0)
      },
      upRight: {
        label: "右上箭頭",
        desc: "模擬 ↗ 的單向右上箭頭。",
        draw: makeSingleArrow(Math.PI / 4)
      },
      right: {
        label: "右箭頭",
        desc: "模擬 ➡ 的單向右箭頭。",
        draw: makeSingleArrow(Math.PI / 2)
      },
      downRight: {
        label: "右下箭頭",
        desc: "模擬 ↘ 的單向右下箭頭。",
        draw: makeSingleArrow((Math.PI * 3) / 4)
      },
      down: {
        label: "下箭頭",
        desc: "模擬 ⬇ 的單向下箭頭。",
        draw: makeSingleArrow(Math.PI)
      },
      downLeft: {
        label: "左下箭頭",
        desc: "模擬 ↙ 的單向左下箭頭。",
        draw: makeSingleArrow((Math.PI * 5) / 4)
      },
      left: {
        label: "左箭頭",
        desc: "模擬 ⬅ 的單向左箭頭。",
        draw: makeSingleArrow((Math.PI * 3) / 2)
      },
      upLeft: {
        label: "左上箭頭",
        desc: "模擬 ↖ 的單向左上箭頭。",
        draw: makeSingleArrow((Math.PI * 7) / 4)
      },
      rightLeftStack: {
        label: "右／左堆疊箭頭",
        desc: "上方右箭頭、下方左箭頭。",
        draw: makeStackedPair("right", "left")
      },
      leftRightStack: {
        label: "左／右堆疊箭頭",
        desc: "上方左箭頭、下方右箭頭。",
        draw: makeStackedPair("left", "right")
      },
      upDownStack: {
        label: "上／下堆疊箭頭",
        desc: "上方上箭頭、下方下箭頭。",
        draw: makeStackedPair("up", "down")
      },
      downUpStack: {
        label: "下／上堆疊箭頭",
        desc: "上方下箭頭、下方上箭頭。",
        draw: makeStackedPair("down", "up")
      },
      upLeftDownRightStack: {
        label: "左上／右下堆疊箭頭",
        desc: "上方左上箭頭、下方右下箭頭。",
        draw: makeStackedPair("upLeft", "downRight")
      },
      downRightUpLeftStack: {
        label: "右下／左上堆疊箭頭",
        desc: "上方右下箭頭、下方左上箭頭。",
        draw: makeStackedPair("downRight", "upLeft")
      },
      upRightDownLeftStack: {
        label: "右上／左下堆疊箭頭",
        desc: "上方右上箭頭、下方左下箭頭。",
        draw: makeStackedPair("upRight", "downLeft")
      },
      downLeftUpRightStack: {
        label: "左下／右上堆疊箭頭",
        desc: "上方左下箭頭、下方右上箭頭。",
        draw: makeStackedPair("downLeft", "upRight")
      },
      crossUpLeftDownRight: {
        label: "左上／右下交錯箭頭",
        desc: "兩支斜向箭頭重疊交錯：左上與右下。",
        draw: makeCrossedPair("upLeft", "downRight")
      },
      crossUpRightDownLeft: {
        label: "右上／左下交錯箭頭",
        desc: "兩支斜向箭頭重疊交錯：右上與左下。",
        draw: makeCrossedPair("upRight", "downLeft")
      },
      vertical: {
        label: "上下雙向箭頭",
        desc: "模擬 ↕ 的上下雙向箭頭。",
        draw: fillVertical
      },
      horizontal: {
        label: "左右雙向箭頭",
        desc: "模擬 ↔ 的左右雙向箭頭。",
        draw: fillHorizontal
      },
      turnLeft: {
        label: "左回彎箭頭",
        desc: "模擬 ↩ 的左回彎箭頭。",
        draw: drawTurnLeft
      },
      turnRight: {
        label: "右回彎箭頭",
        desc: "模擬 ↪ 的右回彎箭頭。",
        draw: drawTurnRight
      },
      turnUp: {
        label: "右上轉向箭頭",
        desc: "模擬 ⤴ 的右上轉向箭頭。",
        draw: drawTurnUp
      },
      turnDown: {
        label: "右下轉向箭頭",
        desc: "模擬 ⤵ 的右下轉向箭頭。",
        draw: drawTurnDown
      },
      rotateClockwise: {
        label: "順時針旋轉箭頭",
        desc: "模擬 🔃 的循環箭頭。",
        draw: drawRotateClockwise
      },
      rotateCounterClockwise: {
        label: "逆時針旋轉箭頭",
        desc: "模擬 🔄 的循環箭頭。",
        draw: drawRotateCounterClockwise
      }
    }
  });
})();
