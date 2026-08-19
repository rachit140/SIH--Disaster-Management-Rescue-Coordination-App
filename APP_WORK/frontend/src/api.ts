// SAHAYSETU API client. Base = EXPO_PUBLIC_BACKEND_URL + /api.
// A module-level token is attached as Authorization: Bearer <token>.

const BASE = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`;

let TOKEN: string | null = null;
export function setToken(t: string | null) {
  TOKEN = t;
}

async function req(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data && data.detail) || `HTTP ${res.status}`);
  return data;
}

export const api = {
  // ---- auth ----
  register: (body: { name: string; email: string; password: string; role?: string }) =>
    req("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  verifyOtp: (email: string, code: string) =>
    req("/auth/verify-otp", { method: "POST", body: JSON.stringify({ email, code }) }),
  login: (email: string, password: string) =>
    req("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  forgotPassword: (email: string) =>
    req("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
  resetPassword: (email: string, code: string, new_password: string) =>
    req("/auth/reset-password", { method: "POST", body: JSON.stringify({ email, code, new_password }) }),
  govLogin: (gov_id: string, name?: string) =>
    req("/auth/gov-login", { method: "POST", body: JSON.stringify({ gov_id, name }) }),
  googleSession: (session_id: string) =>
    req("/auth/session", { method: "POST", body: JSON.stringify({ session_id }) }),
  me: () => req("/auth/me"),
  setRole: (role: string) => req("/auth/role", { method: "POST", body: JSON.stringify({ role }) }),
  logout: () => req("/auth/logout", { method: "POST" }),

  // ---- domain ----
  dashboard: () => req("/dashboard/summary"),
  incidents: (params?: { severity?: string; status?: string; search?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return req(`/incidents${q ? `?${q}` : ""}`);
  },
  incident: (id: string) => req(`/incidents/${id}`),
  createIncident: (body: any) => req("/incidents", { method: "POST", body: JSON.stringify(body) }),
  updateIncidentStatus: (id: string, status: string) =>
    req(`/incidents/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  addIncidentUpdate: (id: string, message: string, author?: string) =>
    req(`/incidents/${id}/updates`, { method: "POST", body: JSON.stringify({ message, author }) }),
  mapMarkers: () => req("/map/markers"),

  // ---- modules ----
  survivors: (params?: any) => { const q = new URLSearchParams(params || {}).toString(); return req(`/survivors${q ? `?${q}` : ""}`); },
  addSurvivor: (body: any) => req("/survivors", { method: "POST", body: JSON.stringify(body) }),
  volunteers: () => req("/volunteers"),
  teams: () => req("/teams"),
  resources: (category?: string) => req(`/resources${category && category !== "All" ? `?category=${encodeURIComponent(category)}` : ""}`),
  requests: () => req("/requests"),
  createRequest: (body: any) => req("/requests", { method: "POST", body: JSON.stringify(body) }),
  updateRequest: (id: string, status: string) => req(`/requests/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  missingPersons: () => req("/missing-persons"),
  addMissingPerson: (body: any) => req("/missing-persons", { method: "POST", body: JSON.stringify(body) }),
  updateMissingPerson: (id: string, status: string) => req(`/missing-persons/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  casualties: () => req("/casualties"),
  addCasualty: (body: any) => req("/casualties", { method: "POST", body: JSON.stringify(body) }),
  updateCasualtyStatus: (id: string, status: string) => req(`/casualties/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  camps: (params?: { latitude?: number; longitude?: number; radius?: number }) => {
    const q = params ? new URLSearchParams(params as any).toString() : "";
    return req(`/camps${q ? `?${q}` : ""}`);
  },
  createCamp: (body: any) => req("/camps", { method: "POST", body: JSON.stringify(body) }),
  updateCampOccupancy: (id: string, occupancy: number) => req(`/camps/${id}/occupancy`, { method: "PATCH", body: JSON.stringify({ occupancy }) }),
  updateCampResources: (id: string, resources: any) => req(`/camps/${id}/resources`, { method: "PATCH", body: JSON.stringify(resources) }),
  updateCampStatus: (id: string, status: string) => req(`/camps/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  resourceRequests: () => req("/resource-requests"),
  createResourceRequest: (body: any) => req("/resource-requests", { method: "POST", body: JSON.stringify(body) }),
  updateRequestStatus: (id: string, status: string) => req(`/resource-requests/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  submitVolunteerOffer: (id: string, body: any) => req(`/resource-requests/${id}/offers`, { method: "POST", body: JSON.stringify(body) }),
  updateOfferStatus: (reqId: string, offerId: string, status: string) => req(`/resource-requests/${reqId}/offers/${offerId}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  conversations: () => req("/conversations"),
  conversationMessages: (id: string) => req(`/conversations/${id}/messages`),
  sendMessage: (id: string, text: string, priority = "normal") => req(`/conversations/${id}/messages`, { method: "POST", body: JSON.stringify({ text, priority }) }),
  alerts: () => req("/alerts"),
  updateAlert: (id: string, status: string) => req(`/alerts/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  reports: () => req("/reports"),
  analytics: (range = "7d") => req(`/analytics?range=${range}`),
  getProfile: () => req("/auth/profile"),
  updateProfile: (body: any) => req("/auth/profile", { method: "PATCH", body: JSON.stringify(body) }),
};
