// src/api/auth.ts
import type { LoginRequest, LoginResponse } from "../types/auth";
import { usersApi } from "./client";

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const response = await usersApi.post<LoginResponse>("/auth/login", {
    email: payload.email,
    password: payload.password,
  });

  return response.data;
}
