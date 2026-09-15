// canvas_rect_drag.js
// 慢慢的倉庫｜UI / Canvas｜Canvas Rect Drag 1.0.0
// Canvas 座標換算 + 矩形命中判斷 + 邊界限制拖曳。
// 不負責繪圖、不綁 QRCode / 圖片、不保存業務資料。
(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function finite(value, name) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      throw new TypeError(name + " must be a finite number.");
    }

    return number;
  }

  function nonNegative(value, name) {
    const number = finite(value, name);

    if (number < 0) {
      throw new RangeError(name + " must be >= 0.");
    }

    return number;
  }

  function normalizeRect(rect) {
    if (!rect || typeof rect !== "object") {
      throw new TypeError("rect must be an object.");
    }

    return {
      x: finite(rect.x, "rect.x"),
      y: finite(rect.y, "rect.y"),
      width: nonNegative(rect.width, "rect.width"),
      height: nonNegative(rect.height, "rect.height")
    };
  }

  function pointFromEvent(canvas, event) {
    if (
      !canvas ||
      typeof canvas.getBoundingClientRect !== "function"
    ) {
      throw new TypeError(
        "canvas must provide getBoundingClientRect()."
      );
    }

    const rect = canvas.getBoundingClientRect();

    if (!(rect.width > 0) || !(rect.height > 0)) {
      throw new RangeError(
        "canvas client rect width/height must be > 0."
      );
    }

    let clientX;
    let clientY;

    if (event?.touches?.length) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else if (event?.changedTouches?.length) {
      clientX = event.changedTouches[0].clientX;
      clientY = event.changedTouches[0].clientY;
    } else {
      clientX = event?.clientX;
      clientY = event?.clientY;
    }

    clientX = finite(clientX, "event.clientX");
    clientY = finite(clientY, "event.clientY");

    return Object.freeze({
      x:
        (clientX - rect.left) *
        (finite(canvas.width, "canvas.width") / rect.width),
      y:
        (clientY - rect.top) *
        (finite(canvas.height, "canvas.height") / rect.height)
    });
  }

  function contains(rect, point) {
    const r = normalizeRect(rect);
    const x = finite(point?.x, "point.x");
    const y = finite(point?.y, "point.y");

    return (
      x >= r.x &&
      x <= r.x + r.width &&
      y >= r.y &&
      y <= r.y + r.height
    );
  }

  function clampRect(rect, bounds) {
    const r = normalizeRect(rect);
    const width = nonNegative(bounds?.width, "bounds.width");
    const height = nonNegative(bounds?.height, "bounds.height");

    const maxX = Math.max(0, width - r.width);
    const maxY = Math.max(0, height - r.height);

    return Object.freeze({
      x: Math.max(0, Math.min(r.x, maxX)),
      y: Math.max(0, Math.min(r.y, maxY)),
      width: r.width,
      height: r.height
    });
  }

  function create(options = {}) {
    let rect = normalizeRect(options.rect || {
      x: 0,
      y: 0,
      width: 0,
      height: 0
    });

    let bounds = {
      width: nonNegative(options.bounds?.width ?? 0, "bounds.width"),
      height: nonNegative(options.bounds?.height ?? 0, "bounds.height")
    };

    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;

    rect = { ...clampRect(rect, bounds) };

    function snapshot() {
      return Object.freeze({
        dragging,
        rect: Object.freeze({ ...rect }),
        bounds: Object.freeze({ ...bounds })
      });
    }

    function setRect(nextRect) {
      rect = {
        ...clampRect(
          normalizeRect(nextRect),
          bounds
        )
      };

      return snapshot();
    }

    function setBounds(nextBounds) {
      bounds = {
        width: nonNegative(
          nextBounds?.width,
          "bounds.width"
        ),
        height: nonNegative(
          nextBounds?.height,
          "bounds.height"
        )
      };

      rect = {
        ...clampRect(rect, bounds)
      };

      return snapshot();
    }

    function start(point) {
      if (!contains(rect, point)) {
        dragging = false;
        return Object.freeze({
          started: false,
          snapshot: snapshot()
        });
      }

      offsetX = finite(point.x, "point.x") - rect.x;
      offsetY = finite(point.y, "point.y") - rect.y;
      dragging = true;

      return Object.freeze({
        started: true,
        snapshot: snapshot()
      });
    }

    function move(point) {
      if (!dragging) {
        return snapshot();
      }

      const next = {
        x: finite(point?.x, "point.x") - offsetX,
        y: finite(point?.y, "point.y") - offsetY,
        width: rect.width,
        height: rect.height
      };

      rect = {
        ...clampRect(next, bounds)
      };

      return snapshot();
    }

    function stop() {
      dragging = false;
      return snapshot();
    }

    return Object.freeze({
      version: VERSION,
      snapshot,
      setRect,
      setBounds,
      start,
      move,
      stop
    });
  }

  global.CanvasRectDrag = Object.freeze({
    version: VERSION,
    pointFromEvent,
    contains,
    clampRect,
    create
  });

})(typeof window !== "undefined" ? window : globalThis);
