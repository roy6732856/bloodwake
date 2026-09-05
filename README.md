# BLOODWAKE｜血月獵場

可直接玩的 3D 俯視生存射擊 Roguelite 原型。Three.js 真實 3D 場景，繁體中文介面，單局 5 分鐘，離線本機可運行。

## 啟動

安裝 Node.js 後，在本資料夾執行 `node server.mjs`，開啟 http://127.0.0.1:4173 。所有依賴與圖片都包含於專案，不需要 npm install、API 金鑰或遊戲帳號。若 4173 已被占用，可設定 PORT 環境變數。

Windows 亦可雙擊 `啟動遊戲.cmd`。請從伺服器網址開啟，直接雙擊 index.html 會受 ES module 的瀏覽器限制。

## 操作與玩法

- WASD／方向鍵移動；滑鼠瞄準，按住左鍵射擊。
- Space 衝刺（短暫無敵），E 新星（範圍傷害與擊退）。
- F 切換自動射擊，瞄準仍由滑鼠控制。
- Esc／P 暫停，切換視窗也會自動暫停。
- 1／2／3 選擇升級。觸控可用左右虛擬搖桿與技能按鈕。
- 拾取青色靈魂升級；紅色結晶補血。墓碑會擋住移動與銀彈。
- 三種普通敵人：行屍、血蝠、重甲屍；每分鐘召喚典獄長（同時最多一名），會施放環形衝擊波。
- 九種隨機局內強化。存活至 05:00 獲勝，死亡或主動結束也可獲得已賺取的殘魂。
- 每 8 次擊殺 +1 殘魂，每存活 20 秒 +1，生還額外 +20。主選單傳承商店可購買三類永久強化，各 5 階。
- 進度儲存在 localStorage `bloodwake.save.v1`，只屬於同一瀏覽器與網址；無雲端同步。

## 技術與素材

原生 ES modules + Three.js 0.180.0（vendor 目錄，MIT）。實作參照官方 [OrthographicCamera](https://threejs.org/docs/pages/OrthographicCamera.html) 與 [Raycaster](https://threejs.org/docs/pages/Raycaster.html) 文件。無外部執行期 CDN。Web Audio 合成射擊、拾取、升級、受傷音效。

`src/game.js`：固定步長戰鬥、碰撞與敵潮。`src/models.js`：3D 模型與場景。`src/progression.js`：升級、經濟、存檔驗證。`src/main.js`：HUD、選單、觸控操作。

Image Gen 生成的概念：`design/concept.png`；石地材質：`public/assets/slate.png`；血月選單背景：`public/assets/bloodmoon.png`。提示詞／設計說明見 design 目錄。角色與障礙物採實際 low-poly 模型，與概念圖的細節程度有意識地區分，以保留真 3D 和瀏覽器效能。

## 驗證

`node --test tests/*.test.mjs`：永久強化購買、損壞存檔、隨機選項、獎勵計算、能力變更。瀏覽器 QA 結果見 `design/QA.md`。

此版本是單一競技場原型；尚未包含多人連線、多張地圖、完整角色動畫素材或雲端存檔。
