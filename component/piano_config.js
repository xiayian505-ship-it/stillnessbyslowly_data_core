/* =========================================================
   Slowly Piano Config v1.2.0
   宿主最常修改的純資料設定。

   這支不是必要依賴：
   不載入時，SlowlyPiano 仍有內建預設值。
========================================================= */

window.SlowlyPianoConfig = {
  /* ---------- 音域 ---------- */

  range: {
    from: "A0",
    to: "C8"
  },

  /* ---------- 排版 ---------- */

  layout: {
    /*
     * vertical：
     * 多排、上下捲動。
     *
     * horizontal：
     * 一條完整鋼琴、左右捲動。
     */
    scrollDirection:
      "vertical",

    /*
     * 垂直模式：
     * 每排放幾個白鍵。
     *
     * 黑鍵覆蓋在白鍵之間，
     * 所以不拿黑鍵來算欄數。
     */
    whiteKeysPerRow: 7,

    /*
     * 垂直模式：
     * 同時看得到幾排。
     * 超出的排數往下捲。
     */
    visibleRows: 3,

    /*
     * 水平模式：
     * viewport 大約看得到
     * 幾個白鍵。
     */
    visibleWhiteKeys: 7
  },

  /* ---------- 音訊 ---------- */

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
   * A0 = 27.5 Hz。
   * 手機喇叭通常很難直接重播這麼低的頻率。
   *
   * 這裡保留正確基頻，
   * 再額外加入較小聲的 2、3 倍泛音，
   * 讓手機仍能聽出低音。
   */
  lowFrequencyAssist: {
    enabled: true,

    belowHz: 130,

    /*
     * true：
     * 只在 sine 使用輔助。
     * triangle / square 本來就自帶泛音。
     */
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

  /* ---------- UI ---------- */

  showHeader: true,
  showControls: true,

  labels: {
    title:
      "手機鋼琴｜88 鍵",

    hint:
      "A0～C8。按住持續響、放開停止。",

    enable:
      "啟用聲音",

    disabledStatus:
      "未啟用",

    enabledStatus:
      "已啟用（可彈奏）",

    wavePrefix:
      "音色：",

    rowPrefix:
      "Range"
  }
};
