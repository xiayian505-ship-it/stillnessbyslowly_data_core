// canvas_text_wrap.js
// 慢慢的倉庫｜UI / Canvas｜Canvas Text Wrap 1.0.0
// 使用 CanvasRenderingContext2D.measureText() 進行逐字換行。
// 支援 maxWidth、maxLines、ellipsis，適合中英文混合文字。
// 不綁字體、不綁顏色、不建立 Canvas、不負責分享卡或圖片輸出。
(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function requireContext(ctx) {
    if (
      !ctx ||
      typeof ctx.measureText !== "function"
    ) {
      throw new TypeError(
        "ctx must provide measureText()."
      );
    }

    return ctx;
  }

  function positive(value, name) {
    const number = Number(value);

    if (!Number.isFinite(number) || number <= 0) {
      throw new RangeError(name + " must be > 0.");
    }

    return number;
  }

  function normalizeMaxLines(value) {
    if (value === undefined || value === Infinity) {
      return Infinity;
    }

    const number = Number(value);

    if (!Number.isInteger(number) || number <= 0) {
      throw new RangeError(
        "maxLines must be a positive integer or Infinity."
      );
    }

    return number;
  }

  function fitEllipsis(ctx, text, maxWidth, ellipsis) {
    let value = text;

    while (
      value &&
      ctx.measureText(value + ellipsis).width > maxWidth
    ) {
      value = value.slice(0, -1);
    }

    if (
      !value &&
      ctx.measureText(ellipsis).width > maxWidth
    ) {
      return "";
    }

    return value + ellipsis;
  }

  function layout(ctx, text, options = {}) {
    requireContext(ctx);

    const maxWidth = positive(
      options.maxWidth,
      "maxWidth"
    );

    const maxLines = normalizeMaxLines(
      options.maxLines
    );

    const ellipsis =
      options.ellipsis === undefined
        ? "…"
        : String(options.ellipsis);

    const source = String(text == null ? "" : text);
    const chars = [...source];

    if (chars.length === 0) {
      return Object.freeze({
        lines: Object.freeze([]),
        truncated: false
      });
    }

    const lines = [];
    let line = "";
    let consumed = 0;

    for (const ch of chars) {
      const next = line + ch;

      if (
        line &&
        ctx.measureText(next).width > maxWidth
      ) {
        lines.push(line);

        if (lines.length >= maxLines) {
          break;
        }

        line = ch;
      } else {
        line = next;
      }

      consumed += 1;
    }

    if (
      line &&
      lines.length < maxLines
    ) {
      lines.push(line);
    }

    const joinedLength = [...lines.join("")].length;
    const truncated = joinedLength < chars.length;

    if (
      truncated &&
      lines.length > 0 &&
      ellipsis
    ) {
      lines[lines.length - 1] = fitEllipsis(
        ctx,
        lines[lines.length - 1],
        maxWidth,
        ellipsis
      );
    }

    return Object.freeze({
      lines: Object.freeze(lines.slice()),
      truncated
    });
  }

  function draw(ctx, text, options = {}) {
    requireContext(ctx);

    if (typeof ctx.fillText !== "function") {
      throw new TypeError(
        "ctx must provide fillText() for draw()."
      );
    }

    const x = Number(options.x ?? 0);
    const y = Number(options.y ?? 0);

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new TypeError(
        "x and y must be finite numbers."
      );
    }

    const lineHeight = positive(
      options.lineHeight,
      "lineHeight"
    );

    const result = layout(ctx, text, options);

    result.lines.forEach(function (line, index) {
      ctx.fillText(
        line,
        x,
        y + index * lineHeight
      );
    });

    return Object.freeze({
      lines: result.lines,
      truncated: result.truncated,
      lineCount: result.lines.length,
      firstY: y,
      lastY:
        result.lines.length === 0
          ? y
          : y + (result.lines.length - 1) * lineHeight,
      nextY:
        y + result.lines.length * lineHeight
    });
  }

  global.CanvasTextWrap = Object.freeze({
    version: VERSION,
    layout,
    draw
  });

})(typeof window !== "undefined" ? window : globalThis);
