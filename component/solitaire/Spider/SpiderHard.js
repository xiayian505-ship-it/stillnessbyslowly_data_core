/* 慢慢軍火庫｜Spider Hard（高階，4 花色）完成品入口 */
(function (global) {
  "use strict";
  global.SlowlySpiderHard = Object.freeze({
    mount(container) {
      if (!global.SlowlySpider?.mount) throw new Error("請先載入 Spider.js 共用引擎。");
      return global.SlowlySpider.mount(container, { suits: 4 });
    }
  });
})(typeof window !== "undefined" ? window : globalThis);
