// 檔案位置：game/card/strategy/card_turn_order.js
// 慢慢軍火庫｜Game / Card / Strategy｜CardTurnOrder 1.1.0
//
// 責任：保存多個參與者的輪替順序、回合數及階段標籤。
//
// 不負責：
//   - 設定「一回合可以出幾張牌」、免費動作次數。
//   - 抽牌、扣費、AI 行動、狀態過期、勝敗判斷或 UI。
//   - 決定使用的是「玩家／Boss」還是多人模式。
//
// 回合數計法：從最後一位參與者走回第一位時加 1。
// 宿主可以只使用輪替功能，不必將此數值視為遊戲的回合規則。
(function (global) {
  "use strict";

  const VERSION = "1.1.0";

  function validateParticipantIdentifiers(participantIds) {
    if (!Array.isArray(participantIds) || participantIds.length === 0) {
      throw new TypeError("participantIds must be a nonempty array");
    }

    if (new Set(participantIds).size !== participantIds.length) {
      throw new TypeError("participantIds must contain unique IDs");
    }

    for (const participantId of participantIds) {
      if (participantId === undefined || participantId === null || participantId === "") {
        throw new TypeError("participant ID cannot be empty");
      }
    }

    return participantIds.slice();
  }

  function createTurnOrder(participantIds, options = {}) {
    const participantOrder = validateParticipantIdentifiers(participantIds);
    const startingRound = options.startRound ?? 1;
    const startingPhase = options.currentPhase ?? null;

    if (!Number.isInteger(startingRound) || startingRound < 1) {
      throw new RangeError("startRound must be an integer >= 1");
    }

    let currentParticipantIndex = 0;
    let currentRound = startingRound;
    let currentPhase = startingPhase;

    /** 快照回傳新物件；participantIds 使用獨立的新陣列。 */
    function getSnapshot() {
      return {
        participantIds: participantOrder.slice(),
        currentParticipantIndex,
        currentRound,
        currentPhase
      };
    }

    function getCurrentParticipant() {
      return participantOrder[currentParticipantIndex];
    }

    function getNextParticipant() {
      const nextParticipantIndex = (currentParticipantIndex + 1) % participantOrder.length;
      return participantOrder[nextParticipantIndex];
    }

    /** 推進到下一位參與者；是否允許推進由宿主決定。 */
    function advanceTurn() {
      currentParticipantIndex += 1;

      if (currentParticipantIndex >= participantOrder.length) {
        currentParticipantIndex = 0;
        currentRound += 1;
      }

      return getSnapshot();
    }

    /** 跳至指定參與者，不自動增加回合數。 */
    function setCurrentParticipant(participantId) {
      const participantIndex = participantOrder.indexOf(participantId);

      if (participantIndex < 0) {
        return false;
      }

      currentParticipantIndex = participantIndex;
      return true;
    }

    /** 階段可以是宿主自訂的任意值，零件只負責保存。 */
    function setCurrentPhase(phaseLabel) {
      currentPhase = phaseLabel;
      return currentPhase;
    }

    /**
     * 還原狀態時必須維持相同參與者順序。
     * 全部檢查通過後才改內部狀態。
     */
    function restoreSnapshot(savedState) {
      if (!savedState || !Array.isArray(savedState.participantIds)) {
        throw new TypeError("invalid CardTurnOrder snapshot");
      }

      const sameParticipantOrder = savedState.participantIds.length === participantOrder.length &&
        savedState.participantIds.every(function (participantId, participantPosition) {
          return participantId === participantOrder[participantPosition];
        });

      const validParticipantIndex = Number.isInteger(savedState.currentParticipantIndex) &&
        savedState.currentParticipantIndex >= 0 &&
        savedState.currentParticipantIndex < participantOrder.length;

      const validRoundNumber = Number.isInteger(savedState.currentRound) &&
        savedState.currentRound >= 1;

      if (!sameParticipantOrder || !validParticipantIndex || !validRoundNumber) {
        throw new TypeError("invalid CardTurnOrder snapshot");
      }

      currentParticipantIndex = savedState.currentParticipantIndex;
      currentRound = savedState.currentRound;
      currentPhase = savedState.currentPhase ?? null;

      return getSnapshot();
    }

    function resetTurnOrder() {
      currentParticipantIndex = 0;
      currentRound = startingRound;
      currentPhase = startingPhase;

      return getSnapshot();
    }

    return Object.freeze({
      getCurrentParticipant,
      getNextParticipant,
      advanceTurn,
      setCurrentParticipant,
      setCurrentPhase,
      getSnapshot,
      restoreSnapshot,
      resetTurnOrder
    });
  }

  global.CardTurnOrder = Object.freeze({
    version: VERSION,
    createTurnOrder
  });
})(typeof window !== "undefined" ? window : globalThis);
