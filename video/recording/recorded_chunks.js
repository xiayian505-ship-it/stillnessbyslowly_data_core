/* 慢慢軍火庫｜Video / Recorded Chunks v1.0.0
 * 單一責任：收集 MediaRecorder 的 Blob 片段並組成一個 Blob。
 * 不啟停錄製器、不產生 URL、不下載檔案。
 * window.SlowlyVideoRecordedChunks
 */
(function (global) {
  "use strict";
  function create(mimeType = "") {
    const chunks = [];
    let subscribed = null;
    function add(blobOrEvent) {
      const blob = blobOrEvent instanceof Blob ? blobOrEvent : blobOrEvent && blobOrEvent.data;
      if (!(blob instanceof Blob)) throw new TypeError("需要 Blob 或 data 含 Blob 的事件");
      if (blob.size > 0) chunks.push(blob);
      return chunks.length;
    }
    function detach() {
      if (!subscribed) return;
      subscribed.removeEventListener("dataavailable", add);
      subscribed = null;
    }
    function attach(recorder) {
      if (!recorder || typeof recorder.addEventListener !== "function") throw new TypeError("需要 MediaRecorder");
      detach();
      subscribed = recorder;
      recorder.addEventListener("dataavailable", add);
      return detach;
    }
    function toBlob(type = mimeType) { return new Blob(chunks, type ? { type } : undefined); }
    function clear() { chunks.length = 0; }
    return Object.freeze({ add, attach, detach, toBlob, clear,
      get count() { return chunks.length; },
      get size() { return chunks.reduce((total, blob) => total + blob.size, 0); }
    });
  }
  global.SlowlyVideoRecordedChunks = Object.freeze({ version: "1.0.0", create });
})(typeof window !== "undefined" ? window : globalThis);
