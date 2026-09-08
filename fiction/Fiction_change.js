/*!
 * Fiction_change.js
 * stillness by slowly
 *
 * 從 Fiction_data.js 延伸拆出的獨立資料變更通知工具。
 * 不負責資料儲存，只負責訂閱、取消訂閱與發送資料變更事件。
 *
 * 用法：
 * <script src="https://lib.stillnessbyslowly.com/fiction/Fiction_change.js"></script>
 *
 * const change = FictionChange.create();
 *
 * const unsubscribe = change.subscribe(event => {
 *   console.log(event);
 * });
 *
 * change.emit({
 *   type: "add",
 *   collection: "works",
 *   record: { title: "作品 A" },
 *   records: []
 * });
 *
 * unsubscribe();
 */

(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  /* =========================================================
     基礎工具
  ========================================================= */

  function deepClone(value) {
    if (value === undefined) {
      return undefined;
    }

    if (typeof global.structuredClone === "function") {
      return global.structuredClone(value);
    }

    return JSON.parse(JSON.stringify(value));
  }

  function normalizeText(value) {
    return String(value ?? "").trim();
  }

  /* =========================================================
     Change
  ========================================================= */

  class Change {
    constructor(options = {}) {
      this.name =
        normalizeText(options.name) || "fiction-change";

      this.listeners = new Set();
    }

    subscribe(listener) {
      if (typeof listener !== "function") {
        throw new TypeError(
          "[FictionChange] subscribe() 需要函式。"
        );
      }

      this.listeners.add(listener);

      return () => {
        this.unsubscribe(listener);
      };
    }

    unsubscribe(listener) {
      return this.listeners.delete(listener);
    }

    emit(change = {}) {
      if (
        change === null ||
        typeof change !== "object" ||
        Array.isArray(change)
      ) {
        throw new TypeError(
          "[FictionChange] emit() 必須傳入物件。"
        );
      }

      const event = {
        ...deepClone(change),

        type:
          normalizeText(change.type) ||
          "change",

        collection:
          normalizeText(change.collection),

        timestamp:
          change.timestamp ||
          new Date().toISOString()
      };

      const listeners = [...this.listeners];

      listeners.forEach(listener => {
        try {
          listener(deepClone(event));
        } catch (error) {
          console.error(
            "[FictionChange] listener 執行失敗。",
            error
          );
        }
      });

      return deepClone(event);
    }

    clear() {
      this.listeners.clear();
    }

    listenerCount() {
      return this.listeners.size;
    }
  }

  /* =========================================================
     對外 API
  ========================================================= */

  const FictionChange = Object.freeze({
    version: VERSION,

    create(options = {}) {
      return new Change(options);
    }
  });

  Object.defineProperty(global, "FictionChange", {
    value: FictionChange,
    writable: false,
    configurable: false,
    enumerable: true
  });

})(window);