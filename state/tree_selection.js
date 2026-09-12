"use strict";

/* =========================================================
   慢慢的倉庫｜Tree Selection v1.0.0

   用途：
   - 管理樹狀資料的「選取狀態」與「展開狀態」
   - 不綁定 DOM、資料 schema、畫面層級或儲存方式
   - 可用於分類樹、資料夾樹、側欄導航、設定選項等

   expansion:
   - "multiple"：可同時展開多個 key（預設）
   - "single"：同一個 state 中只保留一個展開 key
========================================================= */

(function (global) {
  const VERSION = "1.0.0";

  function normalizeValues(values) {
    if (values == null) return [];
    if (!Array.isArray(values) && !(values instanceof Set)) {
      throw new TypeError("TreeSelection values must be an Array or Set");
    }

    return [...new Set([...values].map(value => String(value)))];
  }

  function create(options = {}) {
    const expansion =
      options.expansion === "single"
        ? "single"
        : "multiple";

    const selectedSet = new Set(
      normalizeValues(options.selected)
    );

    const expandedSet = new Set(
      normalizeValues(options.expanded)
    );

    if (expansion === "single" && expandedSet.size > 1) {
      const last = [...expandedSet].at(-1);
      expandedSet.clear();
      if (last !== undefined) expandedSet.add(last);
    }

    function select(value) {
      const key = String(value);
      const before = selectedSet.size;
      selectedSet.add(key);
      return selectedSet.size !== before;
    }

    function unselect(value) {
      return selectedSet.delete(String(value));
    }

    function toggle(value) {
      const key = String(value);

      if (selectedSet.has(key)) {
        selectedSet.delete(key);
        return false;
      }

      selectedSet.add(key);
      return true;
    }

    function has(value) {
      return selectedSet.has(String(value));
    }

    function clearSelection() {
      const count = selectedSet.size;
      selectedSet.clear();
      return count;
    }

    function replaceSelected(values = []) {
      selectedSet.clear();
      normalizeValues(values).forEach(value => {
        selectedSet.add(value);
      });

      return getSelected();
    }

    function expand(value) {
      const key = String(value);

      if (expansion === "single") {
        const alreadyOnly =
          expandedSet.size === 1 &&
          expandedSet.has(key);

        expandedSet.clear();
        expandedSet.add(key);
        return !alreadyOnly;
      }

      const before = expandedSet.size;
      expandedSet.add(key);
      return expandedSet.size !== before;
    }

    function collapse(value) {
      return expandedSet.delete(String(value));
    }

    function toggleExpanded(value) {
      const key = String(value);

      if (expandedSet.has(key)) {
        expandedSet.delete(key);
        return false;
      }

      if (expansion === "single") {
        expandedSet.clear();
      }

      expandedSet.add(key);
      return true;
    }

    function isExpanded(value) {
      return expandedSet.has(String(value));
    }

    function collapseAll() {
      const count = expandedSet.size;
      expandedSet.clear();
      return count;
    }

    function replaceExpanded(values = []) {
      const normalized = normalizeValues(values);

      expandedSet.clear();

      if (expansion === "single") {
        const last = normalized.at(-1);
        if (last !== undefined) expandedSet.add(last);
      } else {
        normalized.forEach(value => {
          expandedSet.add(value);
        });
      }

      return getExpanded();
    }

    function getSelected() {
      return [...selectedSet];
    }

    function getExpanded() {
      return [...expandedSet];
    }

    return Object.freeze({
      version: VERSION,
      expansion,

      select,
      unselect,
      toggle,
      has,
      clearSelection,
      replaceSelected,
      getSelected,

      expand,
      collapse,
      toggleExpanded,
      isExpanded,
      collapseAll,
      replaceExpanded,
      getExpanded,

      get selectedCount() {
        return selectedSet.size;
      },

      get expandedCount() {
        return expandedSet.size;
      }
    });
  }

  global.TreeSelection = Object.freeze({
    version: VERSION,
    create
  });
})(window);
