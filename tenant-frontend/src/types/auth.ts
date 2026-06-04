// src/types/auth.ts
export type UserRole = "member" | "staff" | "admin";

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  access_token: string;
  token_type: "bearer";
  user_id: number;
  role: UserRole;
  force_password_change: boolean;
};

export type AuthUser = {
  token: string;
  userId: number;
  role: UserRole;
};
