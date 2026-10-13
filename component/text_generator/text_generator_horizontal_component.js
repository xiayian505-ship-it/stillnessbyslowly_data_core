/* ================================================================
 * 慢慢軍火庫｜Horizontal Text Generator v2.0.0
 * 橫式完成品：只產生由左往右的參考字位；模板完全由宿主提供。
 * 需要先載入 text_generator_core.js；不依賴直式完成品。
 * ================================================================ */
(function (global) {
  "use strict";

  const VERSION = "2.0.0";

  function create(options = {}) {
    const core = global.SlowlyTextGeneratorCore;
    if (!core?.create) {
      throw new Error("請先載入 text_generator_core.js。");
    }
    if (typeof options.renderSVG !== "function") {
      throw new TypeError("請提供宿主 renderSVG(text, helpers, layout)。");
    }
    if (options.getPositions != null && typeof options.getPositions !== "function") {
      throw new TypeError("getPositions 必須是函式。");
    }

    let engine;
    function layout(raw) {
      const text = engine.normalize(raw);
      if (!text) throw new Error("請輸入至少一個字。");
      const size = engine.sourceSize(text);
      const chars = core.splitCharacters(text);
      const custom = options.getPositions?.(text, size);
      const proposed = custom ?? chars.map((char, index) => ({
        index,
        x: size.width * (index + 1) / (chars.length + 1),
        y: size.height / 2
      }));
      if (!Array.isArray(proposed) || proposed.length !== chars.length) {
        throw new RangeError("橫式字位必須是與文字字數一致的陣列。");
      }
      const slots = proposed.map((slot, index) => {
        if (!slot || !Number.isFinite(slot.x) || !Number.isFinite(slot.y)) {
          throw new TypeError(`第 ${index + 1} 個橫式字位需要有效的 x、y 數值。`);
        }
        return { ...slot, index };
      });
      return { orientation: "horizontal", sourceSize: size, slots };
    }

    engine = core.create({
      ...options,
      renderSVG(text, helpers) {
        return options.renderSVG(text, helpers, layout(text));
      }
    });

    return Object.freeze({ ...engine, layout });
  }

  global.SlowlyHorizontalTextGenerator = Object.freeze({ version: VERSION, create });
})(typeof window !== "undefined" ? window : globalThis);
