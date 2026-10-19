/* 慢慢軍火庫｜Trick Taking Rules 1.0.0
 * 來源：傷心小棧 legalCardsForPlayer / resolveTrick。
 * 跟首花色與一墩結算是共通規則，Hearts 首輪特例交給 callback。
 * 不洗牌、不計算全場勝負、不假定四人或固定花色。
 */
(function (global) {
  "use strict";

  function validate_hand(hand) {
    if (!Array.isArray(hand)) throw new TypeError("hand must be an array.");
    hand.forEach(validate_card);
  }

  function validate_card(card) {
    if (!card || typeof card !== "object" || card.suit === undefined ||
        (typeof card.rank !== "number" && typeof card.rank !== "string")) {
      throw new TypeError("Each card needs suit and rank.");
    }
  }

  function validate_trick(trick) {
    if (!Array.isArray(trick)) throw new TypeError("trick must be an array.");
    for (const play of trick) {
      if (!play || typeof play !== "object" || play.player === undefined) {
        throw new TypeError("Each play needs player and card.");
      }
      validate_card(play.card);
    }
  }

  function legal_cards(hand, trick = [], options = {}) {
    validate_hand(hand);
    validate_trick(trick);
    for (const property of ["can_lead", "can_discard"]) {
      if (options[property] !== undefined && typeof options[property] !== "function") {
        throw new TypeError(property + " must be a function.");
      }
    }
    if (hand.length === 0) return [];
    const leading_suit = trick[0]?.card.suit;
    // Mandatory follow suit always takes precedence over optional game-specific restrictions.
    const required_suit = leading_suit === undefined ? [] : hand.filter(card => card.suit === leading_suit);
    if (required_suit.length > 0) return required_suit.slice();
    const callback = trick.length > 0 ? options.can_discard : options.can_lead;
    if (!callback) return hand.slice();
    const filtered = hand.filter(card => Boolean(callback(card, { hand: hand.slice(), trick: trick.slice() })));
    // In Hearts a forced point discard can be allowed when no alternative exists.
    return filtered.length === 0 && options.allow_when_none !== false ? hand.slice() : filtered;
  }

  function resolve_trick(trick, options = {}) {
    validate_trick(trick);
    if (trick.length === 0) return Object.freeze({ winner: null, lead_suit: null, points: 0, winning_card: null });
    if (options.compare_rank !== undefined && typeof options.compare_rank !== "function") {
      throw new TypeError("compare_rank must be a function.");
    }
    if (options.score_card !== undefined && typeof options.score_card !== "function") {
      throw new TypeError("score_card must be a function.");
    }
    const compare_rank = options.compare_rank ?? ((first, second) => {
      if (typeof first !== "number" || typeof second !== "number" || !Number.isFinite(first) || !Number.isFinite(second)) {
        throw new TypeError("Non-numeric ranks require compare_rank.");
      }
      return first - second;
    });
    const score_card = options.score_card ?? (() => 0);
    const lead_suit = trick[0].card.suit;
    let winning_play = trick[0];
    let points = 0;
    for (const play of trick) {
      const card_score = score_card(play.card, play);
      if (typeof card_score !== "number" || !Number.isFinite(card_score)) {
        throw new TypeError("score_card must return a finite number.");
      }
      points += card_score;
      if (play.card.suit === lead_suit) {
        const comparison = compare_rank(play.card.rank, winning_play.card.rank);
        if (typeof comparison !== "number" || !Number.isFinite(comparison)) {
          throw new TypeError("compare_rank must return a finite number.");
        }
        if (comparison > 0) winning_play = play;
      }
    }
    return Object.freeze({ winner: winning_play.player, lead_suit, points, winning_card: winning_play.card });
  }

  global.SlowlyTrickTakingRules = Object.freeze({ version: "1.0.0", legal_cards, resolve_trick });
})(window);
