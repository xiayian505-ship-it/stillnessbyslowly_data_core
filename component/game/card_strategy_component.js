/* =========================================================
   慢慢軍火庫｜Slowly Card Strategy Component v1.0.0

   通用策略卡牌「完成品」：收藏、升級、組牌、對戰及基本 UI。
   必須先從軍火庫載入下列積木；此處只負責組裝及宿主可覆蓋的規則。
   不儲存到本機／伺服器；不使用《霧林之契》的卡牌資料或視覺皮膚。

   公開入口：window.SlowlyCardStrategy.mount(target, options)
   完整依賴與宿主覆蓋方式，參考 card_strategy_component_usage.html。
========================================================= */
(function (global) {
  "use strict";

  const VERSION = "1.0.0";
  const SNAPSHOT_VERSION = 1;
  const REQUIRED_GLOBALS = [
    "Deck", "CombatStats", "CardInstanceIdentity", "CardZoneTransfer",
    "CardResourcePool", "CardTargetSelection", "CardEffectRegistry",
    "CardTurnOrder", "CardLevelProgression", "CardLoadoutValidation",
    "SlowlyHandFanLayout", "SlowlySlotStageLayout", "SlowlyElementFlight",
    "SlowlyDeviceVibration", "SlowlyImpactSlash"
  ];

  // 這是可玩的示範資料，不是任何既有遊戲的規則或卡牌。
  const DEFAULT_CARDS = [
    { cardId: "strike", name: "攻擊", description: "指定對手，造成傷害。", copies: 3,
      cost: { action: 1 }, target: "opponent", effects: [{ type: "attack", amount: 5 }] },
    { cardId: "guard", name: "防禦", description: "為自己增加護盾。", copies: 3,
      cost: { action: 1 }, target: "self", effects: [{ type: "guard", amount: 4 }] },
    { cardId: "heal", name: "治療", description: "回復自己的生命。", copies: 2,
      cost: { mana: 1 }, target: "self", effects: [{ type: "heal", amount: 4 }] },
    { cardId: "draw", name: "抽牌", description: "從牌庫再抽一張牌。", copies: 3,
      cost: { mana: 1 }, target: "none", effects: [{ type: "draw", amount: 1 }] },
    { cardId: "discard", name: "迫使棄牌", description: "選擇對手的一張手牌並棄掉。", copies: 2,
      cost: { mana: 2 }, target: "opponent-hand", effects: [{ type: "discard" }] },
    { cardId: "redraw", name: "換牌", description: "選擇自己另一張手牌，棄掉並補一張。", copies: 2,
      cost: { action: 1 }, target: "self-hand", effects: [{ type: "redraw" }] },
    { cardId: "exchange", name: "交換", description: "與對手交換一張手牌（不含本張）。", copies: 2,
      cost: { action: 1, mana: 1 }, target: "opponent-hand", effects: [{ type: "exchange" }] },
    { cardId: "restore", name: "充能", description: "恢復一點行動點。", copies: 3,
      cost: { mana: 1 }, target: "none", effects: [{ type: "resource", resource: "action", amount: 1 }] }
  ];

  const DEFAULT_LAYOUTS = [
    {
      name: "vertical", minWidth: 0,
      areas: [["enemy"], ["center"], ["hand"], ["player"], ["controls"]],
      columns: ["minmax(0, 1fr)"], rows: ["auto", "auto", "auto", "auto", "auto"]
    },
    {
      name: "wide", minWidth: 650,
      areas: [["enemy", "enemy"], ["center", "center"], ["hand", "hand"], ["player", "controls"]],
      columns: ["minmax(0, 1fr)", "minmax(0, 1fr)"],
      rows: ["auto", "auto", "auto", "auto"]
    }
  ];

  const DEFAULTS = {
    autoStart: false, // 一行 mount 預設先顯示收藏，可按「開始戰鬥」。
    controlledParticipant: "player",
    participants: [
      { id: "player", name: "玩家", maxHP: 30, hp: 30, shield: 0, ai: false },
      { id: "opponent", name: "電腦", maxHP: 30, hp: 30, shield: 0, ai: true }
    ],
    cards: DEFAULT_CARDS,
    collection: null,
    loadoutIds: null,
    opponentCards: null,
    upgradeTokens: 5,
    resources: { action: 3, mana: 3 },
    rules: {
      deckSize: 20, minimumDeckSize: 5, handSize: 5,
      maximumLevel: 5, freeSwapsPerTurn: 1, aiCardsPerTurn: 2,
      refillEachTurn: true
    },
    layout: { layouts: DEFAULT_LAYOUTS, fan: {} },
    feedback: { animation: true, vibration: false, sound: false,
      slash: { angle: -39, duration: 320 }, vibrationPattern: [20] },
    effects: {}, actions: {}, renderers: {}, formatters: {}, callbacks: {},
    random: null
  };

  function copy(value) {
    if (value === undefined) return undefined;
    // 卡牌與 snapshot 只放可序列化資料；宿主函式保留在 options，不進入快照。
    return JSON.parse(JSON.stringify(value));
  }

  function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function integer(value, fallback, minimum = 0) {
    return Number.isInteger(value) && value >= minimum ? value : fallback;
  }

  function amount(value, fallback = 0) {
    return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
  }

  function readable(value, fallback = "") {
    const result = String(value ?? "").trim();
    return result || fallback;
  }

  function mergeOptions(options) {
    if (!isRecord(options)) throw new TypeError("SlowlyCardStrategy options 必須是物件。");
    return {
      ...DEFAULTS, ...options,
      participants: copy(options.participants ?? DEFAULTS.participants),
      cards: copy(options.cards ?? DEFAULTS.cards),
      collection: options.collection === null || options.collection === undefined
        ? null : copy(options.collection),
      loadoutIds: options.loadoutIds === null || options.loadoutIds === undefined
        ? null : copy(options.loadoutIds),
      opponentCards: options.opponentCards === null || options.opponentCards === undefined
        ? null : copy(options.opponentCards),
      resources: { ...DEFAULTS.resources, ...(options.resources || {}) },
      rules: { ...DEFAULTS.rules, ...(options.rules || {}) },
      layout: { ...DEFAULTS.layout, ...(options.layout || {}) },
      feedback: { ...DEFAULTS.feedback, ...(options.feedback || {}) },
      effects: { ...DEFAULTS.effects, ...(options.effects || {}) },
      actions: { ...DEFAULTS.actions, ...(options.actions || {}) },
      renderers: { ...DEFAULTS.renderers, ...(options.renderers || {}) },
      formatters: { ...DEFAULTS.formatters, ...(options.formatters || {}) },
      callbacks: { ...DEFAULTS.callbacks, ...(options.callbacks || {}) }
    };
  }

  function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = String(text);
    return element;
  }

  function makeButton(label, action, className = "") {
    const button = makeElement("button", className, label);
    button.type = "button";
    button.addEventListener("click", action);
    return button;
  }

  function assertDependencies() {
    const missing = REQUIRED_GLOBALS.filter(name => !global[name]);
    if (missing.length) throw new Error("[SlowlyCardStrategy] 缺少軍火庫依賴：" + missing.join(", "));
    if (String(global.Deck.version || "").startsWith("1.0.")) {
      throw new Error("[SlowlyCardStrategy] Deck 必須是 1.1.0 以上。");
    }
  }

  function createDefaultCollection(definitions) {
    const collection = [];
    definitions.forEach((definition, index) => {
      if (!definition || !readable(definition.cardId)) {
        throw new Error("cards[" + index + "] 必須具有 cardId。");
      }
      const copies = integer(definition.copies ?? 1, 1, 1);
      for (let number = 0; number < copies; number += 1) {
        const card = { ...definition, level: definition.level ?? 1 };
        delete card.copies;
        collection.push(global.CardInstanceIdentity.createCardInstance(
          card, `collection-${index}-${number + 1}`
        ));
      }
    });
    return collection;
  }

  class StrategyComponent {
    constructor(target, rawOptions = {}) {
      assertDependencies();
      this.target = target;
      this.options = mergeOptions(rawOptions);
      this.random = typeof this.options.random === "function" ? this.options.random : Math.random;
      this.rules = this.options.rules;
      this.controlledId = this.options.controlledParticipant;
      this.participantDefinitions = copy(this.options.participants);

      const ids = this.participantDefinitions.map(item => item.id);
      if (ids.length < 2 || ids.some(id => !readable(id)) || new Set(ids).size !== ids.length) {
        throw new Error("participants 需要至少兩個不同且非空的 id。");
      }
      if (!ids.includes(this.controlledId)) throw new Error("controlledParticipant 不在 participants 中。");
      if (!this.participantDefinitions.some(item => item.id !== this.controlledId)) {
        throw new Error("至少需要一位非玩家參與者。");
      }

      this.collection = this.options.collection === null
        ? createDefaultCollection(this.options.cards) : copy(this.options.collection);
      if (!Array.isArray(this.collection)) throw new TypeError("collection 必須是陣列。");
      if (global.CardInstanceIdentity.findDuplicateInstanceIds(this.collection).length) {
        throw new Error("收藏中有重複的實體卡 ID。");
      }
      global.CardInstanceIdentity.groupByCardType(this.collection);
      this.loadoutIds = this.options.loadoutIds === null
        ? global.CardLoadoutValidation.getInstanceIds(this.collection).slice(0, this.rules.deckSize)
        : copy(this.options.loadoutIds);
      this.upgradeTokens = amount(this.options.upgradeTokens, 5);
      this.screen = "collection";
      this.message = "可以先升級、編輯牌組，再開始戰鬥。";
      this.battle = null;
      this.decks = new Map();
      this.pools = new Map();
      this.turnOrder = null;
      this.pending = null;
      this.destroyed = false;
      this.registry = global.CardEffectRegistry.createRegistry();
      this.installEffects();
      this.vibration = global.SlowlyDeviceVibration.create({
        enabled: this.options.feedback.vibration === true
      });

      this.build();
      if (this.options.autoStart) this.start();
      else this.render();
    }

    assertAlive() {
      if (this.destroyed) throw new Error("[SlowlyCardStrategy] 已 destroy。");
    }

    hook(name, detail = {}) {
      const callback = this.options.callbacks[name];
      if (typeof callback !== "function") return;
      try {
        callback({ game: this, state: this.getState(), ...detail });
      } catch (error) {
        console.error("[SlowlyCardStrategy] callback 出錯：" + name, error);
      }
    }

    format(value) {
      const formatter = this.options.formatters.number;
      if (typeof formatter === "function") return String(formatter(value));
      return typeof value === "number" ? value.toLocaleString() : String(value);
    }

    show(message, event = "update") {
      this.message = String(message);
      this.render();
      this.hook("onStateChange", { event });
    }

    guard(action) {
      try {
        return action();
      } catch (error) {
        this.message = error?.message || String(error);
        this.render();
        this.hook("onError", { error: this.message });
        console.error(error);
        return null;
      }
    }

    getCard(instanceId) {
      return global.CardInstanceIdentity.findByInstanceId(this.collection, instanceId);
    }

    getLoadoutValidation() {
      const base = global.CardLoadoutValidation.validateSelection(
        this.collection, this.loadoutIds,
        {
          maximumCards: this.rules.deckSize,
          isEligible: card => typeof this.rules.isLoadoutEligible === "function"
            ? this.rules.isLoadoutEligible(card, { game: this }) !== false : true
        }
      );
      let valid = base.isValid && this.loadoutIds.length >= this.rules.minimumDeckSize;
      let reason = valid ? "牌組有效。" : "請確認牌組張數、收藏資格與重複實體卡。";
      if (valid && typeof this.rules.validateLoadout === "function") {
        const extra = this.rules.validateLoadout({ cards: base.resolvedCards, ids: copy(this.loadoutIds), game: this });
        if (extra === false || (isRecord(extra) && extra.valid === false)) {
          valid = false;
          reason = extra.reason || "未通過宿主牌組驗證。";
        }
      }
      return { ...base, valid, reason };
    }

    setScreen(name) {
      this.assertAlive();
      if (!["collection", "upgrade", "loadout", "battle"].includes(name)) {
        throw new RangeError("未知的畫面：" + name);
      }
      this.screen = name;
      this.pending = null;
      this.render();
      return this;
    }

    addToLoadout(instanceId) {
      this.assertAlive();
      if (!this.getCard(instanceId)) return { ok: false, reason: "收藏中沒有這張卡。" };
      if (this.loadoutIds.includes(instanceId)) return { ok: false, reason: "這張實體卡已加入。" };
      const candidate = this.loadoutIds.concat(instanceId);
      const result = global.CardLoadoutValidation.validateSelection(this.collection, candidate, {
        maximumCards: this.rules.deckSize,
        isEligible: card => typeof this.rules.isLoadoutEligible === "function"
          ? this.rules.isLoadoutEligible(card, { game: this }) !== false : true
      });
      if (!result.isValid) return { ok: false, reason: "卡牌不符合限制或牌組已滿。" };
      this.loadoutIds = candidate;
      this.show("已加入出戰牌組。", "loadout");
      return { ok: true };
    }

    moveLoadoutCard(instanceId, direction) {
      this.assertAlive();
      const position = this.loadoutIds.indexOf(instanceId);
      const destination = position + direction;
      if (position < 0 || destination < 0 || destination >= this.loadoutIds.length) {
        return { ok: false, reason: "無法移動此卡位置。" };
      }
      [this.loadoutIds[position], this.loadoutIds[destination]] =
        [this.loadoutIds[destination], this.loadoutIds[position]];
      this.show("已調整出戰牌組順序。", "loadout-order");
      return { ok: true };
    }

    removeFromLoadout(instanceId) {
      this.assertAlive();
      const position = this.loadoutIds.indexOf(instanceId);
      if (position < 0) return { ok: false, reason: "這張卡不在牌組裡。" };
      this.loadoutIds.splice(position, 1);
      this.show("已從牌組移除；開始戰鬥前會檢查張數。", "loadout");
      return { ok: true };
    }

    upgradeCard(instanceId) {
      this.assertAlive();
      const card = this.getCard(instanceId);
      if (!card) return { ok: false, reason: "找不到卡牌。" };
      const context = { card, game: this, tokens: this.upgradeTokens };
      const cost = typeof this.rules.upgradeCost === "function"
        ? this.rules.upgradeCost(card, context) : 1;
      if (typeof cost !== "number" || !Number.isFinite(cost) || cost < 0) {
        throw new RangeError("升級費用必須是非負數字。");
      }
      if (this.upgradeTokens < cost) return { ok: false, reason: "升級點數不足。" };
      const levelMaximum = this.rules.maximumLevel;
      if (card.level >= levelMaximum) return { ok: false, reason: "已達最高等級。" };
      const canUpgrade = typeof this.rules.canUpgrade === "function"
        ? this.rules.canUpgrade(card, context) !== false : true;
      if (!canUpgrade) return { ok: false, reason: "目前不符合升級條件。" };
      const originalLevel = card.level;
      try {
        const changes = global.CardLevelProgression.upgradeEligibleCards([card], {
          maximumLevel: levelMaximum,
          canUpgradeCard: () => true
        });
        if (!changes.length) return { ok: false, reason: "無法繼續升級。" };
        this.upgradeTokens -= cost;
        this.show(`${card.name} 升到 Lv.${card.level}。`, "upgrade");
        this.hook("onUpgrade", { instanceId, previousLevel: originalLevel, level: card.level });
        return { ok: true, level: card.level };
      } catch (error) {
        card.level = originalLevel;
        throw error;
      }
    }

    installEffects() {
      const builtins = {
        attack: ({ target, effect, card, actor, game }) => {
          const result = global.CombatStats.damage(target, game.effectAmount(card, effect));
          return { damage: result.damage, target: target.id, kind: "attack" };
        },
        guard: ({ actor, effect, card, game }) =>
          global.CombatStats.addShield(actor, game.effectAmount(card, effect)),
        heal: ({ actor, effect, card, game }) =>
          global.CombatStats.heal(actor, game.effectAmount(card, effect)),
        draw: ({ deck, effect, card, game }) =>
          deck.draw(Math.floor(game.effectAmount(card, effect))),
        resource: ({ pool, effect, card, game }) => {
          const key = readable(effect.resource, "action");
          const cap = amount(game.options.resources[key], Infinity);
          const next = Math.min(cap, pool.getAmount(key) + game.effectAmount(card, effect));
          pool.setAmount(key, next);
          return { resource: key, value: next };
        },
        discard: ({ targetCandidate, targetDeck }) => {
          if (!targetCandidate) throw new Error("必須選擇要棄掉的手牌。");
          return global.CardZoneTransfer.moveCard({
            sourceDeck: targetDeck, sourceZone: "hand",
            destinationDeck: targetDeck, destinationZone: "discardPile",
            cardSelection: candidate => candidate.id === targetCandidate.card.id
          });
        },
        redraw: ({ actorId, targetCandidate, game, deck }) => {
          if (!targetCandidate) throw new Error("必須選擇要更換的手牌。");
          const result = global.CardZoneTransfer.moveCard({
            sourceDeck: deck, sourceZone: "hand",
            destinationDeck: deck, destinationZone: "discardPile",
            cardSelection: candidate => candidate.id === targetCandidate.card.id
          });
          if (!result.ok) throw new Error("要換的手牌已不在手上。");
          return { moved: result.movedCard.id, drawn: deck.draw(1).length, actorId };
        },
        exchange: ({ actorId, targetCandidate, deck, targetDeck, card }) => {
          if (!targetCandidate) throw new Error("必須選擇對手的一張手牌。");
          const ally = deck.snapshot().hand.find(item => item.id !== card.id);
          if (!ally) throw new Error("需要另一張手牌才可以交換。");
          return global.CardZoneTransfer.swapCards({
            firstDeck: deck, secondDeck: targetDeck,
            firstZone: "hand", secondZone: "hand",
            firstSelection: item => item.id === ally.id,
            secondSelection: item => item.id === targetCandidate.card.id
          });
        }
      };
      for (const [key, implementation] of Object.entries(builtins)) {
        if (this.options.effects[key] === false || this.options.effects[key] === null) continue;
        this.registry.registerEffect(key, this.options.effects[key] ?? implementation);
      }
      for (const [key, implementation] of Object.entries(this.options.effects)) {
        if (key in builtins || implementation === false || implementation === null) continue;
        this.registry.registerEffect(key, implementation);
      }
    }

    effectAmount(card, effect) {
      const level = global.CardLevelProgression.calculateEffectiveLevel(
        integer(card.level, 1), 0, { maximumLevel: this.rules.maximumLevel }
      );
      const context = { game: this, card, effect, level };
      if (typeof this.rules.effectAmount === "function") {
        return amount(this.rules.effectAmount(context), 0);
      }
      return amount(effect.amount, 0) + Math.max(0, level - 1);
    }

    // 規則覆蓋：宿主提供 checkVictory 時，不再執行預設 HP 判定。
    checkVictory() {
      if (!this.battle || this.battle.status !== "playing") return null;
      if (typeof this.rules.checkVictory === "function") {
        const decision = this.rules.checkVictory({ game: this, battle: this.battle,
          participants: this.battle.participants });
        if (decision === null || decision === false || decision === undefined) return null;
        if (typeof decision === "string") return decision;
        if (isRecord(decision) && decision.finished) return decision.winner ?? "draw";
        return null;
      }
      const standing = Object.values(this.battle.participants).filter(
        participant => !global.CombatStats.isDefeated(participant)
      );
      if (standing.length <= 1) return standing[0]?.id || "draw";
      return null;
    }

    build() {
      this.target.replaceChildren();
      const root = makeElement("section", "slowly-card-strategy");
      root.innerHTML = `
        <header class="scs-header">
          <strong class="scs-title">策略卡牌</strong>
          <nav class="scs-nav" aria-label="策略卡牌功能">
            <button type="button" data-view="collection">收藏</button>
            <button type="button" data-view="upgrade">升級</button>
            <button type="button" data-view="loadout">組牌</button>
            <button type="button" data-view="battle">戰鬥</button>
          </nav>
        </header>
        <p class="scs-message" aria-live="polite"></p>
        <section class="scs-page" data-page="collection" aria-label="卡牌收藏"></section>
        <section class="scs-page" data-page="upgrade" aria-label="卡牌升級"></section>
        <section class="scs-page" data-page="loadout" aria-label="組牌編輯"></section>
        <section class="scs-page" data-page="battle" aria-label="策略戰鬥">
          <div class="scs-stage">
            <section data-stage-slot="enemy" class="scs-slot scs-enemy"></section>
            <section data-stage-slot="center" class="scs-slot scs-center"></section>
            <section data-stage-slot="hand" class="scs-slot scs-hand-slot">
              <div class="scs-hand-title">手牌</div>
              <div class="scs-hand"></div>
            </section>
            <section data-stage-slot="player" class="scs-slot scs-player"></section>
            <section data-stage-slot="controls" class="scs-slot scs-controls"></section>
          </div>
        </section>
      `;
      this.target.appendChild(root);
      this.root = root;
      this.pages = Object.fromEntries(Array.from(root.querySelectorAll("[data-page]"))
        .map(element => [element.dataset.page, element]));
      this.stage = root.querySelector(".scs-stage");
      this.handElement = root.querySelector(".scs-hand");
      root.querySelectorAll("[data-view]").forEach(button => {
        button.addEventListener("click", () => this.guard(() => this.setScreen(button.dataset.view)));
      });
      this.stageLayout = global.SlowlySlotStageLayout.create(this.stage, {
        layouts: this.options.layout.layouts || DEFAULT_LAYOUTS
      });
      this.fan = global.SlowlyHandFanLayout.create(
        this.handElement, this.options.layout.fan || {}
      );
    }

    render() {
      if (this.destroyed) return;
      this.root.querySelector(".scs-message").textContent = this.message;
      Object.entries(this.pages).forEach(([name, panel]) => {
        panel.hidden = name !== this.screen;
      });
      this.root.querySelectorAll("[data-view]").forEach(button => {
        button.setAttribute("aria-current", String(button.dataset.view === this.screen));
      });
      if (this.screen === "collection") this.renderCollection();
      if (this.screen === "upgrade") this.renderUpgrade();
      if (this.screen === "loadout") this.renderLoadout();
      if (this.screen === "battle") this.renderBattle();
    }

    renderCustom(name, container, data, fallback) {
      const renderer = this.options.renderers[name];
      if (typeof renderer === "function") {
        try {
          renderer(container, { game: this, ...data });
          return;
        } catch (error) {
          console.error("[SlowlyCardStrategy] renderer 出錯：" + name, error);
        }
      }
      fallback();
    }

    renderCollection() {
      const page = this.pages.collection;
      page.replaceChildren(makeElement("h2", "", "卡牌收藏"));
      const types = global.CardInstanceIdentity.groupByCardType(this.collection);
      page.appendChild(makeElement("p", "scs-muted", `共 ${this.collection.length} 張實體卡，${types.size} 種卡牌。`));
      const grid = makeElement("div", "scs-card-grid");
      this.collection.forEach(card => {
        const cardPanel = this.cardPanel(card);
        cardPanel.appendChild(makeElement("small", "", `實體 ID：${card.id}`));
        grid.appendChild(cardPanel);
      });
      page.appendChild(grid);
      page.appendChild(makeButton("前往升級", () => this.setScreen("upgrade")));
    }

    cardPanel(card) {
      const panel = makeElement("article", "scs-collection-card");
      this.renderCustom("collectionCard", panel, { card: copy(card) }, () => {
        panel.appendChild(makeElement("strong", "", card.name || card.cardId));
        panel.appendChild(makeElement("span", "", `Lv.${integer(card.level, 1)}`));
        panel.appendChild(makeElement("p", "", card.description || ""));
      });
      return panel;
    }

    renderUpgrade() {
      const page = this.pages.upgrade;
      page.replaceChildren(makeElement("h2", "", "卡牌升級"));
      page.appendChild(makeElement("p", "", `可用升級點數：${this.format(this.upgradeTokens)}`));
      const grid = makeElement("div", "scs-card-grid");
      this.collection.forEach(card => {
        const panel = this.cardPanel(card);
        const context = { card, game: this, tokens: this.upgradeTokens };
        const cost = typeof this.rules.upgradeCost === "function"
          ? this.rules.upgradeCost(card, context) : 1;
        const button = makeButton(`升級（${this.format(cost)} 點）`, () => this.guard(() => {
          const result = this.upgradeCard(card.id);
          if (!result.ok) this.show(result.reason);
        }));
        button.disabled = card.level >= this.rules.maximumLevel ||
          this.upgradeTokens < cost ||
          (typeof this.rules.canUpgrade === "function" && this.rules.canUpgrade(card, context) === false);
        panel.appendChild(button);
        grid.appendChild(panel);
      });
      page.appendChild(grid);
    }

    renderLoadout() {
      const page = this.pages.loadout;
      page.replaceChildren(makeElement("h2", "", "出戰牌組"));
      const validation = this.getLoadoutValidation();
      const status = makeElement("p", "scs-validation", `已選 ${this.loadoutIds.length} / ${this.rules.deckSize} 張，最少 ${this.rules.minimumDeckSize} 張。${validation.reason}`);
      status.dataset.valid = String(validation.valid);
      page.appendChild(status);
      const selectedList = makeElement("ol", "scs-loadout-list");
      this.loadoutIds.forEach((id, index) => {
        const card = this.getCard(id);
        if (!card) return;
        const item = makeElement("li", "", `${card.name} (Lv.${card.level})`);
        const earlier = makeButton("上移", () => this.moveLoadoutCard(id, -1));
        const later = makeButton("下移", () => this.moveLoadoutCard(id, 1));
        earlier.disabled = index === 0;
        later.disabled = index === this.loadoutIds.length - 1;
        item.append(earlier, later);
        selectedList.appendChild(item);
      });
      page.appendChild(selectedList);
      const grid = makeElement("div", "scs-card-grid");
      this.collection.forEach(card => {
        const panel = this.cardPanel(card);
        const selected = this.loadoutIds.includes(card.id);
        const button = makeButton(selected ? "移出牌組" : "加入牌組", () => this.guard(() => {
          const result = selected ? this.removeFromLoadout(card.id) : this.addToLoadout(card.id);
          if (!result.ok) this.show(result.reason);
        }));
        button.disabled = !selected && this.loadoutIds.length >= this.rules.deckSize;
        panel.appendChild(button);
        grid.appendChild(panel);
      });
      page.appendChild(grid);
      const start = makeButton("使用此牌組開始戰鬥", () => this.guard(() => this.start()));
      start.disabled = !validation.valid;
      page.appendChild(start);
    }

    makeCombatantBox(participant, selectable) {
      const panel = makeElement("article", "scs-combatant");
      panel.dataset.participantId = participant.id;
      this.renderCustom("combatant", panel, { participant: copy(participant) }, () => {
        panel.appendChild(makeElement("strong", "scs-combatant-name", participant.name));
        panel.appendChild(makeElement("div", "scs-stat", `HP：${this.format(participant.hp)} / ${this.format(participant.maxHP)}　護盾：${this.format(participant.shield)}`));
        const meter = makeElement("div", "scs-meter");
        meter.setAttribute("role", "progressbar");
        meter.setAttribute("aria-label", participant.name + " HP");
        meter.setAttribute("aria-valuemin", "0");
        meter.setAttribute("aria-valuemax", String(participant.maxHP));
        meter.setAttribute("aria-valuenow", String(participant.hp));
        const fill = makeElement("span", "scs-meter-fill");
        fill.style.width = `${participant.maxHP ? Math.max(0, Math.min(100, participant.hp / participant.maxHP * 100)) : 0}%`;
        meter.appendChild(fill);
        panel.appendChild(meter);
      });
      if (selectable) {
        const button = makeButton("選擇此目標", () => this.guard(() => this.chooseTarget({ participantId: participant.id })));
        panel.appendChild(button);
      }
      return panel;
    }

    renderBattle() {
      const enemySlot = this.stage.querySelector('[data-stage-slot="enemy"]');
      const centerSlot = this.stage.querySelector('[data-stage-slot="center"]');
      const playerSlot = this.stage.querySelector('[data-stage-slot="player"]');
      const controlsSlot = this.stage.querySelector('[data-stage-slot="controls"]');
      if (!this.battle) {
        enemySlot.replaceChildren();
        centerSlot.replaceChildren(makeElement("p", "", "尚未開始戰鬥。"));
        playerSlot.replaceChildren();
        controlsSlot.replaceChildren(makeButton("開始戰鬥", () => this.guard(() => this.start())));
        this.handElement.replaceChildren();
        this.fan.refresh();
        return;
      }
      const actor = this.battle.participants[this.controlledId];
      const opponents = Object.values(this.battle.participants).filter(item => item.id !== this.controlledId);
      const activeId = this.turnOrder.getCurrentParticipant();
      const playerActive = this.battle.status === "playing" && activeId === this.controlledId;
      enemySlot.replaceChildren();
      opponents.forEach(participant => {
        const chosen = this.pending?.target === "opponent" && playerActive;
        enemySlot.appendChild(this.makeCombatantBox(participant, chosen));
        const opponentDeck = this.decks.get(participant.id);
        if (opponentDeck) {
          const hand = opponentDeck.snapshot().hand;
          enemySlot.appendChild(makeElement("p", "scs-muted", `手牌 ${hand.length} 張（不公開牌面）`));
          const enemyHand = makeElement("div", "scs-enemy-hand");
          hand.forEach((card, index) => {
            const choosing = this.pending?.target === "opponent-hand" && playerActive;
            const button = makeButton(`背面 ${index + 1}`, () => this.guard(() =>
              this.chooseTarget({ owner: participant.id, zone: "hand", cardId: card.id })
            ));
            button.disabled = !choosing;
            button.setAttribute("aria-label", `選擇 ${participant.name} 的第 ${index + 1} 張手牌`);
            enemyHand.appendChild(button);
          });
          enemySlot.appendChild(enemyHand);
        }
      });

      centerSlot.replaceChildren();
      centerSlot.appendChild(makeElement("strong", "", `第 ${this.turnOrder.getSnapshot().currentRound} 回合 · ${this.battle.participants[activeId]?.name || activeId} 行動`));
      if (this.battle.status !== "playing") {
        centerSlot.appendChild(makeElement("p", "", `對戰結束。勝者：${this.battle.winner || "平手"}`));
      }
      if (this.pending) centerSlot.appendChild(makeElement("p", "scs-prompt",
        this.pending.mode === "mulligan"
          ? "請點選一張手牌來免費更換，或取消選擇。"
          : "請在戰鬥舞台選擇目標，或取消選擇。"));
      const log = makeElement("ol", "scs-log");
      this.battle.log.slice(-4).forEach(entry => log.appendChild(makeElement("li", "", entry)));
      centerSlot.appendChild(log);

      playerSlot.replaceChildren(this.makeCombatantBox(actor, false));
      const pool = this.pools.get(this.controlledId);
      const resources = makeElement("div", "scs-resources");
      Object.entries(pool.getSnapshot()).forEach(([key, value]) => {
        resources.appendChild(makeElement("span", "scs-resource", `${key}：${this.format(value)}`));
      });
      playerSlot.appendChild(resources);
      playerSlot.appendChild(makeElement("small", "", `牌庫：${this.decks.get(this.controlledId).snapshot().drawPile.length}　棄牌：${this.decks.get(this.controlledId).snapshot().discardPile.length}`));

      const hand = this.decks.get(this.controlledId).snapshot().hand;
      this.handElement.replaceChildren();
      hand.forEach((card, index) => {
        const button = makeButton("", () => this.guard(() => {
          if (this.pending?.target === "self-hand" && this.pending.cardId !== card.id) {
            if (this.pending.mode === "mulligan") {
              const result = this.mulligan(index);
              if (!result.ok) this.show(result.reason);
            } else {
              this.chooseTarget({ owner: this.controlledId, zone: "hand", cardId: card.id });
            }
          } else if (!this.pending) {
            const result = this.playCard(index);
            if (!result.played && result.reason !== "target-required") this.show(result.reason || "無法出牌。");
          }
        }), "scs-hand-card");
        button.dataset.handFanCard = "";
        button.dataset.cardId = card.id;
        button.title = `${card.name}（Lv.${card.level ?? 1}）：${card.description || ""}`;
        button.appendChild(makeElement("strong", "", card.name));
        button.appendChild(makeElement("span", "", `Lv.${card.level ?? 1}`));
        button.appendChild(makeElement("small", "", card.description || ""));
        const required = this.cardCost(card, this.controlledId);
        button.appendChild(makeElement("small", "", Object.entries(required)
          .map(([key, value]) => `${key}:${value}`).join(" / ") || "免費"));
        const canPickSelf = this.pending?.target === "self-hand" && this.pending.cardId !== card.id;
        button.disabled = !playerActive || (Boolean(this.pending) && !canPickSelf) ||
          (!this.pending && !pool.canAfford(required));
        this.renderCustom("handCard", button, { card: copy(card), index, disabled: button.disabled }, () => {});
        this.handElement.appendChild(button);
      });
      this.fan.refresh();
      if (this.pending) {
        const chosenIndex = hand.findIndex(card => card.id === this.pending.cardId);
        this.fan.setSelected(chosenIndex < 0 ? null : chosenIndex);
      } else {
        this.fan.setSelected(null);
      }

      controlsSlot.replaceChildren();
      const redraw = makeButton(`免費換牌（剩 ${this.battle.freeSwaps} 次）`, () => this.guard(() => {
        this.pending = { mode: "mulligan", target: "self-hand", cardId: null };
        this.message = "請點選要免費更換的手牌。";
        this.render();
      }));
      redraw.disabled = !playerActive || this.battle.freeSwaps < 1 || !hand.length || Boolean(this.pending);
      controlsSlot.appendChild(redraw);
      const end = makeButton("結束回合", () => this.guard(() => this.endTurn()));
      end.disabled = !playerActive || Boolean(this.pending);
      controlsSlot.appendChild(end);
      if (this.pending) controlsSlot.appendChild(makeButton("取消目標選擇", () => this.cancelTarget()));
      controlsSlot.appendChild(makeButton("重新開始", () => this.guard(() => this.restart())));
    }

    cardCost(card, actorId) {
      if (typeof this.rules.getCost === "function") {
        return this.rules.getCost({ game: this, card, actorId, battle: this.battle });
      }
      return card.cost || {};
    }

    // 目標候選：卡牌類目標直接使用 CardTargetSelection；角色目標由宿主規則處理。
    resolveTargets(card, actorId) {
      if (typeof this.rules.getTargets === "function") {
        const custom = this.rules.getTargets({ game: this, card, actorId,
          decks: this.decks, participants: this.battle.participants });
        if (custom !== undefined) return custom;
      }
      const definition = typeof this.rules.getTargetType === "function"
        ? this.rules.getTargetType({ game: this, card, actorId })
        : card.target || "none";
      if (definition === "none" || definition === "self") return { type: definition, candidates: [] };
      if (definition === "opponent") {
        return { type: definition, candidates: Object.keys(this.battle.participants)
          .filter(id => id !== actorId).map(participantId => ({ participantId })) };
      }
      if (definition !== "opponent-hand" && definition !== "self-hand") {
        throw new Error("未知的 target 類型：" + definition + "；可用 rules.getTargetType 覆蓋。");
      }
      const ownerIds = definition === "self-hand"
        ? [actorId] : Object.keys(this.battle.participants).filter(id => id !== actorId);
      const zones = ownerIds.map(owner => ({
        owner, zone: "hand", cards: this.decks.get(owner).snapshot().hand
      }));
      const candidates = global.CardTargetSelection.collectCandidates(zones, candidate => {
        if (definition === "self-hand" && candidate.card.id === card.id) return false;
        return typeof this.rules.isEligibleTarget === "function"
          ? this.rules.isEligibleTarget({ game: this, card, actorId, candidate }) !== false
          : true;
      });
      return { type: definition, candidates };
    }

    chooseTarget(target) {
      this.assertAlive();
      if (!this.pending) return { played: false, reason: "沒有待選的卡牌。" };
      const pending = this.pending;
      const hand = this.decks.get(this.controlledId).snapshot().hand;
      const position = hand.findIndex(card => card.id === pending.cardId);
      if (position < 0) { this.pending = null; this.render(); return { played: false, reason: "卡牌已不在手中。" }; }
      return this.playCard(position, target);
    }

    cancelTarget() {
      this.assertAlive();
      this.pending = null;
      this.show("已取消選擇；沒有消耗卡牌或資源。", "cancel-target");
      return this;
    }

    targetFor(card, actorId, requestedTarget) {
      if (typeof this.rules.resolveTarget === "function") {
        const custom = this.rules.resolveTarget({ game: this, card, actorId, requestedTarget });
        if (custom !== undefined) return custom;
      }
      const targetInfo = this.resolveTargets(card, actorId);
      if (targetInfo.type === "none") return { type: "none", target: null, candidate: null };
      if (targetInfo.type === "self") return {
        type: "self", target: this.battle.participants[actorId], candidate: null
      };
      if (!requestedTarget) return { type: targetInfo.type, needsSelection: true,
        candidates: targetInfo.candidates };
      if (targetInfo.type === "opponent") {
        const participantId = requestedTarget.participantId;
        const found = targetInfo.candidates.find(candidate => candidate.participantId === participantId);
        if (!found) return { type: targetInfo.type, invalid: true };
        return { type: targetInfo.type, target: this.battle.participants[participantId], candidate: null };
      }
      const found = global.CardTargetSelection.findCandidate(
        targetInfo.candidates,
        candidate => candidate.owner === requestedTarget.owner &&
          candidate.zone === requestedTarget.zone && candidate.card.id === requestedTarget.cardId
      );
      if (!found) return { type: targetInfo.type, invalid: true };
      return { type: targetInfo.type, target: null, candidate: found };
    }

    // 供電腦/宿主 AI 使用。UI 的公開 playCard(index,target) 預設由 controlledId 出牌。
    playCard(index, target = null, actorId = this.controlledId) {
      this.assertAlive();
      if (!this.battle || this.battle.status !== "playing") {
        return { played: false, reason: "目前沒有進行中的對戰。" };
      }
      if (this.turnOrder.getCurrentParticipant() !== actorId) {
        return { played: false, reason: "還沒輪到這位參與者。" };
      }
      const deck = this.decks.get(actorId);
      const pool = this.pools.get(actorId);
      const hand = deck.snapshot().hand;
      if (!Number.isInteger(index) || index < 0 || index >= hand.length) {
        return { played: false, reason: "手牌索引無效。" };
      }
      const card = hand[index];
      const cost = this.cardCost(card, actorId);
      if (!pool.canAfford(cost)) return { played: false, reason: "資源不足。" };
      if (typeof this.rules.canPlay === "function" &&
          this.rules.canPlay({ game: this, card, actorId, target }) === false) {
        return { played: false, reason: "宿主規則不允許這次出牌。" };
      }
      const resolved = this.targetFor(card, actorId, target);
      if (resolved.invalid) return { played: false, reason: "目標已失效或不合法。" };
      if (resolved.needsSelection) {
        if (actorId === this.controlledId) {
          this.pending = { cardId: card.id, target: resolved.type };
          this.message = "請選擇目標。";
          this.render();
        }
        return { played: false, reason: "target-required", candidates: resolved.candidates };
      }
      if (!Array.isArray(card.effects) || !card.effects.length) {
        return { played: false, reason: "卡牌沒有可執行的效果。" };
      }
      const targetOwner = resolved.candidate?.owner ?? resolved.target?.id ?? actorId;
      const effectContext = {
        game: this, card, actorId, actor: this.battle.participants[actorId],
        target: resolved.target, targetCandidate: resolved.candidate,
        targetOwner, deck, targetDeck: this.decks.get(targetOwner),
        pool, resources: this.pools, battle: this.battle
      };
      for (const effect of card.effects) {
        const validation = this.registry.checkEffect(effect.type, { ...effectContext, effect });
        if (!validation.ok) return { played: false, reason: `卡牌效果不可用：${effect.type} (${validation.reason})` };
      }
      const before = this.snapshot();
      const visualSource = actorId === this.controlledId
        ? Array.from(this.handElement.querySelectorAll("[data-hand-fan-card]"))[index]
        : null;
      try {
        if (!pool.spend(cost)) return { played: false, reason: "資源不足。" };
        const results = [];
        for (const effect of card.effects) {
          const result = this.registry.executeEffect(effect.type, { ...effectContext, effect });
          if (!result.ok || (result.value && result.value.ok === false)) {
            throw new Error("卡牌效果執行失敗：" + effect.type);
          }
          results.push(result.value);
        }
        // 效果可能先移動手牌；依實體 ID 找到出牌卡後才棄牌。
        const currentIndex = deck.snapshot().hand.findIndex(item => item.id === card.id);
        if (currentIndex >= 0) deck.discardAt(currentIndex);
        this.pending = null;
        this.battle.log.push(`${this.battle.participants[actorId].name} 使用 ${card.name}。`);
        const winner = this.checkVictory();
        if (winner !== null) this.finish(winner);
        this.message = `${card.name} 已執行。`;
        // 必須在 render() 換掉手牌 DOM 前取得來源卡片幾何，否則飛行會被略過。
        if (actorId === this.controlledId) this.playFeedback(card, resolved, visualSource);
        this.render();
        this.hook("onCardPlay", { actorId, card: copy(card), results: copy(results) });
        this.hook("onStateChange", { event: "play-card" });
        return { played: true, card: copy(card), results: copy(results) };
      } catch (error) {
        this.restore(before, { notify: false });
        this.message = "操作已復原：" + (error.message || String(error));
        this.render();
        return { played: false, reason: this.message };
      }
    }

    mulligan(index = 0) {
      this.assertAlive();
      if (!this.battle || this.battle.status !== "playing" ||
          this.turnOrder.getCurrentParticipant() !== this.controlledId) {
        return { ok: false, reason: "目前無法換牌。" };
      }
      if (this.pending && this.pending.mode !== "mulligan") {
        return { ok: false, reason: "請先完成或取消目標選擇。" };
      }
      if (this.battle.freeSwaps < 1) return { ok: false, reason: "本回合免費換牌已用完。" };
      const deck = this.decks.get(this.controlledId);
      if (!deck.snapshot().hand[index]) return { ok: false, reason: "沒有可換的手牌。" };
      const before = this.snapshot();
      try {
        const moved = global.CardZoneTransfer.moveCard({
          sourceDeck: deck, sourceZone: "hand",
          destinationDeck: deck, destinationZone: "discardPile", cardSelection: index
        });
        if (!moved.ok) return moved;
        const drawn = deck.draw(1);
        this.battle.freeSwaps -= 1;
        this.pending = null;
        this.show("換牌完成。", "mulligan");
        return { ok: true, movedCard: moved.movedCard, drawn };
      } catch (error) {
        this.restore(before, { notify: false });
        return { ok: false, reason: error.message };
      }
    }

    start() {
      this.assertAlive();
      const validation = this.getLoadoutValidation();
      if (!validation.valid) {
        this.screen = "loadout";
        this.show("無法開始：" + validation.reason);
        return { started: false, reason: validation.reason };
      }
      const participantMap = Object.fromEntries(this.participantDefinitions.map(participant => {
        const item = copy(participant);
        global.CombatStats.normalize(item);
        return [item.id, item];
      }));
      const nextDecks = new Map();
      const nextPools = new Map();
      for (const participant of this.participantDefinitions) {
        let cards;
        if (participant.id === this.controlledId) {
          cards = validation.resolvedCards.map(item => copy(item));
        } else {
          const source = this.options.opponentCards || this.options.cards;
          cards = createDefaultCollection(source).map((item, index) => ({
            ...item, id: `${participant.id}-${index}-${item.id}`
          }));
        }
        nextDecks.set(participant.id, global.Deck.create({
          items: cards, handSize: this.rules.handSize, random: this.random
        }));
        nextPools.set(participant.id, global.CardResourcePool.createPool(this.options.resources));
      }
      // 讓敵方從第一回合就有可選的手牌，棄牌／交換才不是空功能。
      for (const participant of this.participantDefinitions) {
        if (participant.id !== this.controlledId) {
          nextDecks.get(participant.id).drawToHand(this.rules.handSize);
        }
      }
      this.decks = nextDecks;
      this.pools = nextPools;
      this.turnOrder = global.CardTurnOrder.createTurnOrder(this.participantDefinitions.map(item => item.id));
      this.battle = { status: "playing", winner: null, participants: participantMap,
        log: ["對戰開始。"], freeSwaps: this.rules.freeSwapsPerTurn };
      this.pending = null;
      this.screen = "battle";
      this.beginTurn();
      this.show("對戰開始。", "start");
      this.hook("onStart");
      return { started: true };
    }

    restart() {
      return this.start();
    }

    beginTurn() {
      if (!this.battle || this.battle.status !== "playing") return;
      const id = this.turnOrder.getCurrentParticipant();
      this.turnOrder.setCurrentPhase("main");
      const pool = this.pools.get(id);
      const context = { game: this, participantId: id, pool, deck: this.decks.get(id), battle: this.battle };
      if (typeof this.rules.onTurnStart === "function") {
        this.rules.onTurnStart(context);
      } else {
        if (this.rules.refillEachTurn) pool.restoreSnapshot(this.options.resources);
        this.decks.get(id).drawToHand(this.rules.handSize);
      }
      if (id === this.controlledId) this.battle.freeSwaps = this.rules.freeSwapsPerTurn;
      this.battle.log.push(`${this.battle.participants[id].name} 回合開始。`);
      this.hook("onTurnStart", { participantId: id });
    }

    endTurn() {
      this.assertAlive();
      if (!this.battle || this.battle.status !== "playing") return { ended: false, reason: "對戰已結束。" };
      if (this.pending) return { ended: false, reason: "請先取消或完成目標選擇。" };
      const currentId = this.turnOrder.getCurrentParticipant();
      const context = { game: this, participantId: currentId, battle: this.battle,
        deck: this.decks.get(currentId), pool: this.pools.get(currentId) };
      if (typeof this.rules.onTurnEnd === "function") {
        this.rules.onTurnEnd(context);
      } else {
        this.decks.get(currentId).discardAll();
      }
      this.advanceTurn();
      this.beginTurn();
      // 預設自動處理電腦回合；每圈最多處理參與者數以避免覆蓋規則造成無窮迴圈。
      let visited = 0;
      while (this.battle.status === "playing" &&
          this.battle.participants[this.turnOrder.getCurrentParticipant()].ai &&
          visited < this.participantDefinitions.length) {
        this.performAiTurn();
        if (this.battle.status !== "playing") break;
        const aiId = this.turnOrder.getCurrentParticipant();
        if (typeof this.rules.onTurnEnd === "function") {
          this.rules.onTurnEnd({ game: this, participantId: aiId, battle: this.battle,
            deck: this.decks.get(aiId), pool: this.pools.get(aiId) });
        } else {
          // 保留 AI 尚未使用的手牌，供玩家的敵方棄牌與交換卡作為目標。
          // 宿主可以在 rules.onTurnEnd 改為其他丟棄／保留規則。
        }
        this.advanceTurn();
        this.beginTurn();
        visited += 1;
      }
      this.show("回合已推進。", "end-turn");
      return { ended: true, current: this.turnOrder.getCurrentParticipant() };
    }

    advanceTurn() {
      if (typeof this.rules.advanceTurn === "function") {
        this.rules.advanceTurn({ game: this, battle: this.battle, turnOrder: this.turnOrder });
      } else {
        this.turnOrder.advanceTurn();
      }
    }

    performAiTurn() {
      const id = this.turnOrder.getCurrentParticipant();
      if (typeof this.options.actions.aiTurn === "function") {
        this.options.actions.aiTurn({ game: this, participantId: id,
          deck: this.decks.get(id), pool: this.pools.get(id), battle: this.battle });
        return;
      }
      for (let attempt = 0; attempt < this.rules.aiCardsPerTurn; attempt += 1) {
        if (this.battle.status !== "playing") break;
        const hand = this.decks.get(id).snapshot().hand;
        let played = false;
        for (let index = 0; index < hand.length; index += 1) {
          const card = hand[index];
          if (!this.pools.get(id).canAfford(this.cardCost(card, id))) continue;
          let target = null;
          const resolved = this.resolveTargets(card, id);
          if (resolved.type === "opponent") {
            target = resolved.candidates[0] || null;
          } else if (resolved.type.endsWith("-hand")) {
            const chosen = global.CardTargetSelection.pickRandomCandidate(resolved.candidates, this.random);
            if (chosen) target = { owner: chosen.owner, zone: chosen.zone, cardId: chosen.card.id };
          }
          if (resolved.type !== "none" && resolved.type !== "self" && !target) continue;
          const result = this.playCard(index, target, id);
          if (result.played) { played = true; break; }
        }
        if (!played) break;
      }
    }

    finish(winner) {
      if (!this.battle || this.battle.status !== "playing") return;
      this.battle.status = "finished";
      this.battle.winner = winner;
      this.pending = null;
      this.battle.log.push(`對戰結束：${winner === "draw" ? "平手" : (this.battle.participants[winner]?.name || winner) + " 獲勝"}。`);
      this.hook("onFinish", { winner });
    }

    playFeedback(card, resolved, source) {
      const options = this.options.feedback;
      if (options.animation !== false) {
        try {
          const target = resolved.target
            ? Array.from(this.stage.querySelectorAll("[data-participant-id]")).find(
              element => element.dataset.participantId === resolved.target.id
            )
            : this.stage.querySelector(".scs-enemy");
          if (source && target) {
            Promise.resolve(global.SlowlyElementFlight.play({
              source, target, duration: amount(options.flightDuration, 350)
            })).catch(error => console.warn("[SlowlyCardStrategy] 飛行動畫已略過。", error));
          }
          if (card.effects.some(effect => effect.type === "attack")) {
            Promise.resolve(global.SlowlyImpactSlash.play(this.stage, {
              ...(options.slash || {}), target: target || undefined
            })).catch(error => console.warn("[SlowlyCardStrategy] 斬擊特效已略過。", error));
          }
        } catch (error) {
          console.warn("[SlowlyCardStrategy] 特效不影響戰鬥規則。", error);
        }
      }
      if (options.vibration === true) this.vibration.play(options.vibrationPattern ?? [20]);
      if (options.sound === true && global.SlowlyAudioTone?.play) {
        Promise.resolve(global.SlowlyAudioTone.play({ frequency: 460, duration: 0.08, gain: 0.07 }))
          .catch(error => console.warn("[SlowlyCardStrategy] 音效不影響規則。", error));
      }
    }

    setFeedbackEnabled(key, enabled) {
      this.assertAlive();
      if (!["animation", "vibration", "sound"].includes(key)) throw new RangeError("未知的回饋類型。");
      this.options.feedback[key] = Boolean(enabled);
      if (key === "vibration") this.vibration.setEnabled(Boolean(enabled));
      return this;
    }

    setLayouts(layouts) {
      this.assertAlive();
      this.stageLayout.setLayouts(layouts);
      return this;
    }

    snapshot() {
      this.assertAlive();
      const runtime = this.battle ? {
        battle: copy(this.battle),
        decks: Object.fromEntries(Array.from(this.decks).map(([id, deck]) => [id, deck.snapshot()])),
        resources: Object.fromEntries(Array.from(this.pools).map(([id, pool]) => [id, pool.getSnapshot()])),
        turnOrder: this.turnOrder.getSnapshot()
      } : null;
      return copy({ snapshotVersion: SNAPSHOT_VERSION, componentVersion: VERSION,
        collection: this.collection, loadoutIds: this.loadoutIds,
        upgradeTokens: this.upgradeTokens, screen: this.screen,
        message: this.message, runtime });
    }

    getState() {
      return this.snapshot();
    }

    restore(snapshot, { notify = true } = {}) {
      this.assertAlive();
      if (!isRecord(snapshot) || snapshot.snapshotVersion !== SNAPSHOT_VERSION ||
          !Array.isArray(snapshot.collection) || !Array.isArray(snapshot.loadoutIds)) {
        throw new TypeError("策略卡牌快照格式不正確。");
      }
      if (global.CardInstanceIdentity.findDuplicateInstanceIds(snapshot.collection).length) {
        throw new Error("快照收藏含重複實體卡 ID。");
      }
      const nextCollection = copy(snapshot.collection);
      const nextLoadout = copy(snapshot.loadoutIds);
      const nextTokens = amount(snapshot.upgradeTokens, 0);
      let nextBattle = null;
      let nextDecks = new Map();
      let nextPools = new Map();
      let nextTurnOrder = null;
      if (snapshot.runtime !== null && snapshot.runtime !== undefined) {
        const runtime = snapshot.runtime;
        if (!isRecord(runtime.battle) || !isRecord(runtime.decks) ||
            !isRecord(runtime.resources) || !isRecord(runtime.turnOrder)) {
          throw new TypeError("快照戰鬥資料不完整。");
        }
        nextBattle = copy(runtime.battle);
        const ids = this.participantDefinitions.map(item => item.id);
        for (const id of ids) {
          if (!isRecord(nextBattle.participants?.[id])) throw new Error("快照缺少參與者：" + id);
          const deckSnapshot = runtime.decks[id];
          const deck = global.Deck.create({ items: [], handSize: this.rules.handSize, random: this.random });
          deck.restore(deckSnapshot);
          nextDecks.set(id, deck);
          nextPools.set(id, global.CardResourcePool.createPool(runtime.resources[id]));
        }
        nextTurnOrder = global.CardTurnOrder.createTurnOrder(ids);
        nextTurnOrder.restoreSnapshot(runtime.turnOrder);
      }
      this.collection = nextCollection;
      this.loadoutIds = nextLoadout;
      this.upgradeTokens = nextTokens;
      this.battle = nextBattle;
      this.decks = nextDecks;
      this.pools = nextPools;
      this.turnOrder = nextTurnOrder;
      this.screen = ["collection", "upgrade", "loadout", "battle"].includes(snapshot.screen)
        ? snapshot.screen : "collection";
      this.message = String(snapshot.message || "已還原狀態。");
      this.pending = null; // 目標選擇是短暫 UI，不儲存 DOM 選取狀態。
      this.render();
      if (notify) this.hook("onStateChange", { event: "restore" });
      return this;
    }

    destroy() {
      if (this.destroyed) return;
      this.vibration.stop();
      global.SlowlyImpactSlash.clear(this.stage);
      this.fan.destroy();
      this.stageLayout.destroy();
      this.target.replaceChildren();
      this.destroyed = true;
    }
  }

  global.SlowlyCardStrategy = Object.freeze({
    version: VERSION,
    mount(target, options = {}) {
      const element = typeof target === "string" ? document.querySelector(target) : target;
      if (!(element instanceof global.HTMLElement)) {
        throw new Error("[SlowlyCardStrategy] 找不到 mount 的 HTML 容器。");
      }
      return new StrategyComponent(element, options);
    }
  });
})(typeof window !== "undefined" ? window : globalThis);
