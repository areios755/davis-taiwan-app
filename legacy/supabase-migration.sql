-- =============================================
-- Davis Admin + Analytics + Users
-- 在 Supabase SQL Editor 執行
-- =============================================

-- 1. Settings
CREATE TABLE IF NOT EXISTS davis_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Products
CREATE TABLE IF NOT EXISTS davis_products (
  id TEXT PRIMARY KEY,
  category TEXT DEFAULT 'cleaning',
  icon TEXT DEFAULT '🧴',
  color TEXT DEFAULT '#1A6FD4',
  tag_zh TEXT, tag_en TEXT, tag_ja TEXT,
  reason_zh TEXT, reason_en TEXT, reason_ja TEXT,
  note_zh TEXT, note_en TEXT, note_ja TEXT,
  steps JSONB DEFAULT '[]'::jsonb,
  sort_order INT DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Breeds
CREATE TABLE IF NOT EXISTS davis_breeds (
  name_zh TEXT PRIMARY KEY,
  name_en TEXT, name_ja TEXT,
  emoji TEXT DEFAULT '',
  coat_type TEXT DEFAULT '',
  product_keys JSONB DEFAULT '[]'::jsonb,
  wangdefu_aliases JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Analytics (含 token 用量)
CREATE TABLE IF NOT EXISTS davis_analytics (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  breed TEXT,
  pet_type TEXT,
  source TEXT DEFAULT 'direct',
  lang TEXT DEFAULT 'zh-TW',
  is_embed BOOLEAN DEFAULT FALSE,
  is_real_ai BOOLEAN DEFAULT TRUE,
  tier_selected TEXT,
  user_agent TEXT,
  model TEXT DEFAULT 'claude-opus-4-6',
  input_tokens INT DEFAULT 0,
  output_tokens INT DEFAULT 0
);

-- 5. Users (多帳號管理)
CREATE TABLE IF NOT EXISTS davis_users (
  username TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'viewer',
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_analytics_created ON davis_analytics (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_source ON davis_analytics (source);
CREATE INDEX IF NOT EXISTS idx_analytics_breed ON davis_analytics (breed);

-- 7. Initial settings
INSERT INTO davis_settings (key, value) VALUES
  ('enabled_languages', '["zh-TW"]'::jsonb),
  ('embed_whitelist', '["https://wonderpet.netlify.app"]'::jsonb),
  ('embed_use_real_ai', 'false'::jsonb),
  ('embed_fake_delay_ms', '2000'::jsonb),
  ('ai_pricing', '{"model":"claude-opus-4-6","input_per_mtok":15,"output_per_mtok":75,"currency":"USD"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 8. RLS
ALTER TABLE davis_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE davis_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE davis_breeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE davis_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE davis_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_all_settings" ON davis_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_products" ON davis_products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_breeds" ON davis_breeds FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_analytics" ON davis_analytics FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_users" ON davis_users FOR ALL USING (true) WITH CHECK (true);

-- ── davis_shares: 分析結果短連結 ──
CREATE TABLE IF NOT EXISTS davis_shares (
  id          TEXT PRIMARY KEY,          -- 6碼隨機ID，如 "a3k9mz"
  result_json JSONB NOT NULL,            -- 完整 AI 分析結果
  breed       TEXT,                      -- 品種名稱（方便查詢）
  tier        TEXT,                      -- 推薦等級 basic/advanced/signature
  source      TEXT DEFAULT 'direct',     -- 來源
  hotel       TEXT,                      -- 汪得福旅館來源
  view_count  INTEGER DEFAULT 0,         -- 瀏覽次數
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  expires_at  TIMESTAMPTZ DEFAULT NOW() + INTERVAL '90 days'
);

CREATE INDEX IF NOT EXISTS davis_shares_created ON davis_shares(created_at DESC);

-- RLS: 公開可讀（分享連結不需登入），只能透過 service key 寫入
ALTER TABLE davis_shares ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shares_read" ON davis_shares;
CREATE POLICY "shares_read" ON davis_shares FOR SELECT USING (true);

-- ── davis_certifications: 美容師認證 ──
CREATE TABLE IF NOT EXISTS davis_certifications (
  id            TEXT PRIMARY KEY,           -- 8碼唯一ID，如 "DV-A3K9MZ2P"
  shop_name     TEXT NOT NULL,              -- 店名
  owner_name    TEXT NOT NULL,              -- 負責人/美容師姓名
  phone         TEXT,                       -- 聯絡電話
  city          TEXT,                       -- 縣市
  address       TEXT,                       -- 地址
  ig_url        TEXT,                       -- IG 帳號
  fb_url        TEXT,                       -- FB 頁面
  line_id       TEXT,                       -- LINE ID
  note          TEXT,                       -- 申請說明
  status        TEXT DEFAULT 'pending',     -- pending / approved / rejected
  badge_level   TEXT DEFAULT 'certified',   -- certified / advanced / master
  approved_at   TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,                -- 認證有效期（通常1年）
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  view_count    INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS davis_cert_status ON davis_certifications(status);
CREATE INDEX IF NOT EXISTS davis_cert_created ON davis_certifications(created_at DESC);

ALTER TABLE davis_certifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cert_read" ON davis_certifications;
CREATE POLICY "cert_read" ON davis_certifications FOR SELECT USING (true);
