/* 慢慢軍火庫｜Rejected Asset Routing 1.0.0
 * 只製作保留／放棄／替換的歸屬計畫，不修改玩家或接收者的永久資料。
 */
(function (global) {
  "use strict";
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function requireId(id) {
    if (typeof id !== "string" || !id.trim()) throw new TypeError("Item ID must be nonempty string");
    return id;
  }
  function getId(item, options = {}) {
    const reader = options.getItemId ?? (entry => entry?.id);
    if (typeof reader !== "function") throw new TypeError("getItemId must be a function");
    return requireId(reader(item));
  }
  function uniqueItems(items, options) {
    if (!Array.isArray(items)) throw new TypeError("items must be an array");
    const ids = new Set();
    for (const item of items) {
      const id = getId(item, options);
      if (ids.has(id)) throw new Error("Duplicate item ID: " + id);
      ids.add(id);
    }
    return ids;
  }
  function requireDestination(destination) {
    if (typeof destination !== "string" || !destination.trim()) throw new TypeError("destination must be nonempty string");
    return destination;
  }
  function plan(kept, incoming, transferred, removedIds, destination) {
    return { kept: copy(kept), incoming: copy(incoming), transferred: copy(transferred),
      removedIds: [...removedIds], destination, errors: [] };
  }
  function splitBySelection(items, selectedIds, options = {}) {
    const allIds = uniqueItems(items, options);
    if (!Array.isArray(selectedIds)) throw new TypeError("selectedIds must be an array");
    const selected = new Set();
    for (const rawId of selectedIds) {
      const id = requireId(rawId);
      if (selected.has(id)) throw new Error("Duplicate selected ID");
      if (!allIds.has(id)) throw new RangeError("Selected item not found: " + id);
      selected.add(id);
    }
    const kept = items.filter(item => selected.has(getId(item, options)));
    const transferred = items.filter(item => !selected.has(getId(item, options)));
    const destination = transferred.length ? requireDestination(options.destination) : options.destination ?? null;
    return plan(kept, [], transferred, transferred.map(item => getId(item, options)), destination);
  }
  function planRejection(item, destination, options = {}) {
    getId(item, options);
    return plan([], [], [item], [], requireDestination(destination));
  }
  function planReplacement(newItem, oldItemId, destination, options = {}) {
    const incomingId = getId(newItem, options);
    requireId(oldItemId);
    const ownedItems = options.ownedItems;
    const ownedIds = uniqueItems(ownedItems, options);
    if (!ownedIds.has(oldItemId)) throw new RangeError("Replacement target is not owned");
    if (ownedIds.has(incomingId)) throw new Error("Incoming item is already owned");
    const oldItem = ownedItems.find(item => getId(item, options) === oldItemId);
    return plan([], [newItem], [oldItem], [oldItemId], requireDestination(destination));
  }
  function validatePlan(candidate, context = {}) {
    const errors = [];
    if (!candidate || typeof candidate !== "object") return { isValid: false, errors: ["Invalid plan"] };
    const kept = candidate.kept;
    const incoming = candidate.incoming;
    const transferred = candidate.transferred;
    const removedIds = candidate.removedIds;
    try {
      if (!Array.isArray(kept) || !Array.isArray(incoming) || !Array.isArray(transferred) ||
          !Array.isArray(removedIds)) throw new TypeError("Missing plan lists");
      const allIds = new Set();
      for (const item of [...kept, ...incoming, ...transferred]) {
        const id = getId(item, context);
        if (allIds.has(id)) errors.push("Duplicate routed item: " + id);
        allIds.add(id);
      }
      if (new Set(removedIds).size !== removedIds.length) errors.push("Duplicate removed ID");
      for (const id of removedIds) {
        requireId(id);
        if (!transferred.some(item => getId(item, context) === id)) errors.push("Removed item not transferred: " + id);
      }
      if (transferred.length && (typeof candidate.destination !== "string" || !candidate.destination.trim())) {
        errors.push("Missing transfer destination");
      }
      if (context.availableIds !== undefined) {
        const source = new Set(context.availableIds);
        for (const id of removedIds) if (!source.has(id)) errors.push("Source does not own removed item: " + id);
      }
    } catch (error) { errors.push(error.message); }
    return { isValid: errors.length === 0, errors };
  }
  global.RejectedAssetRouting = Object.freeze({ splitBySelection, planRejection,
    planReplacement, validatePlan, VERSION: "1.0.0" });
})(typeof window !== "undefined" ? window : globalThis);
