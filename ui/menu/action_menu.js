/* Slowly Action Menu: anchored commands, not form selection. */
(function (global) {
  "use strict";
  const instances = new WeakMap();
  const active = new Set();
  function resolve_element(value) { return typeof value === "string" ? document.querySelector(value) : value; }
  function create(options = {}) {
    const trigger = resolve_element(options.trigger);
    const menu = resolve_element(options.menu);
    if (!(trigger instanceof HTMLElement) || !(menu instanceof HTMLElement)) throw new TypeError("action menu requires trigger and menu elements");
    if (instances.has(trigger)) return instances.get(trigger);
    const previous = {
      expanded: trigger.getAttribute("aria-expanded"), controls: trigger.getAttribute("aria-controls"),
      popup: trigger.getAttribute("aria-haspopup"), role: menu.getAttribute("role"), hidden: menu.hidden
    };
    const generated_id = !menu.id;
    if (generated_id) menu.id = "slowly_action_menu_" + Math.random().toString(36).slice(2);
    trigger.setAttribute("aria-haspopup", "menu");
    trigger.setAttribute("aria-controls", menu.id);
    trigger.setAttribute("aria-expanded", "false");
    menu.setAttribute("role", "menu");
    menu.hidden = true;
    const items = Array.from(menu.querySelectorAll("[data-action]"));
    if (!items.length) throw new Error("action menu requires [data-action] elements");
    const previous_items = items.map(item => ({ item, role: item.getAttribute("role"), tabindex: item.getAttribute("tabindex") }));
    items.forEach(item => { item.setAttribute("role", "menuitem"); item.tabIndex = -1; });
    let destroyed = false;
    function enabled() { return items.filter(item => !item.disabled && item.getAttribute("aria-disabled") !== "true" && !item.hidden); }
    function ensure_active() { if (destroyed) throw new Error("action menu destroyed"); }
    function position() {
      if (menu.hidden) return;
      const rect = trigger.getBoundingClientRect();
      const width = menu.offsetWidth;
      const height = menu.offsetHeight;
      const margin = 8;
      let left = rect.left;
      if (left + width > innerWidth - margin) left = rect.right - width;
      left = Math.max(margin, Math.min(left, innerWidth - width - margin));
      let top = rect.bottom;
      if (top + height > innerHeight - margin) top = rect.top - height;
      top = Math.max(margin, Math.min(top, innerHeight - height - margin));
      menu.style.left = left + "px";
      menu.style.top = top + "px";
    }
    function close(return_focus = false) {
      if (menu.hidden) return false;
      menu.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      active.delete(api);
      if (return_focus) trigger.focus();
      return true;
    }
    function open(last = false) {
      ensure_active();
      for (const other of Array.from(active)) if (other !== api) other.close();
      if (!menu.hidden) return false;
      menu.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      active.add(api);
      position();
      const candidates = enabled();
      if (candidates.length) candidates[last ? candidates.length - 1 : 0].focus();
      return true;
    }
    function on_trigger_click(event) { event.preventDefault(); if (menu.hidden) open(); else close(true); }
    function on_trigger_key(event) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault(); open(event.key === "ArrowUp");
      }
    }
    function on_menu_key(event) {
      if (event.key === "Escape") { event.preventDefault(); close(true); return; }
      if (event.key === "Tab") { close(); return; }
      const candidates = enabled();
      if (!candidates.length) return;
      const current = candidates.indexOf(document.activeElement);
      let next = current;
      if (event.key === "ArrowDown") next = (current + 1 + candidates.length) % candidates.length;
      else if (event.key === "ArrowUp") next = (current - 1 + candidates.length) % candidates.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = candidates.length - 1;
      else if (event.key === " " || event.key === "Enter") {
        const item = candidates[current];
        if (item) { event.preventDefault(); item.click(); }
        return;
      } else return;
      event.preventDefault(); candidates[next].focus();
    }
    function on_menu_click(event) {
      const item = event.target.closest("[data-action]");
      if (!item || !menu.contains(item) || !enabled().includes(item)) return;
      const detail = { action: item.dataset.action, item, trigger };
      menu.dispatchEvent(new CustomEvent("slowlyaction", { bubbles: true, detail }));
      if (typeof options.on_action === "function") options.on_action(detail);
      close(true);
    }
    function on_document_pointer(event) { if (!menu.contains(event.target) && !trigger.contains(event.target)) close(); }
    function on_focus(event) { if (!menu.contains(event.target) && !trigger.contains(event.target)) close(); }
    trigger.addEventListener("click", on_trigger_click);
    trigger.addEventListener("keydown", on_trigger_key);
    menu.addEventListener("keydown", on_menu_key);
    menu.addEventListener("click", on_menu_click);
    document.addEventListener("pointerdown", on_document_pointer);
    document.addEventListener("focusin", on_focus);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    const api = Object.freeze({
      open, close, toggle() { return menu.hidden ? open() : close(true); }, is_open() { return !menu.hidden; },
      destroy() {
        if (destroyed) return;
        close(); destroyed = true;
        trigger.removeEventListener("click", on_trigger_click);
        trigger.removeEventListener("keydown", on_trigger_key);
        menu.removeEventListener("keydown", on_menu_key);
        menu.removeEventListener("click", on_menu_click);
        document.removeEventListener("pointerdown", on_document_pointer);
        document.removeEventListener("focusin", on_focus);
        window.removeEventListener("resize", position);
        window.removeEventListener("scroll", position, true);
        for (const [element, attrs] of [[trigger, { "aria-expanded": previous.expanded, "aria-controls": previous.controls, "aria-haspopup": previous.popup }], [menu, { role: previous.role }]]) {
          for (const [key, value] of Object.entries(attrs)) if (value === null) element.removeAttribute(key); else element.setAttribute(key, value);
        }
        menu.hidden = previous.hidden;
        menu.style.removeProperty("left"); menu.style.removeProperty("top");
        if (generated_id) menu.removeAttribute("id");
        previous_items.forEach(({ item, role, tabindex }) => {
          if (role === null) item.removeAttribute("role"); else item.setAttribute("role", role);
          if (tabindex === null) item.removeAttribute("tabindex"); else item.setAttribute("tabindex", tabindex);
        });
        instances.delete(trigger);
      }
    });
    instances.set(trigger, api);
    return api;
  }
  global.SlowlyActionMenu = Object.freeze({ version: "1.0.0", create });
})(window);
