Image / Lineart

檔案：
- index.html：Image 分頁
- lineart.js：圖片轉黑白線稿共用模組
- test_lineart.html：功能測試頁

基本用法：

Lineart.draw(img, canvas, {
  threshold: 12
});

這次只做核心抽離：
- 保留原本灰階 → 3×3 均值降噪 → Sobel Edge → threshold 二值化流程
- threshold 改由呼叫端傳入
- 不包含幼兒著色畫、A4 排版、列印等完成品功能
