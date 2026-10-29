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

const router=RejectedAssetRouting;
const items=[{id:"a1",cardId:"attack"},{id:"a2",cardId:"attack"},{id:"b1",cardId:"defense"}];
check("部分保留正確分配",()=>{const p=router.splitBySelection(items,["a1"],{destination:"enemy"});return p.kept.length===1&&p.transferred.length===2&&p.removedIds.join()==="a2,b1";});
check("全部保留",()=>router.splitBySelection(items,["a1","a2","b1"]).transferred.length===0);
check("全部放棄",()=>router.splitBySelection(items,[],{destination:"enemy"}).transferred.length===3);
check("同卡種不同實體不混淆",()=>router.splitBySelection(items,["a1"],{destination:"enemy"}).transferred[0].id==="a2");
check("漏填目的地不可轉移",()=>fails(()=>router.splitBySelection(items,["a1"])));
check("未知 ID 拒絕",()=>fails(()=>router.splitBySelection(items,["ghost"],{destination:"enemy"})));
check("重複選取 ID 拒絕",()=>fails(()=>router.splitBySelection(items,["a1","a1"],{destination:"enemy"})));
check("重複來源 ID 拒絕",()=>fails(()=>router.splitBySelection([items[0],items[0]],[],{destination:"enemy"})));
check("拒絕新獎勵不假裝從玩家收藏移除",()=>router.planRejection({id:"new"},"enemy").removedIds.length===0);
check("替換舊實體",()=>{const p=router.planReplacement({id:"new"},"a2","enemy",{ownedItems:items});return p.incoming[0].id==="new"&&p.removedIds[0]==="a2";});
check("替換不存在的卡失敗",()=>fails(()=>router.planReplacement({id:"new"},"ghost","enemy",{ownedItems:items})));
check("已持有的卡不能當新卡",()=>fails(()=>router.planReplacement({id:"a1"},"a2","enemy",{ownedItems:items})));
const p=router.planReplacement({id:"new"},"a2","enemy",{ownedItems:items});
check("分配計畫有效",()=>router.validatePlan(p,{availableIds:["a1","a2","b1"]}).isValid);
check("來源不存在提示錯誤",()=>!router.validatePlan(p,{availableIds:["a1"]}).isValid);
check("重複歸屬提示錯誤",()=>!router.validatePlan({...p,kept:[{id:"new"}]}).isValid);
check("不污染輸入來源",()=>{p.transferred[0].cardId="changed";return items[1].cardId==="attack";});

    return { passes: results.filter(result => result.status === "PASS").length,
      failures: results.filter(result => result.status === "FAIL").length, results };
  }
  global.MistforestUnitTests = Object.freeze({ run });
})(typeof window !== "undefined" ? window : globalThis);
