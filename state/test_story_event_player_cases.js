/* 對應零件的瀏覽器／Node 共用驗收案例；每一項都實際執行。 */
(function (global) {
  "use strict";
  function run() {
    const results = [];
    function fails(fn) { try { fn(); return false; } catch (_) { return true; } }
    function check(name, fn) {
      try {
        if (fn() !== true) throw new Error("結果不符合預期");
        results.push({ name, status: "PASS" });
      } catch (error) {
        results.push({ name, status: "FAIL", error: error.message });
      }
    }

const player = SlowlyStoryEventPlayer.create();
check("空陣列完成", () => { player.load([]); return player.start().status === "complete"; });
check("空載入後無當前事件", () => player.current() === null);
const items = [{ id: "start", type: "scene", scene: "a" }, { id: "text", type: "text", text: "你好" },
  { id: "choice", type: "choice", options: [{ text: "回去", goto: "start" }, { text: "繼續" }, { text: "錯誤", goto: "missing" }] },
  { id: "host", type: "challenge" }, { id: "end", type: "dialogue", speaker: "甲", text: "完" }];
check("載入與開始", () => { player.load(items); return player.start().event.scene === "a"; });
check("正常前進", () => player.advance().index === 1);
check("選項等待狀態", () => player.advance().status === "choice");
check("選項時普通 advance 不跳過", () => player.advance().index === 2);
check("缺失 goto 不動原位置", () => fails(() => player.choose(2)) && player.snapshot().index === 2);
check("分支可回到之前事件", () => player.choose(0).index === 0);
player.seekById("choice");
check("不指定 goto 的選項依序前進", () => player.choose(1).status === "host");
check("外部事件不能自動前進", () => player.advance().index === 3);
check("外部處理確認後可繼續", () => player.completeHost().index === 4);
check("最後事件結束", () => player.advance().status === "complete");
check("完成後無當前事件", () => player.current() === null);
check("重複 ID 拒絕", () => fails(() => player.load([{id:"a",type:"text"},{id:"a",type:"text"}])));
check("非法種類拒絕", () => fails(() => player.load([{type:"magic"}])));
check("無效索引拒絕", () => fails(() => player.seekByIndex(-1)));
player.load(items); player.start();
check("輸入快照隔離", () => { const s=player.snapshot(); s.event.scene="改"; return player.current().scene === "a"; });
check("原始資料隔離", () => { items[0].scene="改"; return player.current().scene === "a"; });
let notices=0; const unsubscribe=player.subscribe(() => notices++); player.advance(); unsubscribe(); player.advance();
check("取消訂閱", () => notices === 1);
check("多實例隔離", () => { const other=SlowlyStoryEventPlayer.create(); other.load([{type:"text"}]); other.start(); return other.snapshot().count===1 && player.snapshot().count===5; });

    return { passes: results.filter(result => result.status === "PASS").length,
      failures: results.filter(result => result.status === "FAIL").length, results };
  }
  global.MistforestUnitTests = Object.freeze({ run });
})(typeof window !== "undefined" ? window : globalThis);
