// deck.js
// 慢慢的倉庫｜Game / Card｜Deck 1.0.0
// 通用牌庫循環核心：draw pile / hand / discard pile。
// 不處理 DOM、卡牌效果、戰鬥規則、能量或宿主資料格式。
(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function cloneArray(value) {
    return Array.isArray(value) ? value.slice() : [];
  }

  function toNonNegativeInt(value, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) return fallback;
    return Math.floor(number);
  }

  function shuffleInPlace(array, random) {
    for (let i = array.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function create(options = {}) {
    const random = typeof options.random === "function" ? options.random : Math.random;
    const recycleDiscard = options.recycleDiscard !== false;
    const shuffleOnReset = options.shuffleOnReset !== false;
    const shuffleOnRecycle = options.shuffleOnRecycle !== false;

    let handSize = toNonNegativeInt(options.handSize, 0);
    let sourceItems = cloneArray(options.items ?? options.cards);
    let drawPile = [];
    let hand = [];
    let discardPile = [];

    function shuffle() {
      shuffleInPlace(drawPile, random);
      return api;
    }

    function reset(nextItems) {
      if (arguments.length > 0) {
        sourceItems = cloneArray(nextItems);
      }

      drawPile = sourceItems.slice();
      hand = [];
      discardPile = [];

      if (shuffleOnReset) shuffle();
      return api;
    }

    function recycle() {
      if (discardPile.length === 0) return false;

      drawPile = discardPile.splice(0);
      if (shuffleOnRecycle) shuffle();
      return true;
    }

    function drawOne() {
      if (drawPile.length === 0 && recycleDiscard) {
        recycle();
      }

      if (drawPile.length === 0) {
        return { drawn: false, item: undefined };
      }

      const item = drawPile.pop();
      hand.push(item);
      return { drawn: true, item };
    }

    function draw(count = 1) {
      const wanted = toNonNegativeInt(count, 1);
      const drawn = [];

      for (let i = 0; i < wanted; i += 1) {
        const result = drawOne();
        if (!result.drawn) break;
        drawn.push(result.item);
      }

      return drawn;
    }

    function drawToHand(targetSize = handSize) {
      const target = toNonNegativeInt(targetSize, handSize);
      if (hand.length >= target) return [];
      return draw(target - hand.length);
    }

    function discardAt(index) {
      const position = Number(index);
      if (!Number.isInteger(position) || position < 0 || position >= hand.length) {
        return null;
      }

      const [item] = hand.splice(position, 1);
      discardPile.push(item);
      return item;
    }

    function discardItem(item) {
      const index = hand.indexOf(item);
      return index === -1 ? null : discardAt(index);
    }

    function discardAll() {
      if (hand.length === 0) return [];

      const discarded = hand.splice(0);
      discardPile.push(...discarded);
      return discarded;
    }

    function setHandSize(value) {
      handSize = toNonNegativeInt(value, handSize);
      return api;
    }

    function snapshot() {
      return {
        drawPile: drawPile.slice(),
        hand: hand.slice(),
        discardPile: discardPile.slice(),
        handSize
      };
    }

    const api = {
      version: VERSION,
      reset,
      shuffle,
      recycle,
      draw,
      drawToHand,
      discardAt,
      discardItem,
      discardAll,
      setHandSize,
      snapshot
    };

    reset();
    return api;
  }

  global.Deck = Object.freeze({
    version: VERSION,
    create
  });

})(typeof window !== "undefined" ? window : globalThis);
