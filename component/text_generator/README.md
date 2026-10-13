# 慢慢軍火庫｜文字產生器家族（Text Generator）v2

所在分類：**完成品使用**  
路徑：`component/text_generator/`

## 核心原則

- **直式與橫式分別呼叫**，不使用單一 `mode` 切換器。
- **共通功能只寫一次**：Unicode 字素、字數上限、SVG 預覽／Blob、Canvas PNG、等比置中與下載由 `text_generator_core.js` 負責。
- **宿主控制外觀**：字型、文字筆畫、位置微調、色碼、SVG 模板、動態、背景、尺寸、網頁 UI 完全由宿主決定。軍火庫不提供固定的樣式 CSS。
- **不複製既有零件**：PNG 生成與下載直接呼叫軍火庫 `Image/png/`；Blob URL 可選用 `data/blob/`。
- 不附帶第三方字型檔。SVG 使用 `<text>` 時，不同裝置可能有不同字形；宿主自行處理所用字型的授權與一致性。

## 目錄與職責

| 檔案 | 功能 |
| --- | --- |
| `text_generator_component.js` | **v1 相容入口，原檔保留不修改**：`SlowlyTextGenerator` |
| `text_generator_core.js` | v2 共通核心：`SlowlyTextGeneratorCore` |
| `text_generator_vertical_component.js` | v2 **直式**完成品：`SlowlyVerticalTextGenerator` |
| `text_generator_horizontal_component.js` | v2 **橫式**完成品：`SlowlyHorizontalTextGenerator` |
| `text_generator_component_usage.html` | 原 v1 說明，保留 |
| `text_generator_component_demo.html` / `.js` | 原 v1 示範，保留 |
| `test_text_generator.html` / `.js` | 原 v1 測試，保留 |
| `text_generator_vertical_usage.html` | v2 直式參數及 HTTPS 使用說明 |
| `text_generator_vertical_demo.html` / `.js` | v2 直式中性示範 |
| `test_text_generator_vertical.html` / `.js` | v2 直式獨立測試 |
| `text_generator_horizontal_usage.html` | v2 橫式參數及 HTTPS 使用說明 |
| `text_generator_horizontal_demo.html` / `.js` | v2 橫式中性示範 |
| `test_text_generator_horizontal.html` / `.js` | v2 橫式獨立測試 |

## 宿主的 HTTPS 絕對連結

只有直式的宿主：

```html
<script defer src="https://lib.stillnessbyslowly.com/data/blob/blob_url.js"></script>
<script defer src="https://lib.stillnessbyslowly.com/Image/png/canvas_png.js"></script>
<script defer src="https://lib.stillnessbyslowly.com/Image/png/png_download.js"></script>
<script defer src="https://lib.stillnessbyslowly.com/component/text_generator/text_generator_core.js"></script>
<script defer src="https://lib.stillnessbyslowly.com/component/text_generator/text_generator_vertical_component.js"></script>
```

只有橫式的宿主：將最後一行改成：

```html
<script defer src="https://lib.stillnessbyslowly.com/component/text_generator/text_generator_horizontal_component.js"></script>
```

- 不用把另一個方向的完成品一起載入。
- `SlowlyBlobURL` 是可選依賴；未載入時 core 使用瀏覽器原生 Blob URL。
- 只生成 SVG／預覽時不需要 PNG 零件；執行 `pngBlob()` 需要 `SlowlyCanvasPNG`，執行 `downloadPNG()`／`downloadCover()` 另外需要 `SlowlyPNGDownload`。
- 軍火庫**內部**的 demo/test 使用相對檔案路徑，方便先在測試分支驗證未部署的 v2；**外部宿主**請一律使用以上 HTTPS 絕對網址。

## v2 最小 API

兩個完成品均有 `.create(options)`，其中：

- `maxChars`：可調字數上限，預設 4，使用 Unicode 字素切分。
- `sourceSize`：SVG 來源畫布尺寸 `{width,height}` 或 `(text) => ({width,height})`，應與宿主 SVG `viewBox` 一致。
- `renderSVG(text, helpers, layout)`：必填；宿主產生完整 SVG 字串。
- `getPositions(text, size)`：可選，回傳與字數一致的 `[{x,y}, ...]`，覆蓋預設字位。
- `presets`：`png` 倍率、`cover` 長寬／留白／`fit` 等；700×1000 只是宿主可選預設，不是核心強制。
- `filenames`：自訂各種輸出檔名。

`layout` 為 `{orientation, sourceSize, slots}`；`slots` 每項包含 `{index,x,y}`。垂直完成品提供由上而下字位；水平完成品提供由左而右字位。這些只是參考位置，並不幫宿主畫字。

建立後的方法：

```js
art.normalize(text);
art.layout(text);
art.generateSVG(text);
art.sourceSize(text);
art.createPreview(imageElement);  // set(text), clear(), destroy()
art.svgBlob(text);
art.formatSize(text, "png");
art.formatSize(text, "cover");
await art.pngBlob(text, "png");
art.downloadSVG(text);
await art.downloadPNG(text, "png");
await art.downloadCover(text);
```

完整範例請看 `text_generator_vertical_usage.html`、`text_generator_horizontal_usage.html`。

## 透明與尺寸

Canvas 預設透明，只畫宿主 SVG；**宿主 SVG 若自行繪製背景，核心不會刪除**。書封一般使用 `fit: "contain"` 等比縮放，留白依宿主指定；`fit: "fill"` 會拉伸，須自行承擔構圖差異。圖片像素尺寸需為 1～16384 的整數。

預覽採 Object URL，更新、清空或 `destroy()` 時釋放資源。宿主移除頁面預覽時應呼叫 `destroy()`。

## v1 相容性

- `text_generator_component.js`、原 v1 demo/usage/test 的**檔案內容保持與本次上傳的軍火庫 ZIP 相同**。
- 四個既有直式系列（Star、Rain、Thunder、Forest）不需要跟著這次 v2 修改。
- 全域名稱不同：`SlowlyTextGenerator`（舊）、`SlowlyTextGeneratorCore`（新）、`SlowlyVerticalTextGenerator`（新）、`SlowlyHorizontalTextGenerator`（新）。
- 新系列只需要引用 core 和自己選擇的單一方向完成品。

## 測試與部署

本次本機 Chromium 測試：

- 直式 **27 / 27** 項通過，橫式 **27 / 27** 項通過，兩邊各自獨立載入。
- 兩個 demo 的 SVG、透明 PNG、700×1000 書封下載共 **6 項成功**；PNG 四角 alpha 為 0。
- 390px 寬度下兩個 demo 均未橫向溢出。
- 上述測試以本機**內嵌相同內容**執行，正式部署後仍須確認 HTTPS 路徑可讀。

**部署順序**：先將 v2 新檔放入軍火庫，確認核心與 demo/test 正常，再讓新宿主改用正式 HTTPS 絕對路徑。本次沒有修改四個既有網站，也**沒有修改 `index_data.js`**；等 v2 正式上線後，可在既有 Text Generator 完成品項目中補上新的直式／橫式連結（不要重複新增卡片）。

## 程式碼排版與範例頁

- JS、頁面內 CSS 都以多行可讀格式保存，不採最小化壓縮。
- Demo 的 CSS 只保留表單、響應式排列和透明棋盤格，未設定按鈕主題外觀。
- Usage 僅限制內文寬度與程式碼捲動，Test 使用瀏覽器原生外觀。
- 三個公開元件 JS 與 v1 相容入口的邏輯均未更動。
