// 檔案位置：game/card/strategy/card_instance_identity.js
// 慢慢軍火庫｜Game / Card / Strategy｜CardInstanceIdentity 1.1.0
//
// 責任：
//   1. 辨識「卡種 ID」與「實體卡 ID」。
//   2. 依 ID 查找卡牌、依卡種分組、檢查重複的實體 ID。
//   3. 將宿主提供的卡種資料與實體 ID 合成一張卡牌資料。
//
// 不負責：
//   - 自動產生 ID、決定卡牌名稱、卡牌能力、收藏上限。
//   - 管理牌庫、戰鬥流程、DOM 或資料儲存。
//
// 預設欄位：
//   實體卡 ID = card.id
//   卡種 ID   = card.cardId
//   宿主可以透過 getInstanceId / getCardId 改用自己的資料格式。
(function (global) {
  "use strict";

  const VERSION = "1.1.0";

  function isPlainRecord(value) {
    return value !== null &&
      typeof value === "object" &&
      !Array.isArray(value);
  }

  function requireCardCollection(cardCollection) {
    if (!Array.isArray(cardCollection)) {
      throw new TypeError("cardCollection must be an array");
    }
  }

  function requireInstanceIdentifier(id, label) {
    if (id === undefined || id === null || id === "") {
      throw new TypeError(label + " is required");
    }
    return id;
  }

  function readInstanceIdentifier(card, options) {
    if (options.getInstanceId !== undefined) {
      if (typeof options.getInstanceId !== "function") {
        throw new TypeError("getInstanceId must be a function");
      }
      return options.getInstanceId(card);
    }

    return card?.id;
  }

  function readCardTypeIdentifier(card, options) {
    if (options.getCardId !== undefined) {
      if (typeof options.getCardId !== "function") {
        throw new TypeError("getCardId must be a function");
      }
      return options.getCardId(card);
    }

    return card?.cardId;
  }

  /**
   * 建立實體卡資料。
   *
   * cardDefinition：宿主提供的卡種資料。
   * instanceIdentifier：由宿主建立且具唯一性的實體 ID。
   * instanceProperties：其他實體資料；不能用不同的 id 覆蓋 instanceIdentifier。
   *
   * 回傳新物件，不修改傳入的 cardDefinition / instanceProperties。
   */
  function createCardInstance(cardDefinition, instanceIdentifier, instanceProperties = {}) {
    if (!isPlainRecord(cardDefinition)) {
      throw new TypeError("cardDefinition must be an object");
    }

    requireInstanceIdentifier(instanceIdentifier, "instanceIdentifier");

    if (!isPlainRecord(instanceProperties)) {
      throw new TypeError("instanceProperties must be an object");
    }

    if (instanceProperties.id !== undefined && instanceProperties.id !== instanceIdentifier) {
      throw new Error("instanceProperties.id conflicts with instanceIdentifier");
    }

    return {
      ...cardDefinition,
      ...instanceProperties,
      id: instanceIdentifier
    };
  }

  /** 找出指定實體 ID 的第一張卡，找不到則回傳 null。 */
  function findByInstanceId(cardCollection, instanceIdentifier, options = {}) {
    requireCardCollection(cardCollection);

    for (const card of cardCollection) {
      if (readInstanceIdentifier(card, options) === instanceIdentifier) {
        return card;
      }
    }

    return null;
  }

  /** 依卡種 ID 分組，回傳 Map<cardId, card[]>。 */
  function groupByCardType(cardCollection, options = {}) {
    requireCardCollection(cardCollection);

    const cardsByType = new Map();

    for (const card of cardCollection) {
      const cardTypeId = requireInstanceIdentifier(
        readCardTypeIdentifier(card, options),
        "card type id"
      );

      if (!cardsByType.has(cardTypeId)) {
        cardsByType.set(cardTypeId, []);
      }

      cardsByType.get(cardTypeId).push(card);
    }

    return cardsByType;
  }

  /** 回傳重複出現的實體 ID，每種重複 ID 只列一次。 */
  function findDuplicateInstanceIds(cardCollection, options = {}) {
    requireCardCollection(cardCollection);

    const seenInstanceIdentifiers = new Set();
    const duplicateIdentifiers = new Set();

    for (const card of cardCollection) {
      const instanceIdentifier = requireInstanceIdentifier(
        readInstanceIdentifier(card, options),
        "instance id"
      );

      if (seenInstanceIdentifiers.has(instanceIdentifier)) {
        duplicateIdentifiers.add(instanceIdentifier);
      }

      seenInstanceIdentifiers.add(instanceIdentifier);
    }

    return Array.from(duplicateIdentifiers);
  }

  global.CardInstanceIdentity = Object.freeze({
    version: VERSION,
    createCardInstance,
    findByInstanceId,
    groupByCardType,
    findDuplicateInstanceIds
  });
})(typeof window !== "undefined" ? window : globalThis);
