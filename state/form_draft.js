"use strict";

/* =========================================================
   慢慢的倉庫｜Form Draft v1.0.0

   用途：
   - 管理表單或編輯流程中的暫存草稿
   - 保留 initial snapshot，提供 dirty / changed 判斷
   - 不綁定 DOM、欄位名稱、資料 schema 或儲存方式

   資料建議：
   - 適合 JSON-like 資料：
     primitive / Array / plain Object / null
   - DOM 讀值、trim、Number 轉換等由宿主自行處理
========================================================= */

(function (global) {
  const VERSION = "1.0.0";

  function isPlainObject(value) {
    if (!value || typeof value !== "object") return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
  }

  function cloneValue(value) {
    if (Array.isArray(value)) {
      return value.map(cloneValue);
    }

    if (isPlainObject(value)) {
      const output = {};
      Object.keys(value).forEach(key => {
        output[key] = cloneValue(value[key]);
      });
      return output;
    }

    return value;
  }

  function equalValue(a, b) {
    if (Object.is(a, b)) return true;

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;

      for (let i = 0; i < a.length; i += 1) {
        if (!equalValue(a[i], b[i])) return false;
      }

      return true;
    }

    if (isPlainObject(a) && isPlainObject(b)) {
      const aKeys = Object.keys(a);
      const bKeys = Object.keys(b);

      if (aKeys.length !== bKeys.length) return false;

      for (const key of aKeys) {
        if (
          !Object.prototype.hasOwnProperty.call(b, key) ||
          !equalValue(a[key], b[key])
        ) {
          return false;
        }
      }

      return true;
    }

    return false;
  }

  function create(initialData = {}) {
    if (!isPlainObject(initialData)) {
      throw new TypeError("FormDraft.create(initialData) requires a plain object");
    }

    let initial = cloneValue(initialData);
    let current = cloneValue(initialData);

    function get() {
      return cloneValue(current);
    }

    function getValue(key) {
      return cloneValue(current[key]);
    }

    function set(key, value) {
      current[String(key)] = cloneValue(value);
      return getValue(String(key));
    }

    function patch(values = {}) {
      if (!isPlainObject(values)) {
        throw new TypeError("FormDraft.patch(values) requires a plain object");
      }

      Object.keys(values).forEach(key => {
        current[key] = cloneValue(values[key]);
      });

      return get();
    }

    function replace(values = {}) {
      if (!isPlainObject(values)) {
        throw new TypeError("FormDraft.replace(values) requires a plain object");
      }

      current = cloneValue(values);
      return get();
    }

    function remove(key) {
      const name = String(key);
      const existed =
        Object.prototype.hasOwnProperty.call(current, name);

      delete current[name];
      return existed;
    }

    function reset() {
      current = cloneValue(initial);
      return get();
    }

    function commit() {
      initial = cloneValue(current);
      return get();
    }

    function snapshot() {
      return {
        initial: cloneValue(initial),
        current: cloneValue(current),
        dirty: !equalValue(initial, current)
      };
    }

    function changed(key) {
      const name = String(key);
      const initialHas =
        Object.prototype.hasOwnProperty.call(initial, name);
      const currentHas =
        Object.prototype.hasOwnProperty.call(current, name);

      if (initialHas !== currentHas) return true;
      if (!initialHas && !currentHas) return false;

      return !equalValue(initial[name], current[name]);
    }

    function has(key) {
      return Object.prototype.hasOwnProperty.call(
        current,
        String(key)
      );
    }

    return Object.freeze({
      version: VERSION,
      get,
      getValue,
      set,
      patch,
      replace,
      remove,
      reset,
      commit,
      snapshot,
      changed,
      has,

      get dirty() {
        return !equalValue(initial, current);
      }
    });
  }

  global.FormDraft = Object.freeze({
    version: VERSION,
    create
  });
})(window);
