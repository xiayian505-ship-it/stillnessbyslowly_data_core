# 慢慢軍火庫｜Video / 影片基礎積木

只拆來源 `video-speed-player-2.html` 中可重組的媒體能力，不保存來源完成品、不移植其 UI、CSS、配色及文案。
本批 **10 個 JS 微零件 + 10 個無自訂 CSS 的單體測試頁**，歸到 `video/` 新主目錄。
**這次先做零件、不修改主頁 `index.html`／`index_data.js`，也不新增 `component/video/`。**

## 原則

- 每個 `.js` 僅暴露一個 `window.SlowlyVideo...` API，單獨載入即能使用；零個其他軍火庫零件的必要依賴。
- 積木無 DOM 排版、字體、背景、顏色；宿主自己決定 UI。
- 只負責瀏覽器已有的 Web API，不需要外部套件、金鑰、伺服器；瀏覽器不支援的功能須由宿主處理。
- 真正要組裝完整播放器，請等所有積木上傳 GitHub Pages 後由成品透過各自 **HTTPS 絕對網址** 引用；不要複製 JS 到成品目錄。
- 測試頁可以使用瀏覽器原生 File / URL、Canvas 來供應測試素材；那是測試器，不是正式積木依賴。

## 積木表

| 檔案 | 全域物件 | API | 單一職責 |
|---|---|---|---|
| `playback/playback_rate.js` | `SlowlyVideoPlaybackRate` | `get / set` | 播放倍率 |
| `playback/play_pause.js` | `SlowlyVideoPlayPause` | `play / pause / toggle` | 播放與暫停 |
| `playback/seek.js` | `SlowlyVideoSeek` | `to / restart` | 跳轉與重頭 |
| `playback/ready.js` | `SlowlyVideoReady` | `wait` | 等待可播放 |
| `capture/capture_stream.js` | `SlowlyVideoCaptureStream` | `isSupported / capture` | 影片元素串流擷取 |
| `recording/mime_type.js` | `SlowlyVideoRecorderMime` | `isSupported / choose / defaultTypes` | 錄製格式偵測 |
| `recording/media_recorder.js` | `SlowlyVideoMediaRecorder` | `isSupported / create / start / stop` | 錄製器生命週期 |
| `recording/recorded_chunks.js` | `SlowlyVideoRecordedChunks` | `create → add / attach / detach / toBlob / clear` | 錄製片段收集 |
| `progress/media_progress.js` | `SlowlyVideoMediaProgress` | `ratio / percent / read` | 播放進度 |
| `progress/remaining_time.js` | `SlowlyVideoRemainingTime` | `seconds / read` | 倍速剩餘時間 |

## 直接引用範例

```html
<script src="https://lib.stillnessbyslowly.com/video/playback/playback_rate.js"></script>
<script>
  const video = document.querySelector('video');
  SlowlyVideoPlaybackRate.set(video, 2);
</script>
```

## 其他可用的既有軍火庫零件（不重複做）

- `https://lib.stillnessbyslowly.com/data/blob/blob_url.js` → `SlowlyBlobURL.create(file)` / `.revoke(url)`：檔案臨時 URL。
- `https://lib.stillnessbyslowly.com/data/blob/blob_url_scope.js` → 多筆 URL 生命週期。
- `https://lib.stillnessbyslowly.com/data/file/file_reader.js` → File / Blob 內容讀取。
- `https://lib.stillnessbyslowly.com/data/file/filename_sanitize.js` → 檔名清理。
- `https://lib.stillnessbyslowly.com/date/timer/elapsed_format.js` → 毫秒格式化為 HH:MM:SS。

以上是**成品可選擇引用**的獨立積木；本批 Video 基礎積木沒有強制引用它們。

## 與原始播放器的界線

- 倍速（`playbackRate`）、讀取串流（`captureStream`）、錄製（`MediaRecorder`）是不同能力，不能混作一個 JS。
- `captureStream()` 取的是影片元素的媒體串流，**不是啟動三星手機系統的螢幕錄影**。
- 部分瀏覽器不支援串流擷取或指定 MIME，甚至會在背景節流；無法保證全部手機能匯出。
- 原始播放器原先使用 `seeked` 作為錄製啟動點，若已經在 0 秒不一定會觸發；新的 `ready.js` 負責等待可播放狀態，但成品仍要自行組合錄製時序並做實測。
- `recorded_chunks.js` 只能在錄製器 `stop` 事件完成且最後的 dataavailable 已送達之後轉成完整 Blob。
- **S25U、N20U 正常使用**是原始完成品的個人實測紀錄；待重做完成品時寫進成品 README，不當作這批微零件的相容性保證。

## 測試

開啟 `video/video_usage.html`，逐頁驗證各零件。不含自訂 CSS；需影片檔案的測試頁直接選本機檔案，不會上傳。
正式上線的每個測試頁也可由 `https://lib.stillnessbyslowly.com/video/子目錄/test_檔名.html` 開啟。
