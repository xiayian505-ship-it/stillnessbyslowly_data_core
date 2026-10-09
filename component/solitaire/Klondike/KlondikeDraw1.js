/* 慢慢軍火庫｜Klondike Draw 1（翻一張）獨立完成品入口 */
(function (global) {
  "use strict";
  global.SlowlyKlondikeDraw1 = Object.freeze({
    mount(container) {
      if (!global.SlowlyKlondike?.mount) throw new Error("請先載入 Klondike.js 共用引擎。");
      return global.SlowlyKlondike.mount(container, { draw: 1 });
    }
  });
})(typeof window !== "undefined" ? window : globalThis);
