import type { EmbedPostMessage, AnalysisResult, TierLevel } from '@/types';

/** Allowed origins for embed postMessage — no wildcard */
const EMBED_WHITELIST = [
  'https://wonderpet.netlify.app',
  'https://maoanzu.com',
  'https://app.maoanzu.com',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:8888',
];

let customWhitelist: string[] = [];

/** Update whitelist from server config (additive to defaults) */
export function setEmbedWhitelist(origins: string[]): void {
  customWhitelist = origins;
}

/** Get combined whitelist */
function getAllowedOrigins(): string[] {
  return [...EMBED_WHITELIST, ...customWhitelist];
}

/** Check if an origin is in the whitelist */
function isAllowedOrigin(origin: string): boolean {
  return getAllowedOrigins().some((allowed) => origin === allowed || origin.startsWith(allowed));
}

/** Resolve the target origin for postMessage — never returns '*' */
function resolveTargetOrigin(): string | null {
  const referrerOrigin = document.referrer ? new URL(document.referrer).origin : null;
  if (referrerOrigin && isAllowedOrigin(referrerOrigin)) return referrerOrigin;
  // Fallback: try first whitelisted origin (production)
  return EMBED_WHITELIST[0];
}

/**
 * Send recommendation result back to parent window (embed mode).
 * Uses strict origin whitelist — never sends to '*'.
 */
export function postEmbedResult(
  result: AnalysisResult,
  selectedTier: TierLevel,
  hotel: string,
  weight: number | null,
  breedGroupId?: string,
): void {
  if (!window.parent || window.parent === window) return;

  const targetOrigin = resolveTargetOrigin();
  if (!targetOrigin) return;

  const tier = result.tiers[selectedTier];

  const message: EmbedPostMessage = {
    type: 'davis-recommendation',
    source: 'davis-grooming-ai',
    hotel,
    breed: result.breed,
    breed_group_id: breedGroupId || null,
    weight,
    coat_analysis: result.coat_analysis,
    season_hint: result.season_tip || null,
    result: {
      recommended: selectedTier,
      reason: result.coat_analysis,
      autoApply: true,
      products: tier.steps.map((step) => ({
        phase: step.phase,
        name: step.product_name,
        dilution: step.dilution,
        dwell_time: step.dwell_time,
      })),
    },
  };

  window.parent.postMessage(message, targetOrigin);
}

/**
 * Notify parent that embed is ready to receive messages.
 */
export function postEmbedReady(): void {
  if (!window.parent || window.parent === window) return;
  const targetOrigin = resolveTargetOrigin();
  if (!targetOrigin) return;
  window.parent.postMessage({ type: 'davis-embed-ready', source: 'davis-grooming-ai' }, targetOrigin);
}
