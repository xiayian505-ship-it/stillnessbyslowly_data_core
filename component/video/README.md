# Slowly Video Speed Player Component v1.0.0

## 設計原則
- **完成品獨立**：本目錄不修改 /video/ 任一積木。透過 12 支軍火庫基礎 JS 組合出可直接操作的播放器。
- **絕對路徑**：所有基礎零件來自 `https://lib.stillnessbyslowly.com/`，不複製／重作積木；整台播放器也能使用 HTTPS 獨立載入。
- **外觀由宿主決定**：附可直接使用的 Piano 同色粉紅預設 CSS，宿主可用 --svsp-* 換皮；不引用 Piano 檔案。
- **不自動載入隱藏依賴**：必要 JS 必須由宿主明確按序引入。缺少時 mount 直接列出名稱。
- **不連動其他完成品**：與其他 Component 沒有依賴關係。

## 檔案
- `video_speed_player_component.js`：組裝/事件/錄製流程與清理
- `video_speed_player_component.css`：粉紅預設外觀、可覆寫變數與結構
- `video_speed_player_component_demo.html`：可直接開啟的完成品展示
- `video_speed_player_component_usage.html`：全套 HTTPS 引用範例與 API

## 必須先載入的軍火庫積木（依序）
- `https://lib.stillnessbyslowly.com/video/playback/playback_rate.js`（`SlowlyVideoPlaybackRate`）
- `https://lib.stillnessbyslowly.com/video/playback/play_pause.js`（`SlowlyVideoPlayPause`）
- `https://lib.stillnessbyslowly.com/video/playback/seek.js`（`SlowlyVideoSeek`）
- `https://lib.stillnessbyslowly.com/video/playback/ready.js`（`SlowlyVideoReady`）
- `https://lib.stillnessbyslowly.com/video/capture/capture_stream.js`（`SlowlyVideoCaptureStream`）
- `https://lib.stillnessbyslowly.com/video/recording/mime_type.js`（`SlowlyVideoRecorderMime`）
- `https://lib.stillnessbyslowly.com/video/recording/media_recorder.js`（`SlowlyVideoMediaRecorder`）
- `https://lib.stillnessbyslowly.com/video/recording/recorded_chunks.js`（`SlowlyVideoRecordedChunks`）
- `https://lib.stillnessbyslowly.com/video/progress/media_progress.js`（`SlowlyVideoMediaProgress`）
- `https://lib.stillnessbyslowly.com/video/progress/remaining_time.js`（`SlowlyVideoRemainingTime`）
- `https://lib.stillnessbyslowly.com/data/blob/blob_url.js`（`SlowlyBlobURL`）
- `https://lib.stillnessbyslowly.com/data/file/filename_sanitize.js`（`FilenameSanitize`）

然後引入：
- `https://lib.stillnessbyslowly.com/component/video/video_speed_player_component.css`
- `https://lib.stillnessbyslowly.com/component/video/video_speed_player_component.js`

呼叫：`const player = SlowlyVideoSpeedPlayer.mount("#container")`。

## 功能
- 本機檔案選擇、拖曳；播放、暫停、重新開始、更換影片。
- 0.5～5 倍速調整（每 0.5 倍一格）。
- 影片播放進度、錄製進度與預估剩餘時間。
- `captureStream()` + `MediaRecorder` 在瀏覽器錄製播放中的串流，再由 Blob URL 提供檔案下載。
- 可提前停止並取得已錄片段，並有未支援瀏覽器、無資料、錯誤等訊息。
- 不上傳檔案、不需網路 API（不計初次從 HTTPS 下載 JS/CSS）。

## 程式 API
- `.loadFile(file)`（Promise）載入 File
- `.setSpeed(number)` 設定 0.5～5
- `.startExport()`（Promise）開始錄製，需裝置支援
- `.stopExport()`（Promise）提前停止／取消準備
- `.reset()` 更換檔案前清理
- `.destroy()` 取消錄製、回收 Object URLs、移除事件與 DOM
- `.elements` 提供原生 DOM 的引用；`.video` 原生 HTMLVideoElement
- `mount(selectorOrElement, { onError, onExport, speeds })`，其中 `speeds` 改變預設倍率按鈕

## 主題變數（與 Piano Demo 完全相同的原始色碼）
- `--svsp-bg: #151018`、`--svsp-text: #f8eef5`、`--svsp-muted: #cdbdca`
- `--svsp-accent: #ff8fc6`
- `--svsp-panel-bg: rgba(255, 143, 198, 0.08)`、`--svsp-border: rgba(255, 180, 216, 0.22)`
- `--svsp-button-bg: linear-gradient(180deg, #ffe9f4, #ffc5df)`
- `--svsp-button-text: #5d2643`、`--svsp-button-border: #ffb2d5`
- `--svsp-button-active-bg: linear-gradient(180deg, #ff97c9, #ff6caf)`、`--svsp-button-active-border: #ff4b9c`
- `--svsp-dark-bg: linear-gradient(180deg, #7d3e61, #3e1e31)`、`--svsp-dark-text: #fff4fa`、`--svsp-dark-border: #985275`
- `--svsp-dark-active-bg: linear-gradient(180deg, #ff70b2, #b8407a)`、`--svsp-dark-active-border: #ff9bcb`
- `--svsp-radius`、`--svsp-spacing` 可調整布局尺寸。

宿主示範：
```css
#my-video .slowly-video-speed-player {
  --svsp-bg: transparent;
  --svsp-accent: currentColor;
  --svsp-button-bg: transparent;
  --svsp-button-text: inherit;
}
```

**備註**：由於元件本身的 CSS 有預設變數，要換皮請直接對 `.slowly-video-speed-player` 設定變數，而非只設定在其父容器。

## 個人手機歷史測試紀錄
- 舊版播放器：慢慢本人 Samsung Galaxy S25 Ultra（S25U）可正常使用。
- 舊版播放器：慢慢本人 Samsung Galaxy Note20 Ultra（N20U）可正常使用。
- 上述均為**舊版**實測；新版需由 S25U 再驗收，不聲稱其他手機支援，也不主動測試其他型號。

## 限制
- 正式匯出採瀏覽器的 `captureStream()`、`MediaRecorder`，不是呼叫手機系統螢幕錄影，也不是 FFmpeg 快速轉碼。
- 輸出容器、編碼、聲音軌道與播放倍率錄製結果依瀏覽器與裝置能力而定；未成功錄製則回報錯誤。
- 請保持播放頁面在前景、螢幕不要鎖定。
- 目前不登記到 `index_data.js`，先於 GitHub Pages 測試完整功能後再登記 Component。
