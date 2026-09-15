// derived_result.js
// 慢慢的倉庫｜State｜Derived Result 1.0.0
// 管理「由目前輸入產生的結果」是否仍然有效。
// - touch(): 來源輸入已變更，既有結果自動成為 stale
// - commit(value): 以目前來源版本提交新結果
// - clear(): 清除結果，但保留目前來源版本
// 不綁 UI、不綁 QRCode、不比較業務資料內容。
(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function create(options = {}) {
    let sourceRevision = 0;
    let resultRevision = null;
    let hasResult = false;
    let value;

    if (Object.prototype.hasOwnProperty.call(options, "initialValue")) {
      value = options.initialValue;
      hasResult = true;
      resultRevision = sourceRevision;
    }

    function isFresh() {
      return hasResult && resultRevision === sourceRevision;
    }

    function isStale() {
      return hasResult && resultRevision !== sourceRevision;
    }

    function status() {
      if (!hasResult) return "empty";
      return isFresh() ? "fresh" : "stale";
    }

    function snapshot() {
      return Object.freeze({
        status: status(),
        hasResult,
        fresh: isFresh(),
        stale: isStale(),
        sourceRevision,
        resultRevision,
        value: hasResult ? value : undefined
      });
    }

    function touch() {
      sourceRevision += 1;
      return snapshot();
    }

    function commit(nextValue) {
      value = nextValue;
      hasResult = true;
      resultRevision = sourceRevision;
      return snapshot();
    }

    function clear() {
      value = undefined;
      hasResult = false;
      resultRevision = null;
      return snapshot();
    }

    return Object.freeze({
      version: VERSION,
      snapshot,
      status,
      isFresh,
      isStale,
      touch,
      commit,
      clear
    });
  }

  global.DerivedResult = Object.freeze({
    version: VERSION,
    create
  });

})(typeof window !== "undefined" ? window : globalThis);
