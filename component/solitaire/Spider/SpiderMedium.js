/* 慢慢軍火庫｜Spider Medium（中階，2 花色）完成品入口 */
(function (global) {
  "use strict";
  global.SlowlySpiderMedium = Object.freeze({
    mount(container) {
      if (!global.SlowlySpider?.mount) throw new Error("請先載入 Spider.js 共用引擎。");
      return global.SlowlySpider.mount(container, { suits: 2 });
    }
  });
})(typeof window !== "undefined" ? window : globalThis);
