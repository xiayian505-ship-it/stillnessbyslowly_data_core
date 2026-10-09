/* 慢慢軍火庫｜Video / Capture Stream v1.0.0
 * 單一責任：偵測及擷取 HTMLVideoElement 目前播放的媒體串流。
 * 不啟動手機系統螢幕錄影，不管理播放、錄製或資料下載。
 * window.SlowlyVideoCaptureStream
 */
(function (global) {
  "use strict";
  function method(media) {
    if (!media) return null;
    if (typeof media.captureStream === "function") return "captureStream";
    if (typeof media.mozCaptureStream === "function") return "mozCaptureStream";
    return null;
  }
  function isSupported(media) { return method(media) !== null; }
  function capture(media) {
    const name = method(media);
    if (!name) throw new Error("此瀏覽器或元素不支援 captureStream");
    return media[name]();
  }
  global.SlowlyVideoCaptureStream = Object.freeze({ version: "1.0.0", isSupported, capture });
})(typeof window !== "undefined" ? window : globalThis);
