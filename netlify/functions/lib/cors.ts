/**
 * Shared CORS configuration for all Netlify functions.
 * Single source of truth — update origins here only.
 */

const ENV_ORIGINS = process.env.CORS_ALLOWED_ORIGINS;

export const ALLOWED_ORIGINS: string[] = ENV_ORIGINS
  ? ENV_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
  : [
      'https://davistaiwan.netlify.app',
      'https://fur-angel.netlify.app',
      'https://davistaiwan.com',
      'https://www.davistaiwan.com',
      'http://localhost:5173',
      'http://localhost:3000',
    ];

export function corsHeaders(origin?: string): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.some(o => origin.startsWith(o))
    ? origin
    : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Content-Type': 'application/json',
  };
}
