/* Slowly Drawer: left/right Hamburger panels and bottom-sheet share a native dialog. */
(function (global) {
  "use strict";
  const instances = new WeakMap();
  const valid_placements = new Set(["left", "right", "bottom"]);
  function resolve_element(value) { return typeof value === "string" ? document.querySelector(value) : value; }
  function create(options = {}) {
    const dialog = resolve_element(options.dialog);
    const trigger = resolve_element(options.trigger);
    const handle = resolve_element(options.handle);
    const placement = options.placement || "left";
    if (!(dialog instanceof HTMLDialogElement)) throw new TypeError("drawer requires HTMLDialogElement");
    if (!valid_placements.has(placement)) throw new RangeError("drawer placement must be left, right or bottom");
    if (options.trigger != null && !(trigger instanceof HTMLElement)) throw new TypeError("invalid drawer trigger");
    if (options.handle != null && (!(handle instanceof HTMLElement) || !dialog.contains(handle))) throw new TypeError("invalid drawer handle");
    if (instances.has(dialog)) return instances.get(dialog);
    const old_class = dialog.classList.contains("slowly-drawer");
    const old_placement = dialog.getAttribute("data-drawer-placement");
    const old_expanded = trigger?.getAttribute("aria-expanded");
    const old_controls = trigger?.getAttribute("aria-controls");
    const old_has_popup = trigger?.getAttribute("aria-haspopup");
    const assigned_id = !dialog.id;
    if (assigned_id) dialog.id = "slowly_drawer_" + Math.random().toString(36).slice(2);
    dialog.classList.add("slowly-drawer");
    dialog.dataset.drawerPlacement = placement;
    if (trigger) { trigger.setAttribute("aria-controls", dialog.id); trigger.setAttribute("aria-haspopup", "dialog"); trigger.setAttribute("aria-expanded", String(dialog.open)); }
    let destroyed = false;
    let last_focus = null;
    let close_reason = "external";
    let notified = false;
    let dragging = null;
    function ensure_active() { if (destroyed) throw new Error("drawer destroyed"); }
    function update_trigger() { if (trigger) trigger.setAttribute("aria-expanded", String(dialog.open)); }
    function notify_close() {
      if (notified) return;
      notified = true;
      dragging = null;
      if (handle) handle.style.removeProperty("transform");
      update_trigger();
      if (last_focus?.isConnected) last_focus.focus();
      const detail = { placement, reason: close_reason };
      dialog.dispatchEvent(new CustomEvent("slowlydrawerclose", { detail }));
      if (typeof options.on_close === "function") options.on_close(detail);
    }
    function on_native_cancel() { close_reason = "escape"; }
    function on_native_close() { notify_close(); }
    function on_trigger() { api.toggle(); }
    function on_dialog_click(event) {
      if (event.target !== dialog || options.close_on_backdrop === false) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) api.close("backdrop");
    }
    function on_handle_down(event) {
      if (!dialog.open || placement !== "bottom" || options.swipe_to_close === false || !event.isPrimary) return;
      dragging = { pointer_id: event.pointerId, start_y: event.clientY };
      // Synthetic PointerEvents can have no active browser pointer to capture.
      // Real gestures still capture when supported; ignore that specific failure.
      try { handle.setPointerCapture?.(event.pointerId); } catch (ignored) {}
    }
    function on_handle_move(event) {
      if (!dragging || event.pointerId !== dragging.pointer_id) return;
      const movement = Math.max(0, event.clientY - dragging.start_y);
      handle.style.transform = `translateY(${Math.min(movement, 80)}px)`;
    }
    function on_handle_end(event) {
      if (!dragging || event.pointerId !== dragging.pointer_id) return;
      const movement = event.type === "pointercancel" ? 0 : event.clientY - dragging.start_y;
      dragging = null;
      handle.style.removeProperty("transform");
      if (movement >= (options.swipe_threshold ?? 70)) api.close("swipe");
    }
    dialog.addEventListener("cancel", on_native_cancel);
    dialog.addEventListener("close", on_native_close);
    dialog.addEventListener("click", on_dialog_click);
    trigger?.addEventListener("click", on_trigger);
    handle?.addEventListener("pointerdown", on_handle_down);
    handle?.addEventListener("pointermove", on_handle_move);
    handle?.addEventListener("pointerup", on_handle_end);
    handle?.addEventListener("pointercancel", on_handle_end);
    const api = Object.freeze({
      open() {
        ensure_active();
        if (dialog.open) return false;
        last_focus = document.activeElement;
        close_reason = "external";
        notified = false;
        dialog.showModal();
        update_trigger();
        if (typeof options.on_open === "function") options.on_open({ placement });
        return true;
      },
      close(reason = "programmatic") { ensure_active(); if (!dialog.open) return false; close_reason = String(reason); dialog.close(); update_trigger(); return true; },
      toggle() { ensure_active(); return dialog.open ? api.close() : api.open(); },
      is_open() { return dialog.open; },
      destroy() {
        if (destroyed) return;
        if (dialog.open) { close_reason = "destroy"; dialog.close(); notify_close(); }
        destroyed = true;
        dialog.removeEventListener("cancel", on_native_cancel);
        dialog.removeEventListener("close", on_native_close);
        dialog.removeEventListener("click", on_dialog_click);
        trigger?.removeEventListener("click", on_trigger);
        handle?.removeEventListener("pointerdown", on_handle_down);
        handle?.removeEventListener("pointermove", on_handle_move);
        handle?.removeEventListener("pointerup", on_handle_end);
        handle?.removeEventListener("pointercancel", on_handle_end);
        if (!old_class) dialog.classList.remove("slowly-drawer");
        if (old_placement === null) dialog.removeAttribute("data-drawer-placement");
        else dialog.setAttribute("data-drawer-placement", old_placement);
        if (assigned_id) dialog.removeAttribute("id");
        for (const [attribute, value] of [["aria-expanded", old_expanded], ["aria-controls", old_controls], ["aria-haspopup", old_has_popup]]) {
          if (!trigger) continue;
          if (value === null) trigger.removeAttribute(attribute);
          else trigger.setAttribute(attribute, value);
        }
        instances.delete(dialog);
      }
    });
    instances.set(dialog, api);
    return api;
  }
  global.SlowlyDrawer = Object.freeze({ version: "1.0.0", create });
})(window);
