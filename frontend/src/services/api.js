import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const TOKEN_KEY = 'querymind_access_token';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

apiClient.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      tokenStore.clear();
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(error);
  },
);

/* ----------------------------- Authentication ----------------------------- */

export async function getAuthConfig() {
  const { data } = await apiClient.get('/auth/config');
  return data;
}

export async function login({ email, password }) {
  const { data } = await apiClient.post('/auth/login', { email, password });
  tokenStore.set(data.access_token);
  return data;
}

export async function register(payload) {
  const { data } = await apiClient.post('/auth/register', payload);
  tokenStore.set(data.access_token);
  return data;
}

export async function getMe() {
  const { data } = await apiClient.get('/auth/me');
  return data;
}

export async function updateProfile(payload) {
  const { data } = await apiClient.patch('/auth/me', payload);
  return data;
}

export async function changePassword({ currentPassword, newPassword }) {
  const { data } = await apiClient.post('/auth/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
  });
  return data;
}

export async function demoLogin(userId) {
  const { data } = await apiClient.post('/auth/demo-login', { user_id: userId });
  tokenStore.set(data.access_token);
  return data;
}

/* --------------------------------- Catalog -------------------------------- */

/**
 * @returns {Promise<{items: Array, total: number, limit: number, offset: number}>}
 */
export async function getBooks(params = {}) {
  const queryParams = {};
  if (params.category && params.category !== 'All') queryParams.category = params.category;
  if (params.search && params.search.trim()) queryParams.search = params.search.trim();
  if (params.is_available) queryParams.is_available = true;
  if (params.includeInactive) queryParams.include_inactive = true;
  if (params.limit) queryParams.limit = params.limit;
  if (params.offset) queryParams.offset = params.offset;

  const { data } = await apiClient.get('/books', { params: queryParams });
  return data;
}

export async function getBookById(bookId) {
  const { data } = await apiClient.get(`/books/${bookId}`);
  return data;
}

export async function getCategories() {
  const { data } = await apiClient.get('/books/categories');
  return data;
}

/** Public while DEMO_MODE is enabled, admin-only afterwards. */
export async function getUsers(onlyActive = true) {
  const { data } = await apiClient.get('/users', { params: { only_active: onlyActive } });
  return data;
}

/* ---------------------------------- Loans --------------------------------- */

/** Requires authentication. Admins may pass userId to view another account. */
export async function getLoans({ userId, status, limit = 50 } = {}) {
  const params = { limit };
  if (userId) params.user_id = userId;
  if (status) params.status = status;
  const { data } = await apiClient.get('/loans', { params });
  return data;
}

export async function getLoanById(loanId) {
  const { data } = await apiClient.get(`/loans/${loanId}`);
  return data;
}

/** The user comes from the access token, not the request body. */
export async function borrowBook(bookId, days) {
  const { data } = await apiClient.patch(`/books/${bookId}/borrow`, days ? { days } : {});
  return data;
}

/* --------------------------------- Admin ---------------------------------- */

export async function getAdminStats() {
  const { data } = await apiClient.get('/admin/stats');
  return data;
}

export async function getAdminPayments({ pendingOnly = true, query = '', limit = 100 } = {}) {
  const { data } = await apiClient.get('/admin/payments', {
    params: { pending_only: pendingOnly, query: query || undefined, limit },
  });
  return data;
}

export async function recordPayment(loanId, method) {
  const { data } = await apiClient.post(`/admin/payments/${loanId}`, { method });
  return data;
}

export async function createBook(payload) {
  const { data } = await apiClient.post('/admin/books', payload);
  return data;
}

export async function setBookActive(bookId, isActive) {
  const { data } = await apiClient.patch(`/admin/books/${bookId}/active`, null, {
    params: { is_active: isActive },
  });
  return data;
}

/** Staff creates a verified walk-in loan for someone without an account. */
export async function createWalkInLoan(payload) {
  const { data } = await apiClient.post('/admin/walkin-loans', payload);
  return data;
}

/** Only staff can confirm that a physical copy came back. */
export async function adminReturnLoan(loanId) {
  const { data } = await apiClient.post(`/admin/loans/${loanId}/return`);
  return data;
}

export async function updateBook(bookId, payload) {
  const { data } = await apiClient.patch(`/admin/books/${bookId}`, payload);
  return data;
}

export async function createStaff(payload) {
  const { data } = await apiClient.post('/admin/staff', payload);
  return data;
}

export async function setUserRole(userId, role) {
  const { data } = await apiClient.patch(`/admin/users/${userId}/role`, { role });
  return data;
}

export async function getAdminUsers() {
  const { data } = await apiClient.get('/admin/users');
  return data;
}

export async function setUserStatus(userId, accountStatus) {
  const { data } = await apiClient.patch(`/admin/users/${userId}/status`, {
    account_status: accountStatus,
  });
  return data;
}

/* ---------------------------------- Chat ---------------------------------- */

export async function sendChatMessage(message, conversationId = null) {
  const { data } = await apiClient.post('/chat', {
    message,
    conversation_id: conversationId,
  });
  return data;
}

export default apiClient;
