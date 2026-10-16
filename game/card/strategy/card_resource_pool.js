// 檔案位置：game/card/strategy/card_resource_pool.js
// 慢慢軍火庫｜Game / Card / Strategy｜CardResourcePool 1.1.0
//
// 責任：管理多種「由宿主命名」的非負數值資源。
//   - 讀取、設定、增加、清空單項資源。
//   - 同時檢查並扣除多項資源；不足時不扣任何一項。
//   - 提供快照及還原。
//
// 不負責：行動點、魔法點的固定名稱、卡牌費用、上限、
//         回合補充時機、畫面顯示或永久保存。
(function (global) {
  "use strict";

  const VERSION = "1.1.0";

  function requireResourceName(resourceName) {
    if (typeof resourceName !== "string" || resourceName.length === 0) {
      throw new TypeError("resource resourceName must be a nonempty string");
    }

    return resourceName;
  }

  function requireResourceAmount(resourceAmount) {
    if (
      typeof resourceAmount !== "number" ||
      !Number.isFinite(resourceAmount) ||
      resourceAmount < 0
    ) {
      throw new RangeError(
        "resource amount must be a finite non-negative number"
      );
    }

    return resourceAmount;
  }

  /**
   * 接受資源物件，例如 { mana: 3, action: 2 }。
   * 轉成 Map 可使用的鍵值列表，並先驗證所有數值。
   */
  function getValidatedResourceEntries(replacementAmounts) {
    if (
      replacementAmounts === null ||
      typeof replacementAmounts !== "object" ||
      Array.isArray(replacementAmounts)
    ) {
      throw new TypeError("resourceAmounts must be an object");
    }

    const resourceEntries = Object.entries(replacementAmounts);

    return resourceEntries.map(function (resourceEntry) {
      const resourceName = requireResourceName(resourceEntry[0]);
      const resourceAmount = requireResourceAmount(resourceEntry[1]);

      return [resourceName, resourceAmount];
    });
  }

  function createPool(initialAmounts = {}) {
    let resourceAmounts = new Map(getValidatedResourceEntries(initialAmounts));

    /** 未設定的資源視為 0，但不會自行新增紀錄。 */
    function getAmount(resourceName) {
      requireResourceName(resourceName);
      return resourceAmounts.get(resourceName) ?? 0;
    }

    /** 設定絕對數量；是否超過遊戲上限，由宿主自行判定。 */
    function setAmount(resourceName, resourceAmount) {
      requireResourceName(resourceName);
      requireResourceAmount(resourceAmount);

      resourceAmounts.set(resourceName, resourceAmount);
      return resourceAmount;
    }

    /** 增加非負數資源。需要扣除時請使用 spend()。 */
    function addAmount(resourceName, resourceAmount) {
      const previousAmount = getAmount(resourceName);
      const additionalAmount = requireResourceAmount(resourceAmount);
      const updatedAmount = previousAmount + additionalAmount;

      // 避免浮點運算溢出後，在資源表中留下 Infinity。
      requireResourceAmount(updatedAmount);
      return setAmount(resourceName, updatedAmount);
    }

    /** 只檢查，不扣除。 */
    function canAfford(requiredAmounts) {
      const resourceEntries = getValidatedResourceEntries(requiredAmounts);

      return resourceEntries.every(function (resourceEntry) {
        const resourceName = resourceEntry[0];
        const resourceAmount = resourceEntry[1];

        return getAmount(resourceName) >= resourceAmount;
      });
    }

    /**
     * 整筆扣費。
     * 若有任何一項不足，回傳 false，所有資源保持不變。
     * 費用內容不由此零件決定。
     */
    function spend(requiredAmounts) {
      const resourceEntries = getValidatedResourceEntries(requiredAmounts);

      for (const [resourceName, resourceAmount] of resourceEntries) {
        if (getAmount(resourceName) < resourceAmount) {
          return false;
        }
      }

      for (const [resourceName, resourceAmount] of resourceEntries) {
        resourceAmounts.set(resourceName, getAmount(resourceName) - resourceAmount);
      }

      return true;
    }

    /** 將單一資源歸零，回傳歸零前的數量。 */
    function clearAmount(resourceName) {
      const previousAmount = getAmount(resourceName);
      resourceAmounts.set(resourceName, 0);
      return previousAmount;
    }

    /** 回傳新物件，改動快照不會影響目前的資源值。 */
    function getSnapshot() {
      return Object.fromEntries(resourceAmounts);
    }

    /** 全數取代目前的資源資料；驗證失敗不修改原狀態。 */
    function restoreSnapshot(replacementAmounts) {
      const nextResources = new Map(getValidatedResourceEntries(replacementAmounts));
      resourceAmounts = nextResources;

      return getSnapshot();
    }

    return Object.freeze({
      getAmount,
      setAmount,
      addAmount,
      canAfford,
      spend,
      clearAmount,
      getSnapshot,
      restoreSnapshot
    });
  }

  global.CardResourcePool = Object.freeze({
    version: VERSION,
    createPool
  });
})(typeof window !== "undefined" ? window : globalThis);
