// 檔案位置：game/card/strategy/card_level_progression.js
// 慢慢軍火庫｜Game / Card / Strategy｜CardLevelProgression 1.1.0
//
// 責任：
//   - 計算基礎等級加上暫時增減後的有效等級。
//   - 按宿主給定的資格及上限，批次提升卡牌等級。
//
// 不負責：
//   - 決定升級代價、獎勵來源、卡牌能力數值或遊戲等級曲線。
//   - 寫死最高 Lv.5、任何卡牌類型、畫面或儲存方式。
//
// 預設升級會修改卡牌的 level 欄位；宿主可傳入 getCardLevel / setCardLevel。
(function (global) {
  "use strict";

  const VERSION = "1.1.0";

  function requireNonNegativeWholeNumber(value, name) {
    if (!Number.isInteger(value) || value < 0) {
      throw new RangeError(name + " must be a non-negative integer");
    }

    return value;
  }

  function requireMaximumLevel(value) {
    if (value !== Infinity) {
      requireNonNegativeWholeNumber(value, "maximumLevel");
    }

    return value;
  }

  /**
   * 基礎等級加上整數 temporaryBonus，並限制於 [0, maximumLevel]。
   * maximumLevel 沒有指定時不設上限。
   * 不會改動卡牌資料。
   */
  function calculateEffectiveLevel(baseLevel, temporaryBonus = 0, options = {}) {
    requireNonNegativeWholeNumber(baseLevel, "baseLevel");

    if (!Number.isInteger(temporaryBonus)) {
      throw new TypeError("temporaryBonus must be an integer");
    }

    const maximumLevel = requireMaximumLevel(options.maximumLevel ?? Infinity);
    const combinedLevel = baseLevel + temporaryBonus;

    if (combinedLevel < 0) {
      return 0;
    }

    return Math.min(combinedLevel, maximumLevel);
  }

  /**
   * 批次升級。
   *
   * options:
   *   levelIncrease: 每張卡增加幾級，預設 1。
   *   maximumLevel: 最高等級，預設不限。
   *   canUpgradeCard(card): 由宿主決定能否升級。
   *   getCardLevel(card): 讀取等級，預設 card.level ?? 0。
   *   setCardLevel(card, nextLevel): 寫入等級，預設 card.level = nextLevel。
   *
   * 回傳 [{ card, previousLevel, nextLevel }, ...]，只有實際提升的卡牌。
   *
   * 注意：升級前會先檢查全部符合資格的卡牌等級；
   *       但宿主自訂 setter 若在寫入途中拋錯，無法保證回滾。
   */
  function upgradeEligibleCards(cards, options = {}) {
    if (!Array.isArray(cards)) {
      throw new TypeError("cards must be an array");
    }

    const levelIncrease = requireNonNegativeWholeNumber(
      options.levelIncrease ?? 1,
      "levelIncrease"
    );

    const maximumLevel = requireMaximumLevel(options.maximumLevel ?? Infinity);

    const getCardLevel = options.getCardLevel ?? function (card) {
      return card.level ?? 0;
    };

    const setCardLevel = options.setCardLevel ?? function (card, updatedLevel) {
      card.level = updatedLevel;
    };

    const canUpgradeCard = options.canUpgradeCard ?? function () {
      return true;
    };

    if (
      typeof getCardLevel !== "function" ||
      typeof setCardLevel !== "function" ||
      typeof canUpgradeCard !== "function"
    ) {
      throw new TypeError("level callbacks must be functions");
    }

    // 第一階段：計算與驗證，不立刻動到任何卡牌。
    const levelChanges = [];

    for (const card of cards) {
      if (!canUpgradeCard(card)) {
        continue;
      }

      const previousLevel = requireNonNegativeWholeNumber(
        getCardLevel(card),
        "card level"
      );

      const nextLevel = Math.min(maximumLevel, previousLevel + levelIncrease);

      if (nextLevel > previousLevel) {
        levelChanges.push({
          card,
          previousLevel,
          nextLevel
        });
      }
    }

    // 第二階段：完成檢查後，再套用預先算好的變更。
    for (const levelChange of levelChanges) {
      setCardLevel(levelChange.card, levelChange.nextLevel);
    }

    return levelChanges;
  }

  global.CardLevelProgression = Object.freeze({
    version: VERSION,
    calculateEffectiveLevel,
    upgradeEligibleCards
  });
})(typeof window !== "undefined" ? window : globalThis);
