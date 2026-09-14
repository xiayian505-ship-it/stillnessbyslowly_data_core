"use strict";

/* =========================================================
   慢慢的倉庫｜Slowly Game Shell v1.0.0

   通用遊戲外殼。

   必要依賴：
   - Timer
   - Ticker

   Game Shell 負責：
   - 手動 / 自動開始
   - 暫停 / 繼續
   - 重新開始
   - 遊戲時間
   - 可選存檔 Adapter
   - 可選自動存檔
   - 通用狀態 UI
   - 將遊戲內容與外殼生命週期解耦

   Game Shell 不負責：
   - 遊戲規則
   - 排行榜規則
   - 音效語意
   - Toast 實作
   - Storage / 後端實作
   - 專案視覺皮膚
========================================================= */

(function (global) {
  "use strict";

  const VERSION = "1.0.0";
  const SAVE_VERSION = 1;

  const REQUIRED_DEPENDENCIES = [
    "Timer",
    "Ticker"
  ];

  const DEFAULTS = {
    lifecycle: {
      autoStart: false
    },

    timer: {
      enabled: true,
      interval: 250
    },

    save: {
      adapter: null,
      id: "current-game",
      auto: false,
      resumePlayingOnLoad: true
    },

    labels: {
      start: "開始",
      pause: "暫停",
      resume: "繼續",
      restart: "重新開始",
      save: "儲存",
      load: "載入",
      removeSave: "刪除存檔",

      idle: "尚未開始",
      playing: "進行中",
      paused: "已暫停",
      ended: "已結束"
    },

    notify: null,

    callbacks: {}
  };

  function resolveTarget(target) {
    return typeof target === "string"
      ? document.querySelector(target)
      : target;
  }

  function isFunction(value) {
    return typeof value === "function";
  }

  function finiteNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number)
      ? number
      : fallback;
  }

  function mergeOptions(options = {}) {
    return {
      ...DEFAULTS,
      ...options,

      lifecycle: {
        ...DEFAULTS.lifecycle,
        ...(options.lifecycle || {})
      },

      timer: {
        ...DEFAULTS.timer,
        ...(options.timer || {})
      },

      save: {
        ...DEFAULTS.save,
        ...(options.save || {})
      },

      labels: {
        ...DEFAULTS.labels,
        ...(options.labels || {})
      },

      callbacks: {
        ...DEFAULTS.callbacks,
        ...(options.callbacks || {})
      }
    };
  }

  function assertDependencies() {
    const missing = REQUIRED_DEPENDENCIES.filter(
      (name) => !global[name]
    );

    if (missing.length > 0) {
      throw new Error(
        `[SlowlyGameShell] Missing dependency: ${missing.join(", ")}`
      );
    }
  }

  function validateGameAdapter(adapter) {
    if (!adapter || typeof adapter !== "object") {
      throw new TypeError(
        "[SlowlyGameShell] options.game is required."
      );
    }

    if (!isFunction(adapter.mount)) {
      throw new TypeError(
        "[SlowlyGameShell] game.mount(target, hooks) is required."
      );
    }

    return adapter;
  }

  function validateSaveAdapter(adapter) {
    if (!adapter) {
      return null;
    }

    const requiredMethods = [
      "get",
      "save",
      "remove"
    ];

    const missing = requiredMethods.filter(
      (name) => !isFunction(adapter[name])
    );

    if (missing.length > 0) {
      throw new TypeError(
        `[SlowlyGameShell] save adapter missing: ${missing.join(", ")}`
      );
    }

    return adapter;
  }

  function formatElapsed(milliseconds) {
    const totalSeconds = Math.floor(
      Math.max(0, finiteNumber(milliseconds, 0)) / 1000
    );

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor(
      (totalSeconds % 3600) / 60
    );
    const seconds = totalSeconds % 60;

    return [hours, minutes, seconds]
      .map((value) => String(value).padStart(2, "0"))
      .join(":");
  }

  class GameShell {
    constructor(target, options = {}) {
      assertDependencies();

      this.target = resolveTarget(target);

      if (!this.target) {
        throw new Error(
          "[SlowlyGameShell] target not found."
        );
      }

      this.options = mergeOptions(options);
      this.gameAdapter = validateGameAdapter(
        this.options.game
      );
      this.saveAdapter = validateSaveAdapter(
        this.options.save.adapter
      );

      this.game = null;
      this.phase = "idle";
      this.result = null;

      this.elapsedOffsetMs = 0;

      this.autoSave = Boolean(
        this.options.save.auto
      );

      this.restoring = false;
      this.destroyed = false;

      this.saveQueue = Promise.resolve();

      this.timer = global.Timer.create();

      this.ticker = global.Ticker.create({
        interval: Math.max(
          50,
          finiteNumber(
            this.options.timer.interval,
            DEFAULTS.timer.interval
          )
        ),

        callback: () => {
          this.renderElapsed();
        }
      });

      this.build();
      this.render();

      this.callback(
        "onReady",
        this.createPayload()
      );

      if (this.options.lifecycle.autoStart) {
        this.start();
      }
    }

    assertAlive() {
      if (this.destroyed) {
        throw new Error(
          "[SlowlyGameShell] instance has been destroyed."
        );
      }
    }

    build() {
      this.target.replaceChildren();

      const root = document.createElement("section");

      root.className = "slowly-game-shell";

      root.innerHTML = `
        <div
          class="sgs-game-slot"
          data-shell-game-slot
        ></div>

        <div
          class="sgs-controls"
          aria-label="遊戲控制"
        >
          <button
            type="button"
            class="sgs-start"
          ></button>

          <button
            type="button"
            class="sgs-pause"
          ></button>

          <button
            type="button"
            class="sgs-save"
          ></button>

          <button
            type="button"
            class="sgs-load"
          ></button>

          <button
            type="button"
            class="sgs-remove-save"
          ></button>

          <button
            type="button"
            class="sgs-restart"
          ></button>
        </div>

        <p
          class="sgs-message"
          aria-live="polite"
        ></p>

        <footer
          class="sgs-footer"
          aria-live="polite"
        >
          <div class="sgs-footer-item">
            <span class="sgs-footer-label">
              遊戲狀態
            </span>

            <strong class="sgs-phase"></strong>
          </div>

          <div class="sgs-footer-item">
            <span class="sgs-footer-label">
              遊戲時間
            </span>

            <strong class="sgs-time">
              00:00:00
            </strong>
          </div>
        </footer>
      `;

      this.target.appendChild(root);

      this.root = root;

      this.refs = {
        slot: root.querySelector(".sgs-game-slot"),

        start: root.querySelector(".sgs-start"),
        pause: root.querySelector(".sgs-pause"),
        restart: root.querySelector(".sgs-restart"),

        save: root.querySelector(".sgs-save"),
        load: root.querySelector(".sgs-load"),
        removeSave:
          root.querySelector(".sgs-remove-save"),

        message: root.querySelector(".sgs-message"),

        phase: root.querySelector(".sgs-phase"),
        time: root.querySelector(".sgs-time")
      };

      const labels = this.options.labels;

      this.refs.start.textContent =
        labels.start;

      this.refs.pause.textContent =
        labels.pause;

      this.refs.restart.textContent =
        labels.restart;

      this.refs.save.textContent =
        labels.save;

      this.refs.load.textContent =
        labels.load;

      this.refs.removeSave.textContent =
        labels.removeSave;

      this.refs.start.addEventListener(
        "click",
        () => {
          this.start();
        }
      );

      this.refs.pause.addEventListener(
        "click",
        () => {
          if (this.phase === "paused") {
            this.resume();
          } else {
            this.pause();
          }
        }
      );

      this.refs.restart.addEventListener(
        "click",
        () => {
          this.restart();
        }
      );

      this.refs.save.addEventListener(
        "click",
        () => {
          this.save().catch(
            (error) => this.handleError(error)
          );
        }
      );

      this.refs.load.addEventListener(
        "click",
        () => {
          this.load().catch(
            (error) => this.handleError(error)
          );
        }
      );

      this.refs.removeSave.addEventListener(
        "click",
        () => {
          this.removeSave().catch(
            (error) => this.handleError(error)
          );
        }
      );
    }

    createPayload(extra = {}) {
      return {
        shell: this,
        phase: this.phase,
        result: this.result,
        elapsedMs: this.getElapsedMs(),
        game: this.game,
        ...extra
      };
    }

    callback(name, payload) {
      const handler =
        this.options.callbacks[name];

      if (isFunction(handler)) {
        return handler(payload);
      }

      return undefined;
    }

    notify(message) {
      const value = String(
        message ?? ""
      );

      if (isFunction(this.options.notify)) {
        this.options.notify(
          value,
          this.createPayload()
        );

        return;
      }

      this.refs.message.textContent =
        value;
    }

    handleError(error) {
      console.error(error);

      this.notify(
        error?.message ||
        "操作失敗。"
      );
    }

    createGameHooks() {
      return Object.freeze({
        stateChange: (meta) => {
          if (this.restoring) {
            return;
          }

          if (
            this.autoSave &&
            this.phase === "playing"
          ) {
            this.queueAutoSave();
          }

          this.callback(
            "onStateChange",
            this.createPayload({ meta })
          );
        },

        finish: (detail) => {
          if (this.restoring) {
            return;
          }

          this.finish(detail);
        },

        notify: (message) => {
          this.notify(message);
        }
      });
    }

    ensureGameMounted() {
      this.assertAlive();

      if (this.game) {
        return this.game;
      }

      this.game = this.gameAdapter.mount(
        this.refs.slot,
        this.createGameHooks()
      );

      if (!this.game) {
        throw new Error(
          "[SlowlyGameShell] game.mount() must return a game instance."
        );
      }

      return this.game;
    }

    getTimerElapsed() {
      if (!this.options.timer.enabled) {
        return 0;
      }

      return this.timer.elapsed();
    }

    getElapsedMs() {
      return Math.max(
        0,
        this.elapsedOffsetMs +
        this.getTimerElapsed()
      );
    }

    resetClock() {
      this.elapsedOffsetMs = 0;

      this.timer.reset();
      this.ticker.reset();

      this.renderElapsed();
    }

    startClock() {
      if (!this.options.timer.enabled) {
        return;
      }

      this.timer.start();
      this.ticker.start();

      this.renderElapsed();
    }

    pauseClock() {
      if (!this.options.timer.enabled) {
        return;
      }

      this.timer.pause();
      this.ticker.pause();

      this.renderElapsed();
    }

    resumeClock() {
      if (!this.options.timer.enabled) {
        return;
      }

      this.timer.resume();
      this.ticker.resume();

      this.renderElapsed();
    }

    stopClock() {
      if (!this.options.timer.enabled) {
        return;
      }

      this.timer.stop();
      this.ticker.stop();

      this.renderElapsed();
    }

    restoreClock(
      elapsedMs,
      phase
    ) {
      this.elapsedOffsetMs = Math.max(
        0,
        finiteNumber(elapsedMs, 0)
      );

      this.timer.reset();
      this.ticker.reset();

      if (!this.options.timer.enabled) {
        this.renderElapsed();
        return;
      }

      if (phase === "playing") {
        this.timer.start();
        this.ticker.start();
      }

      if (phase === "paused") {
        this.timer.start();
        this.ticker.start();

        this.timer.pause();
        this.ticker.pause();
      }

      this.renderElapsed();
    }

    renderElapsed() {
      if (!this.refs?.time) {
        return;
      }

      this.refs.time.textContent =
        formatElapsed(
          this.getElapsedMs()
        );
    }

    getPhaseLabel() {
      const labels = this.options.labels;

      if (this.phase === "playing") {
        return labels.playing;
      }

      if (this.phase === "paused") {
        return labels.paused;
      }

      if (this.phase === "ended") {
        return labels.ended;
      }

      return labels.idle;
    }

    render() {
      if (!this.refs) {
        return;
      }

      const hasSave =
        Boolean(this.saveAdapter);

      const canSnapshot =
        isFunction(
          this.gameAdapter.snapshot
        );

      const canRestore =
        isFunction(
          this.gameAdapter.restore
        );

      this.root.dataset.phase =
        this.phase;

      this.root.classList.toggle(
        "is-paused",
        this.phase === "paused"
      );

      if ("inert" in this.refs.slot) {
        this.refs.slot.inert =
          this.phase === "paused";
      }

      this.refs.phase.textContent =
        this.getPhaseLabel();

      this.refs.pause.textContent =
        this.phase === "paused"
          ? this.options.labels.resume
          : this.options.labels.pause;

      this.refs.start.disabled =
        this.phase !== "idle";

      this.refs.pause.disabled =
        this.phase === "idle" ||
        this.phase === "ended";

      this.refs.restart.disabled =
        !this.game;

      this.refs.save.hidden =
        !hasSave;

      this.refs.load.hidden =
        !hasSave;

      this.refs.removeSave.hidden =
        !hasSave;

      this.refs.save.disabled =
        !hasSave ||
        !canSnapshot ||
        !this.game;

      this.refs.load.disabled =
        !hasSave ||
        !canRestore;

      this.refs.removeSave.disabled =
        !hasSave;

      this.renderElapsed();
    }

    start() {
      this.assertAlive();

      if (this.phase !== "idle") {
        return this;
      }

      const game =
        this.ensureGameMounted();

      this.resetClock();

      this.phase = "playing";
      this.result = null;

      this.startClock();
      this.render();

      if (isFunction(this.gameAdapter.start)) {
        this.gameAdapter.start(game);
      }

      this.callback(
        "onStart",
        this.createPayload()
      );

      this.callback(
        "onStateChange",
        this.createPayload()
      );

      if (this.autoSave) {
        this.queueAutoSave();
      }

      return this;
    }

    pause() {
      this.assertAlive();

      if (this.phase !== "playing") {
        return this;
      }

      if (isFunction(this.gameAdapter.pause)) {
        this.gameAdapter.pause(
          this.game
        );
      }

      this.pauseClock();

      this.phase = "paused";

      this.render();

      this.callback(
        "onPause",
        this.createPayload()
      );

      this.callback(
        "onStateChange",
        this.createPayload()
      );

      if (this.autoSave) {
        this.queueAutoSave();
      }

      return this;
    }

    resume() {
      this.assertAlive();

      if (this.phase !== "paused") {
        return this;
      }

      if (isFunction(this.gameAdapter.resume)) {
        this.gameAdapter.resume(
          this.game
        );
      }

      this.phase = "playing";

      this.resumeClock();
      this.render();

      this.callback(
        "onResume",
        this.createPayload()
      );

      this.callback(
        "onStateChange",
        this.createPayload()
      );

      return this;
    }

    restart() {
      this.assertAlive();

      const game =
        this.ensureGameMounted();

      this.phase = "playing";
      this.result = null;

      this.resetClock();
      this.startClock();
      this.render();

      if (isFunction(this.gameAdapter.restart)) {
        this.gameAdapter.restart(game);
      } else if (isFunction(this.gameAdapter.start)) {
        this.gameAdapter.start(game);
      }

      this.callback(
        "onRestart",
        this.createPayload()
      );

      this.callback(
        "onStateChange",
        this.createPayload()
      );

      if (this.autoSave) {
        this.queueAutoSave();
      }

      return this;
    }

    finish(detail = {}) {
      this.assertAlive();

      if (this.phase === "ended") {
        return this;
      }

      this.result =
        detail &&
        typeof detail === "object"
          ? detail.result ?? null
          : detail;

      this.phase = "ended";

      this.stopClock();
      this.render();

      this.callback(
        "onFinish",
        this.createPayload({
          detail:
            detail &&
            typeof detail === "object"
              ? detail
              : { result: detail }
        })
      );

      this.callback(
        "onStateChange",
        this.createPayload()
      );

      if (this.autoSave) {
        this.queueAutoSave();
      }

      return this;
    }

    getState() {
      return {
        phase: this.phase,
        result: this.result,
        elapsedMs: this.getElapsedMs(),
        mounted: Boolean(this.game),
        autoSave: this.autoSave
      };
    }

    setAutoSave(enabled) {
      this.autoSave =
        Boolean(enabled);

      if (
        this.autoSave &&
        this.game
      ) {
        this.queueAutoSave();
      }

      return this.autoSave;
    }

    buildSaveRecord() {
      if (!this.game) {
        throw new Error(
          "[SlowlyGameShell] game has not been mounted."
        );
      }

      if (!isFunction(this.gameAdapter.snapshot)) {
        throw new Error(
          "[SlowlyGameShell] game adapter does not support snapshot()."
        );
      }

      return {
        id: String(
          this.options.save.id ||
          DEFAULTS.save.id
        ),

        version: SAVE_VERSION,

        savedAt:
          new Date().toISOString(),

        shell: {
          phase: this.phase,
          result: this.result,
          elapsedMs:
            this.getElapsedMs()
        },

        game:
          this.gameAdapter.snapshot(
            this.game
          )
      };
    }

    queueAutoSave() {
      if (
        !this.saveAdapter ||
        !this.game ||
        this.restoring
      ) {
        return Promise.resolve(null);
      }

      if (
        !isFunction(
          this.gameAdapter.snapshot
        )
      ) {
        return Promise.resolve(null);
      }

      const record =
        this.buildSaveRecord();

      this.saveQueue =
        this.saveQueue
          .then(() =>
            this.saveAdapter.save(record)
          )
          .catch((error) => {
            console.error(error);
            return null;
          });

      return this.saveQueue;
    }

    async save() {
      this.assertAlive();

      if (!this.saveAdapter) {
        throw new Error(
          "[SlowlyGameShell] save adapter is not configured."
        );
      }

      const record =
        this.buildSaveRecord();

      await this.saveAdapter.save(
        record
      );

      this.notify(
        "遊戲已儲存。"
      );

      this.callback(
        "onSave",
        this.createPayload({
          record
        })
      );

      return record;
    }

    async load() {
      this.assertAlive();

      if (!this.saveAdapter) {
        throw new Error(
          "[SlowlyGameShell] save adapter is not configured."
        );
      }

      if (!isFunction(this.gameAdapter.restore)) {
        throw new Error(
          "[SlowlyGameShell] game adapter does not support restore()."
        );
      }

      const id = String(
        this.options.save.id ||
        DEFAULTS.save.id
      );

      const record =
        await this.saveAdapter.get(id);

      if (!record) {
        this.notify(
          "目前沒有遊戲存檔。"
        );

        return null;
      }

      this.restoring = true;

      try {
        const game =
          this.ensureGameMounted();

        this.gameAdapter.restore(
          game,
          record.game
        );

        const savedPhase =
          [
            "idle",
            "playing",
            "paused",
            "ended"
          ].includes(
            record.shell?.phase
          )
            ? record.shell.phase
            : "paused";

        let nextPhase =
          savedPhase;

        if (
          savedPhase === "playing" &&
          this.options.save
            .resumePlayingOnLoad === false
        ) {
          nextPhase = "paused";
        }

        this.phase = nextPhase;

        this.result =
          record.shell?.result ??
          null;

        this.restoreClock(
          record.shell?.elapsedMs,
          nextPhase
        );

        this.render();
      } finally {
        this.restoring = false;
      }

      this.notify(
        "遊戲已載入。"
      );

      this.callback(
        "onLoad",
        this.createPayload({
          record
        })
      );

      this.callback(
        "onStateChange",
        this.createPayload()
      );

      return record;
    }

    async removeSave() {
      this.assertAlive();

      if (!this.saveAdapter) {
        throw new Error(
          "[SlowlyGameShell] save adapter is not configured."
        );
      }

      const id = String(
        this.options.save.id ||
        DEFAULTS.save.id
      );

      await this.saveAdapter.remove(
        id
      );

      this.notify(
        "遊戲存檔已刪除。"
      );

      this.callback(
        "onRemoveSave",
        this.createPayload({ id })
      );

      return true;
    }

    destroy() {
      if (this.destroyed) {
        return;
      }

      this.stopClock();

      if (
        this.game &&
        isFunction(this.gameAdapter.destroy)
      ) {
        this.gameAdapter.destroy(
          this.game
        );
      }

      this.game = null;
      this.destroyed = true;

      this.callback(
        "onDestroy",
        this.createPayload()
      );

      this.target.replaceChildren();
    }
  }

  function mount(target, options = {}) {
    const element =
      resolveTarget(target);

    if (!element) {
      throw new Error(
        "[SlowlyGameShell] target not found."
      );
    }

    if (
      element.__slowlyGameShellInstance
    ) {
      return element
        .__slowlyGameShellInstance;
    }

    const instance =
      new GameShell(
        element,
        options
      );

    Object.defineProperty(
      element,
      "__slowlyGameShellInstance",
      {
        value: instance,
        configurable: true
      }
    );

    const originalDestroy =
      instance.destroy.bind(instance);

    instance.destroy =
      function destroyShell() {
        originalDestroy();

        if (
          element.__slowlyGameShellInstance ===
          instance
        ) {
          delete element
            .__slowlyGameShellInstance;
        }
      };

    return instance;
  }

  global.SlowlyGameShell =
    Object.freeze({
      version: VERSION,
      mount,
      formatElapsed
    });
})(window);
