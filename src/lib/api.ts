import type { AnalyzeRequest, AnalyzeResponse, ApiResponse, DavisSettings } from '@/types';

const API_BASE = '/.netlify/functions';

/**
 * Generic fetch wrapper with error handling.
 */
async function apiFetch<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });

    if (res.status === 429) {
      return { success: false, error: '請求過於頻繁，請稍後再試' };
    }

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return { success: false, error: body?.error ?? `HTTP ${res.status}` };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

// ============================================================
// Public APIs
// ============================================================

/** Send image/breed for AI analysis */
export async function analyzePhoto(req: AnalyzeRequest): Promise<ApiResponse<AnalyzeResponse>> {
  return apiFetch<AnalyzeResponse>('/analyze', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

/** Fetch dynamic config (products, breeds, settings) */
export async function fetchConfig(): Promise<ApiResponse<DavisSettings>> {
  return apiFetch<DavisSettings>('/davis-config');
}

/** Log analytics event */
export async function logEvent(event: Record<string, unknown>): Promise<void> {
  apiFetch('/log', { method: 'POST', body: JSON.stringify(event) }).catch(() => {
    // Silent fail for analytics
  });
}

/** Save share and get short link */
export async function createShare(data: Record<string, unknown>): Promise<ApiResponse<{ id: string; url: string }>> {
  return apiFetch('/share', { method: 'POST', body: JSON.stringify(data) });
}

/** Get share by ID */
export async function getShare(id: string): Promise<ApiResponse<Record<string, unknown>>> {
  return apiFetch(`/share?id=${encodeURIComponent(id)}`);
}

/** Submit certification application */
export async function submitCertification(data: Record<string, unknown>): Promise<ApiResponse<{ id: string }>> {
  return apiFetch('/certify', { method: 'POST', body: JSON.stringify(data) });
}

/** Verify certification by badge ID */
export async function verifyCertification(badgeId: string): Promise<ApiResponse<Record<string, unknown>>> {
  return apiFetch(`/certify?badge=${encodeURIComponent(badgeId)}`);
}

// ============================================================
// Admin APIs (require auth token)
// ============================================================

function adminHeaders(token: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

function adminFetch<T>(path: string, token: string, options?: RequestInit): Promise<ApiResponse<T>> {
  return apiFetch<T>(`/admin${path}`, { ...options, headers: { ...adminHeaders(token), ...(options?.headers || {}) } });
}

export const adminApi = {
  login(username: string, password: string) {
    return apiFetch<{ ok: boolean; token: string; role: string; displayName: string }>('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  me(token: string) {
    return adminFetch<{ username: string; role: string }>('/me', token);
  },

  changePassword(token: string, old_password: string, new_password: string) {
    return adminFetch<{ ok: boolean }>('/change-password', token, {
      method: 'POST', body: JSON.stringify({ old_password, new_password }),
    });
  },

  // Settings
  getSettings(token: string) {
    return adminFetch<{ settings: Record<string, unknown> }>('/settings', token);
  },
  updateSettings(token: string, settings: Record<string, unknown>) {
    return adminFetch<{ ok: boolean }>('/settings', token, {
      method: 'PUT', body: JSON.stringify(settings),
    });
  },

  // Products
  getProducts(token: string) {
    return adminFetch<{ products: Record<string, unknown>[] }>('/products', token);
  },
  saveProduct(token: string, product: Record<string, unknown>) {
    return adminFetch<{ ok: boolean }>('/products', token, {
      method: 'POST', body: JSON.stringify(product),
    });
  },
  deleteProduct(token: string, productKey: string) {
    return adminFetch<{ ok: boolean }>(`/products/${encodeURIComponent(productKey)}`, token, { method: 'DELETE' });
  },
  importProducts(token: string, rows: Record<string, unknown>[]) {
    return adminFetch<{ ok: number; fail: number; total: number }>('/products/import', token, {
      method: 'POST', body: JSON.stringify({ rows }),
    });
  },

  // Breeds
  getBreeds(token: string) {
    return adminFetch<{ breeds: Record<string, unknown>[] }>('/breeds', token);
  },
  saveBreed(token: string, breed: Record<string, unknown>) {
    return adminFetch<{ ok: boolean }>('/breeds', token, {
      method: 'POST', body: JSON.stringify(breed),
    });
  },
  deleteBreed(token: string, breedId: string) {
    return adminFetch<{ ok: boolean }>(`/breeds/${encodeURIComponent(breedId)}`, token, { method: 'DELETE' });
  },

  // Analytics
  getAnalyticsSummary(token: string, days = 30) {
    return adminFetch<{
      days: number; periodTotal: number;
      daily: { date: string; count: number }[];
      topBreeds: { breed: string; count: number }[];
      monthTokens: { input_tokens: number; output_tokens: number; ai_calls: number };
      yearTokens: { input_tokens: number; output_tokens: number; ai_calls: number };
      currentMonth: string; currentYear: string;
    }>(`/analytics/summary?days=${days}`, token);
  },

  // Users
  getUsers(token: string) {
    return adminFetch<{ users: { username: string; role: string; display_name: string; created_at: string }[] }>('/users', token);
  },
  createUser(token: string, user: { username: string; password: string; role: string; display_name?: string }) {
    return adminFetch<{ ok: boolean }>('/users', token, {
      method: 'POST', body: JSON.stringify(user),
    });
  },
  deleteUser(token: string, username: string) {
    return adminFetch<{ ok: boolean }>(`/users/${encodeURIComponent(username)}`, token, { method: 'DELETE' });
  },
  resetPassword(token: string, username: string, new_password: string) {
    return adminFetch<{ ok: boolean }>('/users/reset-password', token, {
      method: 'POST', body: JSON.stringify({ username, new_password }),
    });
  },

  // Certifications (via certify function)
  getCertifications(token: string) {
    return apiFetch<{ ok: boolean; certs: Record<string, unknown>[] }>('/certify/list', {
      headers: adminHeaders(token),
    });
  },
  updateCertStatus(token: string, id: string, status: string) {
    return apiFetch<{ ok: boolean }>(`/certify/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: adminHeaders(token),
      body: JSON.stringify({ status }),
    });
  },

  // Breed import
  importBreeds(token: string, rows: Record<string, unknown>[]) {
    return adminFetch<{ ok: number; fail: number; total: number }>('/breeds/import', token, {
      method: 'POST', body: JSON.stringify({ rows }),
    });
  },

  // Audit Log
  getAuditLog(token: string, params?: { limit?: number; offset?: number; action?: string; user?: string; from?: string; to?: string }) {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.offset) qs.set('offset', String(params.offset));
    if (params?.action) qs.set('action', params.action);
    if (params?.user) qs.set('user', params.user);
    if (params?.from) qs.set('from', params.from);
    if (params?.to) qs.set('to', params.to);
    return adminFetch<{ logs: Record<string, unknown>[]; total: number }>(`/audit-log?${qs.toString()}`, token);
  },

  // AI Assist
  aiAssist(token: string, text: string) {
    return apiFetch<{ breeds: unknown[]; products: unknown[]; summary: string }>('/ai-assist', {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify({ text }),
    });
  },
};
