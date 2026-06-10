import { useEffect, useState, useCallback } from "react";
import { getAllBookings, getAttendees } from "../api/bookings";
import { getOrdersByBooking } from "../api/orders";
import { roomsApi } from "../api/client";
import type { Booking, Attendee, Room } from "../types/booking";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDateWindow(): string[] {
  const dates: string[] = [];
  for (let i = 0; i < 4; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function formatDayLabel(dateStr: string): {
  day: string;
  date: string;
  isToday: boolean;
} {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date().toISOString().slice(0, 10);
  return {
    day: d.toLocaleDateString("en-US", { weekday: "long" }),
    date: d.toLocaleDateString("en-US", { month: "long", day: "numeric" }),
    isToday: dateStr === today,
  };
}

function fmt(t?: string | null) {
  if (!t) return "—";
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function getMemberName(attendees: Attendee[]): string {
  if (!attendees.length) return "—";
  const primary =
    attendees.find((a) => a.linked_member_id && !a.is_member_guest) ??
    attendees[0];
  return (
    `${primary.guest_first_name ?? ""} ${primary.guest_last_name ?? ""}`.trim() ||
    "—"
  );
}

function getDietaryTags(attendees: Attendee[]): string[] {
  const out: string[] = [];
  for (const a of attendees) {
    for (const flag of a.dietary_flags ?? []) {
      const label =
        flag === "OTHER" && a.dietary_other_note
          ? a.dietary_other_note
          : flag.replace(/_/g, " ");
      if (!out.includes(label)) out.push(label);
    }
  }
  return out;
}

const MEAL_LABELS: Record<string, string> = {
  LUNCH: "Lunch",
  DINNER: "Dinner",
  AFTERHOURS: "After Hours",
  SPECIAL_EVENT: "Special Event",
};

const STATUS_COLOR: Record<string, { color: string; bg: string; dot: string }> =
  {
    CONFIRMED: {
      color: "#1a4fa0",
      bg: "rgba(219,234,254,0.5)",
      dot: "#3b82f6",
    },
    DRAFT: { color: "#71717a", bg: "rgba(244,244,245,0.5)", dot: "#a1a1aa" },
    SEATED: { color: "#166534", bg: "rgba(220,252,231,0.5)", dot: "#22c55e" },
    SERVICE: { color: "#92400e", bg: "rgba(254,243,199,0.5)", dot: "#f59e0b" },
    COMPLETED: {
      color: "#a1a1aa",
      bg: "rgba(244,244,245,0.4)",
      dot: "#d4d4d8",
    },
    CANCELLED: {
      color: "#dc2626",
      bg: "rgba(254,226,226,0.4)",
      dot: "#ef4444",
    },
  };

// ─── Types ────────────────────────────────────────────────────────────────────

interface EnrichedBooking {
  booking: Booking;
  attendees: Attendee[];
  room: Room | undefined;
  hasPreOrders: boolean;
}

// ─── Booking Row ──────────────────────────────────────────────────────────────

function BookingRow({ e }: { e: EnrichedBooking }) {
  const { booking, attendees, room, hasPreOrders } = e;
  const cfg = STATUS_COLOR[booking.status] ?? STATUS_COLOR.CONFIRMED;
  const memberName = getMemberName(attendees);
  const dietary = getDietaryTags(attendees);
  const isCancelled = booking.status === "CANCELLED";

  return (
    <div
      className="upcoming-row"
      style={{
        display: "grid",
        gridTemplateColumns: "80px 8px 1fr",
        gap: "0 16px",
        alignItems: "start",
        opacity: isCancelled ? 0.35 : 1,
      }}
    >
      {/* Time */}
      <div
        style={{
          textAlign: "right",
          paddingTop: "10px",
          fontSize: "13px",
          fontWeight: 700,
          color: "#5a544d",
          fontFamily: "var(--font-body)",
          letterSpacing: "-0.01em",
          whiteSpace: "nowrap",
        }}
      >
        {fmt(booking.estimated_arrival)}
      </div>

      {/* Dot */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: "13px",
          gap: 0,
        }}
      >
        <div
          style={{
            width: "9px",
            height: "9px",
            borderRadius: "50%",
            background: cfg.dot,
            flexShrink: 0,
          }}
        />
      </div>

      {/* Card */}
      <div
        style={{
          background: cfg.bg,
          border: `1px solid ${cfg.dot}30`,
          borderRadius: "14px",
          padding: "10px 14px",
          marginBottom: "8px",
        }}
      >
        {/* Top row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: "#18181b",
                fontFamily: "var(--font-display)",
                lineHeight: 1.2,
              }}
            >
              {memberName}
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "#7a746c",
                marginTop: "3px",
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                fontFamily: "var(--font-body)",
                alignItems: "center",
              }}
            >
              <span>{room?.name ?? `Room ${booking.room_id}`}</span>
              <span style={{ color: "#ccc" }}>·</span>
              <span>
                {booking.party_size} guest{booking.party_size !== 1 ? "s" : ""}
              </span>
              <span style={{ color: "#ccc" }}>·</span>
              <span>{MEAL_LABELS[booking.meal_type] ?? booking.meal_type}</span>
            </div>
          </div>

          {/* Status pill */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "3px 9px",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.6)",
              border: `1px solid ${cfg.dot}40`,
              fontSize: "10px",
              fontWeight: 800,
              color: cfg.color,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              fontFamily: "var(--font-body)",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                background: cfg.dot,
                display: "inline-block",
              }}
            />
            {booking.status.charAt(0) + booking.status.slice(1).toLowerCase()}
          </div>
        </div>

        {/* Pre-orders badge */}
        {hasPreOrders && (
          <div style={{ marginTop: "8px" }}>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "999px",
                background: "rgba(238,242,255,0.9)",
                color: "#4338ca",
                border: "1px solid rgba(129,140,248,0.4)",
                fontFamily: "var(--font-body)",
              }}
            >
              🧾 Pre-order
            </span>
          </div>
        )}

        {/* Dietary */}
        {dietary.length > 0 && (
          <div
            style={{
              marginTop: "8px",
              display: "flex",
              gap: "5px",
              flexWrap: "wrap",
            }}
          >
            {dietary.map((d) => (
              <span
                key={d}
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "999px",
                  background: "rgba(254,243,199,0.9)",
                  color: "#92400e",
                  border: "1px solid rgba(245,196,83,0.4)",
                  fontFamily: "var(--font-body)",
                }}
              >
                {d}
              </span>
            ))}
          </div>
        )}

        {/* Notes */}
        {booking.notes && (
          <div
            style={{
              marginTop: "7px",
              fontSize: "11px",
              color: "#7a746c",
              fontStyle: "italic",
              fontFamily: "var(--font-body)",
              lineHeight: 1.5,
            }}
          >
            "{booking.notes}"
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Day Section ──────────────────────────────────────────────────────────────

function DaySection({
  dateStr,
  bookings,
  index,
}: {
  dateStr: string;
  bookings: EnrichedBooking[];
  index: number;
}) {
  const { day, date, isToday } = formatDayLabel(dateStr);
  const covers = bookings
    .filter((e) => !["CANCELLED", "DRAFT"].includes(e.booking.status))
    .reduce((sum, e) => sum + e.booking.party_size, 0);

  const sorted = [...bookings].sort((a, b) =>
    (a.booking.estimated_arrival ?? "").localeCompare(
      b.booking.estimated_arrival ?? "",
    ),
  );

  return (
    <div
      className="upcoming-day"
      style={{ animationDelay: `${index * 0.07}s` }}
    >
      {/* Day header */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "12px",
          marginBottom: "16px",
          paddingBottom: "12px",
          borderBottom: "1px solid rgba(228,222,214,0.7)",
        }}
      >
        <div>
          <span
            style={{
              fontSize: "22px",
              fontWeight: 500,
              fontFamily: "var(--font-display)",
              color: "#18181b",
              letterSpacing: "-0.02em",
            }}
          >
            {day}
          </span>
          <span
            style={{
              fontSize: "14px",
              color: "#9b948b",
              marginLeft: "10px",
              fontFamily: "var(--font-body)",
            }}
          >
            {date}
          </span>
        </div>

        {isToday && (
          <span
            style={{
              fontSize: "9px",
              fontWeight: 800,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--accent, #a38a64)",
              background: "rgba(163,138,100,0.1)",
              border: "1px solid rgba(163,138,100,0.25)",
              padding: "3px 9px",
              borderRadius: "999px",
              fontFamily: "var(--font-body)",
            }}
          >
            Today
          </span>
        )}

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: "12px",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              color: "#9b948b",
              fontFamily: "var(--font-body)",
            }}
          >
            {bookings.length} booking{bookings.length !== 1 ? "s" : ""}
          </span>
          {covers > 0 && (
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#5a544d",
                fontFamily: "var(--font-body)",
              }}
            >
              {covers} covers
            </span>
          )}
        </div>
      </div>

      {/* Bookings */}
      {sorted.length === 0 ? (
        <div
          style={{
            padding: "20px 32px",
            fontSize: "13px",
            color: "#b0a89e",
            fontStyle: "italic",
            fontFamily: "var(--font-body)",
          }}
        >
          No bookings
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {sorted.map((e) => (
            <BookingRow key={e.booking.id} e={e} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function UpcomingPage() {
  const [enriched, setEnriched] = useState<EnrichedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const dateWindow = getDateWindow();

  const load = useCallback(async () => {
    try {
      const [bookingsData, roomsData] = await Promise.all([
        getAllBookings(),
        roomsApi.get<Room[]>("/rooms").then((r) => r.data),
      ]);

      const windowSet = new Set(dateWindow);
      const relevant = bookingsData.filter(
        (b: Booking) =>
          windowSet.has(b.booking_date) && b.status !== "CANCELLED",
      );

      const enrichedData = await Promise.all(
        relevant.map(async (b: Booking) => {
          try {
            const [attendees, orders] = await Promise.all([
              getAttendees(b.id),
              getOrdersByBooking(b.id),
            ]);
          
            return {
              booking: b,
              attendees,
              room: (roomsData as Room[]).find((r) => r.id === b.room_id),
              hasPreOrders: orders.some((o: any) => !o.fired_at),
            };
          } catch {
            return {
              booking: b,
              attendees: [],
              room: (roomsData as Room[]).find((r) => r.id === b.room_id),
              hasPreOrders: false,
            };
          }
        }),
      );

      setEnriched(enrichedData);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("UpcomingPage load failed", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = setInterval(load, 120_000);
    return () => clearInterval(interval);
  }, [load]);

  const totalCovers = enriched
    .filter((e) => !["CANCELLED", "DRAFT"].includes(e.booking.status))
    .reduce((sum, e) => sum + e.booking.party_size, 0);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <div className="upcoming-spinner" />
        <span
          style={{
            fontSize: "13px",
            color: "#9b948b",
            fontFamily: "var(--font-body)",
          }}
        >
          Loading upcoming bookings…
        </span>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes upcoming-fade-up {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes upcoming-spin {
          to { transform: rotate(360deg); }
        }
        .upcoming-day {
          animation: upcoming-fade-up 0.4s ease both;
        }
        .upcoming-spinner {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          border: 2px solid #e8e4de;
          border-top-color: #18181b;
          animation: upcoming-spin 0.8s linear infinite;
        }
      `}</style>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "32px",
          maxWidth: "780px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "10px",
                fontWeight: 800,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--accent, #a38a64)",
                marginBottom: "6px",
                fontFamily: "var(--font-body)",
              }}
            >
              Read-only · Next 4 Days
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: "32px",
                fontWeight: 500,
                fontFamily: "var(--font-display)",
                color: "#18181b",
                letterSpacing: "-0.02em",
                lineHeight: 1,
              }}
            >
              Upcoming
            </h2>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", gap: "8px" }}>
              <div
                style={{
                  padding: "8px 14px",
                  borderRadius: "12px",
                  background: "rgba(248,245,241,0.9)",
                  border: "1px solid rgba(228,222,214,0.8)",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: 700,
                    color: "#18181b",
                    fontFamily: "var(--font-display)",
                    lineHeight: 1,
                  }}
                >
                  {enriched.length}
                </div>
                <div
                  style={{
                    fontSize: "9px",
                    fontWeight: 700,
                    color: "#9b948b",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginTop: "4px",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  Bookings
                </div>
              </div>
              <div
                style={{
                  padding: "8px 14px",
                  borderRadius: "12px",
                  background: "rgba(248,245,241,0.9)",
                  border: "1px solid rgba(228,222,214,0.8)",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: 700,
                    color: "#18181b",
                    fontFamily: "var(--font-display)",
                    lineHeight: 1,
                  }}
                >
                  {totalCovers}
                </div>
                <div
                  style={{
                    fontSize: "9px",
                    fontWeight: 700,
                    color: "#9b948b",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginTop: "4px",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  Covers
                </div>
              </div>
            </div>

            <span
              style={{
                fontSize: "11px",
                color: "#9b948b",
                fontFamily: "var(--font-body)",
              }}
            >
              Updated{" "}
              {lastRefresh.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        {/* Day sections */}
        {dateWindow.map((dateStr, i) => {
          const dayBookings = enriched.filter(
            (e) => e.booking.booking_date === dateStr,
          );
          return (
            <DaySection
              key={dateStr}
              dateStr={dateStr}
              bookings={dayBookings}
              index={i}
            />
          );
        })}
      </div>
    </>
  );
}
