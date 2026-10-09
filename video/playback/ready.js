/* 慢慢軍火庫｜Video / Ready v1.0.0
 * 單一責任：等待媒體可播放；避免假設 seeked 一定會觸發。
 * 無 UI、無外部依賴。window.SlowlyVideoReady
 */
(function (global) {
  "use strict";
  function wait(media, options = {}) {
    if (!media || typeof media.addEventListener !== "function") {
      return Promise.reject(new TypeError("需要媒體元素"));
    }
    const minReadyState = options.minReadyState === undefined ? 2 : Number(options.minReadyState);
    const timeoutMs = options.timeoutMs === undefined ? 10000 : Number(options.timeoutMs);
    if (!Number.isInteger(minReadyState) || minReadyState < 1 || minReadyState > 4) {
      return Promise.reject(new RangeError("minReadyState 必須為 1～4"));
    }
    if (!Number.isFinite(timeoutMs) || timeoutMs < 0) {
      return Promise.reject(new RangeError("timeoutMs 不可小於 0"));
    }
    if (media.error) return Promise.reject(media.error);
    if (media.readyState >= minReadyState) return Promise.resolve(media);
    return new Promise((resolve, reject) => {
      let timer = null;
      const signal = options.signal;
      function cleanup() {
        for (const name of ["loadedmetadata", "loadeddata", "canplay", "canplaythrough"]) {
          media.removeEventListener(name, check);
        }
        media.removeEventListener("error", fail);
        if (signal) signal.removeEventListener("abort", abort);
        if (timer !== null) clearTimeout(timer);
      }
      function check() {
        if (media.error) return fail();
        if (media.readyState >= minReadyState) { cleanup(); resolve(media); }
      }
      function fail() { cleanup(); reject(media.error || new Error("媒體載入失敗")); }
      function abort() { cleanup(); reject(new DOMException("已取消等待媒體", "AbortError")); }
      if (signal && signal.aborted) return abort();
      for (const name of ["loadedmetadata", "loadeddata", "canplay", "canplaythrough"]) {
        media.addEventListener(name, check);
      }
      media.addEventListener("error", fail);
      if (signal) signal.addEventListener("abort", abort, { once: true });
      if (timeoutMs > 0) timer = setTimeout(() => { cleanup(); reject(new Error("等待媒體逾時")); }, timeoutMs);
      check();
    });
  }
  global.SlowlyVideoReady = Object.freeze({ version: "1.0.0", wait });
})(typeof window !== "undefined" ? window : globalThis);
