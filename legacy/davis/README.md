# Davis Taiwan 寵物洗護 AI 顧問

AI 驅動的寵物洗護產品推薦 App — 上傳毛孩照片，由 Claude AI 分析品種與毛質，推薦對應的 Davis 專業洗護套組。

---

## 🚀 部署到 Netlify（3 步驟）

### 步驟一：拖曳資料夾上傳

1. 打開 [netlify.com](https://netlify.com) 並登入
2. 進入 **Sites** 頁面
3. 將整個 `davis-taiwan-app` 資料夾直接**拖曳**到頁面下方的部署區塊
4. 等待部署完成（約 30 秒）

### 步驟二：設定 API Key（啟用 AI 分析功能）

1. 進入你的 Site → **Site configuration** → **Environment variables**
2. 點擊 **Add a variable**
3. 填入：
   - **Key:** `ANTHROPIC_API_KEY`
   - **Value:** 你的 Claude API Key（從 [console.anthropic.com](https://console.anthropic.com) 取得）
4. 點擊 **Save**
5. 回到 **Deploys** → 點擊 **Trigger deploy** → **Deploy site**

### 步驟三：完成！

部署完成後即可使用 AI 圖片分析功能 ✅

---

## 📁 檔案結構

```
davis-taiwan-app/
├── index.html                    # 主要 App 頁面
├── netlify.toml                  # Netlify 設定
├── README.md                     # 本說明文件
└── netlify/
    └── functions/
        └── analyze.js            # Serverless function（安全代理 Claude API）
```

---

## ✨ 功能說明

| 功能 | 說明 |
|------|------|
| 📷 圖片上傳 | 支援 JPG、PNG、HEIC、WEBP，可直接拍攝或上傳 |
| 🤖 AI 分析 | Claude AI 辨識品種、分析毛質，推薦 1–3 種情境套組 |
| ⚡ 品種快選 | 16 個常見品種一鍵推薦，無需 AI 分析 |
| 📋 完整使用流程 | Step 1–3 使用順序、稀釋比例、停留時間、推薦理由 |
| 🛒 官網引流 | 底部固定 CTA，直連 davistaiwan.com |

---

## 🎯 推薦情境涵蓋

- **去油深層清潔** — 泡沫柑橘香波 + 奶油護毛素
- **蓬鬆造型** — 質感香波 + 純粹全效護毛素
- **柔順解結** — 柔順香波 + 奶油護毛素（可加免沖護毛）
- **掉毛季（犬）** — 防脫毛香波 + 防脫毛乳液
- **掉毛季（貓）** — 防脫毛香波貓專用 + 防脫毛乳液
- **低敏日常保養** — 燕麥蘆薈香波 + 免沖護毛素
- **黑色系亮澤** — 炫黑香波 + 奶油護毛素
- **棕紅顯色** — 高級炫彩香波 + 奶油護毛素
- **扁臉眼周清潔** — 甜瓜香波 + Davis Spa 洁面乳

---

## ⚠️ 注意事項

- 未設定 `ANTHROPIC_API_KEY` 時，品種快速選擇功能仍可正常使用
- 所有對外宣傳遵循合規用語：僅描述清潔、保養、毛質表現，不宣稱療效
- API Key 儲存於 Netlify 環境變數，不會暴露在前端代碼中
