/* 慢慢的倉庫｜Clipboard Select
 * 工作：只負責全選指定 input / textarea / 元素內容。
 */
(function (global) {
  "use strict";

  function resolveTarget(target) {
    if (typeof target === "string") return document.querySelector(target);
    if (target instanceof Element) return target;
    return null;
  }

  function selectAll(target) {
    const el = resolveTarget(target);
    if (!el) throw new Error("SlowlyClipboardSelect 找不到目標。");

    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      el.focus();
      el.select();
      return el;
    }

    const selection = global.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el);
    selection.removeAllRanges();
    selection.addRange(range);
    return el;
  }

  global.SlowlyClipboardSelect = { selectAll };
})(window);
