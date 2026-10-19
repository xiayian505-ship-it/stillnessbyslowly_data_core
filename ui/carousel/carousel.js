/* Slowly Carousel: content-agnostic discrete slides, optional autoplay and swipe. */
(function (global) {
  "use strict";
  const instances = new WeakMap();
  function create(root, options = {}) {
    if (typeof root === "string") root = document.querySelector(root);
    if (!(root instanceof HTMLElement)) throw new TypeError("carousel root must be element");
    if (instances.has(root)) return instances.get(root);
    const slides = Array.from(root.querySelectorAll("[data-carousel-slide]"))
      .filter(element => element.closest("[data-slowly-carousel]") === root);
    const previous_button = root.querySelector("[data-carousel-previous]");
    const next_button = root.querySelector("[data-carousel-next]");
    const dots = Array.from(root.querySelectorAll("[data-carousel-go-to]"));
    const original_hidden = slides.map(element => element.hidden);
    const original_aria = slides.map(element => element.getAttribute("aria-hidden"));
    const old_tabindex = root.getAttribute("tabindex");
    const added_tabindex = old_tabindex === null;
    if (added_tabindex) root.tabIndex = 0;
    const loop = options.loop !== false;
    const interval_ms = options.interval_ms ?? 3500;
    if (!Number.isFinite(interval_ms) || interval_ms < 250) throw new RangeError("carousel interval_ms must be >= 250");
    let index = slides.length ? Math.max(0, Math.min(slides.length - 1, options.initial_index ?? 0)) : -1;
    if (!Number.isInteger(index)) throw new RangeError("invalid initial_index");
    let autoplay = false;
    let timer = null;
    let hovering = false;
    let focused = false;
    let destroyed = false;
    let down = null;
    const motion_query = window.matchMedia("(prefers-reduced-motion: reduce)");
    function ensure_active() { if (destroyed) throw new Error("carousel destroyed"); }
    function snapshot() { return { index, count: slides.length, playing: autoplay }; }
    function clear_timer() { if (timer !== null) { clearInterval(timer); timer = null; } }
    function can_advance() { return autoplay && slides.length > 1 && !hovering && !focused && !document.hidden && !motion_query.matches; }
    function renew_timer() {
      clear_timer();
      if (can_advance()) timer = setInterval(() => api.next(), interval_ms);
    }
    function render(emit = false) {
      slides.forEach((element, at) => { element.hidden = at !== index; element.setAttribute("aria-hidden", String(at !== index)); });
      dots.forEach((dot, at) => dot.setAttribute("aria-current", String(at === index)));
      if (previous_button) previous_button.disabled = slides.length < 2 || (!loop && index <= 0);
      if (next_button) next_button.disabled = slides.length < 2 || (!loop && index >= slides.length - 1);
      if (emit) {
        const detail = snapshot();
        root.dispatchEvent(new CustomEvent("slowlycarouselchange", { bubbles: true, detail }));
        if (typeof options.on_change === "function") options.on_change(detail);
      }
    }
    function go_to(next_index) {
      ensure_active();
      if (!Number.isInteger(next_index)) throw new TypeError("carousel index must be integer");
      if (!slides.length) return snapshot();
      if (next_index < 0 || next_index >= slides.length) {
        if (!loop) next_index = Math.max(0, Math.min(slides.length - 1, next_index));
        else next_index = ((next_index % slides.length) + slides.length) % slides.length;
      }
      const changed = next_index !== index;
      index = next_index;
      render(changed);
      return snapshot();
    }
    function on_key(event) {
      if (event.target.closest("input,textarea,select,[contenteditable]")) return;
      if (event.key === "ArrowRight") { event.preventDefault(); api.next(); }
      if (event.key === "ArrowLeft") { event.preventDefault(); api.previous(); }
    }
    function on_down(event) { if (event.pointerType === "touch" || event.pointerType === "pen") down = { x: event.clientX, y: event.clientY, id: event.pointerId }; }
    function on_up(event) {
      if (!down || down.id !== event.pointerId) return;
      const dx = event.clientX - down.x, dy = event.clientY - down.y;
      down = null;
      if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.3) dx < 0 ? api.next() : api.previous();
    }
    function on_cancel() { down = null; }
    function on_enter() { hovering = true; renew_timer(); }
    function on_leave() { hovering = false; renew_timer(); }
    function on_focus() { focused = true; renew_timer(); }
    function on_blur(event) { if (!root.contains(event.relatedTarget)) { focused = false; renew_timer(); } }
    function on_visible() { renew_timer(); }
    function on_motion() { renew_timer(); }
    const on_previous = () => api.previous();
    const on_next = () => api.next();
    const dot_callbacks = dots.map(dot => () => api.go_to(Number(dot.dataset.carouselGoTo)));
    previous_button?.addEventListener("click", on_previous);
    next_button?.addEventListener("click", on_next);
    dots.forEach((dot, at) => dot.addEventListener("click", dot_callbacks[at]));
    root.addEventListener("keydown", on_key);
    root.addEventListener("pointerdown", on_down);
    root.addEventListener("pointerup", on_up);
    root.addEventListener("pointercancel", on_cancel);
    root.addEventListener("mouseenter", on_enter);
    root.addEventListener("mouseleave", on_leave);
    root.addEventListener("focusin", on_focus);
    root.addEventListener("focusout", on_blur);
    document.addEventListener("visibilitychange", on_visible);
    motion_query.addEventListener?.("change", on_motion);
    const api = Object.freeze({
      next() { return go_to(index + 1); }, previous() { return go_to(index - 1); }, go_to,
      start() { ensure_active(); autoplay = true; renew_timer(); return snapshot(); },
      pause() { autoplay = false; clear_timer(); return snapshot(); }, snapshot,
      destroy() {
        if (destroyed) return;
        api.pause(); destroyed = true;
        previous_button?.removeEventListener("click", on_previous);
        next_button?.removeEventListener("click", on_next);
        dots.forEach((dot, at) => dot.removeEventListener("click", dot_callbacks[at]));
        root.removeEventListener("keydown", on_key);
        root.removeEventListener("pointerdown", on_down);
        root.removeEventListener("pointerup", on_up);
        root.removeEventListener("pointercancel", on_cancel);
        root.removeEventListener("mouseenter", on_enter);
        root.removeEventListener("mouseleave", on_leave);
        root.removeEventListener("focusin", on_focus);
        root.removeEventListener("focusout", on_blur);
        document.removeEventListener("visibilitychange", on_visible);
        motion_query.removeEventListener?.("change", on_motion);
        slides.forEach((element, at) => {
          element.hidden = original_hidden[at];
          if (original_aria[at] === null) element.removeAttribute("aria-hidden");
          else element.setAttribute("aria-hidden", original_aria[at]);
        });
        if (added_tabindex) root.removeAttribute("tabindex");
        instances.delete(root);
      }
    });
    instances.set(root, api);
    render();
    if (options.autoplay === true) api.start();
    return api;
  }
  global.SlowlyCarousel = Object.freeze({ version: "1.0.0", create });
})(window);
