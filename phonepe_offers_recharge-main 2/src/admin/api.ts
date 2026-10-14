// Admin API Client

const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('admin_session_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export async function adminFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers || {}),
  };

  const response = await fetch(endpoint, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
}

export const adminApi = {
  // Stats & Dashboard
  getDashboardStats: () => adminFetch('/api/admin/stats/dashboard'),
  getReports: () => adminFetch('/api/admin/stats/reports'),

  // Providers
  getProviders: () => adminFetch('/api/admin/providers'),
  createProvider: (payload: any) => adminFetch('/api/admin/providers', { method: 'POST', body: JSON.stringify(payload) }),
  updateProvider: (id: string, payload: any) => adminFetch(`/api/admin/providers/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  toggleProvider: (id: string) => adminFetch(`/api/admin/providers/${id}/toggle`, { method: 'PATCH' }),
  deleteProvider: (id: string) => adminFetch(`/api/admin/providers/${id}`, { method: 'DELETE' }),

  // Plans
  getPlans: (params?: { search?: string; providerId?: string; status?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.providerId) q.set('providerId', params.providerId);
    if (params?.status) q.set('status', params.status);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return adminFetch(`/api/admin/plans?${q.toString()}`);
  },
  createPlan: (payload: any) => adminFetch('/api/admin/plans', { method: 'POST', body: JSON.stringify(payload) }),
  updatePlan: (id: string, payload: any) => adminFetch(`/api/admin/plans/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  setPlanStatus: (id: string, status: string) => adminFetch(`/api/admin/plans/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deletePlan: (id: string) => adminFetch(`/api/admin/plans/${id}`, { method: 'DELETE' }),

  // Offers
  getOffers: () => adminFetch('/api/admin/offers'),
  createOffer: (payload: any) => adminFetch('/api/admin/offers', { method: 'POST', body: JSON.stringify(payload) }),
  updateOffer: (id: string, payload: any) => adminFetch(`/api/admin/offers/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  setOfferStatus: (id: string, status: string) => adminFetch(`/api/admin/offers/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteOffer: (id: string) => adminFetch(`/api/admin/offers/${id}`, { method: 'DELETE' }),

  // Submissions
  getSubmissions: (params?: { search?: string; providerId?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.providerId) q.set('providerId', params.providerId);
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate) q.set('endDate', params.endDate);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return adminFetch(`/api/admin/submissions?${q.toString()}`);
  },
  revealSubmissionMobile: (id: string) => adminFetch(`/api/admin/submissions/${id}/reveal`, { method: 'POST' }),
  deleteSubmission: (id: string) => adminFetch(`/api/admin/submissions/${id}`, { method: 'DELETE' }),

  // Settings
  getSettings: () => adminFetch('/api/admin/settings'),
  updateSettings: (payload: Record<string, any>) => adminFetch('/api/admin/settings', { method: 'PUT', body: JSON.stringify(payload) }),

  // Audit Logs
  getAuditLogs: (params?: { action?: string; entityType?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.action) q.set('action', params.action);
    if (params?.entityType) q.set('entityType', params.entityType);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return adminFetch(`/api/admin/audit-logs?${q.toString()}`);
  },

  // Orders & UPI Payments
  getOrders: (params?: { search?: string; status?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.status) q.set('status', params.status);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return adminFetch(`/api/admin/orders?${q.toString()}`);
  },
  getOrderStats: () => adminFetch('/api/admin/orders/stats'),
  updateOrderStatus: (id: string, payload: { status: string; notes?: string }) =>
    adminFetch(`/api/admin/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify(payload) }),

  // Users (Owner only)
  getUsers: () => adminFetch('/api/admin/users'),
  createUser: (payload: any) => adminFetch('/api/admin/users', { method: 'POST', body: JSON.stringify(payload) }),
  updateUserRole: (id: string, payload: { role?: string; status?: string }) => adminFetch(`/api/admin/users/${id}/role`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteUser: (id: string) => adminFetch(`/api/admin/users/${id}`, { method: 'DELETE' }),
};
