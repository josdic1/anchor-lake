import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./app/AppShell";
import { RoleRoute } from "./components/shared/RoleRoute";
import { useAuth } from "./hooks/useAuth";
import { AdminPage } from "./pages/AdminPage";
import { BookingsPage } from "./pages/BookingsPage";
import { ChangePasswordPage } from "./pages/ChangePasswordPage";
import { DashboardPage } from "./pages/DashboardPage";
import { HelpPage } from "./pages/HelpPage";
import { GettingStartedPage } from "./pages/GettingStartedPage";
import { KitchenExecutionBoard } from "./pages/KitchenExecutionBoard";
import { KitchenStreamPage } from "./pages/KitchenStreamPage";
import { LoginPage } from "./pages/LoginPage";
import { MemberApp } from "./pages/MemberApp";
import { MembersPage } from "./pages/MembersPage";
import { MenuManagementPage } from "./pages/MenuManagementPage";
import { NewBookingPage } from "./pages/NewBookingPage";
import { ReportsPage } from "./pages/ReportsPage";
import { StaffServiceBoard } from "./pages/StaffServiceBoard";
import { CalendarPage } from "./pages/CalendarPage";
import { MemberMenuPage } from "./pages/MemberMenuPage";
import { StaffPage360 } from "./pages/StaffPage360";
import { TodayPage } from "./pages/Today";
import { UpcomingPage } from "./pages/UpcomingPage";

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

  const isStaffOrAdmin = user?.role === "staff" || user?.role === "admin";

  if (isAuthenticated && forcePasswordChange) {
    return <ChangePasswordPage />;
  }

  if (isAuthenticated && user?.role === "member" && isMobile) {
    return <MemberApp />;
  }

  return (
    <Routes>
      {/* Public route — no nav chrome */}
      <Route path="/start" element={<GettingStartedPage />} />

      {/* All other routes wrapped in AppShell */}
      <Route
        path="*"
        element={
          <AppShell>
            <Routes>
              <Route
                path="/login"
                element={
                  isAuthenticated ? (
                    <Navigate
                      to={isStaffOrAdmin ? "/today" : "/bookings"}
                      replace
                    />
                  ) : (
                    <LoginPage />
                  )
                }
              />
              <Route
                path="/today"
                element={
                  <RoleRoute allow={["staff", "admin"]}>
                    <TodayPage />
                  </RoleRoute>
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
                path="/service"
                element={
                  <RoleRoute allow={["staff", "admin"]}>
                    <StaffServiceBoard />
                  </RoleRoute>
                }
              />
              <Route
                path="/floor"
                element={
                  <RoleRoute allow={["staff", "admin"]}>
                    <StaffPage360 />
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
                path="/member-menu"
                element={
                  <RoleRoute allow={["member"]}>
                    <MemberMenuPage />
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
                path="/upcoming"
                element={
                  <RoleRoute allow={["staff", "admin"]}>
                    <UpcomingPage />
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
                path="/help"
                element={
                  <RoleRoute allow={["admin", "staff", "member"]}>
                    <HelpPage />
                  </RoleRoute>
                }
              />
              <Route
                path="*"
                element={
                  <Navigate
                    to={
                      !isAuthenticated
                        ? "/login"
                        : isStaffOrAdmin
                          ? "/today"
                          : "/bookings"
                    }
                    replace
                  />
                }
              />
            </Routes>
          </AppShell>
        }
      />
    </Routes>
  );
}
