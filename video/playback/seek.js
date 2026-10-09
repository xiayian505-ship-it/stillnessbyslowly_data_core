/* 慢慢軍火庫｜Video / Seek v1.0.0
 * 單一責任：變更播放時間與回到起點。無 UI、無外部依賴。
 * window.SlowlyVideoSeek
 */
(function (global) {
  "use strict";
  function requireMedia(media) {
    if (!media || !("currentTime" in media)) throw new TypeError("需要 HTMLMediaElement");
  }
  function to(media, seconds, options = {}) {
    requireMedia(media);
    let target = Number(seconds);
    if (!Number.isFinite(target)) throw new TypeError("seconds 必須為有限數字");
    if (options.clamp !== false) {
      target = Math.max(0, target);
      if (Number.isFinite(media.duration) && media.duration >= 0) target = Math.min(target, media.duration);
    }
    media.currentTime = target;
    return media.currentTime;
  }
  function restart(media) { return to(media, 0); }
  global.SlowlyVideoSeek = Object.freeze({ version: "1.0.0", to, restart });
})(typeof window !== "undefined" ? window : globalThis);
