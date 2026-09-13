慢慢的倉庫｜QRCode Print Component v1.0.0

定位
====
已完成、可直接呼叫的 QRCode / A4 實體尺寸列印工具。
這不是可任意重構的底層積木；列印核心視為「已校正黑盒」。

來源
====
由既有 qrcode_print_tool.html + qrcode_print_tool.css 完成品化。
原工具曾實際列印並以尺規量測、調整。

凍結規則（重要）
================
除非已確認存在 bug，以下邏輯不可為了重構、效能或程式碼美化而修改：
- QRCode normalize 演算法
- renderSize = 1200
- quietRatio = 0.06
- 黑色像素邊界掃描與重新繪製
- 80 / 120 / 150 / 200 四尺寸規格
- A4 各尺寸容量：18 / 18 / 12 / 9
- px → mm 換算
- 四尺寸實體樣張
- 水平 / 垂直尺規與 mm 刻度
- @page / @media print / A4 mm 排版
- 100%／實際大小列印提醒與流程

可替換範圍
==========
- qrcode_print_component.css：螢幕 UI 外觀殼
- 顯示文案（不得改變列印規格含義）

注意
====
qrcode_print_component.html 內嵌的 A4 / Print CSS 屬於核心，不是外觀殼，不應移除或覆寫。
外部依賴：QRious 4.0.2（jsDelivr）。

使用方式
========
最安全的完成品呼叫方式是 iframe，避免宿主 CSS / JS 污染已校正的列印環境：

<iframe
  src="https://lib.stillnessbyslowly.com/component/qrcode_print/qrcode_print_component.html"
  title="QRCode A4 列印"
  style="width:100%;min-height:900px;border:0;"
></iframe>

若要換殼，修改 qrcode_print_component.css；不要碰 HTML 內嵌的列印核心 CSS 與 A4 JS。
