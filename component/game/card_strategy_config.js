/* =========================================================
   Slowly Card Strategy Config｜可選的宿主純資料設定模板
   只提供預設規則的局部覆寫範例。載入它不是必要條件。
   如需自訂效果／判定函式，請在 mount 的 options 內傳入。
========================================================= */
window.SlowlyCardStrategyConfig = {
  controlledParticipant: "player",
  participants: [
    { id: "player", name: "玩家", maxHP: 30, hp: 30, shield: 0, ai: false },
    { id: "opponent", name: "電腦", maxHP: 30, hp: 30, shield: 0, ai: true }
  ],
  resources: {
    action: 3,
    mana: 3
  },
  upgradeTokens: 5,
  rules: {
    deckSize: 20,
    minimumDeckSize: 5,
    handSize: 5,
    maximumLevel: 5,
    freeSwapsPerTurn: 1,
    aiCardsPerTurn: 2,
    refillEachTurn: true
  },
  feedback: {
    animation: true,
    vibration: false,
    sound: false,
    slash: { angle: -39, duration: 320 },
    vibrationPattern: [20]
  }
};
