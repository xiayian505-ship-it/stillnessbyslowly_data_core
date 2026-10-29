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

const p=SlowlyStoryReadingProgress.create();
check("新紀錄為空", () => p.snapshot().seenIds.length===0);
check("標記看過但未完成", () => { p.markSeen("a"); const s=p.getStatus("a"); return s.seen && !s.completed; });
check("完成意味已看過", () => { p.markCompleted("b"); return p.getStatus("b").seen && p.getStatus("b").completed; });
check("重複標記不重複", () => { p.markSeen("a"); return p.snapshot().seenIds.filter(id=>id==="a").length===1; });
check("書籤保存事件 ID", () => p.setBookmark("a",{eventId:"event-1",eventIndex:2}).eventId==="event-1");
check("以事件 ID 優先定位", () => p.resolveBookmark([{id:"x"},{id:"event-1"}]).index===1);
check("遺失 ID 不亂退回索引", () => p.resolveBookmark([{id:"x"},{id:"y"}]).reason==="missing-id");
check("快照不污染內部", () => { const s=p.snapshot(); s.seenIds.push("z");s.bookmark.eventId="oops";return !p.getStatus("z").seen && p.getBookmark().eventId==="event-1"; });
check("略過清書籤但非完成", () => { p.skip("a");return p.getBookmark()===null && !p.getStatus("a").completed; });
check("已完成再略過仍完成", () => { p.skip("b");return p.getStatus("b").completed; });
check("完成清除同篇書籤", () => { p.setBookmark("b",{eventIndex:2});p.finish("b");return p.getBookmark()===null; });
check("書籤索引定位", () => { p.setBookmark("b",{eventIndex:1});return p.resolveBookmark([{},{},{}]).index===1; });
check("索引失效時報錯語意", () => p.resolveBookmark([{}]).reason==="missing-index");
const saved=p.snapshot();const p2=SlowlyStoryReadingProgress.create();
check("匯出與還原", () => {p2.restore(saved);return p2.getStatus("b").completed && p2.getBookmark().eventIndex===1;});
check("壞資料還原不破壞原狀態", () => { const before=JSON.stringify(p2.snapshot());return fails(()=>p2.restore({seenIds:[],completedIds:[],bookmark:{contentId:"z"}}))&&JSON.stringify(p2.snapshot())===before; });
check("各實例獨立", () => {p2.markSeen("another");return !p.getStatus("another").seen;});
check("重設指定篇章", () => {p2.reset("b");return !p2.getStatus("b").seen && p2.getBookmark()===null;});
check("全部清除", () => {p2.clear();return p2.snapshot().seenIds.length===0;});

    return { passes: results.filter(result => result.status === "PASS").length,
      failures: results.filter(result => result.status === "FAIL").length, results };
  }
  global.MistforestUnitTests = Object.freeze({ run });
})(typeof window !== "undefined" ? window : globalThis);
