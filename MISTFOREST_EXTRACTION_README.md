# 《霧林之契》→ 慢慢軍火庫：零件抽取交付

本包為完整軍火庫目錄（排除原 ZIP 的 `.git` 歷史資料），保留所有原有檔案並新增六組獨立零件、使用說明、Demo、Test；同步更新 `index_data.js`。沒有修改 `lin_card.zip` 的任何內容。

## 新增六組零件

- `state/story_event_player.js`｜故事事件播放器
- `state/story_reading_progress.js`｜閱讀進度
- `state/story_trigger_rules.js`｜劇情觸發
- `game/card/strategy/card_deck_presets.js`｜多套牌組
- `state/reward_claim_flow.js`｜逐項領獎
- `state/rejected_asset_routing.js`｜資產歸屬計畫

每個零件各有 `*_usage.html`、`*_demo.html`、`test_*.html` 與 `test_*_cases.js`。在瀏覽器開啟 `test_*.html` 可以看到實際 PASS／FAIL；Demo 直接從本地同目錄讀取零件，不需連網。執行 Node `node run_all_tests.cjs` 可以一次跑全部同一批測試。

## 技術界線與決策

- 01：採 `seekById`／`seekByIndex` 分離；未知事件類型不接受；`challenge` 透過 `completeHost()` 確認後才前進。
- 02：僅單一書籤，先以事件 ID 找位置，找不到回報失效，不擅自回退到可能已不同的索引。
- 03：規則採 callback，未開發新的 JSON 條件語言；多個命中依 priority 降冪、同級依登記順序。
- 04：採穩定字串 `preset_1` 起始；所持有的實體 ID 需宿主提供或用 `removeUnavailable()` 同步。
- 05：採 `accept/reject/replace` 提案、宿主執行資產更新，再 `commit(decisionId)`；失敗 `cancel`。跨重新整理與宿主資料庫的嚴格 exactly-once 仍需宿主使用決策 ID 實作去重。
- 06：採通用歸屬計畫與驗證，證明不只是一個差集；已實作獨立零件，但不做自動交易或資料回滾。
- 所有核心不依賴原遊戲，不帶固定界面、顏色、Boss、遊戲進度 Key。字串實體 ID 是卡牌配置與資產歸屬契約。

## 驗收

測試頁和 Node 都使用同一套測試案例，避免「頁面顯示 PASS 但測試內容不同」。另有 `docs/Mistforest_Arsenal_Extraction_Spec_2026-10-29.md` 原始需求可供逐條比對。

**路徑提醒：** `index_data.js` 登錄的是發布後應有的絕對網址；本次交付只有離線檔案，並未部署。
