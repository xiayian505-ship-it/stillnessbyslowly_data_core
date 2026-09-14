/* =========================================================
   Slowly Card Battle Component
   v1.0.0

   必要依賴：
   - Deck 1.1+
   - CombatStats
   - DamageRoll
   - ChargeState
   - CombatantConfig
   - ActionPattern

   Component 負責：
   - 卡牌戰鬥流程
   - 玩家能量
   - 內建卡牌效果與敵人行動
   - DOM 結構與必要 UI 狀態
   - snapshot / restore
   - 宿主 effects / actions / renderers / formatters / callbacks 擴充

   不負責：
   - 專案導航
   - 永久儲存位置
   - 音效
   - 遊戲世界資料
   - 專案視覺皮膚
========================================================= */

(function (global) {
  "use strict";

  const VERSION = "1.0.0";
  const SNAPSHOT_VERSION = 1;

  const REQUIRED_DEPENDENCIES = [
    "Deck",
    "CombatStats",
    "DamageRoll",
    "ChargeState",
    "CombatantConfig",
    "ActionPattern"
  ];

  const DEFAULT_CARDS = [
    {
      id: "strike-1",
      name: "攻擊",
      cost: 1,
      description: "造成 4 點傷害。",
      effects: [{ type: "attack", amount: 4 }]
    },
    {
      id: "strike-2",
      name: "攻擊",
      cost: 1,
      description: "造成 4 點傷害。",
      effects: [{ type: "attack", amount: 4 }]
    },
    {
      id: "guard",
      name: "防禦",
      cost: 1,
      description: "獲得 4 點護盾。",
      effects: [{ type: "guard", amount: 4 }]
    },
    {
      id: "energy",
      name: "充能",
      cost: 0,
      description: "恢復 1 點能量。",
      effects: [{ type: "energy", amount: 1 }]
    },
    {
      id: "heal",
      name: "治療",
      cost: 2,
      description: "恢復 3 HP。",
      effects: [{ type: "heal", amount: 3 }]
    }
  ];

  const DEFAULTS = {
    autoStart: true,

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
      pattern: ["attack", "attack", "guard", "charge"],
      meta: {}
    },

    cards: DEFAULT_CARDS,

    rules: {
      handSize: 4,
      resetEnergyEachTurn: true
    },

    effects: {},
    actions: {},
    renderers: {},
    formatters: {},
    callbacks: {},
    random: null
  };

  function deepClone(value) {
    if (value === undefined) return undefined;

    if (typeof global.structuredClone === "function") {
      try {
        return global.structuredClone(value);
      } catch (_) {
        // options 內可能含 function；純資料 snapshot 才需要真正 clone。
      }
    }

    return JSON.parse(JSON.stringify(value));
  }

  function resolveTarget(target) {
    return typeof target === "string"
      ? document.querySelector(target)
      : target;
  }

  function finiteNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function nonNegative(value, fallback = 0) {
    return Math.max(0, finiteNumber(value, fallback));
  }

  function nonNegativeInt(value, fallback = 0) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) return fallback;
    return Math.floor(number);
  }

  function text(value, fallback = "") {
    const result = String(value ?? "").trim();
    return result || fallback;
  }

  function percent(current, max) {
    const high = finiteNumber(max, 0);
    if (high <= 0) return 0;
    const value = finiteNumber(current, 0) / high * 100;
    return Math.max(0, Math.min(100, value));
  }

  function mergeOptions(options) {
    const input = options && typeof options === "object" ? options : {};

    return {
      ...DEFAULTS,
      ...input,

      player: {
        ...DEFAULTS.player,
        ...(input.player || {}),
        meta: {
          ...DEFAULTS.player.meta,
          ...(input.player?.meta || {})
        }
      },

      enemy: {
        ...DEFAULTS.enemy,
        ...(input.enemy || {}),
        meta: {
          ...DEFAULTS.enemy.meta,
          ...(input.enemy?.meta || {})
        }
      },

      cards: Array.isArray(input.cards)
        ? input.cards.slice()
        : DEFAULT_CARDS.map(card => deepClone(card)),

      rules: {
        ...DEFAULTS.rules,
        ...(input.rules || {})
      },

      effects: {
        ...DEFAULTS.effects,
        ...(input.effects || {})
      },

      actions: {
        ...DEFAULTS.actions,
        ...(input.actions || {})
      },

      renderers: {
        ...DEFAULTS.renderers,
        ...(input.renderers || {})
      },

      formatters: {
        ...DEFAULTS.formatters,
        ...(input.formatters || {})
      },

      callbacks: {
        ...DEFAULTS.callbacks,
        ...(input.callbacks || {})
      }
    };
  }

  function assertDependencies() {
    const missing = REQUIRED_DEPENDENCIES.filter(name => !global[name]);

    if (missing.length > 0) {
      throw new Error(
        `[SlowlyCardBattle] Missing dependency: ${missing.join(", ")}`
      );
    }

    const deckVersion = String(global.Deck?.version || "");
    if (deckVersion && deckVersion.startsWith("1.0.")) {
      throw new Error(
        "[SlowlyCardBattle] Deck 1.1.0 or newer is required for restore()."
      );
    }
  }

  function normalizeCards(cards) {
    const result = [];
    const ids = new Set();

    cards.forEach((raw, index) => {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        throw new TypeError(
          `[SlowlyCardBattle] cards[${index}] must be an object.`
        );
      }

      const id = text(raw.id);
      if (!id) {
        throw new Error(
          `[SlowlyCardBattle] cards[${index}] requires a non-empty id.`
        );
      }

      if (ids.has(id)) {
        throw new Error(`[SlowlyCardBattle] Duplicate card id: ${id}`);
      }

      ids.add(id);

      const effects = Array.isArray(raw.effects)
        ? raw.effects.map(effect => ({ ...(effect || {}) }))
        : [];

      result.push({
        ...raw,
        id,
        name: text(raw.name, id),
        cost: nonNegative(raw.cost, 0),
        description: String(raw.description ?? ""),
        effects,
        meta: raw.meta && typeof raw.meta === "object"
          ? deepClone(raw.meta)
          : {}
      });
    });

    return result;
  }

  function normalizePlayer(input) {
    const stats = global.CombatantConfig.normalize(input, DEFAULTS.player);
    const energyMax = nonNegative(input.energyMax, DEFAULTS.player.energyMax);
    const rawEnergy = finiteNumber(input.energy, energyMax);

    return {
      name: text(input.name, DEFAULTS.player.name),
      ...stats,
      energyMax,
      energy: Math.max(0, Math.min(energyMax, rawEnergy)),
      meta: input.meta && typeof input.meta === "object"
        ? deepClone(input.meta)
        : {}
    };
  }

  function normalizeEnemy(input) {
    const stats = global.CombatantConfig.normalize(input, DEFAULTS.enemy);

    return {
      name: text(input.name, DEFAULTS.enemy.name),
      ...stats,
      guardValue: nonNegative(input.guardValue, DEFAULTS.enemy.guardValue),
      chargeBonus: nonNegative(input.chargeBonus, DEFAULTS.enemy.chargeBonus),
      pattern: Array.isArray(input.pattern)
        ? input.pattern.slice()
        : DEFAULTS.enemy.pattern.slice(),
      meta: input.meta && typeof input.meta === "object"
        ? deepClone(input.meta)
        : {}
    };
  }

  class CardBattleComponent {
    constructor(target, options = {}) {
      assertDependencies();

      this.target = target;
      this.options = mergeOptions(options);
      this.cards = normalizeCards(this.options.cards);
      this.rules = {
        handSize: nonNegativeInt(
          this.options.rules.handSize,
          DEFAULTS.rules.handSize
        ),
        resetEnergyEachTurn:
          this.options.rules.resetEnergyEachTurn !== false
      };

      this.random = typeof this.options.random === "function"
        ? this.options.random
        : Math.random;

      this.basePlayer = normalizePlayer(this.options.player);
      this.baseEnemy = normalizeEnemy(this.options.enemy);

      this.deck = global.Deck.create({
        items: this.cards,
        handSize: this.rules.handSize,
        random: this.random
      });

      this.charge = global.ChargeState.create({ initial: 0 });
      this.pattern = global.ActionPattern.create(
        this.baseEnemy.pattern,
        { fallback: "attack" }
      );

      this.state = this.createIdleState();
      this.destroyed = false;

      this.build();

      if (this.options.autoStart !== false) {
        this.start();
      } else {
        this.render();
      }
    }

    createIdleState() {
      return {
        status: "idle",
        turn: null,
        round: 0,
        player: deepClone(this.basePlayer),
        enemy: deepClone(this.baseEnemy),
        message: "尚未開始戰鬥。"
      };
    }

    build() {
      this.target.replaceChildren();

      const root = document.createElement("section");
      root.className = "slowly-card-battle";
      root.innerHTML = `
        <div class="scb-arena">
          <article class="scb-combatant scb-player-panel" data-side="player">
            <header class="scb-combatant-header">
              <strong class="scb-name scb-player-name"></strong>
              <span class="scb-shield-label scb-player-shield"></span>
            </header>
            <div class="scb-visual scb-player-visual"></div>
            <div class="scb-stat-row">
              <span>HP</span>
              <span class="scb-player-hp-text"></span>
            </div>
            <div class="scb-meter" role="progressbar" aria-label="玩家 HP">
              <span class="scb-meter-fill scb-player-hp-fill"></span>
            </div>
          </article>

          <div class="scb-center">
            <div class="scb-round"></div>
            <div class="scb-turn"></div>
          </div>

          <article class="scb-combatant scb-enemy-panel" data-side="enemy">
            <header class="scb-combatant-header">
              <strong class="scb-name scb-enemy-name"></strong>
              <span class="scb-shield-label scb-enemy-shield"></span>
            </header>
            <div class="scb-visual scb-enemy-visual"></div>
            <div class="scb-stat-row">
              <span>HP</span>
              <span class="scb-enemy-hp-text"></span>
            </div>
            <div class="scb-meter" role="progressbar" aria-label="敵人 HP">
              <span class="scb-meter-fill scb-enemy-hp-fill"></span>
            </div>
            <div class="scb-charge"></div>
          </article>
        </div>

        <div class="scb-resource-row">
          <div class="scb-energy-block">
            <div class="scb-stat-row">
              <span>能量</span>
              <span class="scb-energy-text"></span>
            </div>
            <div class="scb-meter scb-energy-meter" role="progressbar" aria-label="玩家能量">
              <span class="scb-meter-fill scb-energy-fill"></span>
            </div>
          </div>
          <div class="scb-piles" aria-live="polite">
            <span class="scb-draw-count"></span>
            <span class="scb-discard-count"></span>
          </div>
        </div>

        <section class="scb-hand-section" aria-label="手牌">
          <div class="scb-hand"></div>
        </section>

        <div class="scb-controls">
          <button type="button" class="scb-end-turn">結束回合</button>
        </div>

        <p class="scb-status" aria-live="polite"></p>
      `;

      this.target.appendChild(root);
      this.root = root;

      this.refs = {
        playerName: root.querySelector(".scb-player-name"),
        playerShield: root.querySelector(".scb-player-shield"),
        playerVisual: root.querySelector(".scb-player-visual"),
        playerHPText: root.querySelector(".scb-player-hp-text"),
        playerHPFill: root.querySelector(".scb-player-hp-fill"),
        playerHPMeter: root.querySelector(".scb-player-panel .scb-meter"),

        enemyName: root.querySelector(".scb-enemy-name"),
        enemyShield: root.querySelector(".scb-enemy-shield"),
        enemyVisual: root.querySelector(".scb-enemy-visual"),
        enemyHPText: root.querySelector(".scb-enemy-hp-text"),
        enemyHPFill: root.querySelector(".scb-enemy-hp-fill"),
        enemyHPMeter: root.querySelector(".scb-enemy-panel .scb-meter"),
        charge: root.querySelector(".scb-charge"),

        round: root.querySelector(".scb-round"),
        turn: root.querySelector(".scb-turn"),
        energyText: root.querySelector(".scb-energy-text"),
        energyFill: root.querySelector(".scb-energy-fill"),
        energyMeter: root.querySelector(".scb-energy-meter"),
        drawCount: root.querySelector(".scb-draw-count"),
        discardCount: root.querySelector(".scb-discard-count"),
        hand: root.querySelector(".scb-hand"),
        endTurn: root.querySelector(".scb-end-turn"),
        status: root.querySelector(".scb-status")
      };

      this.refs.endTurn.addEventListener("click", () => {
        try {
          this.endTurn();
        } catch (error) {
          this.showRuntimeError(error);
        }
      });
    }

    assertAlive() {
      if (this.destroyed) {
        throw new Error("[SlowlyCardBattle] This instance has been destroyed.");
      }
    }

    formatNumber(value) {
      const formatter = this.options.formatters.number;

      if (typeof formatter === "function") {
        return String(formatter(value));
      }

      return Number.isFinite(Number(value))
        ? Number(value).toLocaleString()
        : String(value);
    }

    callback(name, detail = {}) {
      const fn = this.options.callbacks[name];
      if (typeof fn !== "function") return;

      try {
        fn({
          battle: this,
          state: this.getState(),
          ...detail
        });
      } catch (error) {
        console.error(`[SlowlyCardBattle] ${name} callback failed.`, error);
      }
    }

    emitStateChange(reason, detail = {}) {
      this.callback("onStateChange", { reason, ...detail });
    }

    runtimeContext(extra = {}) {
      return {
        battle: this,
        player: this.state.player,
        enemy: this.state.enemy,
        deck: this.deck,
        charge: this.charge,
        pattern: this.pattern,
        stats: global.CombatStats,
        damageRoll: global.DamageRoll,
        setMessage: message => {
          this.state.message = String(message ?? "");
        },
        finish: result => this.finish(result),
        ...extra
      };
    }

    start() {
      this.assertAlive();

      this.state = {
        status: "playing",
        turn: "player",
        round: 1,
        player: deepClone(this.basePlayer),
        enemy: deepClone(this.baseEnemy),
        message: "戰鬥開始。"
      };

      global.CombatStats.normalize(this.state.player);
      global.CombatStats.normalize(this.state.enemy);

      this.deck.reset(this.cards);
      this.deck.setHandSize(this.rules.handSize);
      this.charge.clear();
      this.pattern.setPattern(this.baseEnemy.pattern);
      this.pattern.setFallback("attack");
      this.pattern.reset(0);

      this.beginPlayerTurn({ initial: true });
      this.callback("onStart");
      this.emitStateChange("start");
      return this;
    }

    restart() {
      return this.start();
    }

    beginPlayerTurn({ initial = false } = {}) {
      if (this.state.status !== "playing") return;

      this.state.turn = "player";

      if (!initial && this.rules.resetEnergyEachTurn) {
        this.state.player.energy = this.state.player.energyMax;
      }

      this.deck.drawToHand();

      if (!initial) {
        this.state.message = `第 ${this.state.round} 回合。`;
      }

      this.render();
      this.callback("onTurnStart", { turn: "player" });
    }

    validateEffect(effect) {
      if (!effect || typeof effect !== "object" || Array.isArray(effect)) {
        throw new TypeError("[SlowlyCardBattle] Card effect must be an object.");
      }

      const type = text(effect.type);
      if (!type) {
        throw new Error("[SlowlyCardBattle] Card effect requires type.");
      }

      if (!this.builtinEffects()[type] && typeof this.options.effects[type] !== "function") {
        throw new Error(`[SlowlyCardBattle] Unknown card effect: ${type}`);
      }

      return type;
    }

    builtinEffects() {
      return {
        attack: (context, effect) => {
          const amount = nonNegative(effect.amount, 0);
          const result = global.CombatStats.damage(context.enemy, amount);
          this.state.message = `造成 ${this.formatNumber(result.damage)} 點傷害。`;
          return result;
        },

        guard: (context, effect) => {
          const amount = nonNegative(effect.amount, 0);
          const result = global.CombatStats.addShield(context.player, amount);
          this.state.message = `獲得 ${this.formatNumber(result.added)} 點護盾。`;
          return result;
        },

        heal: (context, effect) => {
          const amount = nonNegative(effect.amount, 0);
          const result = global.CombatStats.heal(context.player, amount);
          this.state.message = `恢復 ${this.formatNumber(result.healed)} HP。`;
          return result;
        },

        energy: (context, effect) => {
          const amount = nonNegative(effect.amount, 0);
          const before = context.player.energy;
          context.player.energy = Math.min(
            context.player.energyMax,
            context.player.energy + amount
          );
          const added = context.player.energy - before;
          this.state.message = `恢復 ${this.formatNumber(added)} 點能量。`;
          return { added, energy: context.player.energy };
        }
      };
    }

    executeCardEffect(card, effect, index) {
      const type = this.validateEffect(effect);
      const context = this.runtimeContext({ card, effect, cardIndex: index });
      const builtin = this.builtinEffects()[type];

      if (builtin) {
        return builtin(context, effect);
      }

      return this.options.effects[type](context, effect);
    }

    playCard(index) {
      this.assertAlive();

      if (this.state.status !== "playing") {
        return { played: false, reason: "not-playing" };
      }

      if (this.state.turn !== "player") {
        return { played: false, reason: "not-player-turn" };
      }

      const deckState = this.deck.snapshot();
      const position = Number(index);

      if (!Number.isInteger(position) || position < 0 || position >= deckState.hand.length) {
        return { played: false, reason: "invalid-card-index" };
      }

      const card = deckState.hand[position];
      const cost = nonNegative(card.cost, 0);

      if (this.state.player.energy < cost) {
        this.state.message = "能量不足。";
        this.render();
        return { played: false, reason: "insufficient-energy", card };
      }

      const effects = Array.isArray(card.effects) ? card.effects : [];
      effects.forEach(effect => this.validateEffect(effect));

      const before = this.snapshot();

      try {
        this.state.player.energy -= cost;

        const results = effects.map(effect =>
          this.executeCardEffect(card, effect, position)
        );

        this.deck.discardAt(position);

        this.callback("onCardPlay", {
          card: deepClone(card),
          index: position,
          results: deepClone(results)
        });

        this.checkResult();
        this.render();
        this.emitStateChange("card-play", { card: deepClone(card) });

        return {
          played: true,
          card: deepClone(card),
          results: deepClone(results)
        };
      } catch (error) {
        this.applySnapshot(before, { notify: false });
        this.render();
        throw error;
      }
    }

    validateAction(action) {
      const type = text(action);
      if (!type) {
        throw new Error("[SlowlyCardBattle] Enemy action must be a non-empty string.");
      }

      if (!this.builtinActions()[type] && typeof this.options.actions[type] !== "function") {
        throw new Error(`[SlowlyCardBattle] Unknown enemy action: ${type}`);
      }

      return type;
    }

    builtinActions() {
      return {
        attack: context => {
          const bonus = context.charge.consume();
          const roll = global.DamageRoll.roll(
            context.enemy.attackMin,
            context.enemy.attackMax,
            { bonus, rng: this.random }
          );
          const damage = global.CombatStats.damage(context.player, roll.total);

          this.state.message = `${context.enemy.name} 攻擊，造成 ${this.formatNumber(damage.damage)} 點傷害。`;

          return { roll, damage };
        },

        guard: context => {
          const result = global.CombatStats.addShield(
            context.enemy,
            context.enemy.guardValue
          );
          this.state.message = `${context.enemy.name} 獲得 ${this.formatNumber(result.added)} 點護盾。`;
          return result;
        },

        charge: context => {
          const value = context.charge.add(context.enemy.chargeBonus);
          this.state.message = `${context.enemy.name} 蓄力，累積 ${this.formatNumber(value)}。`;
          return { value };
        }
      };
    }

    executeEnemyAction(action) {
      const type = this.validateAction(action);
      const context = this.runtimeContext({ action: type });
      const builtin = this.builtinActions()[type];

      if (builtin) {
        return builtin(context);
      }

      return this.options.actions[type](context, type);
    }

    enemyTurn() {
      if (this.state.status !== "playing") return null;

      const before = this.snapshot();

      try {
        const action = this.pattern.next();
        const result = this.executeEnemyAction(action);

        this.callback("onEnemyAction", {
          action,
          result: deepClone(result)
        });

        this.checkResult();
        return { action, result };
      } catch (error) {
        this.applySnapshot(before, { notify: false });
        this.render();
        throw error;
      }
    }

    endTurn() {
      this.assertAlive();

      if (this.state.status !== "playing") {
        return { ended: false, reason: "not-playing" };
      }

      if (this.state.turn !== "player") {
        return { ended: false, reason: "not-player-turn" };
      }

      this.state.turn = "enemy";
      this.render();
      this.callback("onTurnStart", { turn: "enemy" });

      const enemyResult = this.enemyTurn();

      if (this.state.status === "playing") {
        this.state.round += 1;
        this.beginPlayerTurn();
      } else {
        this.render();
      }

      this.emitStateChange("end-turn", {
        enemyAction: enemyResult ? enemyResult.action : null
      });

      return {
        ended: true,
        enemy: enemyResult
      };
    }

    checkResult() {
      if (this.state.status !== "playing") return this.state.status;

      if (global.CombatStats.isDefeated(this.state.enemy)) {
        this.finish("won");
        return "won";
      }

      if (global.CombatStats.isDefeated(this.state.player)) {
        this.finish("lost");
        return "lost";
      }

      return "playing";
    }

    finish(result) {
      if (this.state.status !== "playing") return this.state.status;

      if (result !== "won" && result !== "lost") {
        throw new Error("[SlowlyCardBattle] finish() result must be won or lost.");
      }

      this.state.status = result;
      this.state.turn = null;
      this.state.message = result === "won" ? "戰鬥勝利。" : "戰鬥失敗。";

      this.render();

      if (result === "won") {
        this.callback("onWin");
      } else {
        this.callback("onLose");
      }

      this.callback("onFinish", { result });
      this.emitStateChange("finish", { result });
      return result;
    }

    snapshot() {
      this.assertAlive();

      return deepClone({
        snapshotVersion: SNAPSHOT_VERSION,
        componentVersion: VERSION,
        status: this.state.status,
        turn: this.state.turn,
        round: this.state.round,
        message: this.state.message,
        player: this.state.player,
        enemy: this.state.enemy,
        charge: this.charge.getState(),
        pattern: this.pattern.getState(),
        deck: this.deck.snapshot()
      });
    }

    getState() {
      return this.snapshot();
    }

    applySnapshot(snapshot, { notify = true } = {}) {
      if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
        throw new TypeError("[SlowlyCardBattle] restore() requires a snapshot object.");
      }

      if (!snapshot.player || typeof snapshot.player !== "object") {
        throw new TypeError("[SlowlyCardBattle] snapshot.player is required.");
      }

      if (!snapshot.enemy || typeof snapshot.enemy !== "object") {
        throw new TypeError("[SlowlyCardBattle] snapshot.enemy is required.");
      }

      if (!snapshot.deck || typeof snapshot.deck !== "object") {
        throw new TypeError("[SlowlyCardBattle] snapshot.deck is required.");
      }

      if (!snapshot.pattern || typeof snapshot.pattern !== "object") {
        throw new TypeError("[SlowlyCardBattle] snapshot.pattern is required.");
      }

      if (!snapshot.charge || typeof snapshot.charge !== "object") {
        throw new TypeError("[SlowlyCardBattle] snapshot.charge is required.");
      }

      const player = {
        ...deepClone(snapshot.player),
        energyMax: nonNegative(snapshot.player.energyMax, this.basePlayer.energyMax)
      };
      player.energy = Math.max(
        0,
        Math.min(
          player.energyMax,
          finiteNumber(snapshot.player.energy, player.energyMax)
        )
      );
      global.CombatStats.normalize(player);

      const enemy = deepClone(snapshot.enemy);
      global.CombatStats.normalize(enemy);

      this.deck.restore(snapshot.deck);
      this.charge.set(snapshot.charge.value);
      this.pattern.setPattern(snapshot.pattern.pattern || []);
      this.pattern.setFallback(snapshot.pattern.fallback);
      this.pattern.reset(snapshot.pattern.index);

      const allowedStatus = new Set(["idle", "playing", "won", "lost"]);
      const status = allowedStatus.has(snapshot.status)
        ? snapshot.status
        : "playing";

      const turn = status === "playing" && (snapshot.turn === "player" || snapshot.turn === "enemy")
        ? snapshot.turn
        : null;

      this.state = {
        status,
        turn,
        round: Math.max(0, nonNegativeInt(snapshot.round, 0)),
        player,
        enemy,
        message: String(snapshot.message ?? "")
      };

      if (notify) {
        this.render();
        this.emitStateChange("restore");
      }

      return this;
    }

    restore(snapshot) {
      this.assertAlive();
      return this.applySnapshot(snapshot, { notify: true });
    }

    defaultCombatantRenderer(container, combatant) {
      container.replaceChildren();
      const label = document.createElement("span");
      label.className = "scb-visual-label";
      label.textContent = combatant.name;
      container.appendChild(label);
    }

    renderCombatant(kind) {
      const combatant = this.state[kind];
      const isPlayer = kind === "player";
      const nameRef = isPlayer ? this.refs.playerName : this.refs.enemyName;
      const shieldRef = isPlayer ? this.refs.playerShield : this.refs.enemyShield;
      const visualRef = isPlayer ? this.refs.playerVisual : this.refs.enemyVisual;
      const hpTextRef = isPlayer ? this.refs.playerHPText : this.refs.enemyHPText;
      const hpFillRef = isPlayer ? this.refs.playerHPFill : this.refs.enemyHPFill;
      const hpMeterRef = isPlayer ? this.refs.playerHPMeter : this.refs.enemyHPMeter;

      nameRef.textContent = combatant.name;
      shieldRef.textContent = `護盾 ${this.formatNumber(combatant.shield)}`;
      hpTextRef.textContent = `${this.formatNumber(combatant.hp)} / ${this.formatNumber(combatant.maxHP)}`;
      hpFillRef.style.width = `${percent(combatant.hp, combatant.maxHP)}%`;
      hpMeterRef.setAttribute("aria-valuemin", "0");
      hpMeterRef.setAttribute("aria-valuemax", String(combatant.maxHP));
      hpMeterRef.setAttribute("aria-valuenow", String(combatant.hp));

      const renderer = this.options.renderers[kind];
      if (typeof renderer === "function") {
        try {
          renderer(visualRef, {
            battle: this,
            combatant: deepClone(combatant),
            state: this.getState()
          });
          return;
        } catch (error) {
          console.error(`[SlowlyCardBattle] ${kind} renderer failed.`, error);
        }
      }

      this.defaultCombatantRenderer(visualRef, combatant);
    }

    defaultCardRenderer(button, card) {
      button.replaceChildren();

      const name = document.createElement("strong");
      name.className = "scb-card-name";
      name.textContent = card.name;

      const cost = document.createElement("span");
      cost.className = "scb-card-cost";
      cost.textContent = `Cost ${this.formatNumber(card.cost)}`;

      const description = document.createElement("span");
      description.className = "scb-card-description";
      description.textContent = card.description || "";

      button.append(name, cost, description);
    }

    renderHand() {
      const deckState = this.deck.snapshot();
      const fragment = document.createDocumentFragment();

      deckState.hand.forEach((card, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "scb-card";
        button.dataset.cardId = String(card.id ?? "");
        button.dataset.cardIndex = String(index);

        const disabled =
          this.state.status !== "playing" ||
          this.state.turn !== "player" ||
          this.state.player.energy < nonNegative(card.cost, 0);

        button.disabled = disabled;

        const renderer = this.options.renderers.card;
        if (typeof renderer === "function") {
          try {
            renderer(button, {
              battle: this,
              card: deepClone(card),
              index,
              state: this.getState()
            });
          } catch (error) {
            console.error("[SlowlyCardBattle] card renderer failed.", error);
            this.defaultCardRenderer(button, card);
          }
        } else {
          this.defaultCardRenderer(button, card);
        }

        button.addEventListener("click", () => {
          try {
            this.playCard(index);
          } catch (error) {
            this.showRuntimeError(error);
          }
        });

        fragment.appendChild(button);
      });

      this.refs.hand.replaceChildren(fragment);
      this.refs.drawCount.textContent = `牌庫 ${deckState.drawPile.length}`;
      this.refs.discardCount.textContent = `棄牌 ${deckState.discardPile.length}`;
    }

    render() {
      if (this.destroyed) return;

      this.root.dataset.status = this.state.status;
      this.root.dataset.turn = this.state.turn || "none";

      this.renderCombatant("player");
      this.renderCombatant("enemy");

      this.refs.round.textContent = this.state.round > 0
        ? `Round ${this.state.round}`
        : "Round —";

      const turnText = this.state.status === "playing"
        ? (this.state.turn === "player" ? "玩家回合" : "敵人回合")
        : (this.state.status === "won" ? "勝利" : this.state.status === "lost" ? "失敗" : "待機");

      this.refs.turn.textContent = turnText;

      this.refs.energyText.textContent = `${this.formatNumber(this.state.player.energy)} / ${this.formatNumber(this.state.player.energyMax)}`;
      this.refs.energyFill.style.width = `${percent(this.state.player.energy, this.state.player.energyMax)}%`;
      this.refs.energyMeter.setAttribute("aria-valuemin", "0");
      this.refs.energyMeter.setAttribute("aria-valuemax", String(this.state.player.energyMax));
      this.refs.energyMeter.setAttribute("aria-valuenow", String(this.state.player.energy));

      const chargeValue = this.charge.get();
      this.refs.charge.textContent = chargeValue > 0
        ? `蓄力 ${this.formatNumber(chargeValue)}`
        : "";

      this.refs.status.textContent = this.state.message || "";
      this.refs.endTurn.disabled = !(
        this.state.status === "playing" && this.state.turn === "player"
      );

      this.renderHand();
    }

    showRuntimeError(error) {
      const message = error instanceof Error ? error.message : String(error);
      this.state.message = message;
      this.render();
      console.error(error);
    }

    destroy() {
      if (this.destroyed) return;
      this.target.replaceChildren();
      this.destroyed = true;
    }
  }

  global.SlowlyCardBattle = Object.freeze({
    version: VERSION,

    mount(target, options = {}) {
      const element = resolveTarget(target);

      if (!element) {
        throw new Error("[SlowlyCardBattle] Mount target not found.");
      }

      return new CardBattleComponent(element, options);
    }
  });

})(typeof window !== "undefined" ? window : globalThis);
