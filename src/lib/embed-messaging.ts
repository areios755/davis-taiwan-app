import type { EmbedPostMessage, AnalysisResult, TierLevel } from '@/types';

/** Default allowed origins for embed postMessage */
const DEFAULT_WHITELIST = [
  'https://wonderpet.netlify.app',
  'https://maoanzu.com',
  'https://app.maoanzu.com',
];

let embedWhitelist: string[] = DEFAULT_WHITELIST;

/** Update whitelist from server config */
export function setEmbedWhitelist(origins: string[]): void {
  embedWhitelist = origins;
}

/** Check if an origin is in the whitelist */
function isAllowedOrigin(origin: string): boolean {
  return embedWhitelist.some((allowed) => {
    if (allowed.includes('*')) {
      const pattern = allowed.replace('*', '');
      return origin.endsWith(pattern);
    }
    return origin === allowed;
  });
}

/**
 * Send recommendation result back to parent window (embed mode).
 * Uses origin whitelist instead of '*' for security.
 */
export function postEmbedResult(
  result: AnalysisResult,
  selectedTier: TierLevel,
  hotel: string,
  weight: number | null,
): void {
  if (!window.parent || window.parent === window) {
    console.warn('Not in iframe, cannot postMessage');
    return;
  }

  const tier = result.tiers[selectedTier];

  const message: EmbedPostMessage = {
    type: 'davis-recommendation',
    source: 'davis-grooming-ai',
    hotel,
    breed: result.breed,
    weight,
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

  // Try whitelisted origins first, fall back to referrer
  const parentOrigin = document.referrer
    ? new URL(document.referrer).origin
    : '*';

  const targetOrigin = isAllowedOrigin(parentOrigin) ? parentOrigin : '*';

  if (targetOrigin === '*') {
    console.warn('Parent origin not in whitelist, using * (less secure)');
  }

  window.parent.postMessage(message, targetOrigin);
}

/**
 * Notify parent that embed is ready to receive messages.
 */
export function postEmbedReady(): void {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'davis-embed-ready' }, '*');
  }
}
