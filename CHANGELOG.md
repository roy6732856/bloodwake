# 0.4 · Bloodmoon Will

- 局內節奏導演：根據生命比例、近期受傷、附近敵人與清怪速度切換「窺視／獵潮／餘息」。敵人出生速率限制在原本的 65%～118%，既有敵人血量、傷害與玩家武器能力不變。低血量餘息最多每 60 秒提供一枚恢復結晶。
- 可選試煉：「獵殺印記」以 2.5 秒金色裂隙預告包抄，保留逃生方向，殘魂 +20%；「星蝕試煉」追加三輪有紅圈預警的星雨，殘魂 +25%。試煉與契約收益相乘；Boss 在場或餘息期間會延後新一輪試煉。
- 跨局記憶：保留最近 6 局的摘要與「太輕鬆／剛剛好／太挫折」回饋，推薦兵器和試煉。推薦不自動替玩家選擇。主動結束的戰局不計入分析。
- 經典模式：關閉動態節奏，仍可自由選擇試煉。
- 本版是可解釋的規則導演與個人戰局推薦，尚未接入生成式模型、訓練模型或全玩家推薦學習。不呼叫 Workers AI，不增加模型推論費用。
- 血月記憶沿用現有 D1 JSON 存檔，不需資料表遷移；舊 0.3 客戶端上傳時仍會保留新記憶。

# 0.3 · Cloud Saves

- Cloudflare Workers 靜態遊戲 + D1 私人進度儲存。
- 復原碼換裝置、離線補傳、存檔衝突選擇、本機匯入匯出與替換備份。
- 只發布遊戲資產，部署設定與測試檔不進入公開靜態目錄。

# Changelog

## 0.2 — Arsenal Update

Choose one of three hunters, three mechanically distinct weapons, and three difficulty contracts before each run. Build toward three weapon evolutions; discover chests, temporary powerups, timed world events and five one-time achievements. New caster and charger enemies change positioning decisions.

Combat now has generated transparent impact and rune effects, damage/critical numbers, a hit-confirmation reticle, weapon-specific sounds, brief critical hit pause, camera shake, combo feedback and an evolution reveal. Motion reduction disables camera shake and the UI reveal animation.

Validation: 11 Node tests and 21 in-browser integration tests pass, including separate accelerated five-minute runs with each weapon. Preserves version 0.1 progress and prevents duplicate achievement rewards.

## 0.1 — First playable

3D top-down survival shooter with five-minute rounds, manual aiming, dash, nova, undead crowds, bosses, three-choice upgrades and persistent legacy purchases.
