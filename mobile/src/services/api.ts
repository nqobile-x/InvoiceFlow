/**
 * Shared API service layer for InvoiceFlow mobile.
 * Token storage uses Expo SecureStore (never AsyncStorage).
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  "http://localhost:8080/api/v1";

export const api = axios.create({
  baseURL: API_URL,
  timeout: 20_000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

const TOKEN_KEY = "invoiceflow_access_token";
const REFRESH_KEY = "invoiceflow_refresh_token";
const USER_KEY = "invoiceflow_auth_user";

export async function getStoredToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function getStoredRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_KEY);
  } catch {
    return null;
  }
}

export async function storeToken(token: string, refreshToken?: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  if (refreshToken) {
    await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
  }
}

export async function storeUserJson(userJson: string): Promise<void> {
  await SecureStore.setItemAsync(USER_KEY, userJson);
}

export async function getStoredUserJson(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(USER_KEY);
  } catch {
    return null;
  }
}

export async function clearToken(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {}),
    SecureStore.deleteItemAsync(REFRESH_KEY).catch(() => {}),
    SecureStore.deleteItemAsync(USER_KEY).catch(() => {}),
  ]);
}

let onSessionExpired: (() => void) | null = null;
export function registerSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

// Single-flight refresh lock prevents concurrent 401s from racing refresh rotation
let refreshInFlight: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const refreshToken = await getStoredRefreshToken();
      if (!refreshToken) throw new Error("NO_REFRESH_TOKEN");
      const { data } = await api.post<{ accessToken: string; refreshToken?: string }>(
        "/auth/refresh",
        { refreshToken }
      );
      await storeToken(data.accessToken, data.refreshToken);
      return data.accessToken;
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

// Request interceptor: attach bearer token
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: refresh access token once on 401
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (
      originalRequest &&
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh") &&
      !originalRequest.url?.includes("/auth/login")
    ) {
      originalRequest._retry = true;
      try {
        const nextToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${nextToken}`;
        return api(originalRequest);
      } catch {
        await clearToken();
        onSessionExpired?.();
        throw new Error("SESSION_EXPIRED");
      }
    }

    return Promise.reject(error);
  }
);
