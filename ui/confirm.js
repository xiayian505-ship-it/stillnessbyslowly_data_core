/* =========================================================
   Slowly Confirm v1.0.0
   Stillness by Slowly - 慢慢的倉庫

   用途：
   - 提供通用確認視窗
   - show(options) 回傳 Promise<boolean>
   - true = 確認
   - false = 取消

   責任：
   - 建立 / 開啟 / 關閉確認視窗
   - 確認與取消結果
   - Escape
   - 遮罩點擊
   - 焦點移入與還原
   - 同時呼叫時依序排隊

   不負責：
   - 決定何時詢問
   - 決定確認後執行什麼
   - 刪除 / 儲存 / 導航等業務行為
   - 專案視覺
========================================================= */

(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  let root = null;
  let dialog = null;
  let titleEl = null;
  let messageEl = null;
  let confirmButton = null;
  let cancelButton = null;

  let activeRequest = null;
  let previousFocus = null;
  const queue = [];

  function ensureDocument() {
    if (typeof document === "undefined") {
      throw new Error("SlowlyConfirm requires a browser document.");
    }
  }

  function normalizeText(value, fallback = "") {
    if (value === undefined || value === null) return fallback;
    return String(value);
  }

  function createDom() {
    ensureDocument();

    if (root) return root;

    root = document.createElement("div");
    root.className = "slowly-confirm";
    root.hidden = true;

    root.innerHTML = `
      <div class="slowly-confirm__backdrop" data-confirm-backdrop></div>

      <section
        class="slowly-confirm__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="slowly-confirm-title"
        aria-describedby="slowly-confirm-message"
        tabindex="-1"
      >
        <div class="slowly-confirm__content">
          <h2
            class="slowly-confirm__title"
            id="slowly-confirm-title"
            data-confirm-title
          ></h2>

          <div
            class="slowly-confirm__message"
            id="slowly-confirm-message"
            data-confirm-message
          ></div>
        </div>

        <div class="slowly-confirm__actions">
          <button
            type="button"
            class="slowly-confirm__button slowly-confirm__button--cancel"
            data-confirm-cancel
          >
            取消
          </button>

          <button
            type="button"
            class="slowly-confirm__button slowly-confirm__button--confirm"
            data-confirm-confirm
          >
            確認
          </button>
        </div>
      </section>
    `;

    document.body.appendChild(root);

    dialog = root.querySelector(".slowly-confirm__dialog");
    titleEl = root.querySelector("[data-confirm-title]");
    messageEl = root.querySelector("[data-confirm-message]");
    confirmButton = root.querySelector("[data-confirm-confirm]");
    cancelButton = root.querySelector("[data-confirm-cancel]");

    root.addEventListener("click", handleRootClick);
    root.addEventListener("keydown", handleKeyDown);

    return root;
  }

  function handleRootClick(event) {
    if (!activeRequest) return;

    if (event.target.closest("[data-confirm-confirm]")) {
      finish(true);
      return;
    }

    if (event.target.closest("[data-confirm-cancel]")) {
      finish(false);
      return;
    }

    if (
      event.target.matches("[data-confirm-backdrop]") &&
      activeRequest.options.closeOnBackdrop
    ) {
      finish(false);
    }
  }

  function handleKeyDown(event) {
    if (!activeRequest) return;

    if (event.key === "Escape" && activeRequest.options.closeOnEscape) {
      event.preventDefault();
      finish(false);
      return;
    }

    if (event.key !== "Tab") return;

    const focusable = [cancelButton, confirmButton].filter(
      element => element && !element.disabled && !element.hidden
    );

    if (!focusable.length) {
      event.preventDefault();
      dialog?.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function normalizeOptions(options = {}) {
    return {
      title: normalizeText(options.title, "請確認"),
      message: normalizeText(options.message, ""),
      confirmText: normalizeText(options.confirmText, "確認"),
      cancelText: normalizeText(options.cancelText, "取消"),
      className: normalizeText(options.className, "").trim(),
      closeOnBackdrop: options.closeOnBackdrop !== false,
      closeOnEscape: options.closeOnEscape !== false,
      initialFocus:
        options.initialFocus === "confirm" ? "confirm" : "cancel"
    };
  }

  function applyOptions(options) {
    createDom();

    titleEl.textContent = options.title;
    messageEl.textContent = options.message;
    confirmButton.textContent = options.confirmText;
    cancelButton.textContent = options.cancelText;

    root.className = "slowly-confirm";

    if (options.className) {
      options.className
        .split(/\s+/)
        .filter(Boolean)
        .forEach(className => root.classList.add(className));
    }
  }

  function openRequest(request) {
    activeRequest = request;
    previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    applyOptions(request.options);

    root.hidden = false;
    document.documentElement.classList.add("slowly-confirm-open");

    requestAnimationFrame(() => {
      const target =
        request.options.initialFocus === "confirm"
          ? confirmButton
          : cancelButton;

      target?.focus();
    });
  }

  function showNext() {
    if (activeRequest || queue.length === 0) return;
    openRequest(queue.shift());
  }

  function finish(result) {
    if (!activeRequest) return false;

    const request = activeRequest;
    activeRequest = null;

    if (root) {
      root.hidden = true;
      root.className = "slowly-confirm";
    }

    document.documentElement.classList.remove("slowly-confirm-open");

    if (
      previousFocus &&
      document.contains(previousFocus) &&
      typeof previousFocus.focus === "function"
    ) {
      previousFocus.focus();
    }

    previousFocus = null;
    request.resolve(Boolean(result));

    queueMicrotask(showNext);
    return true;
  }

  function show(options = {}) {
    ensureDocument();

    return new Promise(resolve => {
      queue.push({
        options: normalizeOptions(options),
        resolve
      });

      showNext();
    });
  }

  function confirm() {
    return finish(true);
  }

  function cancel() {
    return finish(false);
  }

  function close(result = false) {
    return finish(Boolean(result));
  }

  function isOpen() {
    return Boolean(activeRequest);
  }

  function pendingCount() {
    return queue.length + (activeRequest ? 1 : 0);
  }

  function destroy() {
    if (activeRequest) {
      const request = activeRequest;
      activeRequest = null;
      request.resolve(false);
    }

    while (queue.length) {
      queue.shift().resolve(false);
    }

    if (root) {
      root.remove();
    }

    root = null;
    dialog = null;
    titleEl = null;
    messageEl = null;
    confirmButton = null;
    cancelButton = null;
    previousFocus = null;

    if (typeof document !== "undefined") {
      document.documentElement.classList.remove("slowly-confirm-open");
    }
  }

  const SlowlyConfirm = Object.freeze({
    version: VERSION,
    show,
    confirm,
    cancel,
    close,
    isOpen,
    pendingCount,
    destroy
  });

  Object.defineProperty(global, "SlowlyConfirm", {
    value: SlowlyConfirm,
    writable: false,
    configurable: false,
    enumerable: true
  });
})(typeof window !== "undefined" ? window : globalThis);
