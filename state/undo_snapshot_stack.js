/* 慢慢軍火庫｜Undo Snapshot Stack 1.0.0
 * 來源：推箱子的 cloneState / saveHistory / undo。
 * 此堆疊不是 window.history，不提供 Redo。push 與 undo 各自深拷貝。
 */
(function (global) {
  "use strict";

  function create(options = {}) {
    const capacity = options.capacity ?? 200;
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new RangeError("capacity must be a positive integer.");
    }
    if (options.clone !== undefined && typeof options.clone !== "function") {
      throw new TypeError("clone must be a function.");
    }
    const clone = options.clone ?? function (value) {
      if (typeof global.structuredClone !== "function") {
        throw new Error("structuredClone is unavailable; provide options.clone.");
      }
      return global.structuredClone(value);
    };
    const snapshots = [];

    function clone_value(value) {
      const result = clone(value);
      if (value && typeof value === "object" && result === value) {
        throw new TypeError("clone must return an independent object.");
      }
      return result;
    }

    function push(snapshot) {
      const saved = clone_value(snapshot);
      snapshots.push(saved);
      if (snapshots.length > capacity) snapshots.shift();
      return snapshots.length;
    }

    function undo() {
      if (snapshots.length === 0) return null;
      // Clone before removing, so a failed clone never destroys stored history.
      const restored = clone_value(snapshots[snapshots.length - 1]);
      snapshots.pop();
      return restored;
    }

    function clear() {
      snapshots.length = 0;
    }

    function can_undo() {
      return snapshots.length > 0;
    }

    function size() {
      return snapshots.length;
    }

    function snapshot() {
      return Object.freeze({ size: snapshots.length, capacity, can_undo: can_undo() });
    }

    return Object.freeze({ push, undo, clear, can_undo, size, snapshot });
  }

  global.SlowlyUndoSnapshotStack = Object.freeze({ version: "1.0.0", create });
})(window);
