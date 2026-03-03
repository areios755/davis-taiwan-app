-- ============================================================
-- Davis Taiwan APP — DB Migration v2
-- Run on existing Supabase davis_* tables
-- ============================================================

-- 1. davis_products: Add simplified Chinese columns
ALTER TABLE davis_products ADD COLUMN IF NOT EXISTS tag_cn TEXT;
ALTER TABLE davis_products ADD COLUMN IF NOT EXISTS reason_cn TEXT;
ALTER TABLE davis_products ADD COLUMN IF NOT EXISTS note_cn TEXT;

-- 2. davis_breeds: Add simplified Chinese column
ALTER TABLE davis_breeds ADD COLUMN IF NOT EXISTS name_cn TEXT;

-- 3. davis_certifications: Add geo columns for groomer map
ALTER TABLE davis_certifications ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE davis_certifications ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

-- 4. davis_settings: Update embed whitelist to include maoanzu
UPDATE davis_settings
SET value = '["https://wonderpet.netlify.app", "https://maoanzu.com", "https://app.maoanzu.com"]'
WHERE key = 'embed_whitelist';

-- 5. davis_settings: Update AI pricing (Opus → Sonnet)
UPDATE davis_settings
SET value = '{"model":"claude-sonnet-4-5-20250929","input_per_mtok":3,"output_per_mtok":15,"currency":"USD"}'
WHERE key = 'ai_pricing';

-- 6. Add rate limit tracking table (optional, can use in-memory instead)
CREATE TABLE IF NOT EXISTS davis_rate_limits (
  ip TEXT PRIMARY KEY,
  count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT now()
);

-- Index for cleanup
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON davis_rate_limits(window_start);
