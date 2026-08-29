import { api } from "./api";

// ── Types ──────────────────────────────────────────────────────────────────

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

export interface Business {
  id: string;
  name: string;
  registrationNumber?: string;
  vatNumber?: string;
  addressLine1?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  primaryColor?: string;
  invoicePrefix: string;
  paymentTermsDays: number;
  bankName?: string;
  bankAccountNumber?: string;
  bankBranchCode?: string;
  currency: string;
  watermarkEnabled?: boolean;
  watermarkText?: string;
}

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

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  status: "DRAFT" | "SENT" | "VIEWED" | "PAID" | "OVERDUE" | "CANCELLED";
  issueDate: string;
  dueDate: string;
  client: Client;
  business?: { id: string; name: string; logoUrl?: string; primaryColor?: string };
  lineItems: LineItem[];
  subtotal: number;
  taxTotal: number;
  total: number;
  currency: string;
  notes?: string;
  terms?: string;
  pdfUrl?: string;
  viewToken: string;
  sentAt?: string;
  viewedAt?: string;
  paidAt?: string;
}

export type InvoiceSummary = Pick<Invoice,
  "id" | "invoiceNumber" | "status" | "issueDate" | "dueDate" | "total" | "currency"
> & { clientName: string };

export interface DashboardSummary {
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  totalOverdue: number;
  invoiceCount: number;
  currency: string;
}

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

// ── API functions ──────────────────────────────────────────────────────────

export const authApi = {
  register: (data: { firstName: string; lastName: string; email: string; password: string }) =>
    api.post<AuthResponse>("/auth/register", data),
  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>("/auth/login", data),
  logout: () => api.post("/auth/logout"),
};

export const businessApi = {
  get: () => api.get<Business>("/business"),
  create: (data: Partial<Business>) => api.post<Business>("/business", data),
  update: (data: Partial<Business>) => api.put<Business>("/business", data),
};

export const clientApi = {
  list: (params?: { search?: string; page?: number; size?: number }) =>
    api.get<PagedResponse<Client>>("/clients", { params }),
  get: (id: string) => api.get<Client>(`/clients/${id}`),
  create: (data: Omit<Client, "id">) => api.post<Client>("/clients", data),
  update: (id: string, data: Partial<Client>) => api.put<Client>(`/clients/${id}`, data),
  delete: (id: string) => api.delete(`/clients/${id}`),
};

export const invoiceApi = {
  list: (params?: { status?: string; page?: number; size?: number }) =>
    api.get<PagedResponse<InvoiceSummary>>("/invoices", { params }),
  get: (id: string) => api.get<Invoice>(`/invoices/${id}`),
  create: (data: {
    clientId: string;
    issueDate: string;
    dueDate: string;
    lineItems: LineItem[];
    notes?: string;
    terms?: string;
  }) => api.post<Invoice>("/invoices", data),
  send: (id: string) => api.post<Invoice>(`/invoices/${id}/send`),
  markPaid: (id: string, data: { amount: number; paymentMethod: string; reference: string; paidAt: string }) =>
    api.post<Invoice>(`/invoices/${id}/mark-paid`, data),
  downloadPdf: (id: string) =>
    api.get(`/invoices/${id}/pdf`, { responseType: "arraybuffer" }),
};

export const dashboardApi = {
  summary: () => api.get<DashboardSummary>("/dashboard/summary"),
  recentInvoices: () => api.get<InvoiceSummary[]>("/dashboard/recent"),
};
