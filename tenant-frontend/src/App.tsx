import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./app/AppShell";
import { RoleRoute } from "./components/shared/RoleRoute";
import { useAuth } from "./hooks/useAuth";
import { AdminPage } from "./pages/AdminPage";
import { BookingsPage } from "./pages/BookingsPage";
import { ChangePasswordPage } from "./pages/ChangePasswordPage";
import { DashboardPage } from "./pages/DashboardPage";
import { KitchenExecutionBoard } from "./pages/KitchenExecutionBoard";
import { KitchenStreamPage } from "./pages/KitchenStreamPage";
import { LoginPage } from "./pages/LoginPage";
import { MemberApp } from "./pages/MemberApp";
import { MembersPage } from "./pages/MembersPage";
import { MenuManagementPage } from "./pages/MenuManagementPage";
import { NewBookingPage } from "./pages/NewBookingPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SeatingPage } from "./pages/SeatingPage";
import { StaffServiceBoard } from "./pages/StaffServiceBoard";
import { CalendarPage } from "./pages/CalendarPage";

function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return mobile;
}

export default function App() {
  const { isAuthenticated, user, forcePasswordChange } = useAuth();
  const isMobile = useIsMobile();

  if (isAuthenticated && forcePasswordChange) {
    return <ChangePasswordPage />;
  }

  if (isAuthenticated && user?.role === "member" && isMobile) {
    return <MemberApp />;
  }

  return (
    <AppShell>
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/bookings" replace />
            ) : (
              <LoginPage />
            )
          }
        />
        <Route
          path="/booking"
          element={
            <RoleRoute allow={["member", "staff", "admin"]}>
              <NewBookingPage />
            </RoleRoute>
          }
        />
        <Route
          path="/bookings"
          element={
            <RoleRoute allow={["member", "staff", "admin"]}>
              <BookingsPage />
            </RoleRoute>
          }
        />
        <Route
          path="/household"
          element={
            <RoleRoute allow={["member", "admin"]}>
              <MembersPage />
            </RoleRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <RoleRoute allow={["staff", "admin"]}>
              <DashboardPage />
            </RoleRoute>
          }
        />
        <Route
          path="/seating"
          element={
            <RoleRoute allow={["staff", "admin"]}>
              <SeatingPage />
            </RoleRoute>
          }
        />
        <Route
          path="/service"
          element={
            <RoleRoute allow={["staff", "admin"]}>
              <StaffServiceBoard />
            </RoleRoute>
          }
        />
        <Route
          path="/kitchen"
          element={
            <RoleRoute allow={["staff", "admin"]}>
              <KitchenExecutionBoard />
            </RoleRoute>
          }
        />
        <Route
          path="/kitchen/stream"
          element={
            <RoleRoute allow={["staff", "admin"]}>
              <KitchenStreamPage />
            </RoleRoute>
          }
        />
        <Route
          path="/menu"
          element={
            <RoleRoute allow={["admin"]}>
              <MenuManagementPage />
            </RoleRoute>
          }
        />
        <Route
          path="/calendar"
          element={
            <RoleRoute allow={["staff", "admin"]}>
              <CalendarPage />
            </RoleRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <RoleRoute allow={["admin", "staff"]}>
              <ReportsPage />
            </RoleRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <RoleRoute allow={["admin"]}>
              <AdminPage />
            </RoleRoute>
          }
        />
        <Route
          path="*"
          element={
            <Navigate to={isAuthenticated ? "/bookings" : "/login"} replace />
          }
        />
      </Routes>
    </AppShell>
  );
}
