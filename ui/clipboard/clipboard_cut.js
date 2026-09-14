/* 慢慢的倉庫｜Clipboard Cut
 * 工作：只負責剪下 input / textarea 目前選取的文字。
 */
(function (global) {
  "use strict";

  function resolveTarget(target) {
    if (typeof target === "string") return document.querySelector(target);
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return target;
    return null;
  }

  async function cut(target) {
    const el = resolveTarget(target);
    if (!el) throw new Error("SlowlyClipboardCut 找不到可剪下的 input / textarea。");

    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (start == null || end == null || start === end) return "";

    const text = el.value.slice(start, end);
    if (global.SlowlyClipboardCopy && typeof global.SlowlyClipboardCopy.copy === "function") {
      await global.SlowlyClipboardCopy.copy(text);
    } else if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      await navigator.clipboard.writeText(text);
    } else {
      throw new Error("SlowlyClipboardCut 需要 Clipboard Copy 或可用的 Clipboard API。");
    }

    el.setRangeText("", start, end, "start");
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return text;
  }

  global.SlowlyClipboardCut = { cut };
})(window);
