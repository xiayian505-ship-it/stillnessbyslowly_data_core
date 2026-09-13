"use strict";

/* =========================================================
   慢慢的倉庫｜Canvas Wrapped Text v1.0.0

   用途：
   - 依 Canvas measureText() 寬度逐字換行
   - 可限制最大行數，超出時自動加省略號
   - 僅處理文字切行與 fillText，不控制字型或顏色
========================================================= */

(function (global) {
  const VERSION = "1.0.0";

  function buildLines(ctx, text, maxWidth, maxLines = Infinity) {
    if (!ctx || typeof ctx.measureText !== "function") {
      throw new TypeError("SlowlyCanvasWrappedText requires a CanvasRenderingContext2D-like object");
    }

    const width = Number(maxWidth);
    if (!Number.isFinite(width) || width < 0) {
      throw new RangeError("maxWidth must be a finite number >= 0");
    }

    const lineLimit = maxLines === Infinity
      ? Infinity
      : Math.max(0, Math.floor(Number(maxLines) || 0));

    if (lineLimit === 0) return [];

    const chars = [...String(text ?? "")];
    let line = "";
    const lines = [];

    for (const ch of chars) {
      const test = line + ch;

      if (ctx.measureText(test).width > width && line) {
        lines.push(line);
        line = ch;

        if (lines.length >= lineLimit) break;
      } else {
        line = test;
      }
    }

    if (line && lines.length < lineLimit) {
      lines.push(line);
    }

    if (lines.length === lineLimit && chars.join("") !== lines.join("")) {
      let last = lines[lines.length - 1] || "";

      while (last && ctx.measureText(last + "…").width > width) {
        last = last.slice(0, -1);
      }

      lines[lines.length - 1] = last + "…";
    }

    return lines;
  }

  function draw(ctx, text, x, y, maxWidth, lineHeight, maxLines = Infinity) {
    if (!ctx || typeof ctx.fillText !== "function") {
      throw new TypeError("SlowlyCanvasWrappedText requires a CanvasRenderingContext2D-like object");
    }

    const step = Number(lineHeight);
    if (!Number.isFinite(step)) {
      throw new RangeError("lineHeight must be a finite number");
    }

    const lines = buildLines(ctx, text, maxWidth, maxLines);

    lines.forEach((line, index) => {
      ctx.fillText(line, x, y + index * step);
    });

    return {
      lines,
      endY: y + Math.max(0, lines.length - 1) * step
    };
  }

  global.SlowlyCanvasWrappedText = Object.freeze({
    version: VERSION,
    buildLines,
    draw
  });
})(typeof window !== "undefined" ? window : globalThis);
