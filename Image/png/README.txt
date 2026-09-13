慢慢的倉庫｜Image / PNG

這組模組來自作品探索中已實際運作的原生 Canvas → PNG 流程，
重新整理成可獨立引用的軍火庫零件。

原專案不需要修改。

模組：
- canvas_png.js
  Canvas → PNG Blob / Data URL
- png_download.js
  PNG Blob / Data URL → 下載

設計原則：
- 不依賴 html2canvas 或其他第三方 PNG 套件
- 不綁 UI、Modal、Toast、Storage
- Blob Object URL 只在下載流程內暫時使用並自動 revoke
