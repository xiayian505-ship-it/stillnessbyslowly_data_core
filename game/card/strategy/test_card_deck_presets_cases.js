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

const presets=CardDeckPresets.create({presetCount:3,maximumCards:2,ownedIds:["a1","a2","b1"]});
check("可自訂牌組數",()=>presets.snapshot().presets.length===3);
check("初始牌組為空",()=>presets.getActive().instanceIds.length===0);
check("加入實體卡",()=>presets.addCard("preset_1","a1").instanceIds[0]==="a1");
check("另一套共用實體引用",()=>presets.addCard("preset_2","a1").instanceIds[0]==="a1");
check("相同卡種不同實體",()=>presets.addCard("preset_1","a2").instanceIds.length===2);
check("同一套不可重複",()=>fails(()=>presets.addCard("preset_1","a1")));
check("超額拒絕",()=>fails(()=>presets.addCard("preset_1","b1")));
check("不存在的實體拒絕",()=>fails(()=>presets.addCard("preset_2","fake")));
check("切換後不掉卡",()=>{presets.setActive("preset_2");presets.setActive("preset_1");return presets.getActive().instanceIds.join() === "a1,a2";});
check("失去實體同步清理",()=>{const result=presets.removeUnavailable(["a2","b1"]);return result.removed===2 && presets.getPreset("preset_1").instanceIds.join()==="a2" && presets.getPreset("preset_2").instanceIds.length===0;});
check("可命名",()=>presets.setName("preset_1","防守").name==="防守");
check("快照不會污染內部",()=>{const s=presets.snapshot();s.presets[0].instanceIds.push("oops");return !presets.getPreset("preset_1").instanceIds.includes("oops");});
const saved=presets.snapshot();
check("正常還原",()=>{presets.removeCard("preset_1","a2");presets.restore(saved);return presets.getPreset("preset_1").instanceIds[0]==="a2";});
check("損壞快照不覆蓋正常配置",()=>{const before=JSON.stringify(presets.snapshot());return fails(()=>presets.restore({presets:[]})) && JSON.stringify(presets.snapshot())===before;});
check("不允許無效啟用 ID",()=>fails(()=>presets.setActive("missing")));
check("不同實例互不影響",()=>{const other=CardDeckPresets.create({presetCount:1});other.addCard("preset_1","x");return presets.getPreset("preset_1").instanceIds[0]==="a2";});

    return { passes: results.filter(result => result.status === "PASS").length,
      failures: results.filter(result => result.status === "FAIL").length, results };
  }
  global.MistforestUnitTests = Object.freeze({ run });
})(typeof window !== "undefined" ? window : globalThis);
