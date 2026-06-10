import { useEffect, useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { bookingsApi, roomsApi } from "../api/client";
import { BookingDetailPanel } from "../components/bookings/BookingDetailPanel";
import { TenantLoader } from "../components/shared/TenantLoader";
import type { Booking, Room, BookingStatus } from "../types/booking";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "#3b82f6",
  SEATED: "#16a34a",
  SERVICE: "#d97706",
  COMPLETED: "#71717a",
};

const STATUS_BG: Record<string, string> = {
  CONFIRMED: "rgba(59, 130, 246, 0.08)",
  SEATED: "rgba(22, 163, 74, 0.08)",
  SERVICE: "rgba(217, 119, 6, 0.09)",
  COMPLETED: "rgba(113, 113, 122, 0.09)",
};

const QUICK_FILTERS: { label: string; value: BookingStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Seated", value: "SEATED" },
  { label: "In Service", value: "SERVICE" },
  { label: "Completed", value: "COMPLETED" },
];

export function CalendarPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [viewDate, setViewDate] = useState(new Date());

  const [statusFilter, setStatusFilter] = useState<BookingStatus | "ALL">(
    "ALL",
  );

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const loadData = async () => {
    setLoading(true);
    try {
      const start = new Date(year, month, 1).toISOString().slice(0, 10);
      const end = new Date(year, month + 1, 0).toISOString().slice(0, 10);
      const [bRes, rRes] = await Promise.all([
        bookingsApi.get<Booking[]>(
          `/bookings/calendar?start=${start}&end=${end}`,
        ),
        roomsApi.get<Room[]>("/rooms"),
      ]);
      setBookings(bRes.data);
      setRooms(rRes.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [month, year]);

  const filteredBookings = useMemo(() => {
    if (statusFilter === "ALL") return bookings;
    return bookings.filter((b) => b.status === statusFilter);
  }, [bookings, statusFilter]);

  const calendarGrid = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push({ day: null, dateStr: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ day: d, dateStr });
    }
    return days;
  }, [year, month]);

  const monthBookingCount = filteredBookings.length;
  const todayStr = new Date().toISOString().slice(0, 10);

  if (loading && bookings.length === 0) return <TenantLoader />;

  return (
    <div
      className={`calendar-page-shell fade-in ${selectedId ? "panel-open" : ""}`}
    >
      <div className="calendar-main">
        <div className="calendar-hero">
          <div className="calendar-hero__copy">
            <div className="calendar-kicker">Calendar View</div>
            <h2 className="calendar-hero__title">
              {MONTHS[month]} {year}
            </h2>
            <div className="calendar-hero__sub">
              {monthBookingCount} visible booking
              {monthBookingCount !== 1 ? "s" : ""} this month
            </div>
          </div>

          <div className="calendar-hero__actions">
            <button
              className="calendar-nav-btn"
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
              aria-label="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              className="calendar-today-btn"
              onClick={() => setViewDate(new Date())}
            >
              Today
            </button>
            <button
              className="calendar-nav-btn"
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
              aria-label="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="calendar-filters">
          {QUICK_FILTERS.map((f) => (
            <button
              key={f.value}
              className={`calendar-pill ${statusFilter === f.value ? "active" : ""}`}
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
          {statusFilter !== "ALL" && (
            <button
              className="calendar-pill-clear"
              onClick={() => setStatusFilter("ALL")}
            >
              <RotateCcw size={12} />
              Reset
            </button>
          )}
        </div>

        <div className="calendar-card">
          <div className="calendar-header-grid">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="calendar-day-label">
                {d}
              </div>
            ))}
          </div>

          <div className="calendar-grid">
            {calendarGrid.map((cell, i) => {
              const dayBookings = filteredBookings.filter(
                (b) => b.booking_date === cell.dateStr,
              );
              const isToday = cell.dateStr === todayStr;

              return (
                <div
                  key={i}
                  className={`calendar-cell ${!cell.day ? "empty" : ""} ${isToday ? "today" : ""}`}
                >
                  {cell.day && (
                    <div className="calendar-cell__top">
                      <span className="day-number">{cell.day}</span>
                      {dayBookings.length > 0 && (
                        <span className="day-count">{dayBookings.length}</span>
                      )}
                    </div>
                  )}

                  <div className="cell-events">
                    {dayBookings.slice(0, 5).map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        className={`calendar-event ${selectedId === b.id ? "selected" : ""}`}
                        onClick={() => setSelectedId(b.id)}
                        style={{
                          borderLeftColor: STATUS_COLORS[b.status] || "#ccc",
                          background: STATUS_BG[b.status] || "rgba(0,0,0,0.03)",
                        }}
                      >
                        <span
                          className="calendar-event__dot"
                          style={{
                            background: STATUS_COLORS[b.status] || "#ccc",
                          }}
                        />
                        <span className="event-time">
                          {b.estimated_arrival.slice(0, 5)}
                        </span>
                        <span className="event-name">
                          {(b as any).primary_first_name
                            ? `${(b as any).primary_first_name} ${((b as any).primary_last_name ?? "").charAt(0)}.`
                            : `#${b.id}`}
                        </span>
                      </button>
                    ))}

                    {dayBookings.length > 5 && (
                      <div className="event-more">
                        +{dayBookings.length - 5} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selectedId && (
        <BookingDetailPanel
          bookingId={selectedId}
          rooms={rooms}
          onClose={() => setSelectedId(null)}
          onUpdated={loadData}
          onCancelled={() => {
            setSelectedId(null);
            loadData();
          }}
        />
      )}

      <style>{`
        .calendar-page-shell {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0;
          transition: grid-template-columns 0.32s ease, gap 0.32s ease;
          max-width: 100%;
          align-items: start;
        }

        .calendar-page-shell.panel-open {
          grid-template-columns: 1fr 420px;
          gap: 28px;
        }

        .calendar-main {
          min-width: 0;
        }

        .calendar-hero {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
          margin-bottom: 18px;
          padding: 2px 2px 0;
        }

        .calendar-hero__copy {
          min-width: 0;
        }

        .calendar-kicker {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--accent, #a38a64);
          margin-bottom: 6px;
        }

        .calendar-hero__title {
          margin: 0;
          font-family: var(--font-display, "Cormorant Garamond", Georgia, serif);
          font-size: 36px;
          font-weight: 500;
          line-height: 1.02;
          letter-spacing: -0.02em;
          color: #18181b;
        }

        .calendar-hero__sub {
          margin-top: 8px;
          font-size: 14px;
          color: #7a746c;
          font-family: var(--font-body, "Inter", sans-serif);
        }

        .calendar-hero__actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .calendar-nav-btn,
        .calendar-today-btn {
          border: 1px solid rgba(223, 216, 207, 0.95);
          background: linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(249,247,244,0.98) 100%);
          color: #3f3a34;
          cursor: pointer;
          box-shadow: 0 8px 22px rgba(0,0,0,0.05);
          transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
        }

        .calendar-nav-btn:hover,
        .calendar-today-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 28px rgba(0,0,0,0.08);
          border-color: rgba(204, 193, 178, 0.95);
        }

        .calendar-nav-btn {
          width: 38px;
          height: 38px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .calendar-today-btn {
          height: 38px;
          padding: 0 16px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 600;
          font-family: var(--font-body, "Inter", sans-serif);
          letter-spacing: 0.01em;
        }

        .calendar-filters {
          display: flex;
          gap: 8px;
          margin-bottom: 18px;
          align-items: center;
          flex-wrap: wrap;
        }

        .calendar-pill {
          padding: 7px 15px;
          border-radius: 999px;
          border: 1.5px solid rgba(229, 223, 215, 0.95);
          background: rgba(255,255,255,0.82);
          color: #6a645c;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.18s ease;
          font-family: var(--font-body, "Inter", sans-serif);
          letter-spacing: 0.01em;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.85);
        }

        .calendar-pill:hover {
          border-color: rgba(203, 192, 177, 0.95);
          color: #3f3a34;
          transform: translateY(-1px);
        }

        .calendar-pill.active {
          background: #18181b;
          color: white;
          border-color: #18181b;
          box-shadow: 0 10px 24px rgba(0,0,0,0.14);
        }

        .calendar-pill-clear {
          background: none;
          border: none;
          color: #9a948b;
          font-size: 12px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-family: var(--font-body, "Inter", sans-serif);
          font-weight: 600;
          padding: 6px 4px;
        }

        .calendar-pill-clear:hover {
          color: #5f5a53;
        }

        .calendar-card {
          background: linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(250,248,245,0.98) 100%);
          border: 1px solid rgba(223, 216, 207, 0.95);
          border-radius: 22px;
          overflow: hidden;
          box-shadow:
            0 28px 70px rgba(0,0,0,0.08),
            0 8px 22px rgba(0,0,0,0.04),
            inset 0 1px 0 rgba(255,255,255,0.85);
          backdrop-filter: blur(6px);
        }

        .calendar-header-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          background: linear-gradient(180deg, rgba(248,245,241,0.95) 0%, rgba(244,240,234,0.95) 100%);
          border-bottom: 1px solid rgba(228, 221, 213, 0.95);
        }

        .calendar-day-label {
          padding: 12px 10px;
          text-align: center;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: #9d978e;
          font-family: var(--font-body, "Inter", sans-serif);
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          grid-auto-rows: minmax(138px, auto);
        }

        .calendar-cell {
          border-right: 1px solid rgba(240, 235, 229, 0.95);
          border-bottom: 1px solid rgba(240, 235, 229, 0.95);
          padding: 10px;
          position: relative;
          background: rgba(255,255,255,0.55);
          transition: background 0.18s ease;
        }

        .calendar-cell:hover {
          background: rgba(255,255,255,0.8);
        }

        .calendar-cell.empty {
          background: rgba(247, 244, 240, 0.55);
        }

        .calendar-cell.today {
          background: linear-gradient(180deg, rgba(255,251,240,0.95) 0%, rgba(255,248,230,0.82) 100%);
        }

        .calendar-cell__top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          min-height: 24px;
        }

        .day-number {
          font-size: 12px;
          font-weight: 700;
          color: #9b948b;
          font-family: var(--font-body, "Inter", sans-serif);
        }

        .today .day-number {
          color: #18181b;
          background: linear-gradient(180deg, #f7df8f 0%, #e8c85e 100%);
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          box-shadow: 0 4px 10px rgba(232, 200, 94, 0.35);
        }

        .day-count {
          min-width: 20px;
          height: 20px;
          padding: 0 6px;
          border-radius: 999px;
          background: rgba(24, 24, 27, 0.06);
          color: #5f5a53;
          font-size: 10px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-body, "Inter", sans-serif);
        }

        .cell-events {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .calendar-event {
          width: 100%;
          border: none;
          border-left: 3px solid #ccc;
          border-radius: 10px;
          cursor: pointer;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 8px;
          text-align: left;
          transition: transform 0.16s ease, box-shadow 0.16s ease, background 0.16s ease;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.6);
        }

        .calendar-event:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 18px rgba(0,0,0,0.08);
        }

        .calendar-event.selected {
          outline: 1px solid rgba(24,24,27,0.18);
          box-shadow: 0 10px 22px rgba(0,0,0,0.10);
        }

        .calendar-event__dot {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          flex-shrink: 0;
        }

        .event-time {
          font-weight: 700;
          font-size: 10px;
          color: #2f2a25;
          font-family: var(--font-body, "Inter", sans-serif);
          flex-shrink: 0;
        }

        .event-name {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 10px;
          font-weight: 600;
          color: #5d5851;
          font-family: var(--font-body, "Inter", sans-serif);
        }

        .event-more {
          font-size: 10px;
          color: #9d978e;
          padding-left: 4px;
          font-weight: 700;
          margin-top: 2px;
          letter-spacing: 0.02em;
          font-family: var(--font-body, "Inter", sans-serif);
        }

        @media (max-width: 1100px) {
          .calendar-page-shell.panel-open {
            grid-template-columns: 1fr;
            gap: 18px;
          }
        }

        @media (max-width: 780px) {
          .calendar-hero {
            flex-direction: column;
            align-items: flex-start;
          }

          .calendar-hero__title {
            font-size: 30px;
          }

          .calendar-card {
            border-radius: 18px;
          }

          .calendar-grid {
            grid-auto-rows: minmax(112px, auto);
          }

          .calendar-cell {
            padding: 8px;
          }

          .calendar-day-label {
            font-size: 9px;
            padding: 10px 6px;
          }

          .calendar-event {
            padding: 6px 7px;
          }

          .event-time,
          .event-name,
          .event-more {
            font-size: 9px;
          }
        }
      `}</style>
    </div>
  );
}
