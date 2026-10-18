/*
 * 慢慢軍火庫｜Canvas Floating Text 1.0.0
 * 來源：燐珣的禮物的獎勵飄字生命週期與 Canvas 繪製。
 * 僅建立、更新、繪製 Canvas 文字，字體／顏色／規則完全由宿主決定。
 */
(function (global) {
  "use strict";

  function finite_number(value, label) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new TypeError(label + " must be a finite number.");
    }
    return value;
  }

  function non_negative(value, label) {
    const number = finite_number(value, label);
    if (number < 0) throw new RangeError(label + " must be >= 0.");
    return number;
  }

  function opacity(value, label) {
    const number = finite_number(value, label);
    if (number < 0 || number > 1) {
      throw new RangeError(label + " must be between 0 and 1.");
    }
    return number;
  }

  function create(options = {}) {
    let context = options.context || null;
    let items = [];
    let destroyed = false;

    function assert_alive() {
      if (destroyed) throw new Error("Canvas Floating Text is destroyed.");
    }

    function add(item) {
      assert_alive();
      if (!item || typeof item.text !== "string") {
        throw new TypeError("item.text must be a string.");
      }
      const lifetime_seconds = non_negative(item.lifetime_seconds ?? 1.1, "lifetime_seconds");
      const entry = {
        text: item.text,
        x: finite_number(item.x, "item.x"),
        y: finite_number(item.y, "item.y"),
        velocity_x: finite_number(item.velocity_x ?? 0, "velocity_x"),
        velocity_y: finite_number(item.velocity_y ?? -40, "velocity_y"),
        lifetime_seconds,
        elapsed_seconds: 0,
        start_alpha: opacity(item.start_alpha ?? 1, "start_alpha"),
        end_alpha: opacity(item.end_alpha ?? 0, "end_alpha"),
        font: item.font,
        fill_style: item.fill_style,
        text_align: item.text_align,
        text_baseline: item.text_baseline
      };
      if (entry.font !== undefined && typeof entry.font !== "string") {
        throw new TypeError("item.font must be a string.");
      }
      if (entry.fill_style !== undefined && typeof entry.fill_style !== "string") {
        throw new TypeError("item.fill_style must be a string.");
      }
      if (lifetime_seconds > 0) {
        items.push(entry);
      }
      return Object.freeze({ ...entry });
    }

    function update(delta_seconds) {
      assert_alive();
      non_negative(delta_seconds, "delta_seconds");
      for (const item of items) {
        const remaining = Math.max(0, item.lifetime_seconds - item.elapsed_seconds);
        const movement_seconds = Math.min(delta_seconds, remaining);
        item.x += item.velocity_x * movement_seconds;
        item.y += item.velocity_y * movement_seconds;
        item.elapsed_seconds += delta_seconds;
      }
      items = items.filter(item => item.elapsed_seconds < item.lifetime_seconds);
      return snapshot();
    }

    function snapshot() {
      return Object.freeze(items.map(item => Object.freeze({ ...item })));
    }

    function draw(other_context = context) {
      assert_alive();
      if (!other_context || typeof other_context.save !== "function" || typeof other_context.fillText !== "function") {
        throw new TypeError("A CanvasRenderingContext2D is required to draw floating text.");
      }
      // 每筆獨立 save/restore，不污染宿主既有字體、透明度與變換狀態。
      for (const item of items) {
        const progress = item.elapsed_seconds / item.lifetime_seconds;
        const alpha = item.start_alpha + (item.end_alpha - item.start_alpha) * progress;
        other_context.save();
        try {
          other_context.globalAlpha *= alpha;
          if (item.font !== undefined) other_context.font = item.font;
          if (item.fill_style !== undefined) other_context.fillStyle = item.fill_style;
          if (item.text_align !== undefined) other_context.textAlign = item.text_align;
          if (item.text_baseline !== undefined) other_context.textBaseline = item.text_baseline;
          other_context.fillText(item.text, item.x, item.y);
        } finally {
          other_context.restore();
        }
      }
      return items.length;
    }

    function clear() {
      assert_alive();
      items = [];
    }

    function destroy() {
      if (destroyed) return;
      items = [];
      context = null;
      destroyed = true;
    }

    return Object.freeze({ version: "1.0.0", add, update, snapshot, draw, clear, destroy });
  }

  global.SlowlyCanvasFloatingText = Object.freeze({ version: "1.0.0", create });
})(window);
