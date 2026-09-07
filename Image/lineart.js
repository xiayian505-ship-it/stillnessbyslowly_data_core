/*
 * Lineart
 * 圖片轉黑白線稿模組
 *
 * 使用：
 * Lineart.draw(img, canvas, { threshold: 12 });
 */
(function (global) {
  "use strict";

  function draw(img, canvas, options) {
    if (!img) {
      throw new TypeError("Lineart.draw: img is required.");
    }

    if (!canvas || typeof canvas.getContext !== "function") {
      throw new TypeError("Lineart.draw: canvas is required.");
    }

    options = options || {};

    var threshold = Number(options.threshold);
    if (!Number.isFinite(threshold)) {
      threshold = 12;
    }

    var ctx = canvas.getContext("2d");
    var w = img.naturalWidth || img.width;
    var h = img.naturalHeight || img.height;

    if (!w || !h) {
      throw new Error("Lineart.draw: image has no usable dimensions.");
    }

    canvas.width = w;
    canvas.height = h;

    ctx.drawImage(img, 0, 0, w, h);

    var src = ctx.getImageData(0, 0, w, h);
    var d = src.data;

    // 灰階
    var g = new Float32Array(w * h);

    for (var i = 0, p = 0; i < d.length; i += 4, p++) {
      g[p] = (d[i] + d[i + 1] + d[i + 2]) / 3;
    }

    // 輕微降噪：3 × 3 均值
    var b = new Float32Array(w * h);

    for (var y = 1; y < h - 1; y++) {
      for (var x = 1; x < w - 1; x++) {
        var bp = y * w + x;
        var s = 0;

        s += g[bp - w - 1] + g[bp - w] + g[bp - w + 1];
        s += g[bp - 1]     + g[bp]     + g[bp + 1];
        s += g[bp + w - 1] + g[bp + w] + g[bp + w + 1];

        b[bp] = s / 9;
      }
    }

    // Sobel Edge：保線
    var out = ctx.createImageData(w, h);
    var o = out.data;

    for (var py = 1; py < h - 1; py++) {
      for (var px = 1; px < w - 1; px++) {
        var pp = py * w + px;

        var a00 = b[pp - w - 1];
        var a01 = b[pp - w];
        var a02 = b[pp - w + 1];

        var a10 = b[pp - 1];
        var a12 = b[pp + 1];

        var a20 = b[pp + w - 1];
        var a21 = b[pp + w];
        var a22 = b[pp + w + 1];

        var sx =
          (-a00 + a02) +
          (-2 * a10 + 2 * a12) +
          (-a20 + a22);

        var sy =
          (-a00 - 2 * a01 - a02) +
          (a20 + 2 * a21 + a22);

        var mag = Math.sqrt(sx * sx + sy * sy);
        var v = mag > threshold ? 0 : 255;

        var oi = pp * 4;
        o[oi] = o[oi + 1] = o[oi + 2] = v;
        o[oi + 3] = 255;
      }
    }

    ctx.putImageData(out, 0, 0);

    return canvas;
  }

  global.Lineart = {
    draw: draw
  };
})(window);
