/* 慢慢軍火庫｜Klondike Draw 3（翻三張）獨立完成品入口 */
(function (global) {
  "use strict";
  global.SlowlyKlondikeDraw3 = Object.freeze({
    mount(container) {
      if (!global.SlowlyKlondike?.mount) throw new Error("請先載入 Klondike.js 共用引擎。");
      return global.SlowlyKlondike.mount(container, { draw: 3 });
    }
  });
})(typeof window !== "undefined" ? window : globalThis);
