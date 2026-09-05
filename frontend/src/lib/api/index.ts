import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // Send HttpOnly refresh token cookie
});

// === Request interceptor: attach access token ===
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// === Response interceptor: handle 401 + auto-refresh ===
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh")
    ) {
      if (isRefreshing) {
        // Queue the request until refresh is done
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) throw new Error("No refresh token");
        const { data } = await api.post<{ accessToken: string; refreshToken: string }>("/auth/refresh", { refreshToken });
        setAccessToken(data.accessToken);
        if (data.refreshToken) setRefreshToken(data.refreshToken);
        processQueue(null, data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAccessToken();
        clearRefreshToken();
        window.location.href = "/auth/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Token helpers
let _accessToken: string | null = null;

function getAccessToken(): string | null {
  return _accessToken ?? localStorage.getItem("_ift");
}

export function setAccessToken(token: string): void {
  _accessToken = token;
  try { localStorage.setItem("_ift", token); } catch {}
}

export function clearAccessToken(): void {
  _accessToken = null;
  try { localStorage.removeItem("_ift"); } catch {}
}

export function setRefreshToken(token: string): void {
  try { localStorage.setItem("_ifrt", token); } catch {}
}

function getRefreshToken(): string | null {
  try { return localStorage.getItem("_ifrt"); } catch { return null; }
}

export function clearRefreshToken(): void {
  try { localStorage.removeItem("_ifrt"); } catch {}
}

// === API functions ===

// Auth
export const authApi = {
  register: (data: RegisterRequest) => api.post<AuthResponse>("/auth/register", data),
  login: (data: LoginRequest) => api.post<AuthResponse>("/auth/login", data),
  logout: () => api.post("/auth/logout"),
  forgotPassword: (email: string) => api.post("/auth/forgot-password", { email }),
  resetPassword: (data: ResetPasswordRequest) => api.post("/auth/reset-password", data),
};

// Business
export const businessApi = {
  get: () => api.get<Business>("/business"),
  create: (data: CreateBusinessRequest) => api.post<Business>("/business", data),
  update: (data: UpdateBusinessRequest) => api.put<Business>("/business", data),
  uploadLogo: (file: File) => {
    const form = new FormData();
    form.append("logo", file);
    return api.post<{ logoUrl: string }>("/business/logo", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

// Clients
export const clientApi = {
  list: (params?: { search?: string; page?: number; size?: number }) =>
    api.get<PagedResponse<Client>>("/clients", { params }),
  get: (id: string) => api.get<Client>(`/clients/${id}`),
  create: (data: CreateClientRequest) => api.post<Client>("/clients", data),
  update: (id: string, data: UpdateClientRequest) => api.put<Client>(`/clients/${id}`, data),
  delete: (id: string) => api.delete(`/clients/${id}`),
};

// Invoices
export const invoiceApi = {
  list: (params?: InvoiceListParams) =>
    api.get<PagedResponse<InvoiceSummary>>("/invoices", { params }),
  get: (id: string) => api.get<Invoice>(`/invoices/${id}`),
  create: (data: CreateInvoiceRequest) => api.post<Invoice>("/invoices", data),
  update: (id: string, data: UpdateInvoiceRequest) => api.put<Invoice>(`/invoices/${id}`, data),
  delete: (id: string) => api.delete(`/invoices/${id}`),
  send: (id: string) => api.post<Invoice>(`/invoices/${id}/send`),
  downloadPdf: (id: string) =>
    api.get(`/invoices/${id}/pdf`, { responseType: "blob" }),
  markPaid: (id: string, data: ManualPaymentRequest) =>
    api.post<Invoice>(`/invoices/${id}/mark-paid`, data),
};

// Payments
export const paymentApi = {
  initiate: (invoiceId: string) =>
    api.post<PayFastPaymentResponse>(`/payments/initiate/${invoiceId}`),
};

// Dashboard
export const dashboardApi = {
  summary: () => api.get<DashboardSummary>("/dashboard/summary"),
  recentInvoices: () => api.get<InvoiceSummary[]>("/dashboard/recent"),
  revenue: () => api.get<RevenueData[]>("/dashboard/revenue"),
};

// === Types ===
export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  hasBusinessProfile: boolean;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface Business {
  id: string;
  name: string;
  registrationNumber?: string;
  vatNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  invoicePrefix: string;
  paymentTermsDays: number;
  bankName?: string;
  bankAccountNumber?: string;
  bankBranchCode?: string;
  currency: string;
  watermarkEnabled?: boolean;
  watermarkText?: string;
  watermarkOpacity?: number;
  contactPerson?: string;
}

export type CreateBusinessRequest = Omit<Business, "id" | "logoUrl">;
export type UpdateBusinessRequest = Partial<CreateBusinessRequest>;

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  companyName?: string;
  vatNumber?: string;
  addressLine1?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country: string;
  notes?: string;
}

export type CreateClientRequest = Omit<Client, "id">;
export type UpdateClientRequest = Partial<CreateClientRequest>;

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number; // e.g. 15 for 15% VAT
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  status: "DRAFT" | "SENT" | "VIEWED" | "PAID" | "OVERDUE" | "CANCELLED";
  issueDate: string;
  dueDate: string;
  client: Client;
  business?: {
    id: string;
    name: string;
    logoUrl?: string;
    primaryColor?: string;
  };
  lineItems: LineItem[];
  subtotal: number;
  taxTotal: number;
  total: number;
  currency: string;
  notes?: string;
  terms?: string;
  contactPerson?: string;
  purchaseOrderNumber?: string;
  tinNumber?: string;
  pdfUrl?: string;
  viewToken: string;
  sentAt?: string;
  viewedAt?: string;
  paidAt?: string;
}

export type InvoiceSummary = Pick<Invoice,
  "id" | "invoiceNumber" | "status" | "issueDate" | "dueDate" | "total" | "currency"
> & { clientName: string };

export interface CreateInvoiceRequest {
  clientId: string;
  issueDate: string;
  dueDate: string;
  lineItems: LineItem[];
  notes?: string;
  terms?: string;
  contactPerson?: string;
  purchaseOrderNumber?: string;
  tinNumber?: string;
}

export type UpdateInvoiceRequest = Partial<CreateInvoiceRequest>;

export interface InvoiceListParams {
  status?: string;
  clientId?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

export interface ManualPaymentRequest {
  amount: number;
  paymentMethod: string;
  reference: string;
  paidAt: string;
}

export interface PayFastPaymentResponse {
  paymentUrl: string;
  params: Record<string, string>;
}

export interface DashboardSummary {
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  totalOverdue: number;
  invoiceCount: number;
  currency: string;
}

export interface RevenueData {
  month: string;
  invoiced: number;
  paid: number;
}

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
