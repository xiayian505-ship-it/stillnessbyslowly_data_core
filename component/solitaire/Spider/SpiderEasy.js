/* 慢慢軍火庫｜Spider Easy（初階，1 花色）完成品入口 */
(function (global) {
  "use strict";
  global.SlowlySpiderEasy = Object.freeze({
    mount(container) {
      if (!global.SlowlySpider?.mount) throw new Error("請先載入 Spider.js 共用引擎。");
      return global.SlowlySpider.mount(container, { suits: 1 });
    }
  });
})(typeof window !== "undefined" ? window : globalThis);
