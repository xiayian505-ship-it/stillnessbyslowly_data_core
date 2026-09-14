/* 慢慢的倉庫｜Clipboard Paste
 * 工作：只負責讀取剪貼簿文字，或貼入指定 input / textarea。
 * 瀏覽器可能要求 HTTPS、權限與使用者操作。
 */
(function (global) {
  "use strict";

  function resolveTarget(target) {
    if (typeof target === "string") return document.querySelector(target);
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return target;
    return null;
  }

  async function read() {
    if (!navigator.clipboard || typeof navigator.clipboard.readText !== "function") {
      throw new Error("SlowlyClipboardPaste：目前環境不支援讀取剪貼簿。");
    }
    return navigator.clipboard.readText();
  }

  async function paste(target) {
    const el = resolveTarget(target);
    if (!el) throw new Error("SlowlyClipboardPaste 找不到可貼上的 input / textarea。");

    const text = await read();
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    el.setRangeText(text, start, end, "end");
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return text;
  }

  global.SlowlyClipboardPaste = { read, paste };
})(window);
