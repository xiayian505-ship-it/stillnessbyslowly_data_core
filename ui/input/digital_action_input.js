/*
 * Slowly Digital Action Input 1.0.0
 * 來源：《Space Cadet Pinball》 KEYMAP 與 Pointer 操作。
 * 將鍵盤／多指 Pointer 映射為按下、放開；不繪製按鈕、不決定遊戲動作。
 * Canvas 區域座標轉換重用 CanvasRectDrag.pointFromEvent。
 */
(function (global) {
  "use strict";

  function create(options = {}) {
    const keyboard_target = options.keyboard_target ?? global;
    const blur_target = options.blur_target ?? global;
    const key_map = options.key_map ?? {};
    const pointer_targets = options.pointer_targets ?? [];
    const on_change = options.on_change;
    if (!keyboard_target || typeof keyboard_target.addEventListener !== "function" ||
        !blur_target || typeof blur_target.addEventListener !== "function") {
      throw new TypeError("keyboard_target and blur_target must support event listeners.");
    }
    if (!key_map || typeof key_map !== "object" || Array.isArray(key_map) ||
        !Array.isArray(pointer_targets)) {
      throw new TypeError("key_map must be an object and pointer_targets an array.");
    }
    if (on_change != null && typeof on_change !== "function") {
      throw new TypeError("on_change must be a function.");
    }
    const bindings = pointer_targets.map((binding, index) => {
      if (!binding || !binding.element || typeof binding.element.addEventListener !== "function" ||
          (typeof binding.action !== "string" && typeof binding.resolve_action !== "function")) {
        throw new TypeError("pointer_targets[" + index + "] requires element and action or resolve_action.");
      }
      if (typeof binding.action === "string" && !binding.action.trim()) {
        throw new TypeError("action cannot be blank.");
      }
      if (binding.resolve_action != null && typeof binding.resolve_action !== "function") {
        throw new TypeError("resolve_action must be a function.");
      }
      if (binding.resolve_action && binding.element instanceof global.HTMLCanvasElement &&
          typeof global.CanvasRectDrag?.pointFromEvent !== "function") {
        throw new Error("CanvasRectDrag.pointFromEvent is required for Canvas region targets.");
      }
      return binding;
    });
    for (const action of Object.values(key_map)) {
      if (typeof action !== "string" || !action.trim()) {
        throw new TypeError("Each key_map action must be a non-empty string.");
      }
    }

    const active_sources = new Map();  // source token -> action
    const event_handlers = [];
    const clear_pointer_caches = [];
    let enabled = options.enabled !== false;
    let destroyed = false;

    function pressed(action) {
      return Array.from(active_sources.values()).includes(action);
    }

    function snapshot() {
      const actions = Object.create(null);
      for (const action of Object.values(key_map)) actions[action] = pressed(action);
      for (const binding of bindings) {
        if (binding.action) actions[binding.action] = pressed(binding.action);
      }
      for (const action of active_sources.values()) actions[action] = true;
      return Object.freeze({ enabled: enabled && !destroyed, actions: Object.freeze(actions) });
    }

    function notify(action, type, source) {
      if (on_change) on_change(Object.freeze({ action, type, pressed: type === "pressed", source }));
    }

    function add_source(source, action) {
      if (!enabled || destroyed || active_sources.has(source)) return false;
      const was_pressed = pressed(action);
      active_sources.set(source, action);
      if (!was_pressed) notify(action, "pressed", source);
      return true;
    }

    function remove_source(source) {
      if (!active_sources.has(source)) return false;
      const action = active_sources.get(source);
      active_sources.delete(source);
      if (!pressed(action)) notify(action, "released", source);
      return true;
    }

    function clear() {
      for (const source of Array.from(active_sources.keys())) remove_source(source);
      for (const clear_cache of clear_pointer_caches) clear_cache();
    }

    function listen(element, name, handler) {
      element.addEventListener(name, handler);
      event_handlers.push({ element, name, handler });
    }

    listen(keyboard_target, "keydown", event => {
      const action = key_map[event.code];
      if (!action || !enabled || event.repeat) return;
      if (options.prevent_default !== false) event.preventDefault();
      add_source("keyboard:" + event.code, action);
    });
    listen(keyboard_target, "keyup", event => {
      const action = key_map[event.code];
      if (!action) return;
      if (options.prevent_default !== false) event.preventDefault();
      remove_source("keyboard:" + event.code);
    });

    bindings.forEach((binding, index) => {
      const element = binding.element;
      const prefix = "pointer:" + index + ":";
      const pointer_tokens = new Map();
      listen(element, "pointerdown", event => {
        if (!enabled || destroyed || (event.pointerType === "mouse" && event.button !== 0)) return;
        if (pointer_tokens.has(event.pointerId)) return;
        let action = binding.action;
        if (binding.resolve_action) {
          let local_point;
          if (element instanceof global.HTMLCanvasElement) {
            local_point = global.CanvasRectDrag.pointFromEvent(element, event);
          } else {
            const bounds = element.getBoundingClientRect();
            local_point = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
          }
          action = binding.resolve_action(event, Object.freeze(local_point));
        }
        if (typeof action !== "string" || !action.trim()) return;
        if (options.prevent_default !== false) event.preventDefault();
        const source = prefix + event.pointerId;
        pointer_tokens.set(event.pointerId, source);
        add_source(source, action);
        try {
          if (typeof element.setPointerCapture === "function") element.setPointerCapture(event.pointerId);
        } catch (error) {
          // 模擬事件、或來源已不在 DOM 時可無 Pointer 捕捉；狀態仍可取消。
        }
      });
      function end_pointer(event) {
        const source = pointer_tokens.get(event.pointerId);
        if (source === undefined) return;
        pointer_tokens.delete(event.pointerId);
        remove_source(source);
        try {
          if (typeof element.hasPointerCapture === "function" && element.hasPointerCapture(event.pointerId)) {
            element.releasePointerCapture(event.pointerId);
          }
        } catch (error) {
          // 捕捉已由瀏覽器釋放。
        }
      }
      listen(element, "pointerup", end_pointer);
      listen(element, "pointercancel", end_pointer);
      listen(element, "lostpointercapture", end_pointer);
      clear_pointer_caches.push(() => pointer_tokens.clear());
    });

    listen(blur_target, "blur", clear);

    function set_enabled(next_enabled) {
      if (destroyed) throw new Error("Digital Action Input is destroyed.");
      enabled = Boolean(next_enabled);
      if (!enabled) clear();
      return snapshot();
    }

    function destroy() {
      if (destroyed) return;
      clear();
      destroyed = true;
      for (const entry of event_handlers) {
        entry.element.removeEventListener(entry.name, entry.handler);
      }
      event_handlers.length = 0;
    }

    return Object.freeze({ version: "1.0.0", pressed, snapshot, clear, set_enabled, destroy });
  }

  global.SlowlyDigitalActionInput = Object.freeze({ version: "1.0.0", create });
})(window);
