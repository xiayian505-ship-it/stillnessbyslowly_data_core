/* 慢慢軍火庫｜Video / Remaining Time v1.0.0
 * 單一責任：推估指定倍速下的剩餘實際播放秒數；不碰 DOM。
 * 無有效總長度或倍率時回傳 null。
 * window.SlowlyVideoRemainingTime
 */
(function (global) {
  "use strict";
  function seconds(currentTime, duration, playbackRate = 1) {
    const current = Number(currentTime);
    const total = Number(duration);
    const rate = Number(playbackRate);
    if (!Number.isFinite(current) || !Number.isFinite(total) || total < 0 ||
        !Number.isFinite(rate) || rate <= 0) return null;
    return Math.max(0, total - current) / rate;
  }
  function read(media) {
    if (!media) throw new TypeError("需要媒體元素");
    return seconds(media.currentTime, media.duration, media.playbackRate);
  }
  global.SlowlyVideoRemainingTime = Object.freeze({ version: "1.0.0", seconds, read });
})(typeof window !== "undefined" ? window : globalThis);
