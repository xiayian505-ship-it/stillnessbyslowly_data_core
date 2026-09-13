慢慢的倉庫｜Data / Blob

Blob URL v1.0.0

用途：
- Blob / File → 暫時 Object URL
- 回收 Object URL

檔案：
- blob_url.js
- blob_url_usage.html
- test_blob_url.html

原則：
- 不包裝 Blob 本身。
- 不負責建立 Blob。
- 不綁定圖片、PNG、PDF、JSON、ZIP 等特定格式。
- 不負責預覽、下載或儲存。
- 宿主決定 Object URL 要拿來做什麼，以及何時結束使用。

來源：
- 自作品探索中反覆使用的 URL.createObjectURL(blob) /
  URL.revokeObjectURL(url) 流程抽出。
