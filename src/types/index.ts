// ============================================================
// Davis Taiwan APP — Core Types
// ============================================================

/** Grooming tier levels */
export type TierLevel = 'basic' | 'advanced' | 'signature';

/** Pet type */
export type PetType = '狗' | '貓';

/** Supported languages */
export type AppLocale = 'zh-TW' | 'zh-CN' | 'en' | 'ja';

/** Season identifier */
export type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter';

// ============================================================
// Product & Breed
// ============================================================

export interface DavisProduct {
  id: string;
  name_zh: string;
  name_en: string;
  name_ja: string;
  name_cn: string;
  category: 'shampoo' | 'conditioner' | 'spa' | 'specialty';
  tag_zh: string;
  tag_en: string;
  tag_ja: string;
  tag_cn: string;
  reason_zh: string;
  reason_en: string;
  reason_ja: string;
  reason_cn: string;
  note_zh?: string;
  note_en?: string;
  note_ja?: string;
  note_cn?: string;
  dilution: string;        // e.g. "12:1"
  dwell_time: string;      // e.g. "5-8min"
  image_url?: string;
}

export interface DavisBreed {
  id: string;
  name_zh: string;
  name_en: string;
  name_ja: string;
  name_cn: string;
  pet_type: PetType;
  coat_type: string;       // e.g. "捲毛", "短毛", "長毛"
  emoji?: string;
  /** Product keys for tier building: [firstWash, secondWash?, conditioner, spaWash?] */
  product_keys: string[];
}

// ============================================================
// Analysis & Results
// ============================================================

export interface AnalysisStep {
  phase: string;           // e.g. "第一洗", "第二洗", "護毛素", "SPA第三洗"
  product_name: string;
  dilution: string;
  dwell_time: string;
  tip?: string;            // AI insight or product tip
}

export interface AnalysisTier {
  level: TierLevel;
  label: string;           // e.g. "基礎洗", "進階洗", "完美SPA"
  description: string;
  steps: AnalysisStep[];
}

export interface AnalysisResult {
  breed: string;
  pet_type: PetType;
  coat_analysis: string;   // AI's coat assessment
  color?: string;          // Detected or user-specified coat color
  season_tip?: string;     // Seasonal recommendation
  tiers: {
    basic: AnalysisTier;
    advanced: AnalysisTier;
    signature: AnalysisTier;
  };
  /** Source of result */
  source: 'ai' | 'breed_select';
  /** Raw AI response (for debugging) */
  raw_response?: string;
}

// ============================================================
// Embed Mode
// ============================================================

export interface EmbedParams {
  embed: boolean;
  breed?: string;
  breed_group_id?: string;  // UUID from breed_groups table (毛安住 direct lookup)
  weight?: number;
  hotel?: string;
  store_name?: string;
  pet_name?: string;
  lang?: AppLocale;
  photo_url?: string;       // Pre-existing photo from parent system
}

export interface EmbedPostMessage {
  type: 'davis-recommendation';
  source: 'davis-grooming-ai';
  hotel: string;
  breed: string;
  breed_group_id: string | null;  // UUID for 毛安住 direct use
  weight: number | null;
  coat_analysis: string;
  season_hint: string | null;
  result: {
    recommended: TierLevel;
    reason: string;
    autoApply: boolean;
    products: Array<{
      phase: string;
      name: string;
      dilution: string;
      dwell_time: string;
    }>;
  };
}

// ============================================================
// Certification
// ============================================================

export type CertStatus = 'pending' | 'approved' | 'rejected';

export interface Certification {
  id: string;
  name: string;
  shop_name: string;
  city: string;
  phone?: string;
  email?: string;
  ig_url?: string;
  fb_url?: string;
  photo_url?: string;
  status: CertStatus;
  badge_id?: string;
  lat?: number;
  lng?: number;
  created_at: string;
  approved_at?: string;
}

// ============================================================
// Admin
// ============================================================

export interface AdminUser {
  username: string;
  role: 'admin' | 'editor';
  token: string;
}

export interface AnalyticsEntry {
  id: string;
  type: 'analyze' | 'breed_select' | 'share' | 'embed';
  breed?: string;
  tier?: TierLevel;
  hotel?: string;
  lang: AppLocale;
  input_tokens?: number;
  output_tokens?: number;
  cost_usd?: number;
  created_at: string;
}

export interface DavisSettings {
  embed_whitelist: string[];
  ai_pricing: {
    model: string;
    input_per_mtok: number;
    output_per_mtok: number;
    currency: string;
  };
  site_name: string;
  maintenance_mode: boolean;
}

// ============================================================
// Color / Season
// ============================================================

export interface ColorKeyword {
  keyword: string;
  zh: string;
  en: string;
  product_hint: string | null;  // Suggested product for this color
}

export interface SeasonConfig {
  id: SeasonId;
  months: number[];
  name_zh: string;
  name_en: string;
  name_ja: string;
  name_cn: string;
  description_zh: string;
  prompt_hint: string;          // Injected into AI prompt
}

// ============================================================
// API
// ============================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AnalyzeRequest {
  image?: string;              // Base64 image data
  breed?: string;
  color?: string;
  weight?: number;
  lang: AppLocale;
  hotel?: string;
  season: SeasonId;
}

export interface AnalyzeResponse {
  result: AnalysisResult;
  tokens: {
    input: number;
    output: number;
  };
}
