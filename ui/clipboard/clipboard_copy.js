/* 慢慢的倉庫｜Clipboard Copy
 * 工作：只負責把文字寫入剪貼簿。
 * 優先使用 Clipboard API；不可用時使用 textarea fallback。
 */
(function (global) {
  "use strict";

  function fallbackCopy(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);

    let ok = false;
    try {
      ok = document.execCommand("copy");
    } finally {
      textarea.remove();
    }

    if (!ok) throw new Error("SlowlyClipboardCopy 複製失敗。");
    return true;
  }

  async function copy(text) {
    const value = String(text ?? "");
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      try {
        await navigator.clipboard.writeText(value);
        return true;
      } catch (_) {
        return fallbackCopy(value);
      }
    }
    return fallbackCopy(value);
  }

  global.SlowlyClipboardCopy = { copy };
})(window);
