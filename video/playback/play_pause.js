/* 慢慢軍火庫｜Video / Play Pause v1.0.0
 * 單一責任：影片播放、暫停與切換。無 UI、無外部依賴。
 * window.SlowlyVideoPlayPause
 */
(function (global) {
  "use strict";
  function requireMedia(media) {
    if (!media || typeof media.play !== "function" || typeof media.pause !== "function") {
      throw new TypeError("需要支援 play/pause 的媒體元素");
    }
  }
  function play(media) { requireMedia(media); return media.play(); }
  function pause(media) { requireMedia(media); media.pause(); return media.paused; }
  function toggle(media) { requireMedia(media); return media.paused ? play(media) : pause(media); }
  global.SlowlyVideoPlayPause = Object.freeze({ version: "1.0.0", play, pause, toggle });
})(typeof window !== "undefined" ? window : globalThis);
