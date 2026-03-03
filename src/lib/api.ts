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

export const adminApi = {
  async login(username: string, password: string): Promise<ApiResponse<{ token: string; role: string }>> {
    return apiFetch('/admin', {
      method: 'POST',
      body: JSON.stringify({ action: 'login', username, password }),
    });
  },

  async getProducts(token: string): Promise<ApiResponse<unknown[]>> {
    return apiFetch('/admin?action=products', { headers: adminHeaders(token) });
  },

  async getBreeds(token: string): Promise<ApiResponse<unknown[]>> {
    return apiFetch('/admin?action=breeds', { headers: adminHeaders(token) });
  },

  async getAnalytics(token: string): Promise<ApiResponse<unknown[]>> {
    return apiFetch('/admin?action=analytics', { headers: adminHeaders(token) });
  },

  async getCertifications(token: string): Promise<ApiResponse<unknown[]>> {
    return apiFetch('/admin?action=certifications', { headers: adminHeaders(token) });
  },

  async updateProduct(token: string, product: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    return apiFetch('/admin', {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify({ action: 'update_product', ...product }),
    });
  },

  async approveCertification(token: string, id: string): Promise<ApiResponse<unknown>> {
    return apiFetch('/admin', {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify({ action: 'approve_cert', id }),
    });
  },
};
