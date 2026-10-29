/* 慢慢軍火庫｜Story Event Player 1.0.0
 * 來源概念：《霧林之契》story/story.js。
 * 只控制單一事件陣列及同篇選項跳轉，不處理畫面、儲存或解鎖。
 */
(function (global) {
  "use strict";

  const SUPPORTED_TYPES = new Set(["scene", "narration", "dialogue", "text", "choice", "challenge"]);

  function copy(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function validateEvents(input) {
    if (!Array.isArray(input)) throw new TypeError("events must be an array");
    const events = copy(input);
    const positions = new Map();
    for (const [index, event] of events.entries()) {
      if (!event || Array.isArray(event) || typeof event !== "object") {
        throw new TypeError("events[" + index + "] must be an object");
      }
      if (!SUPPORTED_TYPES.has(event.type)) throw new RangeError("Unsupported event type at " + index);
      if (event.id !== undefined) {
        if (typeof event.id !== "string" || !event.id) throw new TypeError("event.id must be a nonempty string");
        if (positions.has(event.id)) throw new Error("Duplicate event id: " + event.id);
        positions.set(event.id, index);
      }
      if (event.type === "choice") {
        if (!Array.isArray(event.options) || !event.options.length) throw new TypeError("choice requires options");
        for (const option of event.options) {
          if (!option || typeof option.text !== "string" ||
              (option.goto !== undefined && (typeof option.goto !== "string" || !option.goto))) {
            throw new TypeError("Invalid choice option");
          }
        }
      }
    }
    return { events, positions };
  }

  function create() {
    let events = [];
    let positions = new Map();
    let index = -1;
    let status = "idle";
    const listeners = new Set();

    function current() {
      return index >= 0 && index < events.length ? copy(events[index]) : null;
    }
    function snapshot() {
      return { status, index, count: events.length, event: current() };
    }
    function emit() {
      const state = snapshot();
      for (const listener of listeners) listener(copy(state));
      return state;
    }
    function enter(target) {
      index = target;
      status = events[index].type === "choice" ? "choice" :
        events[index].type === "challenge" ? "host" : "playing";
      return emit();
    }
    function finish() {
      index = events.length;
      status = "complete";
      return emit();
    }
    function moveNext() {
      return index + 1 >= events.length ? finish() : enter(index + 1);
    }
    function load(input) {
      const checked = validateEvents(input);
      events = checked.events;
      positions = checked.positions;
      index = -1;
      status = "idle";
      return emit();
    }
    function start() {
      return events.length ? enter(0) : finish();
    }
    function advance() {
      return status === "playing" ? moveNext() : snapshot();
    }
    function choose(optionIndex) {
      if (status !== "choice") throw new Error("Not waiting for a choice");
      if (!Number.isInteger(optionIndex) || !events[index].options[optionIndex]) {
        throw new RangeError("Invalid option index");
      }
      const option = events[index].options[optionIndex];
      if (option.goto === undefined) return moveNext();
      if (!positions.has(option.goto)) throw new RangeError("Unknown goto target: " + option.goto);
      return enter(positions.get(option.goto));
    }
    function completeHost() {
      if (status !== "host") throw new Error("Not waiting for host action");
      return moveNext();
    }
    function seekByIndex(target) {
      if (!Number.isInteger(target) || target < 0 || target >= events.length) {
        throw new RangeError("Invalid event index");
      }
      return enter(target);
    }
    function seekById(id) {
      if (!positions.has(id)) throw new RangeError("Unknown event id");
      return enter(positions.get(id));
    }
    function reset() {
      index = -1;
      status = "idle";
      return emit();
    }
    function subscribe(callback) {
      if (typeof callback !== "function") throw new TypeError("listener must be a function");
      listeners.add(callback);
      return function unsubscribe() { listeners.delete(callback); };
    }
    return Object.freeze({ load, start, current, advance, choose, completeHost,
      seekByIndex, seekById, snapshot, reset, subscribe });
  }

  global.SlowlyStoryEventPlayer = Object.freeze({ create, VERSION: "1.0.0" });
})(typeof window !== "undefined" ? window : globalThis);
