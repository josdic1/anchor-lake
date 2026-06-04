import { useAuth } from "./useAuth";
import type { UserRole } from "../types/auth";

export function useRole() {
  const { user } = useAuth();
  const role = user?.role ?? null;

  return {
    role,
    is: (r: UserRole) => role === r,
    isAny: (...roles: UserRole[]) => role !== null && roles.includes(role),
    isMember: role === "member",
    isStaff: role === "staff",
    isAdmin: role === "admin",
    isStaffOrAdmin: role === "staff" || role === "admin",
  };
}
