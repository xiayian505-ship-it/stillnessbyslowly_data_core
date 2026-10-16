// 檔案位置：game/card/strategy/card_zone_transfer.js
// 慢慢軍火庫｜Game / Card / Strategy｜CardZoneTransfer 1.1.0
//
// 責任：利用軍火庫既有 Deck.snapshot() / Deck.restore() 介面，
//       讓卡牌能夠在不同區域或不同牌庫之間移動與交換。
//
// 提供：
//   moveCard()     - 移動指定一張卡牌。
//   moveZoneCards()  - 移動區域內全部卡牌。
//   swapCards() - 交換指定兩張卡牌。
//   swapZoneCards() - 交換兩個區域的全部卡牌。
//
// 不負責：
//   - 抽牌、洗牌、丟棄（請用既有 Deck）。
//   - 陣營、交換費用、回合限制、卡片 ID、UI 或永久收藏。
//
// 區域僅對應 Deck 1.1.0：drawPile、hand、discardPile。
// 注意：只移動目前區域，不修改 Deck 的 sourceItems；Deck.reset()
//       仍然回到該 Deck 自己的原始來源。不要在交易中並行操作相同 Deck。
(function (global) {
  "use strict";

  const VERSION = "1.1.0";
  const ALLOWED_ZONES = Object.freeze(["drawPile", "hand", "discardPile"]);

  function requireKnownZone(zone) {
    if (!ALLOWED_ZONES.includes(zone)) {
      throw new RangeError("unknown deck zone: " + zone);
    }

    return zone;
  }

  function requireDeckInterface(deckInstance) {
    if (
      !deckInstance ||
      typeof deckInstance.snapshot !== "function" ||
      typeof deckInstance.restore !== "function"
    ) {
      throw new TypeError("deckInstance must provide snapshot() and restore()");
    }

    return deckInstance;
  }

  /**
   * 選擇方式由宿主決定：
   *   - 整數：區域陣列的索引。
   *   - 函式：Array.findIndex 所使用的 predicate。
   * 不會自作主張把 cardSelector 解讀成 movedCard.id。
   */
  function findSelectedIndex(zoneCards, cardSelector) {
    if (Number.isInteger(cardSelector)) {
      const valid = cardSelector >= 0 && cardSelector < zoneCards.length;
      return valid ? cardSelector : -1;
    }

    if (typeof cardSelector === "function") {
      return zoneCards.findIndex(cardSelector);
    }

    throw new TypeError("cardSelection must be an array index or predicate");
  }

  function cloneDeckSnapshot(snapshot) {
    for (const zone of ALLOWED_ZONES) {
      if (!Array.isArray(snapshot[zone])) {
        throw new TypeError("deckInstance snapshot missing " + zone);
      }
    }

    return {
      ...snapshot,
      drawPile: snapshot.drawPile.slice(),
      hand: snapshot.hand.slice(),
      discardPile: snapshot.discardPile.slice()
    };
  }

  /**
   * 先把各 Deck 的狀態複製成草稿，所有操作都作用在草稿上。
   * 最後才由 commitChanges() 統一寫回。
   */
  function createTransferSession(deckInstances) {
    const participatingDecks = Array.from(new Set(deckInstances));
    const originalStates = new Map();
    const workingStates = new Map();

    for (const deckInstance of participatingDecks) {
      requireDeckInterface(deckInstance);

      const snapshot = deckInstance.snapshot();
      const workingState = cloneDeckSnapshot(snapshot);

      originalStates.set(deckInstance, snapshot);
      workingStates.set(deckInstance, workingState);
    }

    function getWorkingState(deckInstance) {
      return workingStates.get(deckInstance);
    }

    function commitChanges() {
      let restoreAttemptCount = 0;

      try {
        for (const deckInstance of participatingDecks) {
          restoreAttemptCount += 1;
          deckInstance.restore(workingStates.get(deckInstance));
        }
      } catch (error) {
        // 包含拋錯的 Deck；它可能已在拋錯前部分修改狀態。
        const attemptedDecks = participatingDecks.slice(0, restoreAttemptCount);
        const rollbackErrors = [];

        for (const deckInstance of attemptedDecks) {
          try {
            deckInstance.restore(originalStates.get(deckInstance));
          } catch (recoveryError) {
            rollbackErrors.push(recoveryError);
          }
        }

        if (rollbackErrors.length > 0) {
          throw new AggregateError(
            [error, ...rollbackErrors],
            "transfer failed; rollback also failed"
          );
        }

        throw error;
      }
    }

    return { getWorkingState, commitChanges };
  }

  /** 移動一張；找不到指定卡牌時回傳 not_found，不修改牌庫。 */
  function moveCard(options) {
    const { sourceDeck, sourceZone, destinationDeck, destinationZone, cardSelection } = options;

    requireDeckInterface(sourceDeck);
    requireDeckInterface(destinationDeck);
    requireKnownZone(sourceZone);
    requireKnownZone(destinationZone);

    if (sourceDeck === destinationDeck && sourceZone === destinationZone) {
      throw new Error("same source and destination zone");
    }

    const transferSession = createTransferSession([sourceDeck, destinationDeck]);
    const sourceZoneCards = transferSession.getWorkingState(sourceDeck)[sourceZone];
    const selectedIndex = findSelectedIndex(sourceZoneCards, cardSelection);

    if (selectedIndex < 0) {
      return { ok: false, reason: "not_found" };
    }

    const removedCards = sourceZoneCards.splice(selectedIndex, 1);
    const movedCard = removedCards[0];

    transferSession.getWorkingState(destinationDeck)[destinationZone].push(movedCard);
    transferSession.commitChanges();

    return { ok: true, movedCard };
  }

  /** 移動指定區域全部卡牌，包含空區域。 */
  function moveZoneCards(options) {
    const { sourceDeck, sourceZone, destinationDeck, destinationZone } = options;

    requireDeckInterface(sourceDeck);
    requireDeckInterface(destinationDeck);
    requireKnownZone(sourceZone);
    requireKnownZone(destinationZone);

    if (sourceDeck === destinationDeck && sourceZone === destinationZone) {
      throw new Error("same source and destination zone");
    }

    const transferSession = createTransferSession([sourceDeck, destinationDeck]);
    const sourceZoneCards = transferSession.getWorkingState(sourceDeck)[sourceZone];
    const movedCards = sourceZoneCards.splice(0, sourceZoneCards.length);

    transferSession.getWorkingState(destinationDeck)[destinationZone].push(...movedCards);
    transferSession.commitChanges();

    return { ok: true, movedCards };
  }

  /**
   * 交換兩張卡牌。
   * firstSelection、secondSelection 各自指向該區域的索引或 predicate。
   * 任一側找不到時不交換。
   */
  function swapCards(options) {
    const {
      firstDeck,
      secondDeck,
      firstZone = "hand",
      secondZone = "hand",
      firstSelection,
      secondSelection
    } = options;

    requireDeckInterface(firstDeck);
    requireDeckInterface(secondDeck);
    requireKnownZone(firstZone);
    requireKnownZone(secondZone);

    const transferSession = createTransferSession([firstDeck, secondDeck]);
    const firstZoneCards = transferSession.getWorkingState(firstDeck)[firstZone];
    const secondZoneCards = transferSession.getWorkingState(secondDeck)[secondZone];

    const firstSelectedIndex = findSelectedIndex(firstZoneCards, firstSelection);
    const secondSelectedIndex = findSelectedIndex(secondZoneCards, secondSelection);

    if (firstSelectedIndex < 0 || secondSelectedIndex < 0) {
      return { ok: false, reason: "not_found" };
    }

    const firstSelectedCard = firstZoneCards[firstSelectedIndex];
    const secondSelectedCard = secondZoneCards[secondSelectedIndex];

    if (firstZoneCards === secondZoneCards && firstSelectedIndex === secondSelectedIndex) {
      return { ok: true, firstSelectedCard, secondSelectedCard };
    }

    firstZoneCards[firstSelectedIndex] = secondSelectedCard;
    secondZoneCards[secondSelectedIndex] = firstSelectedCard;

    transferSession.commitChanges();
    return { ok: true, firstSelectedCard, secondSelectedCard };
  }

  /**
   * 將兩個區域中的卡牌整批交換。
   * 同一牌庫的同一區域視為無操作。
   */
  function swapZoneCards(options) {
    const {
      firstDeck,
      secondDeck,
      firstZone = "hand",
      secondZone = "hand"
    } = options;

    requireDeckInterface(firstDeck);
    requireDeckInterface(secondDeck);
    requireKnownZone(firstZone);
    requireKnownZone(secondZone);

    if (firstDeck === secondDeck && firstZone === secondZone) {
      return { ok: true, firstZoneCards: [], secondZoneCards: [] };
    }

    const transferSession = createTransferSession([firstDeck, secondDeck]);
    const firstZoneCards = transferSession.getWorkingState(firstDeck)[firstZone];
    const secondZoneCards = transferSession.getWorkingState(secondDeck)[secondZone];

    const previousFirstZoneCards = firstZoneCards.slice();
    const previousSecondZoneCards = secondZoneCards.slice();

    firstZoneCards.splice(0, firstZoneCards.length, ...previousSecondZoneCards);
    secondZoneCards.splice(0, secondZoneCards.length, ...previousFirstZoneCards);

    transferSession.commitChanges();

    return {
      ok: true,
      firstZoneCards: previousFirstZoneCards,
      secondZoneCards: previousSecondZoneCards
    };
  }

  global.CardZoneTransfer = Object.freeze({
    version: VERSION,
    moveCard,
    moveZoneCards,
    swapCards,
    swapZoneCards
  });
})(typeof window !== "undefined" ? window : globalThis);
