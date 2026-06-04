import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { HoursOfOperationModal } from "../components/hours/HoursOfOperationModal";
import { useAuth } from "../hooks/useAuth";
import { useTenant } from "../hooks/useTenant";
import { Can } from "../components/shared/Can";
import { bookingsApi } from "../api/client";
import {
  TutorialTour,
  hasTourCompleted,
  resetTourCompleted,
} from "../components/shared/TutorialTour";

type AppShellProps = {
  children: React.ReactNode;
};

const navLink = ({ isActive }: { isActive: boolean }) =>
  isActive ? "app-nav__link app-nav__link--active" : "app-nav__link";

function useStuckBookingCount() {
  const [count, setCount] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.role !== "admin") return;

    async function load() {
      try {
        const res = await bookingsApi.get("/bookings");
        const today = new Date().toISOString().slice(0, 10);
        const stuck = res.data.filter(
          (b: any) =>
            ["SEATED", "SERVICE"].includes(b.status) && b.booking_date < today,
        );
        setCount(stuck.length);
      } catch {}
    }

    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [user?.role]);

  return count;
}

export function AppShell({ children }: AppShellProps) {
  const { user, logoutUser, isAuthenticated } = useAuth();
  const { name, logo_url, features } = useTenant();
  const [isHoursOpen, setIsHoursOpen] = useState(false);
  const [runTour, setRunTour] = useState(false);
  const stuckCount = useStuckBookingCount();
  const navigate = useNavigate();

  const isAdmin = user?.role === "admin";
  const isStaffOrAdmin = user?.role === "staff" || isAdmin;

  // Auto-start tour for first-time users
  useEffect(() => {
    if (!isAuthenticated || !user?.userId) return;
    if (hasTourCompleted()) return;
    const t = setTimeout(() => setRunTour(true), 600);
    return () => clearTimeout(t);
  }, [isAuthenticated, user?.userId]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (
        e.key === "n" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(
          (e.target as HTMLElement).tagName,
        )
      ) {
        navigate("/booking");
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [navigate]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__brand">
          {logo_url ? (
            <img className="app-header__logo" src={logo_url} alt={name} />
          ) : (
            <div className="app-header__logo-mark" aria-hidden="true" />
          )}
          <span className="app-header__title">{name}</span>
        </div>

        {isAuthenticated && (
          <nav className="app-nav">
            <NavLink id="nav-bookings" to="/bookings" className={navLink}>
              Bookings
            </NavLink>
            <NavLink id="nav-new-booking" to="/booking" className={navLink}>
              New Booking
            </NavLink>

            <Can roles={["member"]}>
              <NavLink id="nav-household" to="/household" className={navLink}>
                My Household
              </NavLink>
            </Can>

            <button
              id="nav-hours"
              type="button"
              className="app-nav__link app-nav__button"
              onClick={() => setIsHoursOpen(true)}
            >
              Hours
            </button>

            {isStaffOrAdmin && (
              <>
                <NavLink id="nav-calendar" to="/calendar" className={navLink}>
                  Calendar
                </NavLink>
                <NavLink id="nav-dashboard" to="/dashboard" className={navLink}>
                  Dashboard
                </NavLink>
                <NavLink id="nav-seating" to="/seating" className={navLink}>
                  Seating
                </NavLink>
                <NavLink id="nav-service" to="/service" className={navLink}>
                  Service
                </NavLink>
                {features.show_kitchen_board && (
                  <NavLink id="nav-kitchen" to="/kitchen" className={navLink}>
                    Kitchen
                  </NavLink>
                )}
              </>
            )}

            {isStaffOrAdmin && features.show_reports && (
              <NavLink id="nav-reports" to="/reports" className={navLink}>
                Reports
              </NavLink>
            )}

            {isAdmin && (
              <>
                <NavLink id="nav-menu" to="/menu" className={navLink}>
                  Menu
                </NavLink>
                <NavLink id="nav-setup" to="/setup" className={navLink}>
                  Setup
                </NavLink>
                <NavLink id="nav-admin" to="/admin" className={navLink}>
                  <span
                    style={{
                      position: "relative",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    Admin
                    {stuckCount > 0 && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "#dc2626",
                          color: "white",
                          borderRadius: "100px",
                          fontSize: "9px",
                          fontWeight: 700,
                          minWidth: "16px",
                          height: "16px",
                          padding: "0 4px",
                          lineHeight: 1,
                        }}
                      >
                        {stuckCount}
                      </span>
                    )}
                  </span>
                </NavLink>
              </>
            )}
          </nav>
        )}

        {isAuthenticated && (
          <div className="app-header__right">
            <button
              id="tour-help-btn"
              type="button"
              onClick={() => {
                resetTourCompleted();
                setTimeout(() => setRunTour(true), 50);
              }}
              title="Show walkthrough"
              aria-label="Show walkthrough"
              style={{
                background: "none",
                border: "1.5px solid var(--zinc-200)",
                borderRadius: "50%",
                width: "28px",
                height: "28px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 700,
                color: "var(--zinc-500)",
                marginRight: "8px",
                flexShrink: 0,
              }}
            >
              ?
            </button>
            <span className="app-header__role">{user?.role}</span>
            <button className="app-header__logout" onClick={logoutUser}>
              Log out
            </button>
          </div>
        )}
      </header>

      <main className="app-main">{children}</main>

      <HoursOfOperationModal
        isOpen={isHoursOpen}
        onClose={() => setIsHoursOpen(false)}
      />

      {isAuthenticated && user?.role && (
        <TutorialTour
          runTour={runTour}
          setRunTour={setRunTour}
          role={user.role as "member" | "staff" | "admin"}
        />
      )}

      {isAuthenticated && (
        <button
          onClick={() => navigate("/booking")}
          style={{
            position: "fixed",
            bottom: "2rem",
            right: "2rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0 1.25rem",
            height: "44px",
            borderRadius: "100px",
            background: "var(--zinc-900)",
            color: "white",
            border: "none",
            fontSize: "13px",
            fontWeight: 500,
            fontFamily: "var(--font-body)",
            letterSpacing: "0.02em",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)",
            zIndex: 50,
            transition: "all 0.2s ease",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "var(--zinc-800)";
            (e.currentTarget as HTMLElement).style.boxShadow =
              "0 4px 16px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.1)";
            (e.currentTarget as HTMLElement).style.transform =
              "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "var(--zinc-900)";
            (e.currentTarget as HTMLElement).style.boxShadow =
              "0 2px 8px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)";
            (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
          }}
          title="New Booking (N)"
          aria-label="New Booking"
        >
          <span style={{ fontSize: "18px", fontWeight: 300, lineHeight: 1 }}>
            +
          </span>
          New Booking
        </button>
      )}
    </div>
  );
}
