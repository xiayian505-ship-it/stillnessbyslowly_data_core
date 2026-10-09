# 慢慢軍火庫｜Scroll Motion 滾動互動微零件

本目錄是**獨立新增**的分類，與既有 `effects/scroll/`、`effects/reveal/` 並存。暫時**不登錄軍火庫主頁**，也不修改 `index.html`、`index_data.js`、`group.html`。

- 原則：一個檔案通常只做一件事；簡單視覺效果優先純 CSS，觀察滾動狀態才使用 JS。
- 每個 CSS/JS 零件都可透過 `https://lib.stillnessbyslowly.com/scroll_motion/分類/檔名` **直接引用**，不需要複製功能到專案。
- 每個零件都有同目錄 `test_檔名.html` 獨立測試頁。放上 GitHub Pages 後可直接開測試頁。
- 命名採 `SlowlyScroll...` JS 全域物件，對外提供 `attach(...)`、`destroy()`（部分附帶 `update()` / `refresh()`）。
- 透過 CSS 自訂屬性調整參數，避免寫死每個網站的設計。

## 零件清單

| 子目錄 | 檔案 | 單一責任 |
|---|---|---|
| `trigger/` | `element_progress.js` | 元素進出視窗時的進度（0～1） |
| | `direction.js` | 判斷向上／向下捲動 |
| | `leave.js` | 元素曾進入後又離開視窗 |
| | `velocity.js` | 當下捲動速度，px/s |
| | `section_active.js` | 哪個頁面區塊位於閱讀焦點 |
| `linked/` | `opacity.css` | 滾動進度連動透明度 |
| | `translate_x.css` | 滾動進度連動水平位移 |
| | `translate_y.css` | 滾動進度連動垂直位移 |
| | `scale.css` | 滾動進度連動縮放 |
| | `rotate.css` | 滾動進度連動旋轉 |
| | `blur.css` | 滾動進度連動模糊程度 |
| | `clip_reveal.css` | 滾動進度連動遮罩揭露 |
| `motion/` | `fade.css` | 淡入 |
| | `slide_up.css` / `slide_down.css` | 上／下移動 |
| | `slide_left.css` / `slide_right.css` | 左／右移動 |
| | `zoom.css` | 縮放進場 |
| | `spin.css` | 旋轉進場 |
| | `flip_x.css` / `flip_y.css` | X/Y 軸翻轉進場 |
| | `blur_clear.css` | 模糊變清楚 |
| | `bounce.css` | 彈跳進場 |
| | `shake.css` | 搖晃 |
| `parallax/` | `x.js` / `y.js` | 獨立單軸視差，支援一起載入 |
| `layout/` | `sticky_top.css` / `sticky_bottom.css` | 原生黏住上／下緣 |
| | `snap_x.css` / `snap_y.css` | 原生 X/Y 滾動吸附 |
| | `horizontal_rail.css` | 可用手指左右滑動的橫向內容列 |
| `horizontal/` | `vertical_to_horizontal.css` + `.js` | 垂直捲動推進橫向展示（單一功能的 CSS/JS 配對） |
| `control/` | `stagger.js` | 多元素逐一增加 delay，不決定動畫樣式 |

## 既有軍火庫能力（不再做第二份）

- 進入視窗 / 每次進入 / 只進入一次：`effects/reveal/auto_reveal.js` → `SlowlyReveal.create({ once: false })`。
- 現有淡入上浮：`effects/reveal/fade_up.css`。
- 滑到特定高度增加 class：`effects/scroll/scroll_class.js`。
- 全頁滾動進度條：`effects/scroll/progress.js` + `progress.css`。
- 視差加透明度的現成組合：`effects/scroll/parallax_fade.js`。

這些舊檔案**沒有修改**，新零件可以直接跟它們搭配。

## 範例一：進入視窗 → 淡入＋上浮

`fade.css` 與 `slide_up.css` 各是獨立 CSS。觸發使用既有 `auto_reveal.js`：

```html
<link rel="stylesheet" href="https://lib.stillnessbyslowly.com/scroll_motion/motion/fade.css">
<link rel="stylesheet" href="https://lib.stillnessbyslowly.com/scroll_motion/motion/slide_up.css">
<div class="slowly-motion-fade slowly-motion-slide-up" data-slowly-reveal>
  我的卡片
</div>
<script src="https://lib.stillnessbyslowly.com/effects/reveal/auto_reveal.js"></script>
<script>
  SlowlyReveal.create({ once: false });
</script>
```

