// combat_stats.js
// 通用戰鬥數值核心：HP、護盾、傷害與治療。
// 不綁定玩家／敵人、回合、卡牌、AI、DOM 或特定遊戲。
(function (global) {
  "use strict";

  function toFiniteNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function normalizeAmount(value) {
    return Math.max(0, toFiniteNumber(value, 0));
  }

  function ensureTarget(target) {
    if (!target || typeof target !== "object") {
      throw new TypeError("CombatStats target must be an object.");
    }

    const maxHP = Math.max(0, toFiniteNumber(target.maxHP, 0));
    const hp = Math.max(0, Math.min(maxHP, toFiniteNumber(target.hp, maxHP)));
    const shield = Math.max(0, toFiniteNumber(target.shield, 0));

    target.maxHP = maxHP;
    target.hp = hp;
    target.shield = shield;

    return target;
  }

  const CombatStats = {
    normalize(target) {
      return ensureTarget(target);
    },

    damage(target, amount) {
      ensureTarget(target);

      const incoming = normalizeAmount(amount);
      const absorbed = Math.min(target.shield, incoming);
      const damage = incoming - absorbed;

      target.shield -= absorbed;
      target.hp = Math.max(0, target.hp - damage);

      return {
        incoming,
        absorbed,
        damage,
        hp: target.hp,
        shield: target.shield,
        defeated: target.hp <= 0
      };
    },

    heal(target, amount) {
      ensureTarget(target);

      const requested = normalizeAmount(amount);
      const before = target.hp;

      target.hp = Math.min(target.maxHP, target.hp + requested);

      return {
        requested,
        healed: target.hp - before,
        hp: target.hp,
        maxHP: target.maxHP,
        full: target.hp >= target.maxHP
      };
    },

    addShield(target, amount) {
      ensureTarget(target);

      const added = normalizeAmount(amount);
      target.shield += added;

      return {
        added,
        shield: target.shield
      };
    },

    setHP(target, value) {
      ensureTarget(target);

      target.hp = Math.max(0, Math.min(target.maxHP, toFiniteNumber(value, target.hp)));

      return {
        hp: target.hp,
        maxHP: target.maxHP,
        defeated: target.hp <= 0,
        full: target.hp >= target.maxHP
      };
    },

    setMaxHP(target, value, options = {}) {
      ensureTarget(target);

      const previousMaxHP = target.maxHP;
      const nextMaxHP = Math.max(0, toFiniteNumber(value, previousMaxHP));
      const preserveRatio = Boolean(options.preserveRatio);
      const ratio = previousMaxHP > 0 ? target.hp / previousMaxHP : 0;

      target.maxHP = nextMaxHP;

      if (preserveRatio) {
        target.hp = Math.max(0, Math.min(nextMaxHP, nextMaxHP * ratio));
      } else {
        target.hp = Math.min(target.hp, nextMaxHP);
      }

      return {
        hp: target.hp,
        maxHP: target.maxHP
      };
    },

    clearShield(target) {
      ensureTarget(target);
      const removed = target.shield;
      target.shield = 0;

      return {
        removed,
        shield: 0
      };
    },

    isDefeated(target) {
      ensureTarget(target);
      return target.hp <= 0;
    },

    isFull(target) {
      ensureTarget(target);
      return target.hp >= target.maxHP;
    }
  };

  global.CombatStats = CombatStats;
})(window);
