// 檔案位置：game/card/strategy/card_target_selection.js
// 慢慢軍火庫｜Game / Card / Strategy｜CardTargetSelection 1.1.0
//
// 責任：
//   - 將宿主提供的多個卡牌區域整理為候選目標。
//   - 以宿主提供的條件篩選與查找候選目標。
//   - 在宿主明確呼叫時，從候選名單隨機選取一個。
//
// 不負責：分辨敵我、決定合法對象、射程、出牌費用、
//         隨機目標政策、畫面點選或對目標執行任何效果。
(function (global) {
  "use strict";

  const VERSION = "1.1.0";

  /**
   * cardZones: [
   *   { owner: 'player-1', zone: 'hand', cards: [...] },
   *   { owner: 'player-2', zone: 'discardPile', cards: [...] }
   * ]
   *
   * isEligibleCandidate(targetCandidate) 由宿主提供。
   * 回傳新的候選陣列，不修改來源陣列。
   */
  function collectCandidates(cardZones, isEligibleCandidate = () => true) {
    if (!Array.isArray(cardZones)) {
      throw new TypeError("cardZones must be an array");
    }

    if (typeof isEligibleCandidate !== "function") {
      throw new TypeError("isEligibleCandidate must be a function");
    }

    const eligibleCandidates = [];

    for (const cardZone of cardZones) {
      if (!cardZone || !Array.isArray(cardZone.cards)) {
        throw new TypeError("each cardZone must contain cards array");
      }

      for (let cardIndex = 0; cardIndex < cardZone.cards.length; cardIndex += 1) {
        const targetCandidate = {
          owner: cardZone.owner,
          zone: cardZone.zone,
          cardIndex,
          card: cardZone.cards[cardIndex]
        };

        if (isEligibleCandidate(targetCandidate)) {
          eligibleCandidates.push(targetCandidate);
        }
      }
    }

    return eligibleCandidates;
  }

  /**
   * 以索引或宿主條件尋找候選項，找不到回傳 null。
   * 注意：索引指的是「候選名單」索引，不是原始牌區索引。
   */
  function findCandidate(eligibleCandidates, candidateSelector) {
    if (!Array.isArray(eligibleCandidates)) {
      throw new TypeError("eligibleCandidates must be an array");
    }

    if (typeof candidateSelector === "function") {
      return eligibleCandidates.find(candidateSelector) ?? null;
    }

    if (Number.isInteger(candidateSelector)) {
      return eligibleCandidates[candidateSelector] ?? null;
    }

    return null;
  }

  /**
   * 從候選名單隨機挑一個，不修改名單。
   * randomNumberGenerator 預設 Math.random；測試時可以注入固定亂數。
   */
  function pickRandomCandidate(eligibleCandidates, randomNumberGenerator = Math.random) {
    if (!Array.isArray(eligibleCandidates)) {
      throw new TypeError("eligibleCandidates must be an array");
    }

    if (typeof randomNumberGenerator !== "function") {
      throw new TypeError("randomNumberGenerator must be a function");
    }

    if (eligibleCandidates.length === 0) {
      return null;
    }

    const randomValue = randomNumberGenerator();

    if (
      typeof randomValue !== "number" ||
      !Number.isFinite(randomValue) ||
      randomValue < 0 ||
      randomValue >= 1
    ) {
      throw new RangeError("randomNumberGenerator must return [0, 1)");
    }

    const cardIndex = Math.floor(randomValue * eligibleCandidates.length);
    return eligibleCandidates[cardIndex];
  }

  global.CardTargetSelection = Object.freeze({
    version: VERSION,
    collectCandidates,
    findCandidate,
    pickRandomCandidate
  });
})(typeof window !== "undefined" ? window : globalThis);
