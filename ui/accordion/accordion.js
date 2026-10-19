/* Slowly Accordion: native details-based independent groups. */
(function (global) {
  "use strict";
  const instances = new WeakMap();
  function create(root, options = {}) {
    if (typeof root === "string") root = document.querySelector(root);
    if (!(root instanceof HTMLElement)) throw new TypeError("accordion root must be an element");
    if (instances.has(root)) return instances.get(root);
    const nodes = Array.from(root.querySelectorAll("details[data-accordion-id]"))
      .filter(node => node.closest("[data-slowly-accordion]") === root);
    if (!nodes.length) throw new Error("accordion needs details[data-accordion-id]");
    const lookup = new Map();
    nodes.forEach(node => {
      const key = node.dataset.accordionId;
      if (!key || lookup.has(key) || !node.querySelector(":scope > summary")) {
        throw new Error("accordion id must be unique and details must contain summary");
      }
      lookup.set(key, node);
    });
    const multiple = options.multiple === true;
    let destroyed = false;
    let synchronizing = false;
    function ensure_active() { if (destroyed) throw new Error("accordion destroyed"); }
    function snapshot() {
      return Array.from(lookup, ([key, node]) => ({ key, open: node.open }));
    }
    function emit(key) {
      const detail = { key, state: snapshot() };
      root.dispatchEvent(new CustomEvent("slowlyaccordionchange", { bubbles: true, detail }));
      if (typeof options.on_change === "function") options.on_change(detail);
    }
    function apply(key, desired) {
      ensure_active();
      if (!lookup.has(key)) throw new RangeError("unknown accordion key: " + key);
      const node = lookup.get(key);
      if (node.open === desired && (multiple || !desired)) return snapshot();
      synchronizing = true;
      if (desired && !multiple) nodes.forEach(other => { if (other !== node) other.open = false; });
      node.open = desired;
      synchronizing = false;
      emit(key);
      return snapshot();
    }
    function on_toggle(event) {
      if (destroyed || synchronizing || !lookup.has(event.target.dataset.accordionId)) return;
      const node = event.target;
      if (node.open && !multiple) {
        synchronizing = true;
        nodes.forEach(other => { if (other !== node) other.open = false; });
        synchronizing = false;
      }
      emit(node.dataset.accordionId);
    }
    nodes.forEach(node => node.addEventListener("toggle", on_toggle));
    if (!multiple) {
      let first = false;
      nodes.forEach(node => { if (node.open) { if (first) node.open = false; first = true; } });
    }
    const api = Object.freeze({
      open: key => apply(String(key), true),
      close: key => apply(String(key), false),
      toggle: key => apply(String(key), !lookup.get(String(key))?.open),
      open_all() { ensure_active(); if (!multiple) throw new Error("open_all requires multiple mode"); nodes.forEach(node => { node.open = true; }); emit(null); return snapshot(); },
      close_all() { ensure_active(); nodes.forEach(node => { node.open = false; }); emit(null); return snapshot(); },
      snapshot,
      destroy() { if (destroyed) return; destroyed = true; nodes.forEach(node => node.removeEventListener("toggle", on_toggle)); instances.delete(root); }
    });
    instances.set(root, api);
    return api;
  }
  global.SlowlyAccordion = Object.freeze({ version: "1.0.0", create });
})(window);
