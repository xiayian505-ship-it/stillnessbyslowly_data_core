/* 慢慢軍火庫｜Video / Media Recorder v1.0.0
 * 單一責任：建立、開始與停止 MediaRecorder；不保存 chunks、不管理 UI。
 * window.SlowlyVideoMediaRecorder
 */
(function (global) {
  "use strict";
  function isSupported() { return typeof global.MediaRecorder === "function"; }
  function create(stream, options = {}) {
    if (!isSupported()) throw new Error("此瀏覽器不支援 MediaRecorder");
    if (!stream || typeof stream.getTracks !== "function") throw new TypeError("需要 MediaStream");
    return new global.MediaRecorder(stream, options);
  }
  function start(recorder, timeslice) {
    if (!recorder || typeof recorder.start !== "function") throw new TypeError("需要 MediaRecorder");
    if (timeslice === undefined) recorder.start();
    else {
      if (!Number.isFinite(Number(timeslice)) || Number(timeslice) < 0) throw new RangeError("timeslice 必須是非負數");
      recorder.start(Number(timeslice));
    }
    return recorder;
  }
  function stop(recorder) {
    if (!recorder || typeof recorder.stop !== "function" || typeof recorder.addEventListener !== "function") {
      return Promise.reject(new TypeError("需要 MediaRecorder"));
    }
    if (recorder.state === "inactive") return Promise.resolve(recorder);
    return new Promise((resolve, reject) => {
      function cleanup() {
        recorder.removeEventListener("stop", onStop);
        recorder.removeEventListener("error", onError);
      }
      function onStop() { cleanup(); resolve(recorder); }
      function onError(event) { cleanup(); reject(event.error || new Error("錄製失敗")); }
      recorder.addEventListener("stop", onStop);
      recorder.addEventListener("error", onError);
      try { recorder.stop(); } catch (err) { cleanup(); reject(err); }
    });
  }
  global.SlowlyVideoMediaRecorder = Object.freeze({ version: "1.0.0", isSupported, create, start, stop });
})(typeof window !== "undefined" ? window : globalThis);
