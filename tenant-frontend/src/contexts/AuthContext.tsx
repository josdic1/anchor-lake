// src/contexts/AuthContext.tsx
import { createContext } from "react";
import type { AuthUser, LoginRequest } from "../types/auth";

export type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  forcePasswordChange: boolean;
  loginUser: (payload: LoginRequest) => Promise<void>;
  logoutUser: () => void;
};

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);
