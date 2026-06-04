import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { TenantLoader } from "./TenantLoader"; // Use your fancy loader!
import type { UserRole } from "../../types/auth";

type Props = {
  children: React.ReactNode;
  allow: UserRole[];
};

export function RoleRoute({ children, allow }: Props) {
  const { user, isAuthenticated, isLoading } = useAuth();

  // 1. Wait for the AuthProvider to finish checking sessionStorage
  if (isLoading) {
    return <TenantLoader />;
  }

  // 2. Not logged in? Go to login.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 3. Wrong role? Go to the default safe page.
  if (!user || !allow.includes(user.role)) {
    return <Navigate to="/bookings" replace />;
  }

  // 4. Authorized!
  return <>{children}</>;
}
