import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const KEY_TOKEN = 'villan.token';
const KEY_ADMIN_TOKEN = 'villan.admin_token';

export async function getToken() { return AsyncStorage.getItem(KEY_TOKEN); }
export async function setToken(v: string | null) { if (v) return AsyncStorage.setItem(KEY_TOKEN, v); return AsyncStorage.removeItem(KEY_TOKEN); }
export async function getAdminToken() { return AsyncStorage.getItem(KEY_ADMIN_TOKEN); }
export async function setAdminToken(v: string | null) { if (v) return AsyncStorage.setItem(KEY_ADMIN_TOKEN, v); return AsyncStorage.removeItem(KEY_ADMIN_TOKEN); }

async function request(path: string, opts: RequestInit = {}, adminAuth = false) {
  const token = adminAuth ? await getAdminToken() : await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string> || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}/api${path}`, { ...opts, headers });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const msg = (data && (data.detail || data.message)) || `HTTP ${res.status}`;
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
  return data;
}

export const api = {
  // auth
  sendOtp: (phone: string) => request('/auth/send-otp', { method: 'POST', body: JSON.stringify({ phone }) }),
  verifyOtp: (phone: string, otp: string, name?: string, referral?: string) =>
    request('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ phone, otp, name, referral }) }),
  // user
  me: () => request('/me'),
  updateMe: (patch: any) => request('/me', { method: 'PATCH', body: JSON.stringify(patch) }),
  // wallet
  wallet: () => request('/wallet'),
  transactions: (kind?: string) => request(`/wallet/transactions${kind ? `?kind=${kind}` : ''}`),
  // payment config (public - use user token)
  paymentConfig: () => request('/payment/config'),
  // deposits
  createDeposit: (payload: { amount: number; utr: string; method: string }) =>
    request('/deposits', { method: 'POST', body: JSON.stringify(payload) }),
  myDeposits: () => request('/deposits/mine'),
  // withdrawals
  createWithdraw: (payload: { amount: number; upi_id: string; account_name: string }) =>
    request('/withdrawals', { method: 'POST', body: JSON.stringify(payload) }),
  myWithdrawals: () => request('/withdrawals/mine'),
  // games
  gameCatalog: () => request('/games/catalog'),
  play: (payload: { game_type: string; bet_amount: number; params?: any }) =>
    request('/games/play', { method: 'POST', body: JSON.stringify(payload) }),
  // promotions / vip / notifications / support
  promotions: () => request('/promotions'),
  vip: () => request('/vip'),
  notifications: () => request('/notifications'),
  markRead: (id: string) => request(`/notifications/${id}/read`, { method: 'POST' }),
  createTicket: (subject: string, message: string) =>
    request('/support/tickets', { method: 'POST', body: JSON.stringify({ subject, message }) }),
  myTickets: () => request('/support/tickets'),
  // admin
  adminLogin: (phone: string, password: string) =>
    request('/admin/login', { method: 'POST', body: JSON.stringify({ phone, password }) }),
  adminDashboard: () => request('/admin/dashboard', {}, true),
  adminUsers: (q?: string) => request(`/admin/users${q ? `?q=${encodeURIComponent(q)}` : ''}`, {}, true),
  adminAdjust: (uid: string, delta: number, reason: string) =>
    request(`/admin/users/${uid}/adjust`, { method: 'POST', body: JSON.stringify({ delta, reason }) }, true),
  adminBlock: (uid: string) => request(`/admin/users/${uid}/block`, { method: 'POST' }, true),
  adminDeposits: (status?: string) => request(`/admin/deposits${status ? `?status=${status}` : ''}`, {}, true),
  adminActDeposit: (id: string, action: 'approve' | 'reject') =>
    request(`/admin/deposits/${id}/${action}`, { method: 'POST' }, true),
  adminWithdrawals: (status?: string) => request(`/admin/withdrawals${status ? `?status=${status}` : ''}`, {}, true),
  adminActWithdrawal: (id: string, action: 'approve' | 'reject') =>
    request(`/admin/withdrawals/${id}/${action}`, { method: 'POST' }, true),
  adminGetPayment: () => request('/admin/payment-config', {}, true),
  adminUpdatePayment: (payload: any) =>
    request('/admin/payment-config', { method: 'PATCH', body: JSON.stringify(payload) }, true),
  adminUpdateAppSettings: (payload: any) =>
    request('/admin/app-settings', { method: 'PATCH', body: JSON.stringify(payload) }, true),
  adminBroadcast: (title: string, body: string) =>
    request('/admin/broadcast', { method: 'POST', body: JSON.stringify({ title, body }) }, true),
  adminReports: () => request('/admin/reports', {}, true),
  adminTickets: () => request('/admin/tickets', {}, true),
};
