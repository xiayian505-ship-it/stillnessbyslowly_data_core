/* 慢慢軍火庫｜Video / Recorder MIME Type v1.0.0
 * 單一責任：查詢 MediaRecorder 支援的錄製格式，不建立錄製器。
 * window.SlowlyVideoRecorderMime
 */
(function (global) {
  "use strict";
  const DEFAULT_TYPES = Object.freeze([
    "video/mp4;codecs=h264,aac", "video/mp4",
    "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"
  ]);
  function isSupported(type, recorderCtor = global.MediaRecorder) {
    return !!(recorderCtor && typeof recorderCtor.isTypeSupported === "function" &&
      typeof type === "string" && type && recorderCtor.isTypeSupported(type));
  }
  function choose(candidates = DEFAULT_TYPES, recorderCtor = global.MediaRecorder) {
    if (!Array.isArray(candidates)) throw new TypeError("candidates 必須為陣列");
    return candidates.find(type => isSupported(type, recorderCtor)) || null;
  }
  global.SlowlyVideoRecorderMime = Object.freeze({ version: "1.0.0", isSupported, choose, defaultTypes: DEFAULT_TYPES });
})(typeof window !== "undefined" ? window : globalThis);
