import axios from "axios";
import Cookies from "js-cookie";

/** When NEXT_PUBLIC_API_URL is missing (e.g. fresh clone without .env.local), dev still targets FastAPI. */
const DEFAULT_DEV_API_URL = "http://127.0.0.1:8000";

export const resolvedApiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "development" ? DEFAULT_DEV_API_URL : "");

/**
 * Axios instance for GlobalTradeX API.
 * - baseURL from NEXT_PUBLIC_API_URL (or FastAPI default in development)
 * - JWT from cookie `token` as Authorization: Bearer
 * - 401 → clear cookie, redirect to /login
 */
const api = axios.create({
  baseURL: resolvedApiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (config.data instanceof FormData || config.data instanceof URLSearchParams) {
    delete config.headers["Content-Type"];
  }
  const token = Cookies.get("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove("token");
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

/** OAuth2 password flow: form fields `username` (email) + `password` */
export const authApi = {
  login: (email, password) => {
    const body = new URLSearchParams();
    body.set("username", email);
    body.set("password", password);
    return api.post("/api/auth/login", body);
  },
  register: (data) => api.post("/api/auth/register", data),
};

export const shipmentsApi = {
  getAll: (params) => api.get("/api/shipments", { params }),
  create: (data) => api.post("/api/shipments", data),
  updateStatus: (id, body) =>
    api.patch(
      `/api/shipments/${id}/status`,
      typeof body === "string" ? { new_status: body } : body
    ),
  getById: (id) => api.get(`/api/shipments/${id}`),
};

/** Simulated GPS tracking (polling + REST controls) */
export const trackingApi = {
  active: () => api.get("/api/shipments/tracking/active"),
  state: (id) => api.get(`/api/shipments/${id}/tracking`),
  init: (id, body) => api.post(`/api/shipments/${id}/tracking/init`, body),
  start: (id) => api.post(`/api/shipments/${id}/tracking/start`),
  pause: (id) => api.post(`/api/shipments/${id}/tracking/pause`),
  reset: (id) => api.post(`/api/shipments/${id}/tracking/reset`),
  demoRoutes: () => api.get("/api/tracking/demo-routes"),
  seedDemos: () => api.post("/api/tracking/seed-demos"),
};

export const productsApi = {
  getAll: (params) => api.get("/api/products", { params }),
  create: (data) => api.post("/api/products", data),
  update: (id, data) => api.put(`/api/products/${id}`, data),
  remove: (id) => api.delete(`/api/products/${id}`),
};

/** Used by dashboard documents page */
export const documentsApi = {
  list: () => api.get("/api/documents"),
  upload: (formData, onUploadProgress) =>
    api.post("/api/documents/upload", formData, {
      onUploadProgress: (evt) => {
        if (onUploadProgress && evt.total) {
          onUploadProgress(Math.round((evt.loaded / evt.total) * 100));
        }
      },
    }),
  byShipment: (shipmentId) => api.get(`/api/documents/shipment/${shipmentId}`),
  download: (id) => api.get(`/api/documents/${id}/download`, { responseType: "blob" }),
  remove: (id) => api.delete(`/api/documents/${id}`),
  pendingReview: () => api.get("/api/documents/pending-review"),
  recentlyVerifiedToday: () => api.get("/api/documents/recently-verified-today"),
  verify: (id, body) => api.patch(`/api/documents/${id}/verify`, body),
  aiVerify: (id) => api.post(`/api/documents/${id}/ai-verify`),
};

/** Used by dashboard calculator page */
export const calculatorApi = {
  duties: (body) => api.post("/api/calculator/duties", body),
  freight: (body) => api.post("/api/calculator/freight", body),
};

export const analyticsApi = {
  global: () => api.get("/api/analytics/global"),
  shipments: () => api.get("/api/analytics/shipments"),
  documents: () => api.get("/api/analytics/documents"),
};

export const notificationsApi = {
  list: (params) => api.get("/api/notifications", { params }),
};

export const usersApi = {
  list: (params) => api.get("/api/users", { params }),
  create: (data) => api.post("/api/users", data),
  updateAdmin: (id, body) => api.patch(`/api/users/${id}`, body),
};

export const aiApi = {
  suggestRoutes: (body) => api.post("/api/ai/suggest-routes", body),
  chat: (body) => api.post("/api/ai/chat", body),
};

export default api;
