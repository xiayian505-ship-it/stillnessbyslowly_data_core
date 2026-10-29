/* Focus Confirm 1.0.0｜慢慢軍火庫
 * 第一次選取聚焦；再選同一 ID 才確認。不依賴 DOM、導航或連點時間。
 */
(function (global) {
  "use strict";
  function normalizeItems(items) {
    if (!Array.isArray(items)) throw new TypeError("items must be an array");
    const keys = new Set();
    items.forEach(function (id) {
      if (typeof id !== "string" || !id.trim()) throw new TypeError("item ID must be a non-empty string");
      if (keys.has(id)) throw new RangeError("duplicate item ID: " + id);
      keys.add(id);
    });
    return keys;
  }
  function create(options = {}) {
    let items = normalizeItems(options.items || []);
    let focused = null;
    let destroyed = false;
    function check() { if (destroyed) throw new Error("Focus Confirm has been destroyed"); }
    function select(id) {
      check();
      if (typeof id !== "string" || !items.has(id)) return { status: "invalid", id: id, focused };
      if (focused === id) return { status: "confirmed", id, focused };
      focused = id;
      return { status: "focused", id, focused };
    }
    function clear() { check(); focused = null; }
    function setItems(next) {
      check();
      const validated = normalizeItems(next);
      items = validated;
      if (focused !== null && !items.has(focused)) focused = null;
      return Array.from(items);
    }
    function getFocused() { check(); return focused; }
    function destroy() { items.clear(); focused = null; destroyed = true; }
    return Object.freeze({ select, clear, setItems, getFocused, destroy });
  }
  global.SlowlyFocusConfirm = Object.freeze({ version: "1.0.0", create });
})(typeof window !== "undefined" ? window : globalThis);
