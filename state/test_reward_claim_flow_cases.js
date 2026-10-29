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

const flow=SlowlyRewardClaimFlow.create();
check("零獎勵直接完成",()=>flow.start([],{flowId:"zero"}).status==="complete");
check("零獎勵無 current",()=>flow.current()===null);
flow.start([{id:"a",name:"甲"},{id:"b",name:"乙"},{id:"c",name:"丙"}],{flowId:"battle_1"});
check("顯示首項獎勵",()=>flow.current().id==="a");
const first=flow.accept();
check("接受先提出決定",()=>flow.snapshot().cursor===0&&first.type==="accept");
check("重複提交會拒絕",()=>fails(()=>flow.accept()));
check("宿主失敗取消後游標不動",()=>flow.cancel(first.decisionId)&&flow.snapshot().cursor===0);
const again=flow.accept();
check("重新提出相同識別碼",()=>again.decisionId===first.decisionId);
check("確認後移至下一項",()=>flow.commit(again.decisionId).committed&&flow.current().id==="b");
check("重複 commit 不生效",()=>flow.commit(again.decisionId).committed===false);
const second=flow.reject("不需要");
check("拒絕記錄原因",()=>second.details.reason==="不需要");
check("錯誤確認 ID 不前進",()=>flow.commit("wrong").committed===false&&flow.snapshot().cursor===1);
flow.commit(second.decisionId);
check("替換一定要求目標",()=>fails(()=>flow.replace("")));
const third=flow.replace("old");
const mid=flow.snapshot();
const restored=SlowlyRewardClaimFlow.create();
check("中途可還原 pending",()=>{restored.restore(mid);return restored.snapshot().pending.decisionId===third.decisionId;});
check("還原後完成",()=>restored.commit(third.decisionId).completed&&restored.isComplete());
check("完成後不再領取",()=>fails(()=>restored.accept()));
check("完成結果不重複",()=>restored.commit(third.decisionId).committed===false&&restored.snapshot().decisions.length===3);
check("快照資料隔離",()=>{const s=restored.snapshot();s.items[0].name="改";return restored.snapshot().items[0].name==="甲";});
check("損毀快照不污染現況",()=>{const before=JSON.stringify(restored.snapshot());return fails(()=>restored.restore({status:"pending",cursor:99,items:[],decisions:[],flowId:"x"}))&&JSON.stringify(restored.snapshot())===before;});
check("重複獎勵 ID 拒絕",()=>fails(()=>restored.start([{id:"a"},{id:"a"}])));

    return { passes: results.filter(result => result.status === "PASS").length,
      failures: results.filter(result => result.status === "FAIL").length, results };
  }
  global.MistforestUnitTests = Object.freeze({ run });
})(typeof window !== "undefined" ? window : globalThis);
