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

const rules=SlowlyStoryTriggerRules.create([
 {id:"a",targetId:"one",event:"win",priority:2,unlockWhen:c=>c.level>=2,triggerWhen:c=>c.auto===true && !c.seen?.includes("one")},
 {id:"b",targetId:"two",event:"win",priority:2,unlockWhen:c=>c.level>=1,triggerWhen:c=>c.auto===true},
 {id:"c",targetId:"three",event:"win",priority:5,unlockWhen:c=>c.level>=3,triggerWhen:c=>c.auto===true}
]);
check("未解鎖時為 false",()=>!rules.isUnlocked("one",{level:1}));
check("解鎖後為 true",()=>rules.isUnlocked("one",{level:2}));
check("不存在目標不解鎖",()=>!rules.isUnlocked("never",{level:100}));
check("關閉自動播放仍維持可讀",()=>rules.isUnlocked("one",{level:2,auto:false}));
check("關閉自動播放不觸發",()=>!rules.shouldTrigger("win",{level:5,auto:false}));
check("已讀不觸發指定規則",()=>rules.evaluate("win",{level:2,auto:true,seen:["one"]}).every(r=>r.targetId!=="one"));
check("穩定排序及不遺漏",()=>rules.evaluate("win",{level:3,auto:true}).map(r=>r.id).join(",")==="c,a,b");
check("評估不改變 context",()=>{const c={level:4,auto:true};rules.evaluate("win",c);return c.level===4 && !('modified' in c);});
check("不符合事件則空陣列",()=>rules.evaluate("lost",{level:4,auto:true}).length===0);
check("缺 context 明確報錯",()=>fails(()=>rules.evaluate("win")));
check("缺進度不默認解鎖",()=>!rules.isUnlocked("one",{}));
check("規則資訊輸出不露 callback",()=>typeof rules.getRules()[0].unlockWhen==="undefined");
check("重複規則 ID 拒絕",()=>fails(()=>SlowlyStoryTriggerRules.create([{id:"a",targetId:"x"},{id:"a",targetId:"y"}])));
check("規則不是陣列拒絕",()=>fails(()=>SlowlyStoryTriggerRules.create({})));

    return { passes: results.filter(result => result.status === "PASS").length,
      failures: results.filter(result => result.status === "FAIL").length, results };
  }
  global.MistforestUnitTests = Object.freeze({ run });
})(typeof window !== "undefined" ? window : globalThis);
