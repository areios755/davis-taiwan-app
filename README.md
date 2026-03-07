# Davis Taiwan AI Pet Grooming Consultant

AI-powered pet grooming recommendation system built for Davis Taiwan. Upload a pet photo or select a breed to receive a personalized three-tier grooming plan using Davis professional products.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Netlify Functions (TypeScript)
- **Database**: Supabase (PostgreSQL) — shared with maoanzu
- **AI**: Claude Sonnet 4.5 (Anthropic API)
- **PWA**: vite-plugin-pwa with offline breed data
- **i18n**: 4 languages (zh-TW, zh-CN, en, ja)

## Project Structure

```
src/
  pages/         # 7 public pages + HomePage
  admin/         # 9 admin components (Dashboard, ProductManager, etc.)
  data/          # Static breed/product data (Supabase fallback)
  lib/           # API client, image processor, embed messaging
  hooks/         # useEmbed
  i18n/          # 4 locale JSON files
  types/         # All TypeScript interfaces
netlify/
  functions/     # 8 serverless functions
public/
  embed-test.html  # Embed integration test page
```

## Environment Variables

Create `.env` in the project root:

```env
# Frontend (exposed to browser via VITE_ prefix)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Backend (Netlify Functions only)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DAVIS_TOKEN_SECRET=your-random-secret-32chars
DAVIS_ADMIN_USERNAME=admin
DAVIS_ADMIN_PASSWORD=your-password
ANTHROPIC_API_KEY=sk-ant-...
```

> **Note**: `SUPABASE_URL` is the **shared maoanzu Supabase instance**. Davis uses the same `breed_groups` table as maoanzu, plus its own `davis_*` tables.

## Local Development

```bash
npm install
npm run dev          # Vite dev server on :3001
npx netlify dev      # Full stack with functions on :8888
```

## Deploy to Netlify

1. Connect GitHub repo to Netlify
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Set all environment variables above in Netlify UI

## Shared Database Architecture

The Supabase database is shared with the maoanzu system:

| Table | Owner | Description |
|-------|-------|-------------|
| `breed_groups` | Shared | Breed data — maoanzu manages name/species/size, Davis manages davis_breed_id/davis_product_keys/grooming_tips |
| `davis_products` | Davis | Product scenarios with 4-language translations |
| `davis_settings` | Davis | App configuration (embed whitelist, AI pricing, etc.) |
| `davis_shares` | Davis | Shared analysis results |
| `davis_certifications` | Davis | Groomer certification applications |
| `davis_analytics` | Davis | Usage tracking and token costs |

## Embed Integration (maoanzu)

Davis can be embedded as an iframe in the maoanzu system:

```html
<iframe src="https://davis-taiwan.netlify.app/analyze?embed=true&breed=貴賓犬&breed_group_id=UUID&weight=5&hotel=maoanzu&store_name=毛安住&pet_name=Lucky&lang=zh-TW"></iframe>
```

**Parameters**: `embed`, `breed`, `breed_group_id` (UUID from breed_groups), `weight`, `hotel`, `store_name`, `pet_name`, `lang`, `photo_url`

**postMessage response**:
```json
{
  "type": "davis-recommendation",
  "source": "davis-grooming-ai",
  "breed": "貴賓犬",
  "breed_group_id": "uuid-here",
  "coat_analysis": "...",
  "season_hint": "...",
  "result": {
    "recommended": "advanced",
    "products": [{ "phase": "第一洗", "name": "...", "dilution": "10:1", "dwell_time": "5min" }]
  }
}
```

Test the integration at `/embed-test.html`.

## Security

- CORS whitelist (not `*`) on all Netlify Functions
- Rate limiting (in-memory per-IP) on all functions
- Token auth with HMAC-SHA256 (`DAVIS_TOKEN_SECRET`)
- No API keys exposed to frontend — Anthropic calls server-side only
- `postMessage` uses origin whitelist (not `*`)
- Input sanitization on all user-facing endpoints

## Netlify Functions

| Function | Purpose |
|----------|---------|
| `analyze` | AI photo/breed analysis (Claude Sonnet) |
| `admin` | Admin CRUD (products, breeds, users, settings, analytics) |
| `davis-config` | Public config endpoint (strips API keys) |
| `share` | Save/retrieve shared results |
| `certify` | Certification application + admin review |
| `ai-assist` | Admin AI text extraction for breed/product data |
| `log` | Analytics event logging |
| `ping` | Health check + API connectivity test |
