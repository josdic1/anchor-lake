// src/providers/AuthProvider.tsx
import { useMemo, useState, useEffect, type ReactNode } from "react";
import { login } from "../api/auth";
import { authStorage } from "../api/client";
import { AuthContext } from "../contexts/AuthContext";
import { TenantLoader } from "../components/shared/TenantLoader";
import type { AuthUser, LoginRequest } from "../types/auth";

const USER_ID_KEY = "apr_user_id";
const ROLE_KEY = "apr_role";
const FORCE_PW_KEY = "apr_force_pw_change";

function readStoredUser(): AuthUser | null {
  const token = authStorage.getToken();
  const userId = localStorage.getItem(USER_ID_KEY);
  const role = localStorage.getItem(ROLE_KEY);
  if (!token || !userId || !role) return null;
  return {
    token,
    userId: Number(userId),
    role: role as AuthUser["role"],
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [forcePasswordChange, setForcePasswordChange] = useState(false);

  useEffect(() => {
    const storedUser = readStoredUser();
    if (storedUser) {
      setUser(storedUser);
      setForcePasswordChange(localStorage.getItem(FORCE_PW_KEY) === "1");
    }
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  async function loginUser(payload: LoginRequest) {
    setIsLoading(true);
    try {
      const response = await login(payload);
      const nextUser: AuthUser = {
        token: response.access_token,
        userId: response.user_id,
        role: response.role,
      };

      authStorage.setToken(nextUser.token);
      localStorage.setItem(USER_ID_KEY, String(nextUser.userId));
      localStorage.setItem(ROLE_KEY, nextUser.role);
      localStorage.setItem(
        FORCE_PW_KEY,
        response.force_password_change ? "1" : "0",
      );

      setForcePasswordChange(response.force_password_change);
      setUser(nextUser);
    } finally {
      setIsLoading(false);
    }
  }

  function logoutUser() {
    setIsLoading(true);
    authStorage.clearToken();
    localStorage.removeItem(USER_ID_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(FORCE_PW_KEY);
    setUser(null);
    setForcePasswordChange(false);
    setTimeout(() => setIsLoading(false), 600);
  }

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      forcePasswordChange,
      loginUser,
      logoutUser,
    }),
    [user, isLoading, forcePasswordChange],
  );

  return (
    <AuthContext.Provider value={value}>
      {isLoading ? <TenantLoader /> : children}
    </AuthContext.Provider>
  );
}
