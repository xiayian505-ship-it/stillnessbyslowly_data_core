/* 慢慢的倉庫｜Slowly Clipboard Component
 * 工作：組合 Clipboard Copy / Cut / Paste / Select，
 *      為 input / textarea 建立可直接操作的原生按鈕列。
 * 外觀由 clipboard_component.css 提供最低限度結構，宿主可自行覆寫。
 */
(function (global) {
  "use strict";

  function resolveTarget(target) {
    if (typeof target === "string") return document.querySelector(target);
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return target;
    return null;
  }

  function requireDependencies() {
    const missing = [];

    if (!global.SlowlyClipboardCopy || typeof global.SlowlyClipboardCopy.copy !== "function") {
      missing.push("SlowlyClipboardCopy");
    }

    if (!global.SlowlyClipboardCut || typeof global.SlowlyClipboardCut.cut !== "function") {
      missing.push("SlowlyClipboardCut");
    }

    if (!global.SlowlyClipboardPaste || typeof global.SlowlyClipboardPaste.paste !== "function") {
      missing.push("SlowlyClipboardPaste");
    }

    if (!global.SlowlyClipboardSelect || typeof global.SlowlyClipboardSelect.selectAll !== "function") {
      missing.push("SlowlyClipboardSelect");
    }

    if (missing.length) {
      throw new Error(`SlowlyClipboard 缺少依賴：${missing.join("、")}。`);
    }
  }

  function selectedText(target) {
    const start = target.selectionStart;
    const end = target.selectionEnd;

    if (start == null || end == null || start === end) return "";
    return target.value.slice(start, end);
  }

  function createButton(action, label) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "slowly-clipboard-button";
    button.dataset.action = action;
    button.textContent = label;
    return button;
  }

  class ClipboardComponent {
    constructor(target, options = {}) {
      requireDependencies();

      this.target = target;
      this.options = options;

      const labels = {
        copy: "複製",
        cut: "剪下",
        paste: "貼上",
        selectAll: "全選",
        ...(options.labels || {})
      };

      const root = document.createElement("div");
      root.className = "slowly-clipboard";
      root.setAttribute("role", "group");
      root.setAttribute("aria-label", options.ariaLabel || "剪貼簿操作");

      const copyButton = createButton("copy", labels.copy);
      const cutButton = createButton("cut", labels.cut);
      const pasteButton = createButton("paste", labels.paste);
      const selectAllButton = createButton("select-all", labels.selectAll);

      root.append(copyButton, cutButton, pasteButton, selectAllButton);

      const insertTarget = options.container
        ? (typeof options.container === "string"
            ? document.querySelector(options.container)
            : options.container)
        : null;

      if (insertTarget instanceof Element) {
        insertTarget.appendChild(root);
      } else {
        target.insertAdjacentElement("afterend", root);
      }

      this.elements = {
        root,
        target,
        copy: copyButton,
        cut: cutButton,
        paste: pasteButton,
        selectAll: selectAllButton
      };

      this._listeners = {
        copy: () => this.copy().catch((error) => this._handleError("copy", error)),
        cut: () => this.cut().catch((error) => this._handleError("cut", error)),
        paste: () => this.paste().catch((error) => this._handleError("paste", error)),
        selectAll: () => {
          try {
            this.selectAll();
          } catch (error) {
            this._handleError("selectAll", error);
          }
        }
      };

      copyButton.addEventListener("click", this._listeners.copy);
      cutButton.addEventListener("click", this._listeners.cut);
      pasteButton.addEventListener("click", this._listeners.paste);
      selectAllButton.addEventListener("click", this._listeners.selectAll);
    }

    _handleError(action, error) {
      if (typeof this.options.onError === "function") {
        this.options.onError(error, action, this);
        return;
      }

      console.error(error);
    }

    async copy() {
      const text = selectedText(this.target);
      if (!text) return "";

      await global.SlowlyClipboardCopy.copy(text);
      return text;
    }

    async cut() {
      return global.SlowlyClipboardCut.cut(this.target);
    }

    async paste() {
      return global.SlowlyClipboardPaste.paste(this.target);
    }

    selectAll() {
      return global.SlowlyClipboardSelect.selectAll(this.target);
    }

    destroy() {
      this.elements.copy.removeEventListener("click", this._listeners.copy);
      this.elements.cut.removeEventListener("click", this._listeners.cut);
      this.elements.paste.removeEventListener("click", this._listeners.paste);
      this.elements.selectAll.removeEventListener("click", this._listeners.selectAll);
      this.elements.root.remove();
    }
  }

  global.SlowlyClipboard = {
    mount(target, options = {}) {
      const el = resolveTarget(target);

      if (!el) {
        throw new Error("SlowlyClipboard 找不到可使用的 input / textarea 目標。");
      }

      return new ClipboardComponent(el, options);
    }
  };
})(window);
