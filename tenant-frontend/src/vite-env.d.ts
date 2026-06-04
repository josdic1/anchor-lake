/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_USERS: string;
  readonly VITE_API_ROOMS: string;
  readonly VITE_API_MENU: string;
  readonly VITE_API_BOOKINGS: string;
  readonly VITE_API_ORDERS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
