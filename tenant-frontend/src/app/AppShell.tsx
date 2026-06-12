import { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { HoursOfOperationModal } from "../components/hours/HoursOfOperationModal";
import { useAuth } from "../hooks/useAuth";
import { useTenant } from "../hooks/useTenant";
import { Can } from "../components/shared/Can";
import { bookingsApi } from "../api/client";
import {
  TutorialTour,
  hasTourCompleted,
  markTourCompleted,
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
    window.addEventListener("stuck-bookings-changed", load);
    return () => {
      clearInterval(interval);
      window.removeEventListener("stuck-bookings-changed", load);
    };
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
  const location = useLocation();
  const isOnNewBookingPage = location.pathname === "/booking";

  const isAdmin = user?.role === "admin";
  const isStaffOrAdmin = user?.role === "staff" || isAdmin;
  const isWait = isAdmin || user?.sub_role === "wait";
  const isKitchen = isAdmin || user?.sub_role === "kitchen";
  const isManager = isAdmin || user?.sub_role === "manager";
  const hasNoSubRole = isStaffOrAdmin && !user?.sub_role && !isAdmin;
  const canSeeBookingsAndCalendar = isManager || hasNoSubRole;

  useEffect(() => {
    if (isAuthenticated && !hasTourCompleted()) {
      const t = setTimeout(() => setRunTour(true), 600);
      return () => clearTimeout(t);
    }
  }, [isAuthenticated]);

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
    <div className={`app-shell ${!isAuthenticated ? "app-shell--guest" : ""}`}>
      <header className="app-header">
        <a
          href="/"
          className="app-header__brand"
          style={{ textDecoration: "none", color: "inherit" }}
        >
          {logo_url ? (
            <img className="app-header__logo" src={logo_url} alt={name} />
          ) : (
            <div className="app-header__logo-mark" aria-hidden="true" />
          )}
          <span className="app-header__title">{name}</span>
        </a>

        {isAuthenticated && (
          <nav className="app-nav">
            {/* ── Member-only links ── */}
            <Can roles={["member"]}>
              <NavLink id="nav-bookings" to="/bookings" className={navLink}>
                Bookings
              </NavLink>
            </Can>
            <Can roles={["member"]}>
              <NavLink id="nav-new-booking" to="/booking" className={navLink}>
                New Booking
              </NavLink>
            </Can>
            <Can roles={["member"]}>
              <NavLink id="nav-household" to="/household" className={navLink}>
                My Household
              </NavLink>
            </Can>
            <Can roles={["member"]}>
              <NavLink
                id="nav-member-menu"
                to="/member-menu"
                className={navLink}
              >
                Menu
              </NavLink>
            </Can>
            <Can roles={["member"]}>
              <NavLink id="nav-guide" to="/start" className={navLink}>
                Guide
              </NavLink>
            </Can>

            {/* ── Manager / no-sub-role / admin: Bookings + New Booking ── */}
            {canSeeBookingsAndCalendar && (
              <>
                <NavLink id="nav-bookings" to="/bookings" className={navLink}>
                  Bookings
                </NavLink>
                <NavLink id="nav-new-booking" to="/booking" className={navLink}>
                  New Booking
                </NavLink>
              </>
            )}

            {/* ── All staff + admin: Today + Upcoming ── */}
            {isStaffOrAdmin && (
              <NavLink id="nav-today" to="/today" className={navLink}>
                Today
              </NavLink>
            )}
            {isStaffOrAdmin && (
              <NavLink id="nav-upcoming" to="/upcoming" className={navLink}>
                Upcoming
              </NavLink>
            )}

            {/* ── Manager / no-sub-role / admin: Calendar + Dashboard ── */}
            {canSeeBookingsAndCalendar && (
              <>
                <NavLink id="nav-calendar" to="/calendar" className={navLink}>
                  Calendar
                </NavLink>
                <NavLink id="nav-dashboard" to="/dashboard" className={navLink}>
                  Dashboard
                </NavLink>
              </>
            )}

            {/* ── Wait: Floor + Service ── */}
            {isStaffOrAdmin && isWait && (
              <>
                <NavLink id="nav-floor" to="/floor" className={navLink}>
                  Floor
                </NavLink>
                <NavLink id="nav-service" to="/service" className={navLink}>
                  Service
                </NavLink>
              </>
            )}

            {/* ── Kitchen: Kitchen board ── */}
            {isStaffOrAdmin && features.show_kitchen_board && isKitchen && (
              <NavLink id="nav-kitchen" to="/kitchen" className={navLink}>
                Kitchen
              </NavLink>
            )}

            {/* ── Hours (all users) ── */}
            <button
              id="nav-hours"
              type="button"
              className="app-nav__link app-nav__button"
              onClick={() => setIsHoursOpen(true)}
            >
              Hours
            </button>

            {/* ── Help (all staff + admin) ── */}
            {isStaffOrAdmin && (
              <NavLink id="nav-help" to="/help" className={navLink}>
                Help
              </NavLink>
            )}

            {/* ── Manager / admin: Reports ── */}
            {canSeeBookingsAndCalendar && features.show_reports && (
              <NavLink id="nav-reports" to="/reports" className={navLink}>
                Reports
              </NavLink>
            )}

            {/* ── Admin only ── */}
            {isAdmin && (
              <>
                <NavLink id="nav-menu" to="/menu" className={navLink}>
                  Menu Mgmt
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
                markTourCompleted();
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
            <span className="app-header__role">
              {user?.sub_role || user?.role}
            </span>
            <button className="app-header__logout" onClick={logoutUser}>
              Log out
            </button>
          </div>
        )}
      </header>

      <main className={`app-main ${!isAuthenticated ? "app-main--guest" : ""}`}>
        {children}
      </main>

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

      {/* FAB: only members, managers, no-sub-role staff, and admins */}
      {isAuthenticated &&
        !isOnNewBookingPage &&
        (isAdmin || !isStaffOrAdmin || canSeeBookingsAndCalendar) && (
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
              boxShadow:
                "0 2px 8px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)",
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
              (e.currentTarget as HTMLElement).style.transform =
                "translateY(0)";
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
