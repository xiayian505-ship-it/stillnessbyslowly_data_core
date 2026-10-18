/*
 * 慢慢軍火庫｜Dialogue Sequence 1.0.0
 * 來源：燐珣的禮物「先補完本句，再進下一句」的對話流程。
 * 不實作逐字動畫：宿主可呼叫既有 SlowlyTypewriter。
 * 事件只回報狀態，由宿主決定如何繪製文字與觸發特效。
 */
(function (global) {
  "use strict";

  function create(options = {}) {
    const on_line_start = options.on_line_start;
    const on_line_complete = options.on_line_complete;
    const on_finished = options.on_finished;
    const on_changed = options.on_changed;
    for (const [name, handler] of Object.entries({ on_line_start, on_line_complete, on_finished, on_changed })) {
      if (handler != null && typeof handler !== "function") {
        throw new TypeError(name + " must be a function.");
      }
    }

    const allow_skip = options.allow_skip !== false;
    let lines = [];
    let index = -1;
    let running = false;
    let revealed = false;
    let finished = false;
    let destroyed = false;

    function assert_alive() {
      if (destroyed) throw new Error("Dialogue Sequence has been destroyed.");
    }

    function validate_lines(input) {
      if (!Array.isArray(input)) {
        throw new TypeError("lines must be an array.");
      }
      return input.map(function (line, line_index) {
        if (!line || typeof line !== "object" || typeof line.text !== "string") {
          throw new TypeError("lines[" + line_index + "].text must be a string.");
        }
        // 只複製物件外層。講者、識別碼、effect 等為宿主自己的資料。
        return Object.freeze({ ...line });
      });
    }

    function snapshot() {
      return Object.freeze({
        index,
        count: lines.length,
        running: running && !destroyed,
        revealed,
        finished,
        line: index >= 0 && index < lines.length ? lines[index] : null
      });
    }

    function emit_changed() {
      if (on_changed) on_changed(snapshot());
    }

    function finish() {
      running = false;
      finished = true;
      index = lines.length;
      emit_changed();
      if (on_finished) on_finished(snapshot());
      return snapshot();
    }

    function enter_line(next_index) {
      index = next_index;
      revealed = lines[index].text.length === 0;
      if (on_line_start) on_line_start(lines[index], index);
      emit_changed();
      if (revealed && on_line_complete) on_line_complete(lines[index], index);
      return snapshot();
    }

    function start(next_lines) {
      assert_alive();
      if (next_lines !== undefined) {
        lines = validate_lines(next_lines);
      }
      index = -1;
      running = true;
      revealed = false;
      finished = false;
      if (lines.length === 0) return finish();
      return enter_line(0);
    }

    function complete_current() {
      assert_alive();
      if (!running || revealed) return snapshot();
      revealed = true;
      if (on_line_complete) on_line_complete(lines[index], index);
      emit_changed();
      return snapshot();
    }

    function advance() {
      assert_alive();
      if (!running) return snapshot();
      if (!revealed) {
        if (allow_skip) return complete_current();
        return snapshot();
      }
      if (index + 1 >= lines.length) return finish();
      return enter_line(index + 1);
    }

    function reset() {
      assert_alive();
      index = -1;
      running = false;
      revealed = false;
      finished = false;
      emit_changed();
      return snapshot();
    }

    function destroy() {
      if (destroyed) return;
      lines = [];
      running = false;
      destroyed = true;
    }

    return Object.freeze({ version: "1.0.0", start, advance, complete_current, snapshot, reset, destroy });
  }

  global.SlowlyDialogueSequence = Object.freeze({ version: "1.0.0", create });
})(window);
