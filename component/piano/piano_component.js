"use strict";

/* =========================================================
   慢慢的倉庫｜Slowly Piano v1.2.0

   手機／觸控友善的鋼琴完成品。

   必要依賴：
   - SlowlyAudioContext
   - SlowlyAudioNoteFrequency
   - SlowlyAudioOscillator
   - SlowlyAudioGain
   - SlowlyAudioEnvelope

   v1.2.0：
   - 低音手機喇叭輔助（保留基頻 + 加入低音泛音）
   - 可選垂直／水平捲動
   - 垂直模式可設定每排白鍵數
   - 可設定畫面同時顯示幾排
   - 水平模式為一條連續鋼琴，可設定可視白鍵數
   - 音域仍由宿主 range 決定

   設計說明：
   「每排幾鍵」以白鍵計算。
   黑鍵是覆蓋在白鍵間，不佔等寬欄位，
   因此用白鍵數做 layout 才不會切壞琴鍵幾何。
========================================================= */

(function (global) {
  "use strict";

  const VERSION = "1.2.0";

  const REQUIRED_DEPENDENCIES = [
    "SlowlyAudioContext",
    "SlowlyAudioNoteFrequency",
    "SlowlyAudioOscillator",
    "SlowlyAudioGain",
    "SlowlyAudioEnvelope"
  ];

  const CHROMATIC_NAMES = Object.freeze([
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B"
  ]);

  const VALID_WAVES = new Set([
    "sine",
    "triangle",
    "square",
    "sawtooth"
  ]);

  const VALID_SCROLL_DIRECTIONS =
    new Set([
      "vertical",
      "horizontal"
    ]);

  const DEFAULTS = {
    range: {
      from: "C3",
      to: "B5"
    },

    layout: {
      scrollDirection: "vertical",

      /*
       * 垂直模式：
       * 一排放幾個白鍵。
       */
      whiteKeysPerRow: 7,

      /*
       * 垂直模式：
       * viewport 同時可見幾排。
       */
      visibleRows: 3,

      /*
       * 水平模式：
       * viewport 大約同時可見幾個白鍵。
       */
      visibleWhiteKeys: 7
    },

    a4: 440,

    wave: "sine",

    waveTypes: [
      "sine",
      "triangle",
      "square"
    ],

    gain: 0.22,
    attack: 0.02,
    release: 0.08,

    /*
     * 手機喇叭很難重播 A0、A1 這類低頻。
     * 這個功能保留正確基頻，
     * 並在低頻音額外加較小聲的泛音，
     * 讓小喇叭仍能「聽見」低音。
     */
    lowFrequencyAssist: {
      enabled: true,
      belowHz: 130,
      sineOnly: true,

      harmonics: [
        {
          multiple: 2,
          gainRatio: 0.30
        },
        {
          multiple: 3,
          gainRatio: 0.18
        }
      ]
    },

    showHeader: true,
    showControls: true,

    labels: {
      title: "手機鋼琴",
      hint: "按住持續響、放開停止。",
      enable: "啟用聲音",
      disabledStatus: "未啟用",
      enabledStatus: "已啟用（可彈奏）",
      wavePrefix: "音色：",
      rowPrefix: "Range"
    },

    callbacks: {
      onReady: null,
      onAudioReady: null,
      onNoteStart: null,
      onNoteEnd: null,
      onWaveChange: null,
      onDestroy: null
    }
  };

  function isFunction(value) {
    return typeof value === "function";
  }

  function finiteNumber(
    value,
    fallback,
    name
  ) {
    const number = Number(
      value ?? fallback
    );

    if (!Number.isFinite(number)) {
      throw new TypeError(
        `[SlowlyPiano] ${name} must be a finite number.`
      );
    }

    return number;
  }

  function positiveNumber(
    value,
    fallback,
    name
  ) {
    const number =
      finiteNumber(
        value,
        fallback,
        name
      );

    if (number <= 0) {
      throw new RangeError(
        `[SlowlyPiano] ${name} must be > 0.`
      );
    }

    return number;
  }

  function positiveInteger(
    value,
    fallback,
    name
  ) {
    const number = Number(
      value ?? fallback
    );

    if (
      !Number.isInteger(number) ||
      number <= 0
    ) {
      throw new RangeError(
        `[SlowlyPiano] ${name} must be a positive integer.`
      );
    }

    return number;
  }

  function nonNegativeNumber(
    value,
    fallback,
    name
  ) {
    const number =
      finiteNumber(
        value,
        fallback,
        name
      );

    if (number < 0) {
      throw new RangeError(
        `[SlowlyPiano] ${name} must be >= 0.`
      );
    }

    return number;
  }

  function normalizeWave(value) {
    const wave =
      String(value || "sine")
        .toLowerCase();

    if (!VALID_WAVES.has(wave)) {
      throw new RangeError(
        "[SlowlyPiano] wave must be sine, triangle, square, or sawtooth."
      );
    }

    return wave;
  }

  function normalizeWaveTypes(values) {
    const source =
      Array.isArray(values) &&
      values.length
        ? values
        : DEFAULTS.waveTypes;

    const result = [];

    source.forEach((value) => {
      const wave =
        normalizeWave(value);

      if (!result.includes(wave)) {
        result.push(wave);
      }
    });

    return result;
  }

  function normalizeScrollDirection(
    value
  ) {
    const direction =
      String(
        value ??
        DEFAULTS.layout
          .scrollDirection
      ).toLowerCase();

    if (
      !VALID_SCROLL_DIRECTIONS
        .has(direction)
    ) {
      throw new RangeError(
        "[SlowlyPiano] layout.scrollDirection must be vertical or horizontal."
      );
    }

    return direction;
  }

  function normalizeLayout(layout = {}) {
    return {
      scrollDirection:
        normalizeScrollDirection(
          layout.scrollDirection
        ),

      whiteKeysPerRow:
        positiveInteger(
          layout.whiteKeysPerRow,
          DEFAULTS.layout
            .whiteKeysPerRow,
          "layout.whiteKeysPerRow"
        ),

      visibleRows:
        positiveInteger(
          layout.visibleRows,
          DEFAULTS.layout
            .visibleRows,
          "layout.visibleRows"
        ),

      visibleWhiteKeys:
        positiveInteger(
          layout.visibleWhiteKeys,
          DEFAULTS.layout
            .visibleWhiteKeys,
          "layout.visibleWhiteKeys"
        )
    };
  }

  function normalizeLowFrequencyAssist(
    value = {}
  ) {
    const source = {
      ...DEFAULTS.lowFrequencyAssist,
      ...(value || {})
    };

    const harmonicsSource =
      Array.isArray(source.harmonics)
        ? source.harmonics
        : DEFAULTS
            .lowFrequencyAssist
            .harmonics;

    const harmonics =
      harmonicsSource.map(
        (
          harmonic,
          index
        ) => {
          return {
            multiple:
              positiveNumber(
                harmonic.multiple,
                2,
                `lowFrequencyAssist.harmonics[${index}].multiple`
              ),

            gainRatio:
              nonNegativeNumber(
                harmonic.gainRatio,
                0,
                `lowFrequencyAssist.harmonics[${index}].gainRatio`
              )
          };
        }
      );

    return {
      enabled:
        source.enabled !== false,

      belowHz:
        positiveNumber(
          source.belowHz,
          DEFAULTS
            .lowFrequencyAssist
            .belowHz,
          "lowFrequencyAssist.belowHz"
        ),

      sineOnly:
        source.sineOnly !== false,

      harmonics
    };
  }

  function parseNote(note) {
    const parsed =
      global
        .SlowlyAudioNoteFrequency
        .parse(note);

    return {
      note: parsed.note,
      octave: parsed.octave,
      midi: parsed.midi
    };
  }

  function midiToNote(midi) {
    const midiNumber =
      Number(midi);

    if (
      !Number.isInteger(
        midiNumber
      )
    ) {
      throw new TypeError(
        "[SlowlyPiano] midi must be an integer."
      );
    }

    const noteIndex =
      (
        midiNumber % 12 +
        12
      ) % 12;

    const octave =
      Math.floor(
        midiNumber / 12
      ) - 1;

    return (
      CHROMATIC_NAMES[noteIndex] +
      octave
    );
  }

  function buildNoteRange(
    from,
    to
  ) {
    const start =
      parseNote(from);

    const end =
      parseNote(to);

    if (start.midi > end.midi) {
      throw new RangeError(
        "[SlowlyPiano] range.from must not be higher than range.to."
      );
    }

    const notes = [];

    for (
      let midi = start.midi;
      midi <= end.midi;
      midi += 1
    ) {
      const noteId =
        midiToNote(midi);

      notes.push({
        noteId,
        midi,
        octave:
          Math.floor(
            midi / 12
          ) - 1,
        isBlack:
          noteId.includes("#")
      });
    }

    return notes;
  }

  function normalizeRange(range) {
    const source =
      range || DEFAULTS.range;

    const notes =
      buildNoteRange(
        String(
          source.from ??
          DEFAULTS.range.from
        ).trim(),

        String(
          source.to ??
          DEFAULTS.range.to
        ).trim()
      );

    return {
      from:
        notes[0].noteId,

      to:
        notes[
          notes.length - 1
        ].noteId,

      notes
    };
  }

  function mergeOptions(options = {}) {
    const waveTypes =
      normalizeWaveTypes(
        options.waveTypes
      );

    const wave =
      normalizeWave(
        options.wave ??
        DEFAULTS.wave
      );

    if (
      !waveTypes.includes(wave)
    ) {
      waveTypes.unshift(wave);
    }

    return {
      ...DEFAULTS,
      ...options,

      range:
        normalizeRange(
          options.range
        ),

      layout:
        normalizeLayout(
          options.layout
        ),

      lowFrequencyAssist:
        normalizeLowFrequencyAssist(
          options.lowFrequencyAssist
        ),

      a4:
        positiveNumber(
          options.a4,
          DEFAULTS.a4,
          "a4"
        ),

      wave,
      waveTypes,

      gain:
        nonNegativeNumber(
          options.gain,
          DEFAULTS.gain,
          "gain"
        ),

      attack:
        nonNegativeNumber(
          options.attack,
          DEFAULTS.attack,
          "attack"
        ),

      release:
        nonNegativeNumber(
          options.release,
          DEFAULTS.release,
          "release"
        ),

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

  function resolveTarget(target) {
    return typeof target === "string"
      ? document.querySelector(target)
      : target;
  }

  function assertDependencies() {
    const missing =
      REQUIRED_DEPENDENCIES.filter(
        (name) => !global[name]
      );

    if (missing.length) {
      throw new Error(
        `[SlowlyPiano] Missing dependency: ${missing.join(", ")}`
      );
    }
  }

  function splitVerticalRows(
    notes,
    whiteKeysPerRow
  ) {
    const rows = [];

    let current = [];
    let whiteCount = 0;

    notes.forEach((note) => {
      /*
       * 到下一顆白鍵時才換排。
       * 這樣上一顆白鍵後面的黑鍵
       * 會留在原排，不會讓新排從黑鍵開始。
       */
      if (
        !note.isBlack &&
        whiteCount >=
          whiteKeysPerRow
      ) {
        rows.push(current);

        current = [];
        whiteCount = 0;
      }

      current.push(note);

      if (!note.isBlack) {
        whiteCount += 1;
      }
    });

    if (current.length) {
      rows.push(current);
    }

    return rows;
  }

  class Piano {
    constructor(target, options = {}) {
      assertDependencies();

      this.target =
        resolveTarget(target);

      if (!this.target) {
        throw new Error(
          "[SlowlyPiano] target not found."
        );
      }

      this.options =
        mergeOptions(options);

      this.wave =
        this.options.wave;

      this.activeNotes =
        new Map();

      this.notePointers =
        new Map();

      this.pointerNotes =
        new Map();

      this.rows = [];

      this.destroyed = false;
      this.resizeObserver = null;

      this.handleWindowResize =
        () => {
          this.refreshLayout();
        };

      this.handleVisibilityChange =
        () => {
          if (document.hidden) {
            this.allOff();
          }
        };

      this.handleWindowBlur =
        () => {
          this.allOff();
        };

      this.build();
      this.bindLifecycle();

      requestAnimationFrame(
        () => {
          this.refreshLayout();
        }
      );

      this.renderWave();
      this.renderStatus();

      this.callback(
        "onReady",
        this.payload()
      );
    }

    assertAlive() {
      if (this.destroyed) {
        throw new Error(
          "[SlowlyPiano] instance has been destroyed."
        );
      }
    }

    callback(name, payload) {
      const handler =
        this.options.callbacks[name];

      if (isFunction(handler)) {
        return handler(payload);
      }

      return undefined;
    }

    payload(extra = {}) {
      return {
        piano: this,
        wave: this.wave,

        range: {
          from:
            this.options.range.from,

          to:
            this.options.range.to
        },

        layout: {
          ...this.options.layout
        },

        noteCount:
          this.options.range
            .notes.length,

        audioState:
          global
            .SlowlyAudioContext
            .state(),

        activeNotes:
          Array.from(
            this.activeNotes.keys()
          ),

        ...extra
      };
    }

    build() {
      this.target.replaceChildren();

      const root =
        document.createElement(
          "section"
        );

      root.className =
        "slowly-piano";

      root.classList.add(
        this.options.layout
          .scrollDirection ===
          "horizontal"
          ? "is-horizontal"
          : "is-vertical"
      );

      /* ---------- Header ---------- */

      const header =
        document.createElement("div");

      header.className =
        "spiano-header";

      if (!this.options.showHeader) {
        header.hidden = true;
      }

      const title =
        document.createElement("div");

      title.className =
        "spiano-title";

      title.textContent =
        this.options.labels.title;

      const hint =
        document.createElement("div");

      hint.className =
        "spiano-hint";

      hint.textContent =
        this.options.labels.hint;

      header.append(
        title,
        hint
      );

      /* ---------- Controls ---------- */

      const controls =
        document.createElement("div");

      controls.className =
        "spiano-controls";

      if (!this.options.showControls) {
        controls.hidden = true;
      }

      const enableButton =
        document.createElement("button");

      enableButton.type = "button";
      enableButton.className =
        "spiano-enable";

      enableButton.textContent =
        this.options.labels.enable;

      const status =
        document.createElement("span");

      status.className =
        "spiano-status";

      const waveButton =
        document.createElement("button");

      waveButton.type = "button";
      waveButton.className =
        "spiano-wave";

      controls.append(
        enableButton,
        status,
        waveButton
      );

      /* ---------- Scroll viewport ---------- */

      const scroll =
        document.createElement("div");

      scroll.className =
        "spiano-scroll";

      const keyboard =
        document.createElement("div");

      keyboard.className =
        "spiano-keyboard";

      scroll.appendChild(keyboard);

      root.append(
        header,
        controls,
        scroll
      );

      this.target.appendChild(root);

      this.root = root;

      this.refs = {
        header,
        title,
        hint,
        controls,
        enableButton,
        status,
        waveButton,
        scroll,
        keyboard
      };

      enableButton.addEventListener(
        "click",
        () => {
          this.enableAudio()
            .catch((error) => {
              console.error(error);
            });
        }
      );

      waveButton.addEventListener(
        "click",
        () => {
          this.nextWave();
        }
      );

      this.buildKeyboard();
    }

    buildKeyboard() {
      const direction =
        this.options.layout
          .scrollDirection;

      if (direction === "horizontal") {
        this.buildRow(
          this.options.range.notes,
          `${this.options.range.from}～${this.options.range.to}`
        );

        return;
      }

      const chunks =
        splitVerticalRows(
          this.options.range.notes,
          this.options.layout
            .whiteKeysPerRow
        );

      chunks.forEach(
        (notes, index) => {
          this.buildRow(
            notes,
            `${this.options.labels.rowPrefix} ${index + 1}`
          );
        }
      );
    }

    buildRow(
      notes,
      titleText
    ) {
      const box =
        document.createElement("div");

      box.className =
        "spiano-row";

      const title =
        document.createElement("div");

      title.className =
        "spiano-row-title";

      const first =
        notes[0].noteId;

      const last =
        notes[
          notes.length - 1
        ].noteId;

      title.textContent =
        `${titleText}（${first}～${last}）`;

      box.appendChild(title);

      const whiteRow =
        document.createElement("div");

      whiteRow.className =
        "spiano-white-row";

      box.appendChild(whiteRow);

      const whiteElements =
        new Map();

      const blackElements = [];

      notes.forEach((note) => {
        if (note.isBlack) {
          return;
        }

        const label =
          note.noteId.replace(
            /-?\d+$/,
            ""
          );

        const key =
          this.makeKeyElement(
            "white",
            note.noteId,
            label
          );

        whiteRow.appendChild(key);

        whiteElements.set(
          note.midi,
          key
        );
      });

      notes.forEach((note) => {
        if (!note.isBlack) {
          return;
        }

        const label =
          note.noteId.replace(
            /-?\d+$/,
            ""
          );

        const key =
          this.makeKeyElement(
            "black",
            note.noteId,
            label
          );

        box.appendChild(key);

        blackElements.push({
          midi: note.midi,
          element: key
        });
      });

      this.refs.keyboard
        .appendChild(box);

      this.rows.push({
        box,
        whiteElements,
        blackElements
      });
    }

    makeKeyElement(
      kind,
      noteId,
      label
    ) {
      const element =
        document.createElement(
          "button"
        );

      element.type = "button";

      element.className =
        kind === "white"
          ? "spiano-key spiano-white-key"
          : "spiano-key spiano-black-key";

      element.dataset.noteId =
        noteId;

      element.setAttribute(
        "aria-label",
        noteId
      );

      const labelElement =
        document.createElement("span");

      labelElement.className =
        "spiano-key-label";

      labelElement.textContent =
        label;

      const subElement =
        document.createElement("span");

      subElement.className =
        "spiano-key-sub";

      subElement.textContent =
        noteId;

      element.append(
        labelElement,
        subElement
      );

      element.addEventListener(
        "pointerdown",
        (event) => {
          this.handlePointerDown(
            event,
            element,
            noteId
          );
        }
      );

      element.addEventListener(
        "pointerup",
        (event) => {
          this.handlePointerRelease(
            event,
            element,
            noteId
          );
        }
      );

      element.addEventListener(
        "pointercancel",
        (event) => {
          this.handlePointerRelease(
            event,
            element,
            noteId
          );
        }
      );

      return element;
    }

    async handlePointerDown(
      event,
      element,
      noteId
    ) {
      if (
        this.pointerNotes.has(
          event.pointerId
        )
      ) {
        return;
      }

      try {
        element.setPointerCapture(
          event.pointerId
        );
      } catch {
        // 某些瀏覽器可能不允許 capture。
      }

      this.pointerNotes.set(
        event.pointerId,
        noteId
      );

      if (
        !this.notePointers.has(noteId)
      ) {
        this.notePointers.set(
          noteId,
          new Set()
        );
      }

      this.notePointers
        .get(noteId)
        .add(event.pointerId);

      element.classList.add(
        "is-down"
      );

      try {
        await this.enableAudio();

        if (
          this.pointerNotes.get(
            event.pointerId
          ) !== noteId
        ) {
          return;
        }

        this.startNote(noteId);
      } catch (error) {
        console.error(error);

        this.releasePointerState(
          event.pointerId,
          element,
          noteId
        );
      }
    }

    handlePointerRelease(
      event,
      element,
      noteId
    ) {
      const currentNote =
        this.pointerNotes.get(
          event.pointerId
        );

      if (currentNote !== noteId) {
        return;
      }

      this.releasePointerState(
        event.pointerId,
        element,
        noteId
      );

      try {
        element.releasePointerCapture(
          event.pointerId
        );
      } catch {
        // Pointer capture 已解除時忽略。
      }
    }

    releasePointerState(
      pointerId,
      element,
      noteId
    ) {
      this.pointerNotes.delete(
        pointerId
      );

      const pointers =
        this.notePointers.get(
          noteId
        );

      if (pointers) {
        pointers.delete(pointerId);

        if (pointers.size === 0) {
          this.notePointers.delete(
            noteId
          );

          element.classList.remove(
            "is-down"
          );

          this.stopNote(noteId);
        }
      }
    }

    async enableAudio() {
      this.assertAlive();

      const context =
        await global
          .SlowlyAudioContext
          .resume();

      this.renderStatus();

      this.callback(
        "onAudioReady",
        this.payload({
          context
        })
      );

      return context;
    }

    shouldUseLowFrequencyAssist(
      frequency
    ) {
      const assist =
        this.options
          .lowFrequencyAssist;

      if (
        !assist.enabled ||
        frequency >=
          assist.belowHz
      ) {
        return false;
      }

      if (
        assist.sineOnly &&
        this.wave !== "sine"
      ) {
        return false;
      }

      return true;
    }

    createVoiceLayer(
      context,
      frequency,
      gainValue,
      startAt
    ) {
      const oscillator =
        global
          .SlowlyAudioOscillator
          .create(
            context,
            {
              type: this.wave,
              frequency
            }
          );

      const gain =
        global
          .SlowlyAudioGain
          .create(
            context,
            global
              .SlowlyAudioEnvelope
              .floor
          );

      global
        .SlowlyAudioOscillator
        .connect(
          oscillator,
          gain
        );

      global
        .SlowlyAudioGain
        .connect(
          gain,
          context.destination
        );

      global
        .SlowlyAudioEnvelope
        .attack(
          gain.gain,
          {
            startAt,

            duration:
              this.options.attack,

            from:
              global
                .SlowlyAudioEnvelope
                .floor,

            to:
              Math.max(
                gainValue,
                global
                  .SlowlyAudioEnvelope
                  .floor
              ),

            curve: "linear"
          }
        );

      global
        .SlowlyAudioOscillator
        .start(
          oscillator,
          startAt
        );

      return {
        oscillator,
        gain,
        frequency,
        gainValue
      };
    }

    startNote(noteId) {
      this.assertAlive();

      const context =
        global.SlowlyAudioContext
          .get();

      if (
        !context ||
        context.state !== "running" ||
        this.activeNotes.has(noteId)
      ) {
        return false;
      }

      const frequency =
        global
          .SlowlyAudioNoteFrequency
          .toFrequency(
            noteId,
            {
              a4:
                this.options.a4
            }
          );

      const startAt =
        context.currentTime;

      const layers = [];

      layers.push(
        this.createVoiceLayer(
          context,
          frequency,
          this.options.gain,
          startAt
        )
      );

      if (
        this.shouldUseLowFrequencyAssist(
          frequency
        )
      ) {
        this.options
          .lowFrequencyAssist
          .harmonics
          .forEach((harmonic) => {
            if (
              harmonic.gainRatio <= 0
            ) {
              return;
            }

            layers.push(
              this.createVoiceLayer(
                context,

                frequency *
                  harmonic.multiple,

                this.options.gain *
                  harmonic.gainRatio,

                startAt
              )
            );
          });
      }

      this.activeNotes.set(
        noteId,
        {
          frequency,
          layers
        }
      );

      this.callback(
        "onNoteStart",
        this.payload({
          noteId,
          frequency,
          layerCount:
            layers.length
        })
      );

      return true;
    }

    stopNote(noteId) {
      const voice =
        this.activeNotes.get(
          noteId
        );

      const context =
        global.SlowlyAudioContext
          .get();

      if (!voice || !context) {
        return false;
      }

      const releaseAt =
        context.currentTime;

      voice.layers.forEach(
        (layer) => {
          global
            .SlowlyAudioEnvelope
            .cancel(
              layer.gain.gain,
              releaseAt
            );

          global
            .SlowlyAudioEnvelope
            .release(
              layer.gain.gain,
              {
                startAt:
                  releaseAt,

                duration:
                  this.options
                    .release,

                from:
                  Math.max(
                    layer.gain.gain
                      .value ||
                    layer.gainValue ||
                    global
                      .SlowlyAudioEnvelope
                      .floor,

                    global
                      .SlowlyAudioEnvelope
                      .floor
                  ),

                to:
                  global
                    .SlowlyAudioEnvelope
                    .floor,

                curve: "linear"
              }
            );

          try {
            global
              .SlowlyAudioOscillator
              .stop(
                layer.oscillator,

                releaseAt +
                  this.options
                    .release +
                  0.01
              );
          } catch {
            // 已停止的 Oscillator 不重複處理。
          }
        }
      );

      this.activeNotes.delete(
        noteId
      );

      this.callback(
        "onNoteEnd",
        this.payload({
          noteId,
          frequency:
            voice.frequency
        })
      );

      return true;
    }

    allOff() {
      Array.from(
        this.activeNotes.keys()
      ).forEach((noteId) => {
        this.stopNote(noteId);
      });

      this.pointerNotes.clear();
      this.notePointers.clear();

      this.root
        .querySelectorAll(
          ".spiano-key.is-down"
        )
        .forEach((element) => {
          element.classList.remove(
            "is-down"
          );
        });

      return this;
    }

    getWave() {
      return this.wave;
    }

    setWave(value) {
      this.assertAlive();

      const wave =
        normalizeWave(value);

      this.wave = wave;

      if (
        !this.options.waveTypes
          .includes(wave)
      ) {
        this.options.waveTypes
          .push(wave);
      }

      this.renderWave();

      this.callback(
        "onWaveChange",
        this.payload()
      );

      return this.wave;
    }

    nextWave() {
      this.assertAlive();

      const waves =
        this.options.waveTypes;

      const currentIndex =
        waves.indexOf(
          this.wave
        );

      const nextIndex =
        (
          currentIndex + 1
        ) % waves.length;

      return this.setWave(
        waves[nextIndex]
      );
    }

    renderWave() {
      if (!this.refs?.waveButton) {
        return;
      }

      this.refs.waveButton
        .textContent =
          this.options.labels
            .wavePrefix +
          this.wave.toUpperCase();
    }

    renderStatus() {
      if (!this.refs?.status) {
        return;
      }

      const enabled =
        global
          .SlowlyAudioContext
          .state() === "running";

      this.refs.status.textContent =
        enabled
          ? this.options.labels
              .enabledStatus
          : this.options.labels
              .disabledStatus;

      this.root?.classList.toggle(
        "is-audio-ready",
        enabled
      );
    }

    positionBlackKeys(row) {
      if (
        !row ||
        this.destroyed
      ) {
        return;
      }

      row.blackElements.forEach(
        ({
          midi,
          element
        }) => {
          const previousWhite =
            row.whiteElements
              .get(midi - 1);

          const nextWhite =
            row.whiteElements
              .get(midi + 1);

          const width =
            element.offsetWidth;

          let left = null;

          if (
            previousWhite &&
            nextWhite
          ) {
            const center =
              (
                previousWhite
                  .offsetLeft +
                previousWhite
                  .offsetWidth +
                nextWhite.offsetLeft
              ) / 2;

            left =
              center -
              width / 2;
          } else if (
            previousWhite
          ) {
            left =
              previousWhite.offsetLeft +
              previousWhite.offsetWidth -
              width / 2;
          } else if (
            nextWhite
          ) {
            left =
              nextWhite.offsetLeft -
              width / 2;
          }

          if (left !== null) {
            element.style.left =
              `${left}px`;
          }
        }
      );
    }

    positionAllBlackKeys() {
      this.rows.forEach((row) => {
        this.positionBlackKeys(row);
      });

      return this;
    }

    refreshViewport() {
      const layout =
        this.options.layout;

      const scroll =
        this.refs.scroll;

      scroll.style.maxHeight = "";
      scroll.style.maxWidth = "";

      if (
        layout.scrollDirection ===
        "vertical"
      ) {
        const rowElements =
          this.rows
            .slice(
              0,
              layout.visibleRows
            )
            .map(
              (row) => row.box
            );

        if (!rowElements.length) {
          return;
        }

        const keyboardStyle =
          getComputedStyle(
            this.refs.keyboard
          );

        const gap =
          parseFloat(
            keyboardStyle.rowGap ||
            keyboardStyle.gap ||
            "0"
          ) || 0;

        const totalHeight =
          rowElements.reduce(
            (sum, element) =>
              sum +
              element.offsetHeight,
            0
          ) +
          gap *
            Math.max(
              0,
              rowElements.length - 1
            );

        scroll.style.maxHeight =
          `${totalHeight}px`;

        return;
      }

      const firstRow =
        this.rows[0];

      if (!firstRow) {
        return;
      }

      const whiteKeys =
        Array.from(
          firstRow.whiteElements
            .values()
        );

      const visible =
        whiteKeys.slice(
          0,
          layout.visibleWhiteKeys
        );

      if (!visible.length) {
        return;
      }

      const first =
        visible[0];

      const last =
        visible[
          visible.length - 1
        ];

      const rowStyle =
        getComputedStyle(
          firstRow.box
        );

      const paddingLeft =
        parseFloat(
          rowStyle.paddingLeft ||
          "0"
        ) || 0;

      const paddingRight =
        parseFloat(
          rowStyle.paddingRight ||
          "0"
        ) || 0;

      const visibleWidth =
        last.offsetLeft +
        last.offsetWidth -
        first.offsetLeft +
        paddingLeft +
        paddingRight;

      scroll.style.maxWidth =
        `${visibleWidth}px`;
    }

    refreshLayout() {
      this.positionAllBlackKeys();

      this.refreshViewport();

      return this;
    }

    bindLifecycle() {
      if (
        "ResizeObserver" in global
      ) {
        this.resizeObserver =
          new ResizeObserver(
            () => {
              this.refreshLayout();
            }
          );

        this.resizeObserver.observe(
          this.refs.keyboard
        );
      } else {
        global.addEventListener(
          "resize",
          this.handleWindowResize
        );
      }

      document.addEventListener(
        "visibilitychange",
        this.handleVisibilityChange
      );

      global.addEventListener(
        "blur",
        this.handleWindowBlur
      );
    }

    getState() {
      return {
        wave: this.wave,

        range: {
          from:
            this.options.range.from,

          to:
            this.options.range.to
        },

        layout: {
          ...this.options.layout
        },

        noteCount:
          this.options.range
            .notes.length,

        a4:
          this.options.a4,

        audioState:
          global
            .SlowlyAudioContext
            .state(),

        activeNotes:
          Array.from(
            this.activeNotes.keys()
          )
      };
    }

    destroy() {
      if (this.destroyed) {
        return;
      }

      this.allOff();

      if (this.resizeObserver) {
        this.resizeObserver
          .disconnect();

        this.resizeObserver = null;
      } else {
        global.removeEventListener(
          "resize",
          this.handleWindowResize
        );
      }

      document.removeEventListener(
        "visibilitychange",
        this.handleVisibilityChange
      );

      global.removeEventListener(
        "blur",
        this.handleWindowBlur
      );

      this.destroyed = true;

      this.callback(
        "onDestroy",
        this.payload()
      );

      this.target
        .replaceChildren();
    }
  }

  function mount(
    target,
    options = {}
  ) {
    const element =
      resolveTarget(target);

    if (!element) {
      throw new Error(
        "[SlowlyPiano] target not found."
      );
    }

    if (
      element.__slowlyPianoInstance
    ) {
      return element
        .__slowlyPianoInstance;
    }

    const instance =
      new Piano(
        element,
        options
      );

    Object.defineProperty(
      element,
      "__slowlyPianoInstance",
      {
        value: instance,
        configurable: true
      }
    );

    const originalDestroy =
      instance.destroy
        .bind(instance);

    instance.destroy =
      function destroyPiano() {
        originalDestroy();

        if (
          element
            .__slowlyPianoInstance ===
          instance
        ) {
          delete element
            .__slowlyPianoInstance;
        }
      };

    return instance;
  }

  global.SlowlyPiano =
    Object.freeze({
      version: VERSION,
      mount
    });
})(window);
