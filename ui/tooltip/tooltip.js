/* Slowly Tooltip: non-interactive supplementary text; focus, hover and tap. */
(function (global) {
  "use strict";
  const instances = new WeakMap();
  function resolve_element(value) { return typeof value === "string" ? document.querySelector(value) : value; }
  function create(options = {}) {
    const trigger = resolve_element(options.trigger);
    const tooltip = resolve_element(options.tooltip);
    if (!(trigger instanceof HTMLElement) || !(tooltip instanceof HTMLElement)) throw new TypeError("tooltip requires trigger and tooltip elements");
    if (instances.has(trigger)) return instances.get(trigger);
    const had_id = Boolean(tooltip.id);
    if (!had_id) tooltip.id = "slowly_tooltip_" + Math.random().toString(36).slice(2);
    const old_describedby = trigger.getAttribute("aria-describedby");
    const old_role = tooltip.getAttribute("role");
    const old_hidden = tooltip.hidden;
    const ids = new Set((old_describedby || "").split(/\s+/).filter(Boolean));
    ids.add(tooltip.id);
    trigger.setAttribute("aria-describedby", Array.from(ids).join(" "));
    tooltip.setAttribute("role", "tooltip");
    tooltip.hidden = true;
    if (options.text !== undefined) tooltip.textContent = String(options.text);
    let destroyed = false;
    let delay_timer = null;
    function ensure_active() { if (destroyed) throw new Error("tooltip destroyed"); }
    function clear_delay() { if (delay_timer !== null) { clearTimeout(delay_timer); delay_timer = null; } }
    function position() {
      if (tooltip.hidden) return;
      const t = trigger.getBoundingClientRect();
      const w = tooltip.offsetWidth; const h = tooltip.offsetHeight;
      const space = 7; const margin = 6;
      let vertical = options.placement || "top";
      if (vertical !== "top" && vertical !== "bottom") vertical = "top";
      if (vertical === "top" && t.top < h + space) vertical = "bottom";
      else if (vertical === "bottom" && innerHeight - t.bottom < h + space) vertical = "top";
      let top = vertical === "top" ? t.top - h - space : t.bottom + space;
      let left = t.left + t.width / 2 - w / 2;
      top = Math.max(margin, Math.min(top, innerHeight - h - margin));
      left = Math.max(margin, Math.min(left, innerWidth - w - margin));
      tooltip.style.top = top + "px"; tooltip.style.left = left + "px";
    }
    function show() { ensure_active(); clear_delay(); if (!tooltip.hidden) return false; tooltip.hidden = false; position(); return true; }
    function hide() { clear_delay(); if (tooltip.hidden) return false; tooltip.hidden = true; return true; }
    function schedule_show() {
      clear_delay();
      const delay = options.delay_ms ?? 120;
      if (!Number.isFinite(delay) || delay < 0) throw new RangeError("invalid tooltip delay");
      if (delay === 0) show(); else delay_timer = setTimeout(() => { delay_timer = null; show(); }, delay);
    }
    function on_blur() { if (!trigger.matches(":hover")) hide(); }
    function on_leave() { if (document.activeElement !== trigger) hide(); }
    function on_key(event) { if (event.key === "Escape") { hide(); } }
    function on_touch(event) {
      if (event.pointerType !== "touch") return;
      if (tooltip.hidden) show(); else hide();
    }
    function on_outside(event) { if (!tooltip.contains(event.target) && !trigger.contains(event.target)) hide(); }
    trigger.addEventListener("mouseenter", schedule_show);
    trigger.addEventListener("mouseleave", on_leave);
    trigger.addEventListener("focus", schedule_show);
    trigger.addEventListener("blur", on_blur);
    trigger.addEventListener("keydown", on_key);
    trigger.addEventListener("pointerdown", on_touch);
    document.addEventListener("pointerdown", on_outside);
    window.addEventListener("scroll", position, true);
    window.addEventListener("resize", position);
    const api = Object.freeze({
      show, hide, is_open() { return !tooltip.hidden; },
      destroy() {
        if (destroyed) return;
        hide(); destroyed = true;
        trigger.removeEventListener("mouseenter", schedule_show);
        trigger.removeEventListener("mouseleave", on_leave);
        trigger.removeEventListener("focus", schedule_show);
        trigger.removeEventListener("blur", on_blur);
        trigger.removeEventListener("keydown", on_key);
        trigger.removeEventListener("pointerdown", on_touch);
        document.removeEventListener("pointerdown", on_outside);
        window.removeEventListener("scroll", position, true);
        window.removeEventListener("resize", position);
        if (old_describedby === null) trigger.removeAttribute("aria-describedby");
        else trigger.setAttribute("aria-describedby", old_describedby);
        if (old_role === null) tooltip.removeAttribute("role"); else tooltip.setAttribute("role", old_role);
        if (!had_id) tooltip.removeAttribute("id");
        tooltip.hidden = old_hidden;
        tooltip.style.removeProperty("top"); tooltip.style.removeProperty("left");
        instances.delete(trigger);
      }
    });
    instances.set(trigger, api);
    return api;
  }
  global.SlowlyTooltip = Object.freeze({ version: "1.0.0", create });
})(window);
