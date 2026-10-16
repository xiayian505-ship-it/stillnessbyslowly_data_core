// 檔案位置：game/card/strategy/card_effect_registry.js
// 慢慢軍火庫｜Game / Card / Strategy｜CardEffectRegistry 1.1.0
//
// 責任：儲存宿主註冊的「效果名稱 → 處理函式」，並按要求執行。
//
// 不負責：
//   - 定義任何卡牌效果、出牌時機、資源費用或勝敗規則。
//   - 自動挑選目標、修改牌庫、呼叫 UI 或保存遊戲狀態。
//   - 回滾宿主效果造成的副作用。
//
// 注意：效果處理是同步的。
//       宿主的 execute() 若拋出錯誤，錯誤直接交還宿主。
(function (global) {
  "use strict";

  const VERSION = "1.1.0";

  function requireNonemptyEffectKey(effectKey) {
    if (typeof effectKey !== "string" || effectKey.length === 0) {
      throw new TypeError("effect key must be a nonempty string");
    }

    return effectKey;
  }

  function normalizeEffectDefinition(effectDefinition) {
    // 允許 registerEffect('registeredEffect', function () { ... }) 的簡單形式。
    const registeredEffect = typeof effectDefinition === "function"
      ? { execute: effectDefinition }
      : effectDefinition;

    if (!registeredEffect || typeof registeredEffect.execute !== "function") {
      throw new TypeError("effect execute must be a function");
    }

    if (
      registeredEffect.canRun !== undefined &&
      typeof registeredEffect.canRun !== "function"
    ) {
      throw new TypeError("canRun must be a function");
    }

    return {
      execute: registeredEffect.execute,
      canRun: registeredEffect.canRun
    };
  }

  function createRegistry() {
    const registeredEffects = new Map();

    /**
     * 登記一種宿主自訂效果。
     * 不允許覆蓋既有名稱；更新前請先 removeEffect()。
     */
    function registerEffect(effectKey, effectDefinition) {
      requireNonemptyEffectKey(effectKey);
      const registeredEffect = normalizeEffectDefinition(effectDefinition);

      if (registeredEffects.has(effectKey)) {
        throw new Error("effect already registered: " + effectKey);
      }

      registeredEffects.set(effectKey, registeredEffect);
      return registryApi;
    }

    /**
     * 判斷此效果是否已登記、目前是否允許執行。
     * 建議宿主的 canRun() 不產生副作用。
     */
    function checkEffect(effectKey, effectContext) {
      const registeredEffect = registeredEffects.get(effectKey);

      if (!registeredEffect) {
        return { ok: false, reason: "unknown_effect" };
      }

      if (registeredEffect.canRun && !registeredEffect.canRun(effectContext)) {
        return { ok: false, reason: "blocked" };
      }

      return { ok: true };
    }

    /**
     * 先檢查，通過後執行宿主登記的函式。
     * 不在這裡自動扣費，也不把回傳結果當作卡牌戰鬥規則。
     */
    function executeEffect(effectKey, effectContext) {
      const eligibilityResult = checkEffect(effectKey, effectContext);

      if (!eligibilityResult.ok) {
        return eligibilityResult;
      }

      const registeredEffect = registeredEffects.get(effectKey);
      const executionResult = registeredEffect.execute(effectContext);

      return {
        ok: true,
        value: executionResult
      };
    }

    function hasEffect(effectKey) {
      return registeredEffects.has(effectKey);
    }

    function removeEffect(effectKey) {
      return registeredEffects.delete(effectKey);
    }

    function listEffectKeys() {
      return Array.from(registeredEffects.keys());
    }

    const registryApi = Object.freeze({
      registerEffect,
      checkEffect,
      executeEffect,
      hasEffect,
      removeEffect,
      listEffectKeys
    });

    return registryApi;
  }

  global.CardEffectRegistry = Object.freeze({
    version: VERSION,
    createRegistry
  });
})(typeof window !== "undefined" ? window : globalThis);
