import { useRole } from "../../hooks/useRole";
import type { UserRole } from "../../types/auth";

type Props = {
  roles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export function Can({ roles, children, fallback = null }: Props) {
  const { isAny } = useRole();
  return isAny(...roles) ? <>{children}</> : <>{fallback}</>;
}
