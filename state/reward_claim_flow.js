/* 慢慢軍火庫｜Reward Claim Flow 1.0.0
 * 來源概念：《霧林之契》pendingReward 的 queue/cursor。
 * 二階段：提出決定 → 宿主完成資產操作 → commit。核心不更動任何收藏。
 */
(function (global) {
  "use strict";
  let localSequence = 0;
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function requireItems(input) {
    if (!Array.isArray(input)) throw new TypeError("items must be an array");
    const items = copy(input);
    const ids = new Set();
    for (const item of items) {
      if (!item || typeof item.id !== "string" || !item.id) throw new TypeError("Every item needs a string id");
      if (ids.has(item.id)) throw new Error("Duplicate reward item ID: " + item.id);
      ids.add(item.id);
    }
    return items;
  }
  function newFlowId() {
    localSequence += 1;
    return "session_" + Date.now() + "_" + localSequence;
  }
  function create() {
    let state = { flowId: null, items: [], cursor: 0, decisions: [], pending: null, status: "idle" };
    function snapshot() { return copy(state); }
    function isComplete() { return state.status === "complete"; }
    function start(input, metadata = {}) {
      if (state.status === "pending") throw new Error("Cannot replace unfinished flow");
      if (metadata.flowId !== undefined && (typeof metadata.flowId !== "string" || !metadata.flowId)) {
        throw new TypeError("Invalid flowId");
      }
      const items = requireItems(input);
      state = { flowId: metadata.flowId ?? newFlowId(), items, cursor: 0,
        decisions: [], pending: null, status: items.length ? "pending" : "complete" };
      return snapshot();
    }
    function current() {
      return state.status === "pending" ? copy(state.items[state.cursor]) : null;
    }
    function submit(type, details = {}) {
      if (state.status !== "pending") throw new Error("No active reward flow");
      if (state.pending) throw new Error("Decision already pending host confirmation");
      if (type === "replace" && (typeof details.targetId !== "string" || !details.targetId)) {
        throw new TypeError("Replacement targetId is required");
      }
      if (type === "reject" && details.reason !== undefined && typeof details.reason !== "string") {
        throw new TypeError("reason must be a string");
      }
      // 相同流程與游標的決策 ID 固定；宿主可用它做重試去重。
      state.pending = { decisionId: state.flowId + ":" + state.cursor,
        itemId: state.items[state.cursor].id, type, details: copy(details) };
      return copy(state.pending);
    }
    function accept(details = {}) { return submit("accept", details); }
    function reject(reason = "") { return submit("reject", { reason }); }
    function replace(targetId) { return submit("replace", { targetId }); }
    function commit(decisionId) {
      if (!state.pending || state.pending.decisionId !== decisionId) {
        return { committed: false, completed: isComplete() };
      }
      state.decisions.push(copy(state.pending));
      state.pending = null;
      state.cursor += 1;
      if (state.cursor === state.items.length) state.status = "complete";
      return { committed: true, completed: isComplete(), state: snapshot() };
    }
    function cancel(decisionId) {
      if (!state.pending || state.pending.decisionId !== decisionId) return false;
      state.pending = null;
      return true;
    }
    function restore(input) {
      if (!input || !["idle", "pending", "complete"].includes(input.status) ||
          !Number.isInteger(input.cursor)) throw new TypeError("Invalid flow snapshot");
      const items = requireItems(input.items);
      if (!Array.isArray(input.decisions) || input.cursor < 0 || input.cursor > items.length ||
          input.decisions.length !== input.cursor ||
          (input.status === "complete" && input.cursor !== items.length) ||
          (input.status === "pending" && input.cursor >= items.length) ||
          (input.status === "idle" && (items.length || input.cursor)) ||
          (input.status !== "idle" && (typeof input.flowId !== "string" || !input.flowId))) {
        throw new TypeError("Inconsistent flow snapshot");
      }
      const decisions = copy(input.decisions);
      for (const [index, decision] of decisions.entries()) {
        if (!decision || decision.itemId !== items[index].id ||
            decision.decisionId !== input.flowId + ":" + index ||
            !["accept", "reject", "replace"].includes(decision.type)) {
          throw new TypeError("Invalid committed decision");
        }
      }
      const pending = input.pending === null || input.pending === undefined ? null : copy(input.pending);
      if (pending && (input.status !== "pending" || pending.itemId !== items[input.cursor].id ||
          pending.decisionId !== input.flowId + ":" + input.cursor ||
          !["accept", "reject", "replace"].includes(pending.type))) {
        throw new TypeError("Invalid pending decision");
      }
      const next = { flowId: input.flowId ?? null, items, cursor: input.cursor,
        decisions, pending, status: input.status };
      state = next;
      return snapshot();
    }
    return Object.freeze({ start, current, accept, reject, replace, commit, cancel,
      isComplete, snapshot, restore });
  }
  global.SlowlyRewardClaimFlow = Object.freeze({ create, VERSION: "1.0.0" });
})(typeof window !== "undefined" ? window : globalThis);
