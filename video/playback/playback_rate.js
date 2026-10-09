/* 慢慢軍火庫｜Video / Playback Rate v1.0.0
 * 單一責任：讀取及設定媒體播放倍率。無 UI、無外部依賴。
 * window.SlowlyVideoPlaybackRate
 */
(function (global) {
  "use strict";
  function requireMedia(media) {
    if (!media || !("playbackRate" in media)) throw new TypeError("需要 HTMLMediaElement");
  }
  function get(media) { requireMedia(media); return media.playbackRate; }
  function set(media, rate) {
    requireMedia(media);
    const value = Number(rate);
    if (!Number.isFinite(value) || value <= 0) throw new RangeError("rate 必須為大於 0 的有限數字");
    media.playbackRate = value;
    return media.playbackRate;
  }
  global.SlowlyVideoPlaybackRate = Object.freeze({ version: "1.0.0", get, set });
})(typeof window !== "undefined" ? window : globalThis);
