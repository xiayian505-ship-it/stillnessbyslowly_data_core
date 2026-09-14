/* =========================================================
   Slowly Card Battle Config
   宿主最常修改的純資料設定。

   這支不是必要依賴：
   不載入時，SlowlyCardBattle 仍會使用內建預設值。
========================================================= */

window.SlowlyCardBattleConfig = {
  player: {
    name: "玩家",
    maxHP: 20,
    currentHP: 20,
    shield: 0,
    energyMax: 3,
    energy: 3,
    meta: {}
  },

  enemy: {
    name: "Boss",
    maxHP: 25,
    currentHP: 25,
    shield: 0,
    attackMin: 3,
    attackMax: 6,
    guardValue: 3,
    chargeBonus: 4,
    pattern: [
      "attack",
      "attack",
      "guard",
      "charge"
    ],
    meta: {}
  },

  cards: [
    {
      id: "strike-1",
      name: "攻擊",
      cost: 1,
      description: "造成 4 點傷害。",
      effects: [
        { type: "attack", amount: 4 }
      ],
      meta: {}
    },
    {
      id: "strike-2",
      name: "攻擊",
      cost: 1,
      description: "造成 4 點傷害。",
      effects: [
        { type: "attack", amount: 4 }
      ],
      meta: {}
    },
    {
      id: "guard",
      name: "防禦",
      cost: 1,
      description: "獲得 4 點護盾。",
      effects: [
        { type: "guard", amount: 4 }
      ],
      meta: {}
    },
    {
      id: "energy",
      name: "充能",
      cost: 0,
      description: "恢復 1 點能量。",
      effects: [
        { type: "energy", amount: 1 }
      ],
      meta: {}
    },
    {
      id: "heal",
      name: "治療",
      cost: 2,
      description: "恢復 3 HP。",
      effects: [
        { type: "heal", amount: 3 }
      ],
      meta: {}
    }
  ],

  rules: {
    handSize: 4,
    resetEnergyEachTurn: true
  }
};
