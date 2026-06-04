// src/api/client.ts
import axios, { type InternalAxiosRequestConfig } from "axios";
import { API } from "./config";

export type ServiceName = keyof typeof API;

const TOKEN_KEY = "apr_access_token";

export const authStorage = {
  getToken: (): string | null => localStorage.getItem(TOKEN_KEY),
  setToken: (token: string): void => localStorage.setItem(TOKEN_KEY, token),
  clearToken: (): void => localStorage.removeItem(TOKEN_KEY),
};

const createServiceClient = (baseURL: string) => {
  const client = axios.create({
    baseURL,
    timeout: 10000,
    headers: {
      "Content-Type": "application/json",
    },
  });

  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = authStorage.getToken();

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  });

  return client;
};

export const usersApi = createServiceClient(API.users);
export const roomsApi = createServiceClient(API.rooms);
export const menuApi = createServiceClient(API.menu);
export const bookingsApi = createServiceClient(API.bookings);
export const ordersApi = createServiceClient(API.orders);
