"use strict";

/* =========================================================
   慢慢的倉庫｜Elapsed Format v1.0.0

   通用經過時間格式化核心。

   API：
   - SlowlyElapsedFormat.formatHMS(milliseconds)

   行為：
   - 將毫秒轉為 HH:MM:SS
   - 小時不限制在 24 以內
   - 負數、非有限數值與無法轉成數字的值視為 0
   - 只負責格式化，不建立 Timer / Ticker，也不讀取 DOM
========================================================= */

(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function finiteMilliseconds(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, number) : 0;
  }

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function formatHMS(milliseconds) {
    const totalSeconds = Math.floor(finiteMilliseconds(milliseconds) / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
  }

  global.SlowlyElapsedFormat = Object.freeze({
    version: VERSION,
    formatHMS
  });
})(window);
