// src/api/config.ts
export const API_BASE_URLS = {
  users: import.meta.env.VITE_API_USERS as string,
  rooms: import.meta.env.VITE_API_ROOMS as string,
  menu: import.meta.env.VITE_API_MENU as string,
  bookings: import.meta.env.VITE_API_BOOKINGS as string,
  orders: import.meta.env.VITE_API_ORDERS as string,
};

function assertEnv(value: string | undefined, name: string): string {
  if (!value || !value.trim()) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export const API = {
  users: assertEnv(API_BASE_URLS.users, "VITE_API_USERS"),
  rooms: assertEnv(API_BASE_URLS.rooms, "VITE_API_ROOMS"),
  menu: assertEnv(API_BASE_URLS.menu, "VITE_API_MENU"),
  bookings: assertEnv(API_BASE_URLS.bookings, "VITE_API_BOOKINGS"),
  orders: assertEnv(API_BASE_URLS.orders, "VITE_API_ORDERS"),
};
