/* Slowly Modal: generic content dialog, independent of SlowlyConfirm. */
(function (global) {
  "use strict";
  const instances = new WeakMap();
  function create(dialog, options = {}) {
    if (typeof dialog === "string") dialog = document.querySelector(dialog);
    if (!(dialog instanceof HTMLDialogElement)) throw new TypeError("modal requires a native dialog element");
    if (instances.has(dialog)) return instances.get(dialog);
    let destroyed = false;
    let previous_focus = null;
    let close_reason = "external";
    let notified = false;
    const backdrop_close = options.close_on_backdrop !== false;
    function ensure_active() { if (destroyed) throw new Error("modal destroyed"); }
    function notify_close() {
      if (notified) return;
      notified = true;
      if (previous_focus?.isConnected) previous_focus.focus();
      const detail = { reason: close_reason };
      dialog.dispatchEvent(new CustomEvent("slowlymodalclose", { detail }));
      if (typeof options.on_close === "function") options.on_close(detail);
    }
    function on_cancel() { close_reason = "escape"; }
    function on_close() { notify_close(); }
    function on_click(event) {
      if (!backdrop_close || event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) api.close("backdrop");
    }
    dialog.addEventListener("cancel", on_cancel);
    dialog.addEventListener("close", on_close);
    dialog.addEventListener("click", on_click);
    const api = Object.freeze({
      open() {
        ensure_active();
        if (dialog.open) return false;
        previous_focus = document.activeElement;
        close_reason = "external";
        notified = false;
        dialog.showModal();
        if (typeof options.on_open === "function") options.on_open({ dialog });
        dialog.dispatchEvent(new CustomEvent("slowlymodalopen"));
        return true;
      },
      close(reason = "programmatic") { ensure_active(); if (!dialog.open) return false; close_reason = String(reason); dialog.close(); return true; },
      is_open() { return dialog.open; },
      destroy() {
        if (destroyed) return;
        if (dialog.open) { close_reason = "destroy"; dialog.close(); notify_close(); }
        destroyed = true;
        dialog.removeEventListener("cancel", on_cancel);
        dialog.removeEventListener("close", on_close);
        dialog.removeEventListener("click", on_click);
        instances.delete(dialog);
      }
    });
    instances.set(dialog, api);
    return api;
  }
  global.SlowlyModal = Object.freeze({ version: "1.0.0", create });
})(window);
