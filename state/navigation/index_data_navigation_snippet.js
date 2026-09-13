{
  "id": "navigation",
  "title": "Navigation / 跳轉",
  "subpage": true,
  "items": [
    {
      "title": "Navigation",
      "desc": "通用頁面跳轉核心，包裝瀏覽器 location / history 的常用跳轉行為，提供 go、replace、back、forward、reload 與 current；不綁 UI、Router、SPA、章節或遊戲流程。",
      "links": [
        { "label": "navigation.js", "href": "https://lib.stillnessbyslowly.com/state/navigation/navigation.js" },
        { "label": "功能測試", "href": "https://lib.stillnessbyslowly.com/state/navigation/test_navigation.html" },
        { "label": "使用說明", "href": "https://lib.stillnessbyslowly.com/state/navigation/navigation_usage.html" }
      ]
    },
    {
      "title": "Navigation URL",
      "desc": "通用 URL 解析與判斷工具，以原生 URL 為基礎，提供解析、相對網址解析、絕對網址判斷、外部網址判斷、同源判斷與 URL 資訊取得；不執行頁面跳轉。",
      "links": [
        { "label": "url.js", "href": "https://lib.stillnessbyslowly.com/state/navigation/url.js" },
        { "label": "功能測試", "href": "https://lib.stillnessbyslowly.com/state/navigation/test_url.html" },
        { "label": "使用說明", "href": "https://lib.stillnessbyslowly.com/state/navigation/url_usage.html" }
      ]
    },
    {
      "title": "Navigation Query",
      "desc": "通用 query string 處理工具，以 URLSearchParams 為基礎，提供讀取、複數讀取、存在判斷、設定、追加、刪除、物件轉換與 query 建立；不執行頁面跳轉。",
      "links": [
        { "label": "query.js", "href": "https://lib.stillnessbyslowly.com/state/navigation/query.js" },
        { "label": "功能測試", "href": "https://lib.stillnessbyslowly.com/state/navigation/test_query.html" },
        { "label": "使用說明", "href": "https://lib.stillnessbyslowly.com/state/navigation/query_usage.html" }
      ]
    },
    {
      "title": "Navigation Hash",
      "desc": "通用 URL hash 處理工具，提供 hash 正規化、讀取、設定、清除、比對與更新目前頁面 hash；不查找 DOM 元素，不綁 UI 或 Router。",
      "links": [
        { "label": "hash.js", "href": "https://lib.stillnessbyslowly.com/state/navigation/hash.js" },
        { "label": "功能測試", "href": "https://lib.stillnessbyslowly.com/state/navigation/test_hash.html" },
        { "label": "使用說明", "href": "https://lib.stillnessbyslowly.com/state/navigation/hash_usage.html" }
      ]
    },
    {
      "title": "Navigation History",
      "desc": "通用瀏覽紀錄操作核心，包裝原生 history API，提供 pushState、replaceState、go、back、forward、state 與 length；不自行監聽 popstate，也不維護 SPA route table。",
      "links": [
        { "label": "history.js", "href": "https://lib.stillnessbyslowly.com/state/navigation/history.js" },
        { "label": "功能測試", "href": "https://lib.stillnessbyslowly.com/state/navigation/test_history.html" },
        { "label": "使用說明", "href": "https://lib.stillnessbyslowly.com/state/navigation/history_usage.html" }
      ]
    }
  ]
}