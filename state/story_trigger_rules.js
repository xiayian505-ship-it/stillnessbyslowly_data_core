/* 慢慢軍火庫｜Story Trigger Rules 1.0.0
 * 僅負責判斷資格與回傳候選，無導航、無存檔、無播放。
 * 採宿主 callback 條件，不內建條件語法或腳本引擎。
 */
(function (global) {
  "use strict";
  function create(inputRules) {
    if (!Array.isArray(inputRules)) throw new TypeError("rules must be an array");
    const seenIds = new Set();
    const rules = inputRules.map(function (rule, index) {
      if (!rule || typeof rule.id !== "string" || !rule.id ||
          typeof rule.targetId !== "string" || !rule.targetId ||
          (rule.event !== undefined && (typeof rule.event !== "string" || !rule.event)) ||
          (rule.unlockWhen !== undefined && typeof rule.unlockWhen !== "function") ||
          (rule.triggerWhen !== undefined && typeof rule.triggerWhen !== "function") ||
          (rule.priority !== undefined && !Number.isFinite(rule.priority))) {
        throw new TypeError("Invalid rule at index " + index);
      }
      if (seenIds.has(rule.id)) throw new Error("Duplicate rule id: " + rule.id);
      seenIds.add(rule.id);
      return { ...rule, priority: rule.priority ?? 0, order: index };
    });
    function requireContext(context) {
      if (!context || typeof context !== "object" || Array.isArray(context)) {
        throw new TypeError("context must be an object");
      }
    }
    function unlocked(rule, context) {
      return rule.unlockWhen === undefined || rule.unlockWhen(context) === true;
    }
    function isUnlocked(targetId, context) {
      requireContext(context);
      return rules.some(rule => rule.targetId === targetId && unlocked(rule, context));
    }
    function evaluate(eventName, context) {
      if (typeof eventName !== "string" || !eventName) throw new TypeError("eventName is required");
      requireContext(context);
      return rules.filter(rule => rule.event === eventName && unlocked(rule, context) &&
        (rule.triggerWhen === undefined || rule.triggerWhen(context) === true))
        .sort((first, second) => second.priority - first.priority || first.order - second.order)
        .map(rule => ({ id: rule.id, targetId: rule.targetId, event: rule.event, priority: rule.priority }));
    }
    function shouldTrigger(eventName, context) { return evaluate(eventName, context).length > 0; }
    function getRules() {
      return rules.map(rule => ({ id: rule.id, targetId: rule.targetId,
        event: rule.event, priority: rule.priority }));
    }
    return Object.freeze({ isUnlocked, shouldTrigger, evaluate, getRules });
  }
  global.SlowlyStoryTriggerRules = Object.freeze({ create, VERSION: "1.0.0" });
})(typeof window !== "undefined" ? window : globalThis);
