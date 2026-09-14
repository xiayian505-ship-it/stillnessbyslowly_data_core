// combatant_config.js
// 慢慢的倉庫｜Game / Combat
// 通用戰鬥單位基礎數值正規化。
// 只整理 HP、Shield 與攻擊範圍，不查資料來源、不處理 AI、回合、傷害或 UI。

(function (global) {
  "use strict";

  function finite(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function nonNegative(value, fallback) {
    const number = finite(value);
    if (number === null) return fallback;
    return Math.max(0, number);
  }

  function positive(value, fallback) {
    const number = finite(value);
    if (number === null || number <= 0) return fallback;
    return number;
  }

  function resolveAttack(source, fallback) {
    const sourceAttack = Array.isArray(source.attack)
      ? source.attack
      : Array.isArray(source.atk)
        ? source.atk
        : [];

    let min = finite(
      source.attackMin ??
      source.atkMin ??
      sourceAttack[0]
    );

    let max = finite(
      source.attackMax ??
      source.atkMax ??
      sourceAttack[1]
    );

    if (min === null) min = fallback.attackMin;
    if (max === null) max = fallback.attackMax;

    min = Math.max(0, min);
    max = Math.max(0, max);

    if (min > max) {
      [min, max] = [max, min];
    }

    return { attackMin: min, attackMax: max };
  }

  const CombatantConfig = {
    normalize(source, defaults) {
      const input = source && typeof source === "object" ? source : {};
      const base = defaults && typeof defaults === "object" ? defaults : {};

      const baseMaxHP = positive(
        base.maxHP ?? base.hp,
        1
      );

      const maxHP = positive(
        input.maxHP ?? input.hp,
        baseMaxHP
      );

      const rawHP = finite(input.currentHP);
      const currentHP = rawHP === null
        ? maxHP
        : Math.min(maxHP, Math.max(0, rawHP));

      const shield = nonNegative(
        input.shield,
        nonNegative(base.shield, 0)
      );

      const fallbackAttack = resolveAttack(base, {
        attackMin: 0,
        attackMax: 0
      });

      const attack = resolveAttack(input, fallbackAttack);

      return {
        maxHP,
        hp: currentHP,
        shield,
        attackMin: attack.attackMin,
        attackMax: attack.attackMax
      };
    }
  };

  global.CombatantConfig = CombatantConfig;
})(window);
