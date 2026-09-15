"use strict";

/* =========================================================
   慢慢的倉庫｜ContentEditable Insert v1.0.0

   用途：
   - 在指定 contenteditable 元素目前游標位置插入純文字
   - 插入後將游標移到新文字後方
   - 可插入純文字換行
   - 成功插入後派發 input 事件，讓宿主自行接狀態同步

   不負責：
   - 綁定鍵盤事件
   - 決定何時插入
   - 編輯器樣式
   - 草稿保存
========================================================= */

(function (global) {
  const VERSION = "1.0.0";

  function resolveTarget(target) {
    if (typeof target === "string") {
      return global.document?.querySelector(target) || null;
    }

    return target instanceof global.HTMLElement ? target : null;
  }

  function nodeInsideTarget(node, target) {
    if (!node) return false;

    const element = node.nodeType === global.Node.TEXT_NODE
      ? node.parentNode
      : node;

    return element === target || target.contains(element);
  }

  function createRangeAtEnd(target) {
    const range = global.document.createRange();
    range.selectNodeContents(target);
    range.collapse(false);
    return range;
  }

  function dispatchInput(target, text, inputType) {
    let event;

    if (typeof global.InputEvent === "function") {
      event = new global.InputEvent("input", {
        bubbles: true,
        inputType,
        data: text
      });
    } else {
      event = new global.Event("input", { bubbles: true });
    }

    target.dispatchEvent(event);
  }

  function insertText(target, text, options = {}) {
    const element = resolveTarget(target);

    if (!element) {
      throw new TypeError("SlowlyContentEditable.insertText requires an HTMLElement target");
    }

    if (!element.isContentEditable) {
      throw new Error("SlowlyContentEditable target must be contenteditable");
    }

    const selection = global.getSelection?.();
    if (!selection) return false;

    let range = selection.rangeCount > 0
      ? selection.getRangeAt(0)
      : null;

    if (!range || !nodeInsideTarget(range.commonAncestorContainer, element)) {
      if (options.fallbackToEnd === false) return false;
      range = createRangeAtEnd(element);
    }

    const value = String(text ?? "");
    const node = global.document.createTextNode(value);

    range.deleteContents();
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);

    selection.removeAllRanges();
    selection.addRange(range);

    if (options.dispatchInput !== false) {
      dispatchInput(
        element,
        value,
        options.inputType || "insertText"
      );
    }

    return true;
  }

  function insertLineBreak(target, options = {}) {
    return insertText(target, "\n", {
      ...options,
      inputType: options.inputType || "insertLineBreak"
    });
  }

  global.SlowlyContentEditable = Object.freeze({
    version: VERSION,
    insertText,
    insertLineBreak
  });
})(typeof window !== "undefined" ? window : globalThis);