對單一元素調整參數，例如 `style="--slowly-motion-duration:800ms; --slowly-motion-delay:150ms; --slowly-motion-y-distance:42px"`。

## 範例二：滑多少，內容就動多少

`element_progress.js` 本身**不做動畫**，只計算進度。`linked/` 中各 CSS 不需要彼此依賴：

```html
<link rel="stylesheet" href="https://lib.stillnessbyslowly.com/scroll_motion/linked/opacity.css">
<link rel="stylesheet" href="https://lib.stillnessbyslowly.com/scroll_motion/linked/translate_x.css">
<section id="scroll-zone" style="min-height:160vh">
  <div class="slowly-scroll-opacity slowly-scroll-translate-x">會逐漸顯現並移動</div>
</section>
<script src="https://lib.stillnessbyslowly.com/scroll_motion/trigger/element_progress.js"></script>
<script>
  const scrollPart = SlowlyScrollElementProgress.attach('#scroll-zone');
  // 解除監聽：scrollPart.destroy();
</script>
```

**建議把進度計算掛在不動的外層容器，動畫加在內層子元素**，避免移動、縮放效果反過來影響測量值。CSS 自訂變數會由外層繼承至內層。

進度參數：`start` 預設 1（元素頂端到達視窗下方）；`end` 預設 0（元素底端離開視窗上方）。`onUpdate(progress, element)` 提供 0～1 值。

### linked 微零件的可調參數

- `opacity.css`：`--slowly-scroll-opacity-from`、`--slowly-scroll-opacity-to`（預設 .15～1）。
- `translate_x.css`：`--slowly-scroll-translate-x-distance`（預設 48px）。
- `translate_y.css`：`--slowly-scroll-translate-y-distance`（預設 32px）。
- `scale.css`：`--slowly-scroll-scale-from`、`--slowly-scroll-scale-to`（預設 .85～1）。
- `rotate.css`：`--slowly-scroll-rotate-from`、`--slowly-scroll-rotate-to`（預設 -15deg～0deg）。
- `blur.css`：`--slowly-scroll-blur-from`（預設 12px）。
- `clip_reveal.css`：由左到右揭露（目前無額外參數）。

## 範例三：垂直捲動，橫向展示

這是唯一需要 HTML 結構、CSS、JS 三者配合的零件；JS 不攔截 wheel/touch，手機一樣正常上下滑。

```html
<link rel="stylesheet" href="https://lib.stillnessbyslowly.com/scroll_motion/horizontal/vertical_to_horizontal.css">
<section id="hscroll" class="slowly-vth">
  <div class="slowly-vth-viewport">
    <div class="slowly-vth-track">
      <article style="width:100vw;height:100vh">第一屏</article>
      <article style="width:100vw;height:100vh">第二屏</article>
      <article style="width:100vw;height:100vh">第三屏</article>
    </div>
  </div>
</section>
<script src="https://lib.stillnessbyslowly.com/scroll_motion/horizontal/vertical_to_horizontal.js"></script>
<script>
  const hscroll = SlowlyVerticalToHorizontal.attach('#hscroll');
  // 當卡片數量或寬度變動：hscroll.refresh();
  // 離開頁面：hscroll.destroy();
</script>
```

## 注意事項

1. `motion/` 使用 `.is-visible` 作啟動標記，可用原有 `SlowlyReveal` 自動控制，也可以由網站手動控制。CSS 零件不負責檢測捲動。
2. `motion/slide_*` 使用個別的 CSS `translate`；**X + Y 可組合**。`fade`（opacity）、`zoom`（scale）、`spin`（rotate）也能疊用。**同時使用兩個旋轉類或兩個 blur/filter 類效果，則會互相覆蓋**。
3. `linked/` 和 `motion/` 若同時控制*同一個 CSS 屬性*，仍可能覆蓋，這時請對內外兩層分別套用效果。
4. `layout/sticky_*` 遵守 CSS sticky 規則，祖先的 overflow、可捲動範圍都可能影響固定位置；`snap_*` 要放在有固定可捲動尺寸的容器。
5. 基於視差的 `parallax/x.js`、`y.js` 控制 `translate`；若元素已有自己的 translate 效果，請分配至不同包裝層。兩支 JS 可同時套到同一元素，解除時會恢復原始 translate。
6. 所有純動畫 CSS 都內建 `prefers-reduced-motion` 處理；滾動進度在減少動態設定下會固定為完成狀態。橫向展示則退回一般左右滑動。
7. 未公開檔案前，以上 CDN 路徑**尚不會生效**：先把新目錄放進軍火庫 repo 並部署 GitHub Pages，主頁入口則可以之後再討論。
