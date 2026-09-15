// import_merge.js
// 慢慢的倉庫｜Data｜Import Merge 1.0.0
// 將匯入資料合併到現有資料，遇到識別鍵衝突時交由宿主產生新鍵。
// 不讀檔、不解析 JSON、不寫 Storage、不顯示 UI，也不決定資料 schema。
(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function cloneValue(value) {
    if (typeof global.structuredClone === "function") {
      return global.structuredClone(value);
    }

    return JSON.parse(JSON.stringify(value));
  }

  function keyToken(value) {
    return `${typeof value}:${String(value)}`;
  }

  function merge(existing, incoming, options = {}) {
    if (!Array.isArray(existing)) {
      throw new TypeError("ImportMerge.merge: existing 必須是陣列。");
    }

    if (!Array.isArray(incoming)) {
      throw new TypeError("ImportMerge.merge: incoming 必須是陣列。");
    }

    const key = String(options.key || "id");
    const getKey = typeof options.getKey === "function"
      ? options.getKey
      : item => item?.[key];
    const setKey = typeof options.setKey === "function"
      ? options.setKey
      : (item, value) => {
          item[key] = value;
          return item;
        };
    const createKey = typeof options.createKey === "function"
      ? options.createKey
      : null;
    const maxAttempts = Number.isInteger(options.maxAttempts) && options.maxAttempts > 0
      ? options.maxAttempts
      : 100;

    const records = existing.map(cloneValue);
    const usedKeys = new Set();

    for (const item of records) {
      const value = getKey(item);
      if (value !== undefined && value !== null && value !== "") {
        usedKeys.add(keyToken(value));
      }
    }

    const added = [];
    const collisions = [];

    incoming.forEach((rawItem, index) => {
      let item = cloneValue(rawItem);
      const oldKey = getKey(item);
      const oldToken = oldKey === undefined || oldKey === null || oldKey === ""
        ? null
        : keyToken(oldKey);
      const hasCollision = oldToken !== null && usedKeys.has(oldToken);
      const isMissing = oldToken === null;

      if (hasCollision || isMissing) {
        if (!createKey) {
          const reason = hasCollision ? "識別鍵衝突" : "缺少識別鍵";
          throw new Error(
            `ImportMerge.merge: 第 ${index + 1} 筆匯入資料${reason}，但未提供 createKey。`
          );
        }

        let newKey;
        let unique = false;

        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
          newKey = createKey({
            item: cloneValue(item),
            index,
            oldKey,
            attempt,
            usedKeys: new Set(usedKeys)
          });

          if (newKey === undefined || newKey === null || newKey === "") {
            continue;
          }

          if (!usedKeys.has(keyToken(newKey))) {
            unique = true;
            break;
          }
        }

        if (!unique) {
          throw new Error(
            `ImportMerge.merge: 第 ${index + 1} 筆資料在 ${maxAttempts} 次內無法取得唯一識別鍵。`
          );
        }

        item = setKey(item, newKey) || item;
        collisions.push(Object.freeze({
          index,
          reason: hasCollision ? "collision" : "missing",
          oldKey,
          newKey
        }));
      }

      const finalKey = getKey(item);
      if (finalKey !== undefined && finalKey !== null && finalKey !== "") {
        usedKeys.add(keyToken(finalKey));
      }

      records.push(item);
      added.push(cloneValue(item));
    });

    return Object.freeze({
      records: Object.freeze(records),
      added: Object.freeze(added),
      addedCount: added.length,
      rekeyedCount: collisions.length,
      collisions: Object.freeze(collisions)
    });
  }

  global.ImportMerge = Object.freeze({
    version: VERSION,
    merge
  });

})(typeof window !== "undefined" ? window : globalThis);
