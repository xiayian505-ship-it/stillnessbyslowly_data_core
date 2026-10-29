/* 慢慢軍火庫｜Reward Pool Policy 1.0.0
 * 由分類 → 子群 → 候選項目分層加權抽選；每次獨立放回，不生成或發放實體獎勵。
 * 來源概念：《霧林之契》先抽類別、特殊牌再抽子群的獎勵機率。
 */
(function (global) {
  "use strict";
  function jsonCopy(value) { return JSON.parse(JSON.stringify(value)); }
  function nonempty(value) { return typeof value === "string" && value.trim() !== ""; }

  function create(policy, options = {}) {
    if (!policy || !Array.isArray(policy.groups) || policy.groups.length === 0) {
      throw new TypeError("policy.groups must be a nonempty array");
    }
    const random = options.random || Math.random;
    const maxBatch = options.maxBatch === undefined ? 10000 : options.maxBatch;
    if (typeof random !== "function") throw new TypeError("random must be a function");
    if (!Number.isInteger(maxBatch) || maxBatch < 0) throw new RangeError("Invalid maxBatch");
    const storedPolicy = jsonCopy(policy);

    function validateItems(items) {
      if (!Array.isArray(items) || items.length === 0) throw new TypeError("Leaf items must be nonempty");
      for (const item of items) {
        if (item === null || typeof item === "boolean" ||
            (typeof item !== "string" && typeof item !== "number" &&
              (typeof item !== "object" || Array.isArray(item))) ||
            (typeof item === "string" && !nonempty(item)) ||
            (typeof item === "number" && !Number.isFinite(item))) {
          throw new TypeError("Invalid reward item");
        }
      }
    }
    function validateGroupArray(groups, depth) {
      if (!Array.isArray(groups) || groups.length === 0) throw new TypeError("Empty reward group array");
      let totalWeight = 0;
      const usedIds = new Set();
      for (const group of groups) {
        if (!group || typeof group !== "object" || Array.isArray(group) || !nonempty(group.id)) {
          throw new TypeError("Invalid reward group");
        }
        if (usedIds.has(group.id)) throw new Error("Duplicate group ID: " + group.id);
        usedIds.add(group.id);
        const weight = group.weight === undefined ? 1 : group.weight;
        if (typeof weight !== "number" || !Number.isFinite(weight) || weight < 0) {
          throw new RangeError("Invalid reward weight: " + group.id);
        }
        totalWeight += weight;
        if (group.items !== undefined && group.groups !== undefined) {
          throw new TypeError("Reward group must have items OR subgroups");
        }
        if (group.items !== undefined) validateItems(group.items);
        else if (group.groups !== undefined && depth === 0) validateGroupArray(group.groups, 1);
        else throw new TypeError("Invalid nesting or missing reward items");
      }
      if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
        throw new RangeError("Group weights must have positive finite total");
      }
    }
    validateGroupArray(storedPolicy.groups, 0);

    function unitRandom() {
      const value = random();
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value >= 1) {
        throw new RangeError("random() must return a number in [0, 1)");
      }
      return value;
    }
    function chooseWeighted(groups) {
      const total = groups.reduce((sum, group) => sum + (group.weight === undefined ? 1 : group.weight), 0);
      const position = unitRandom() * total;
      let cursor = 0;
      let finalPositive = null;
      for (const group of groups) {
        const weight = group.weight === undefined ? 1 : group.weight;
        if (weight <= 0) continue;
        cursor += weight;
        finalPositive = group;
        if (position < cursor) return group;
      }
      return finalPositive; // 浮點誤差時落在最後一個正權重項目。
    }
    function pick() {
      const selectedGroup = chooseWeighted(storedPolicy.groups);
      const leaf = selectedGroup.groups ? chooseWeighted(selectedGroup.groups) : selectedGroup;
      const index = Math.floor(unitRandom() * leaf.items.length);
      return jsonCopy(leaf.items[index]);
    }
    function pickMany(count) {
      if (!Number.isInteger(count) || count < 0 || count > maxBatch) {
        throw new RangeError("Invalid reward count");
      }
      return Array.from({ length: count }, () => pick());
    }
    function getPolicy() { return jsonCopy(storedPolicy); }
    function validate() { return { valid: true, groups: storedPolicy.groups.length }; }
    return Object.freeze({ pick, pickMany, getPolicy, validate });
  }
  global.SlowlyRewardPoolPolicy = Object.freeze({ create, VERSION: "1.0.0" });
})(typeof window !== "undefined" ? window : globalThis);
