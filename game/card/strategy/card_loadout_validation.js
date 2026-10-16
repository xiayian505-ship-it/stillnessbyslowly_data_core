// 檔案位置：game/card/strategy/card_loadout_validation.js
// 慢慢軍火庫｜Game / Card / Strategy｜CardLoadoutValidation 1.1.0
//
// 責任：
//   - 依收藏中的「實體卡 ID」還原一份選用卡牌清單。
//   - 找出遺失、重複、不符合宿主資格、超出宿主數量上限的情況。
//   - 從卡牌陣列取出實體卡 ID，方便宿主自行保存。
//
// 不負責：
//   - 收藏資料庫、選牌 UI、永久存檔、幾套牌組、牌組切換。
//   - 決定卡牌種類、等級、出戰上限與有效性條件。
//
// 選取狀態可使用軍火庫既有 TreeSelection；抽牌仍用既有 Deck。
(function (global) {
  "use strict";

  const VERSION = "1.1.0";

  function readDefaultInstanceId(card) {
    return card?.id;
  }

  function requireInstanceIdentifier(instanceIdentifier) {
    if (instanceIdentifier === undefined || instanceIdentifier === null || instanceIdentifier === "") {
      throw new Error("card instance ID is required");
    }

    return instanceIdentifier;
  }

  function getValidationCallbacks(options) {
    const getInstanceId = options.getInstanceId ?? readDefaultInstanceId;
    const isEligible = options.isEligible ?? function () {
      return true;
    };

    if (
      typeof getInstanceId !== "function" ||
      typeof isEligible !== "function"
    ) {
      throw new TypeError("getInstanceId and isEligible must be functions");
    }

    return { getInstanceId, isEligible };
  }

  /**
   * 檢查選用清單並找回對應的實體卡資料。
   *
   * ownedCards：目前持有的實體卡物件陣列。
   * selectedInstanceIds：宿主選好的實體卡 ID 順序。
   * options.maximumCards：宿主可指定最大選取數量（預設無上限）。
   * options.isEligible(card)：宿主可自行檢查卡牌資格。
   *
   * 即使 isValid = false 也會回傳能解析的 resolvedCards，供宿主顯示問題；
   * 宿主應先確認 isValid 才將 resolvedCards 用於遊戲。
   */
  function validateSelection(ownedCards, selectedInstanceIds, options = {}) {
    if (!Array.isArray(ownedCards) || !Array.isArray(selectedInstanceIds)) {
      throw new TypeError("ownedCards and selectedInstanceIds must be arrays");
    }

    const validationCallbacks = getValidationCallbacks(options);
    const maximumCards = options.maximumCards ?? Infinity;

    if (maximumCards !== Infinity && (!Number.isInteger(maximumCards) || maximumCards < 0)) {
      throw new RangeError("maximumCards must be nonnegative integer");
    }

    const ownedCardsById = new Map();

    // 建立收藏查找表；收藏本身若有重複實體 ID，直接報錯。
    for (const card of ownedCards) {
      const instanceIdentifier = requireInstanceIdentifier(validationCallbacks.getInstanceId(card));

      if (ownedCardsById.has(instanceIdentifier)) {
        throw new Error("duplicate owned card instance ID");
      }

      ownedCardsById.set(instanceIdentifier, card);
    }

    const resolvedCards = [];
    const missingInstanceIds = [];
    const duplicateInstanceIds = [];
    const ineligibleInstanceIds = [];
    const seenInstanceIds = new Set();

    for (const instanceIdentifier of selectedInstanceIds) {
      if (seenInstanceIds.has(instanceIdentifier)) {
        duplicateInstanceIds.push(instanceIdentifier);
        continue;
      }

      seenInstanceIds.add(instanceIdentifier);

      if (!ownedCardsById.has(instanceIdentifier)) {
        missingInstanceIds.push(instanceIdentifier);
        continue;
      }

      const card = ownedCardsById.get(instanceIdentifier);

      if (!validationCallbacks.isEligible(card)) {
        ineligibleInstanceIds.push(instanceIdentifier);
        continue;
      }

      resolvedCards.push(card);
    }

    const exceedsMaximum = selectedInstanceIds.length > maximumCards;
    const isValid = missingInstanceIds.length === 0 &&
      duplicateInstanceIds.length === 0 &&
      ineligibleInstanceIds.length === 0 &&
      !exceedsMaximum;

    return {
      isValid,
      resolvedCards,
      missingInstanceIds,
      duplicateInstanceIds,
      ineligibleInstanceIds,
      exceedsMaximum
    };
  }

  /**
   * 取得卡牌 ID 列表；不保存到 localStorage 或資料庫。
   * ID 如何序列化、儲存及取回，交給宿主決定。
   */
  function getInstanceIds(cardCollection, options = {}) {
    if (!Array.isArray(cardCollection)) {
      throw new TypeError("cards must be an array");
    }

    const getInstanceId = options.getInstanceId ?? readDefaultInstanceId;

    if (typeof getInstanceId !== "function") {
      throw new TypeError("getInstanceId must be a function");
    }

    return cardCollection.map(function (card) {
      return requireInstanceIdentifier(getInstanceId(card));
    });
  }

  global.CardLoadoutValidation = Object.freeze({
    version: VERSION,
    validateSelection,
    getInstanceIds
  });
})(typeof window !== "undefined" ? window : globalThis);
