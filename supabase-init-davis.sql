-- ============================================================
-- Davis Taiwan App — Supabase 初始化 SQL
-- 在 Supabase SQL Editor 中執行此檔案
-- ============================================================

-- 1. breed_groups（毛安住 + Davis 共用品種表）
CREATE TABLE IF NOT EXISTS breed_groups (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  species          TEXT NOT NULL CHECK (species IN ('dog', 'cat')),
  name             TEXT NOT NULL,
  name_en          TEXT,
  name_ja          TEXT,
  name_cn          TEXT,
  aliases          TEXT[] DEFAULT '{}',
  size_range       TEXT[],
  weight_range     JSONB,
  coat_types       TEXT[] DEFAULT '{}',
  emoji            TEXT,
  coat_characteristics TEXT,
  davis_breed_id   TEXT,
  davis_product_keys TEXT[] DEFAULT '{}',
  grooming_tips    JSONB DEFAULT '[]',
  seasonal_notes   JSONB DEFAULT '{}',
  is_active        BOOLEAN DEFAULT true,
  sort_order       INT DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_breed_groups_species ON breed_groups(species);

-- 2. davis_products
CREATE TABLE IF NOT EXISTS davis_products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_key TEXT UNIQUE NOT NULL,
  name_zh     TEXT NOT NULL,
  name_en     TEXT,
  name_cn     TEXT,
  name_ja     TEXT,
  category    TEXT CHECK (category IN ('shampoo','conditioner','spa','specialty','skin_care','ear_care')),
  series      TEXT CHECK (series IN ('salon','show_beauty','skin_care','ear_care')),
  tag_zh      TEXT, tag_en TEXT, tag_cn TEXT, tag_ja TEXT,
  reason_zh   TEXT, reason_en TEXT, reason_cn TEXT, reason_ja TEXT,
  note_zh     TEXT, note_en TEXT, note_cn TEXT, note_ja TEXT,
  dilution    TEXT,
  dwell_time  TEXT,
  usage_steps JSONB DEFAULT '[]',
  coat_types  TEXT[] DEFAULT '{}',
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 3. davis_settings
CREATE TABLE IF NOT EXISTS davis_settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT UNIQUE NOT NULL,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 4. davis_shares
CREATE TABLE IF NOT EXISTS davis_shares (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  result_data JSONB NOT NULL,
  breed       TEXT,
  tier        TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 5. davis_certifications
CREATE TABLE IF NOT EXISTS davis_certifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  shop_name   TEXT,
  city        TEXT,
  phone       TEXT,
  email       TEXT,
  instagram   TEXT,
  facebook    TEXT,
  photo_url   TEXT,
  lat         FLOAT,
  lng         FLOAT,
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 6. davis_analytics
CREATE TABLE IF NOT EXISTS davis_analytics (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type    TEXT NOT NULL,
  breed         TEXT,
  tier          TEXT,
  tokens_in     INT DEFAULT 0,
  tokens_out    INT DEFAULT 0,
  model         TEXT,
  ip_address    TEXT,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================
ALTER TABLE breed_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE davis_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE davis_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE davis_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE davis_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE davis_settings ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "breed_groups_select_all" ON breed_groups FOR SELECT USING (true);
CREATE POLICY "davis_products_select_all" ON davis_products FOR SELECT USING (true);
CREATE POLICY "davis_shares_insert_all" ON davis_shares FOR INSERT WITH CHECK (true);
CREATE POLICY "davis_shares_select_all" ON davis_shares FOR SELECT USING (true);
CREATE POLICY "davis_certifications_select_approved" ON davis_certifications FOR SELECT USING (status = 'approved');
