/* 慢慢軍火庫｜Video / Media Progress v1.0.0
 * 單一責任：由目前時間和總長度算出進度；不碰 DOM。
 * 無有效總長度時回傳 null，讓宿主自行顯示未知狀態。
 * window.SlowlyVideoMediaProgress
 */
(function (global) {
  "use strict";
  function ratio(currentTime, duration) {
    const current = Number(currentTime);
    const total = Number(duration);
    if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0) return null;
    return Math.max(0, Math.min(1, current / total));
  }
  function percent(currentTime, duration) {
    const r = ratio(currentTime, duration);
    return r === null ? null : r * 100;
  }
  function read(media) {
    if (!media) throw new TypeError("需要媒體元素");
    return percent(media.currentTime, media.duration);
  }
  global.SlowlyVideoMediaProgress = Object.freeze({ version: "1.0.0", ratio, percent, read });
})(typeof window !== "undefined" ? window : globalThis);
