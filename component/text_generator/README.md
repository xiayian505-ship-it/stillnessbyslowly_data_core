# 慢慢軍火庫｜Text Generator Component v1.0.0

位置：`component/text_generator/`（完成品使用）

## 核心原則

- 完成品負責文字切分、SVG 呼叫、SVG 預覽 Object URL、Canvas PNG、透明畫布等比例置中、下載流程。
- 宿主提供**實際 SVG 生成函式**（可以讀取自己的模板並建立雨滴、星光、雷電等），指定文字字位、字體、字數上限、尺寸、顏色與預設值。沒有任何風格寫死在軍火庫。
- 這個完成品**沒有 CSS**、不自動建立 UI，也不攜帶任何第三方字型檔。
- 已有零件直接使用：`data/blob/blob_url.js`（可選預覽 URL）、`Image/png/canvas_png.js`（PNG 必要）、`Image/png/png_download.js`（PNG 下載必要）。
- 700×1000 的角角者書封只是宿主可以設定的輸出尺寸，不是完成品強制輸出的格式。

## 檔案

- `text_generator_component.js`：完整共用生成功能
- `text_generator_component_usage.html`：所有 API 與 HTTPS 引用方式
- `text_generator_component_demo.html` / `text_generator_component_demo.js`：獨立宿主示例
- `test_text_generator.html` / `test_text_generator.js`：瀏覽器測試（字數、畫布、透明背景）

## 已完成驗證

- 將 Star／Rain／Thunder 原版核心改接本完成品後，6 組不同文字 × 3 種模板，產生的 **SVG 字串逐位元一致**。
- 星辰、雨系、雷電原有書封版在 1、2、4 字的 `drawImage` 排列位置一致。
- JS 語法檢查及基於模擬 Canvas 的 PNG 尺寸／流程檢查通過。
- 使用 Chromium 將三個網站與軍火庫程式內嵌載入做實際瀏覽器測試：**9 種下載（3 系列 × SVG、PNG、書封）全部成功**。PNG 尺寸正確、四角 alpha 為 0，390px 手機視窗無橫向溢出。
- 軍火庫獨立測試頁 **12 / 12 項通過**，含 Blob、PNG 與背景透明。
- 此環境對本機 HTTP 網址有限制，因此採用內嵌資源方式驗證真實瀏覽器；**正式 CDN 網址與 GitHub Pages 部署後的連線尚未實測**。

## 正式上線順序

1. 先把 `component/text_generator/` 上傳進軍火庫 repo，確認 `https://lib.stillnessbyslowly.com/component/text_generator/text_generator_component.js` 能回傳 JavaScript。
2. 確認完成品示範及測試頁可用（PNG 零件需同時可讀）。
3. 再選擇性更新 `desk/word/` 的三個宿主（另有獨立接入版 ZIP；**勿先推宿主，否則會找不到新軍火庫檔案**）。
4. 需要在軍火庫首頁展示時，才更新 `index_data.js` 的「完成品使用」清單；單純部署完成品並不強制改首頁。

範例不需要傳 `assets/` 資料夾；`star / rain / thunder` 的 SVG 模板仍屬宿主，不應搬到軍火庫。

## 軍火庫首頁登錄（可選，先不要盲覆蓋舊檔）

如果要把這顆完成品放進首頁「完成品使用」，可在 repo 最新的 `index_data.js`，`page: "examples"` 的 `items` 中新增這個項目；**不要直接用舊版完整 `index_data.js` 覆蓋線上最新內容**：

```js
{
  title: "Text Generator Component",
  desc: "文字藝術字產生完成品。由宿主提供 SVG 模板、字體、色彩及輸出尺寸；提供文字字素切分、SVG 預覽、PNG 生成與透明書封等比輸出。依賴 Blob URL、Canvas PNG 與 PNG Download 既有零件，不附帶 CSS 或固定視覺風格。",
  links: [
    { label: "text_generator_component.js", href: "https://lib.stillnessbyslowly.com/component/text_generator/text_generator_component.js" },
    { label: "展示頁", href: "https://lib.stillnessbyslowly.com/component/text_generator/text_generator_component_demo.html" },
    { label: "使用說明", href: "https://lib.stillnessbyslowly.com/component/text_generator/text_generator_component_usage.html" }
  ]
}
```

### 程式碼與示範頁排版

- JS / SVG 模板保留多行原始碼，便於閱讀和改版；不使用壓縮版。
- 示範／測試 HTML 僅保留必要的版面與透明棋盤格，不另加藍色按鈕風格。
- 正式宿主（Star / Rain / Thunder）的按鈕樣式不受軍火庫元件控制。
