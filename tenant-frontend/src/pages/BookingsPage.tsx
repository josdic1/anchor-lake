import { useEffect, useMemo, useState } from "react";
import {
  getAllBookings,
  getMyBookings,
  getAttendees,
  type BookingSearchParams,
} from "../api/bookings";
import { getOrdersByBooking } from "../api/orders";
import { roomsApi } from "../api/client";
import { BookingsFilters } from "../components/bookings/BookingsFilters";
import { BookingsTable } from "../components/bookings/BookingsTable";
import { BookingDetailPanel } from "../components/bookings/BookingDetailPanel";
import { useAuth } from "../hooks/useAuth";
import type { Attendee, Booking, Room } from "../types/booking";

const EMPTY_FILTERS: BookingSearchParams = {};

type QuickTab = "today" | "active" | "drafts" | "past" | "all";

const QUICK_TABS: { key: QuickTab; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "active", label: "Active" },
  { key: "drafts", label: "Drafts" },
  { key: "past", label: "Past" },
  { key: "all", label: "All" },
];

function PageLoader({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="page-loading-card" role="status" aria-live="polite">
      <span className="page-loading-spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function applyQuickTab(bookings: Booking[], tab: QuickTab): Booking[] {
  const today = getToday();
  switch (tab) {
    case "today":
      return bookings.filter((b) => b.booking_date === today);
    case "active":
      return bookings.filter((b) =>
        ["CONFIRMED", "SEATED", "SERVICE"].includes(b.status),
      );
    case "drafts":
      return bookings.filter((b) => b.status === "DRAFT");
    case "past":
      return bookings.filter((b) =>
        ["COMPLETED", "CANCELLED"].includes(b.status),
      );
    case "all":
    default:
      return bookings;
  }
}

function applyFilters(
  bookings: Booking[],
  filters: BookingSearchParams,
  attendeeMap: Record<number, Attendee[]>,
): Booking[] {
  let result = bookings;

  if (filters.dateFrom)
    result = result.filter((b) => b.booking_date >= filters.dateFrom!);
  if (filters.dateTo)
    result = result.filter((b) => b.booking_date <= filters.dateTo!);
  if (filters.status)
    result = result.filter((b) => b.status === filters.status);
  if (filters.mealType)
    result = result.filter((b) => b.meal_type === filters.mealType);
  if (filters.roomId)
    result = result.filter((b) => String(b.room_id) === filters.roomId);

  if (filters.memberQuery) {
    const q = filters.memberQuery.toLowerCase().trim();
    result = result.filter((b) => {
      if (String(b.booking_member_id).includes(q) || String(b.id).includes(q))
        return true;
      return (attendeeMap[b.id] || []).some((a) =>
        `${a.guest_first_name ?? ""} ${a.guest_last_name ?? ""}`
          .toLowerCase()
          .includes(q),
      );
    });
  }

  return result;
}

function smartSort(bookings: Booking[]): Booking[] {
  const today = getToday();
  const STATUS_PRIORITY: Record<string, number> = {
    SERVICE: 0,
    SEATED: 1,
    CONFIRMED: 2,
    DRAFT: 3,
    COMPLETED: 4,
    CANCELLED: 5,
  };

  return [...bookings].sort((a, b) => {
    // Today's bookings first
    const aToday = a.booking_date === today ? 0 : 1;
    const bToday = b.booking_date === today ? 0 : 1;
    if (aToday !== bToday) return aToday - bToday;

    // Within same day group, sort by status priority
    const aPri = STATUS_PRIORITY[a.status] ?? 99;
    const bPri = STATUS_PRIORITY[b.status] ?? 99;
    if (aPri !== bPri) return aPri - bPri;

    // Then by date descending (newest first)
    if (a.booking_date !== b.booking_date)
      return a.booking_date > b.booking_date ? -1 : 1;

    // Then by arrival time ascending
    return (a.estimated_arrival ?? "").localeCompare(b.estimated_arrival ?? "");
  });
}

export function BookingsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [attendeeMap, setAttendeeMap] = useState<Record<number, Attendee[]>>(
    {},
  );
  const [ordersMap, setOrdersMap] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<BookingSearchParams>(EMPTY_FILTERS);
  const [quickTab, setQuickTab] = useState<QuickTab>("today");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(
    null,
  );

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");

      try {
        const [bookingsData, roomsData] = await Promise.all([
          user?.role === "member" ? getMyBookings() : getAllBookings(),
          roomsApi.get<Room[]>("/rooms").then((r) => r.data),
        ]);

        setBookings(bookingsData);
        setRooms(roomsData);

        const entries = await Promise.all(
          bookingsData.map(async (b) => {
            try {
              const [attendees, orders] = await Promise.all([
                getAttendees(b.id),
                getOrdersByBooking(b.id),
              ]);
              return { id: b.id, attendees, hasOrders: orders.length > 0 };
            } catch {
              return { id: b.id, attendees: [], hasOrders: false };
            }
          }),
        );

        setAttendeeMap(
          Object.fromEntries(entries.map((e) => [e.id, e.attendees])),
        );
        setOrdersMap(
          Object.fromEntries(entries.map((e) => [e.id, e.hasOrders])),
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load bookings.",
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [user?.role]);

  // Compute tab counts
  const tabCounts = useMemo(() => {
    const today = getToday();
    return {
      today: bookings.filter((b) => b.booking_date === today).length,
      active: bookings.filter((b) =>
        ["CONFIRMED", "SEATED", "SERVICE"].includes(b.status),
      ).length,
      drafts: bookings.filter((b) => b.status === "DRAFT").length,
      past: bookings.filter((b) =>
        ["COMPLETED", "CANCELLED"].includes(b.status),
      ).length,
      all: bookings.length,
    };
  }, [bookings]);

  const filtered = useMemo(() => {
    const tabbed = applyQuickTab(bookings, quickTab);
    const searched = applyFilters(tabbed, filters, attendeeMap);
    return smartSort(searched);
  }, [bookings, quickTab, filters, attendeeMap]);

  function handleSelectBooking(id: number) {
    setSelectedBookingId((prev) => (prev === id ? null : id));
  }

  function handleBookingUpdated(updated: Booking) {
    setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  }

  function handleBookingCancelled() {
    setSelectedBookingId(null);
  }

  const hasAnyFilter =
    !!filters.dateFrom ||
    !!filters.dateTo ||
    !!filters.status ||
    !!filters.mealType ||
    !!filters.roomId ||
    !!filters.memberQuery;

  if (loading) {
    return <PageLoader label="Loading bookings..." />;
  }

  if (error) {
    return (
      <div className="page-loading-card page-loading-card--error" role="alert">
        {error}
      </div>
    );
  }

  return (
    <div
      className={`bookings-page ${selectedBookingId ? "bookings-page--panel-open" : ""}`}
    >
      <div className="bookings-page__main">
        <div className="page-header">
          <h2 className="page-title">Bookings</h2>
        </div>

        {/* Quick tabs */}
        <div
          style={{
            display: "flex",
            gap: "4px",
            marginBottom: "1rem",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {QUICK_TABS.map((tab) => {
            const isActive = quickTab === tab.key;
            const count = tabCounts[tab.key];
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setQuickTab(tab.key);
                  setFilters(EMPTY_FILTERS);
                }}
                style={{
                  padding: "6px 14px",
                  borderRadius: "100px",
                  border: `1.5px solid ${isActive ? "var(--zinc-900)" : "var(--zinc-200)"}`,
                  background: isActive
                    ? "var(--zinc-900)"
                    : "var(--bg-surface)",
                  color: isActive ? "white" : "var(--zinc-600)",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 500,
                  fontFamily: "var(--font-body)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {tab.label}
                <span
                  style={{
                    fontSize: "10px",
                    opacity: 0.7,
                    fontWeight: 600,
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}

          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              marginLeft: "auto",
              padding: "6px 12px",
              borderRadius: "100px",
              border: `1.5px solid ${hasAnyFilter ? "var(--accent)" : "var(--zinc-200)"}`,
              background: hasAnyFilter ? "var(--accent-light)" : "transparent",
              color: hasAnyFilter ? "var(--accent)" : "var(--zinc-500)",
              cursor: "pointer",
              fontSize: "12px",
              fontFamily: "var(--font-body)",
            }}
          >
            {showFilters ? "Hide Filters" : "Filters"}
            {hasAnyFilter && " ✕"}
          </button>
        </div>

        {/* Advanced filters (collapsible) */}
        {showFilters && (
          <BookingsFilters
            filters={filters}
            rooms={rooms}
            onChange={setFilters}
            onClear={() => setFilters(EMPTY_FILTERS)}
          />
        )}

        <BookingsTable
          bookings={filtered}
          rooms={rooms}
          attendeeMap={attendeeMap}
          ordersMap={ordersMap}
          selectedBookingId={selectedBookingId}
          onSelectBooking={handleSelectBooking}
          loading={loading}
          error={error}
        />
      </div>

      {selectedBookingId && (
        <BookingDetailPanel
          bookingId={selectedBookingId}
          rooms={rooms}
          onClose={() => setSelectedBookingId(null)}
          onUpdated={handleBookingUpdated}
          onCancelled={handleBookingCancelled}
        />
      )}
    </div>
  );
}
