// dom_capture.js
// 慢慢的倉庫｜Image｜DOM Capture 1.0.0
// 將 DOM 元素複製到畫面外，交由宿主 renderer 轉成 Canvas，再輸出 Blob。
// 不綁 html2canvas、不綁特定元件、不負責下載／分享。
// renderer(element, renderOptions) 必須回傳 Canvas 或 Promise<Canvas>。
(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function requireElement(element) {
    if (
      !element ||
      typeof element.cloneNode !== "function" ||
      typeof element.getBoundingClientRect !== "function"
    ) {
      throw new TypeError("element must be a DOM element.");
    }

    return element;
  }

  function requireRenderer(renderer) {
    if (typeof renderer !== "function") {
      throw new TypeError("renderer must be a function.");
    }

    return renderer;
  }

  function requireDocument(element) {
    const doc = element.ownerDocument || global.document;

    if (
      !doc ||
      typeof doc.createElement !== "function" ||
      !doc.body
    ) {
      throw new Error("DOM Capture requires a document with body.");
    }

    return doc;
  }

  function canvasToBlob(canvas, options = {}) {
    if (!canvas || typeof canvas.toBlob !== "function") {
      return Promise.reject(
        new TypeError("renderer must return a Canvas-like object with toBlob().")
      );
    }

    const type = options.type || "image/png";
    const quality = options.quality;

    return new Promise(function (resolve, reject) {
      canvas.toBlob(
        function (blob) {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Canvas could not be converted to Blob."));
          }
        },
        type,
        quality
      );
    });
  }

  async function capture(element, options = {}) {
    const source = requireElement(element);
    const renderer = requireRenderer(options.renderer);
    const doc = requireDocument(source);

    const rect = source.getBoundingClientRect();
    const width = Math.ceil(Number(rect.width) || 0);

    if (!(width > 0)) {
      throw new RangeError("element width must be > 0.");
    }

    const wrap = doc.createElement("div");
    wrap.style.position = "fixed";
    wrap.style.left = "-100000px";
    wrap.style.top = "0";
    wrap.style.width = width + "px";
    wrap.style.background = "transparent";
    wrap.style.pointerEvents = "none";

    const clone = source.cloneNode(true);
    clone.style.width = width + "px";
    clone.style.maxWidth = "none";
    clone.style.margin = "0";

    if (options.removeBoxShadow !== false) {
      clone.style.boxShadow = "none";
    }

    if (typeof options.prepareClone === "function") {
      options.prepareClone(clone, source);
    }

    wrap.appendChild(clone);
    doc.body.appendChild(wrap);

    try {
      const canvas = await renderer(
        clone,
        options.renderOptions || {}
      );

      const blob = await canvasToBlob(canvas, {
        type: options.type || "image/png",
        quality: options.quality
      });

      return Object.freeze({
        blob,
        canvas,
        width
      });
    } finally {
      wrap.remove();
    }
  }

  global.DOMCapture = Object.freeze({
    version: VERSION,
    canvasToBlob,
    capture
  });

})(typeof window !== "undefined" ? window : globalThis);
