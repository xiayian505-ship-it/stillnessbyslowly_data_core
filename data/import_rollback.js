"use strict";

/* =========================================================
   慢慢的倉庫｜Import Rollback v1.0.0

   用途：
   - 為資料匯入流程保存「匯入前快照」
   - commit 失敗時，交由宿主提供的 restore() 還原
   - 成功後 release() 丟棄快照

   邊界：
   - 不綁定 JSON、localStorage、IndexedDB、Blob 或 UI
   - 不自行猜測資料怎麼備份、怎麼恢復
   - 可與 JSON Safe Import 的 rollback callback 搭配
========================================================= */

(function (global) {
  const VERSION = "1.0.0";

  function assertFunction(value, name) {
    if (typeof value !== "function") {
      throw new TypeError(`ImportRollback ${name} must be a function`);
    }
  }

  function create(options = {}) {
    const captureHandler = options.capture;
    const restoreHandler = options.restore;

    assertFunction(captureHandler, "capture");
    assertFunction(restoreHandler, "restore");

    let snapshot;
    let ready = false;
    let restoring = false;
    let restored = false;

    async function capture(context) {
      if (restoring) {
        throw new Error("ImportRollback cannot capture while restoring");
      }

      snapshot = await captureHandler(context);
      ready = true;
      restored = false;

      return snapshot;
    }

    async function rollback(context) {
      if (!ready) {
        return {
          restored: false,
          reason: "no-snapshot"
        };
      }

      if (restoring) {
        throw new Error("ImportRollback restore is already running");
      }

      restoring = true;

      try {
        await restoreHandler(snapshot, context);
        restored = true;

        return {
          restored: true
        };
      } finally {
        restoring = false;
      }
    }

    function release() {
      const hadSnapshot = ready;

      snapshot = undefined;
      ready = false;
      restored = false;

      return hadSnapshot;
    }

    return Object.freeze({
      version: VERSION,
      capture,
      rollback,
      release,

      get ready() {
        return ready;
      },

      get restoring() {
        return restoring;
      },

      get restored() {
        return restored;
      }
    });
  }

  global.ImportRollback = Object.freeze({
    version: VERSION,
    create
  });
})(window);
