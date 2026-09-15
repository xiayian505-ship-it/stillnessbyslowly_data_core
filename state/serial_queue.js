/* =========================================================
   Serial Queue v1.0.0
   Stillness by Slowly - 慢慢的倉庫

   用途：
   - 將非同步工作依加入順序逐一執行
   - 前一件完成後，才執行下一件
   - 單一工作失敗時，只拒絕該工作的 Promise
   - 某一件失敗，不會讓後續工作停止

   責任：
   - FIFO 排隊
   - 非同步序列執行
   - 個別工作的 resolve / reject
   - 提供 idle() 等待佇列清空
   - 提供目前佇列狀態

   不負責：
   - 工作內容
   - Retry
   - Timeout
   - 錯誤訊息 UI
   - 儲存 / Render / Network
   - 業務規則
========================================================= */

(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function create() {
    const queue = [];
    const idleWaiters = [];

    let running = false;

    function getState() {
      return {
        running,
        pending: queue.length,
        size: queue.length + (running ? 1 : 0)
      };
    }

    function resolveIdleWaiters() {
      if (running || queue.length > 0) return;

      const waiters = idleWaiters.splice(0);

      waiters.forEach(resolve => {
        resolve();
      });
    }

    async function runNext() {
      if (running) return;

      const item = queue.shift();

      if (!item) {
        resolveIdleWaiters();
        return;
      }

      running = true;

      try {
        const result = await item.task();
        item.resolve(result);
      } catch (error) {
        item.reject(error);
      } finally {
        running = false;

        if (queue.length > 0) {
          queueMicrotask(runNext);
        } else {
          resolveIdleWaiters();
        }
      }
    }

    function add(task) {
      if (typeof task !== "function") {
        throw new TypeError(
          "SerialQueue.add(task): task must be a function."
        );
      }

      const taskPromise = new Promise((resolve, reject) => {
        queue.push({
          task,
          resolve,
          reject
        });
      });

      queueMicrotask(runNext);

      return taskPromise;
    }

    function idle() {
      if (!running && queue.length === 0) {
        return Promise.resolve();
      }

      return new Promise(resolve => {
        idleWaiters.push(resolve);
      });
    }

    return Object.freeze({
      add,
      idle,
      getState
    });
  }

  const SerialQueue = Object.freeze({
    version: VERSION,
    create
  });

  Object.defineProperty(global, "SerialQueue", {
    value: SerialQueue,
    writable: false,
    configurable: false,
    enumerable: true
  });
})(typeof window !== "undefined" ? window : globalThis);
