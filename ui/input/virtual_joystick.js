/*
 * 慢慢軍火庫｜Virtual Joystick 1.0.0
 * 抽離自燐珣的禮物的 Pointer 拖曳方向控制。
 * 不繪製搖桿或替宿主移動角色。
 * Canvas 座標換算直接引用 CanvasRectDrag.pointFromEvent。
 */
(function (global) {
  "use strict";

  function finite_number(value, name) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new TypeError(name + " must be a finite number.");
    }
    return value;
  }

  function non_negative(value, name) {
    const number = finite_number(value, name);
    if (number < 0) {
      throw new RangeError(name + " must be >= 0.");
    }
    return number;
  }

  function create(options = {}) {
    const target = options.target;
    if (!target || typeof target.addEventListener !== "function" || typeof target.getBoundingClientRect !== "function") {
      throw new TypeError("options.target must be a DOM element.");
    }
    const is_canvas = target instanceof global.HTMLCanvasElement;
    if (is_canvas && !global.CanvasRectDrag?.pointFromEvent) {
      throw new Error("CanvasRectDrag.pointFromEvent is required for Canvas targets.");
    }
    const dead_zone = non_negative(options.dead_zone ?? 10, "options.dead_zone");
    const max_distance = non_negative(options.max_distance ?? 70, "options.max_distance");
    if (!(max_distance > dead_zone)) {
      throw new RangeError("max_distance must be greater than dead_zone.");
    }
    const on_change = options.on_change;
    if (on_change != null && typeof on_change !== "function") {
      throw new TypeError("options.on_change must be a function.");
    }

    let enabled = options.enabled !== false;
    let destroyed = false;
    let pointer_id = null;
    let origin = { x: 0, y: 0 };
    let current = { x: 0, y: 0 };

    function point_from_event(event) {
      if (is_canvas) {
        return global.CanvasRectDrag.pointFromEvent(target, event);
      }
      const bounds = target.getBoundingClientRect();
      if (!(bounds.width > 0 && bounds.height > 0)) {
        throw new RangeError("Target bounds must be positive.");
      }
      return {
        x: finite_number(event.clientX, "event.clientX") - bounds.left,
        y: finite_number(event.clientY, "event.clientY") - bounds.top
      };
    }

    function snapshot() {
      const active = pointer_id !== null && enabled && !destroyed;
      const offset_x = active ? current.x - origin.x : 0;
      const offset_y = active ? current.y - origin.y : 0;
      const distance = Math.hypot(offset_x, offset_y);
      const moving = active && distance > dead_zone;
      const strength = moving ? Math.min(1, (distance - dead_zone) / (max_distance - dead_zone)) : 0;
      return Object.freeze({
        active,
        enabled: enabled && !destroyed,
        pointer_id,
        origin: Object.freeze({ ...origin }),
        current: Object.freeze({ ...current }),
        direction_x: moving ? offset_x / distance : 0,
        direction_y: moving ? offset_y / distance : 0,
        strength,
        distance
      });
    }

    function notify() {
      if (on_change) {
        on_change(snapshot());
      }
    }

    function end_pointer() {
      if (pointer_id === null) return;
      const old_id = pointer_id;
      pointer_id = null;
      if (typeof target.hasPointerCapture === "function" && target.hasPointerCapture(old_id)) {
        target.releasePointerCapture(old_id);
      }
      notify();
    }

    function on_pointer_down(event) {
      if (!enabled || destroyed || pointer_id !== null || event.isPrimary === false || (event.pointerType === "mouse" && event.button !== 0)) {
        return;
      }
      origin = point_from_event(event);
      current = { ...origin };
      pointer_id = event.pointerId;
      if (typeof target.setPointerCapture === "function") {
        target.setPointerCapture(pointer_id);
      }
      notify();
    }

    function on_pointer_move(event) {
      if (event.pointerId !== pointer_id || destroyed) return;
      current = point_from_event(event);
      notify();
    }

    function on_pointer_end(event) {
      if (event.pointerId === pointer_id) {
        end_pointer();
      }
    }

    function on_window_blur() {
      end_pointer();
    }

    target.addEventListener("pointerdown", on_pointer_down);
    target.addEventListener("pointermove", on_pointer_move);
    target.addEventListener("pointerup", on_pointer_end);
    target.addEventListener("pointercancel", on_pointer_end);
    target.addEventListener("lostpointercapture", on_pointer_end);
    global.addEventListener("blur", on_window_blur);

    function set_enabled(next_enabled) {
      if (destroyed) throw new Error("Joystick is destroyed.");
      enabled = Boolean(next_enabled);
      if (!enabled) end_pointer();
      notify();
      return snapshot();
    }

    function destroy() {
      if (destroyed) return;
      end_pointer();
      destroyed = true;
      target.removeEventListener("pointerdown", on_pointer_down);
      target.removeEventListener("pointermove", on_pointer_move);
      target.removeEventListener("pointerup", on_pointer_end);
      target.removeEventListener("pointercancel", on_pointer_end);
      target.removeEventListener("lostpointercapture", on_pointer_end);
      global.removeEventListener("blur", on_window_blur);
    }

    return Object.freeze({ version: "1.0.0", snapshot, set_enabled, destroy });
  }

  global.SlowlyVirtualJoystick = Object.freeze({ version: "1.0.0", create });
})(window);
