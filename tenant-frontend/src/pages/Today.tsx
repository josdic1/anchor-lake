import { useEffect, useState, useCallback } from "react";
import { getAllBookings, getAttendees } from "../api/bookings";
import { getOrdersByBooking, getOrderItems } from "../api/orders";
import { getActiveMenuItems } from "../api/menu";
import { roomsApi } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import type { Booking, Attendee, Room } from "../types/booking";
import type { Order, OrderItem } from "../api/orders";
import type { MenuItem } from "../api/menu";
import { DemoPanel } from "../components/shared/DemoPanel";

interface EnrichedBooking {
  booking: Booking;
  attendees: Attendee[];
  orders: Order[];
  orderItems: Record<number, OrderItem[]>;
  room: Room | undefined;
}

type TimelineFilter = "active" | "arriving" | "all";

function fmt(t?: string | null) {
  if (!t) return "—";
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getDayLabel() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

const MEAL_LABELS: Record<string, string> = {
  LUNCH: "Lunch",
  DINNER: "Dinner",
  AFTERHOURS: "After Hours",
  SPECIAL_EVENT: "Special Event",
};

const STATUS_COLORS: Record<
  string,
  { dot: string; label: string; color: string }
> = {
  CONFIRMED: {
    dot: "var(--zinc-300)",
    label: "Arriving",
    color: "var(--zinc-500)",
  },
  SEATED: { dot: "var(--zinc-500)", label: "Seated", color: "var(--zinc-600)" },
  SERVICE: {
    dot: "var(--accent)",
    label: "In Service",
    color: "var(--accent)",
  },
  COMPLETED: {
    dot: "var(--zinc-200)",
    label: "Completed",
    color: "var(--zinc-400)",
  },
  CANCELLED: {
    dot: "var(--zinc-200)",
    label: "Cancelled",
    color: "var(--zinc-400)",
  },
  DRAFT: { dot: "var(--zinc-200)", label: "Draft", color: "var(--zinc-300)" },
};

function collectDietary(enriched: EnrichedBooking[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const e of enriched) {
    for (const a of e.attendees) {
      const name =
        `${a.guest_first_name ?? ""} ${a.guest_last_name ?? ""}`.trim() ||
        `Member #${a.linked_member_id}`;
      for (const flag of a.dietary_flags ?? []) {
        const label =
          flag === "OTHER" && a.dietary_other_note
            ? a.dietary_other_note
            : flag.replace(/_/g, " ");
        if (!map[label]) map[label] = [];
        if (!map[label].includes(name)) map[label].push(name);
      }
    }
  }
  return map;
}

function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--zinc-200)",
        borderRadius: "var(--radius-lg)",
        padding: "24px 28px",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {children}
    </div>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: "10px",
        fontWeight: 600,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "var(--accent)",
        marginBottom: "4px",
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({
  children,
  href,
  linkLabel,
}: {
  children: React.ReactNode;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "16px",
      }}
    >
      <div
        style={{
          fontSize: "18px",
          fontWeight: 500,
          fontFamily: "var(--font-display)",
          color: "var(--zinc-900)",
        }}
      >
        {children}
      </div>
      {href && linkLabel && (
        <a
          href={href}
          style={{
            padding: "6px 16px",
            borderRadius: "var(--radius-sm)",
            background: "var(--zinc-900)",
            color: "var(--bg-surface)",
            fontSize: "12px",
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          {linkLabel}
        </a>
      )}
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "14px 20px",
        minWidth: "80px",
      }}
    >
      <span
        style={{
          fontSize: "26px",
          fontWeight: 600,
          color: "var(--zinc-900)",
          lineHeight: 1,
          fontFamily: "var(--font-display)",
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: "10px",
          fontWeight: 600,
          color: "var(--zinc-400)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginTop: "5px",
        }}
      >
        {label}
      </span>
    </div>
  );
}

function FilterPill({
  label,
  value,
  selected,
  onClick,
}: {
  label: string;
  value: string | number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "14px 20px",
        background: selected ? "var(--zinc-900)" : "var(--bg-surface)",
        border: `1.5px solid ${selected ? "var(--zinc-900)" : "var(--zinc-200)"}`,
        borderRadius: "var(--radius-md)",
        minWidth: "80px",
        cursor: "pointer",
        transition: "all 0.15s ease",
        outline: "none",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <span
        style={{
          fontSize: "26px",
          fontWeight: 600,
          color: selected ? "var(--bg-surface)" : "var(--zinc-900)",
          lineHeight: 1,
          fontFamily: "var(--font-display)",
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: "10px",
          fontWeight: 600,
          color: selected ? "rgba(255,255,255,0.7)" : "var(--zinc-400)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginTop: "5px",
        }}
      >
        {label}
      </span>
    </button>
  );
}

function BookingTimeline({ enriched }: { enriched: EnrichedBooking[] }) {
  const sorted = [...enriched].sort((a, b) =>
    (a.booking.estimated_arrival ?? "").localeCompare(
      b.booking.estimated_arrival ?? "",
    ),
  );

  if (sorted.length === 0) {
    return (
      <div
        style={{
          padding: "32px",
          textAlign: "center",
          fontSize: "13px",
          color: "var(--zinc-400)",
          fontStyle: "italic",
        }}
      >
        No bookings for this filter
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {sorted.map((e) => {
        const { booking, attendees, room } = e;
        const sc = STATUS_COLORS[booking.status] ?? STATUS_COLORS.DRAFT;
        const primary =
          attendees.find((a) => a.linked_member_id && !a.is_member_guest) ??
          attendees[0];
        const memberName = primary
          ? `${primary.guest_first_name ?? ""} ${primary.guest_last_name ?? ""}`.trim() ||
            "—"
          : "—";
        const dietary = attendees
          .flatMap((a) =>
            (a.dietary_flags ?? []).map((f) =>
              f === "OTHER" && a.dietary_other_note
                ? a.dietary_other_note
                : f.replace(/_/g, " "),
            ),
          )
          .filter((v, i, arr) => arr.indexOf(v) === i);
        const isCurrent = ["SEATED", "SERVICE"].includes(booking.status);
        const isGone = ["COMPLETED", "CANCELLED"].includes(booking.status);

        return (
          <div
            key={booking.id}
            style={{
              display: "grid",
              gridTemplateColumns: "56px 6px 1fr",
              gap: "0 12px",
              alignItems: "start",
              opacity: isGone ? 0.3 : 1,
            }}
          >
            {/* Time */}
            <div
              style={{
                textAlign: "right",
                paddingTop: "10px",
                fontSize: "11px",
                fontWeight: 500,
                color: "var(--zinc-400)",
                letterSpacing: "0.01em",
                fontVariantNumeric: "tabular-nums",
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
                paddingTop: "12px",
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: sc.dot,
                  flexShrink: 0,
                }}
              />
            </div>

            {/* Card */}
            <div
              style={{
                background: isCurrent ? "var(--bg-surface)" : "var(--zinc-50)",
                border: "1px solid var(--zinc-200)",
                borderRadius: "var(--radius-md)",
                padding: "9px 13px",
                marginBottom: "2px",
              }}
            >
              {/* Name + status on one line */}
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--zinc-900)",
                  }}
                >
                  {memberName}
                </span>
                {booking.status !== "DRAFT" && (
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: sc.color,
                      flexShrink: 0,
                    }}
                  >
                    {sc.label}
                  </span>
                )}
              </div>
              {/* Meta line — one font, one size, one weight */}
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--zinc-400)",
                  marginTop: "2px",
                }}
              >
                {room?.name ?? `Room ${booking.room_id}`} · #{booking.id} ·{" "}
                {booking.party_size} guest{booking.party_size !== 1 ? "s" : ""}{" "}
                · {MEAL_LABELS[booking.meal_type] ?? booking.meal_type}
              </div>

              {dietary.length > 0 && (
                <div
                  style={{
                    marginTop: "6px",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "4px",
                  }}
                >
                  {dietary.map((d) => (
                    <span
                      key={d}
                      style={{
                        fontSize: "10px",
                        fontWeight: 600,
                        padding: "1px 7px",
                        borderRadius: "var(--radius-sm)",
                        background: "var(--zinc-100)",
                        color: "var(--zinc-600)",
                        border: "1px solid var(--zinc-200)",
                      }}
                    >
                      {d}
                    </span>
                  ))}
                </div>
              )}

              {booking.notes && (
                <div
                  style={{
                    marginTop: "5px",
                    fontSize: "11px",
                    color: "var(--zinc-400)",
                    fontStyle: "italic",
                  }}
                >
                  "{booking.notes}"
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RoomStatus({
  enriched,
  rooms,
}: {
  enriched: EnrichedBooking[];
  rooms: Room[];
}) {
  const activeRooms = rooms.filter((r) => r.is_active);
  const byRoom: Record<number, EnrichedBooking[]> = {};
  enriched.forEach((e) => {
    const id = e.booking.room_id;
    if (!byRoom[id]) byRoom[id] = [];
    byRoom[id].push(e);
  });

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
        gap: "10px",
      }}
    >
      {activeRooms.map((room) => {
        const roomBookings = byRoom[room.id] ?? [];
        const active = roomBookings.filter((e) =>
          ["SEATED", "SERVICE"].includes(e.booking.status),
        );
        const seated = active.reduce((sum, e) => sum + e.booking.party_size, 0);
        const pct =
          room.capacity > 0 ? Math.min(100, (seated / room.capacity) * 100) : 0;
        const isEmpty = active.length === 0;
        return (
          <div
            key={room.id}
            style={{
              padding: "14px 16px",
              background: "var(--bg-surface)",
              border: "1px solid var(--zinc-200)",
              borderRadius: "var(--radius-md)",
              opacity: isEmpty ? 0.5 : 1,
            }}
          >
            <div
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--zinc-800)",
                marginBottom: "5px",
              }}
            >
              {room.name}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--zinc-400)",
                marginBottom: "8px",
              }}
            >
              {isEmpty ? "Available" : `${seated} / ${room.capacity} seated`}
            </div>
            <div
              style={{
                height: "3px",
                background: "var(--zinc-200)",
                borderRadius: "999px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${pct}%`,
                  background: pct > 80 ? "var(--error)" : "var(--accent)",
                  borderRadius: "999px",
                  transition: "width 0.4s ease",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DietarySummary({ enriched }: { enriched: EnrichedBooking[] }) {
  const dietary = collectDietary(enriched);
  const entries = Object.entries(dietary);
  if (entries.length === 0) {
    return (
      <div
        style={{
          fontSize: "13px",
          color: "var(--zinc-400)",
          fontStyle: "italic",
          padding: "8px 0",
        }}
      >
        No dietary restrictions today
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {entries.map(([flag, names]) => (
        <div
          key={flag}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "9px 13px",
            background: "var(--zinc-50)",
            border: "1px solid var(--zinc-200)",
            borderRadius: "var(--radius-md)",
            gap: "16px",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--zinc-700)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              flexShrink: 0,
            }}
          >
            {flag}
          </div>
          <div
            style={{
              fontSize: "12px",
              color: "var(--zinc-500)",
              textAlign: "right",
              lineHeight: 1.5,
            }}
          >
            {names.join(", ")}
          </div>
        </div>
      ))}
    </div>
  );
}

function PreOrders({
  enriched,
  menuMap,
}: {
  enriched: EnrichedBooking[];
  menuMap: Record<number, string>;
}) {
  const itemMap: Record<string, number> = {};
  for (const e of enriched) {
    for (const order of e.orders) {
      const items = e.orderItems[order.id] ?? [];
      for (const item of items) {
        const name = menuMap[item.menu_item_id] ?? `Item #${item.menu_item_id}`;
        itemMap[name] = (itemMap[name] ?? 0) + item.quantity;
      }
    }
  }
  const allItems = Object.entries(itemMap)
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty);
  if (allItems.length === 0) {
    return (
      <div
        style={{
          fontSize: "13px",
          color: "var(--zinc-400)",
          fontStyle: "italic",
          padding: "8px 0",
        }}
      >
        No pre-orders yet
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {allItems.map((item) => (
        <div
          key={item.name}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "9px 13px",
            background: "var(--zinc-50)",
            border: "1px solid var(--zinc-200)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <span
            style={{
              fontSize: "13px",
              color: "var(--zinc-700)",
              fontWeight: 500,
            }}
          >
            {item.name}
          </span>
          <span
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "var(--zinc-900)",
              background: "var(--bg-surface)",
              border: "1px solid var(--zinc-200)",
              borderRadius: "var(--radius-sm)",
              padding: "1px 10px",
              minWidth: "32px",
              textAlign: "center",
            }}
          >
            {item.qty}
          </span>
        </div>
      ))}
    </div>
  );
}

function CoverBreakdown({ enriched }: { enriched: EnrichedBooking[] }) {
  const byMeal: Record<string, number> = {};
  for (const e of enriched) {
    if (["CANCELLED", "DRAFT"].includes(e.booking.status)) continue;
    byMeal[e.booking.meal_type] =
      (byMeal[e.booking.meal_type] ?? 0) + e.booking.party_size;
  }
  const entries = Object.entries(byMeal);
  if (entries.length === 0) {
    return (
      <div
        style={{
          fontSize: "13px",
          color: "var(--zinc-400)",
          fontStyle: "italic",
        }}
      >
        No covers today
      </div>
    );
  }
  return (
    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
      {entries.map(([meal, count]) => (
        <div
          key={meal}
          style={{
            padding: "12px 20px",
            background: "var(--zinc-50)",
            border: "1px solid var(--zinc-200)",
            borderRadius: "var(--radius-md)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "26px",
              fontWeight: 600,
              color: "var(--zinc-900)",
              fontFamily: "var(--font-display)",
              lineHeight: 1,
            }}
          >
            {count}
          </div>
          <div
            style={{
              fontSize: "10px",
              fontWeight: 600,
              color: "var(--zinc-400)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginTop: "4px",
            }}
          >
            {MEAL_LABELS[meal] ?? meal}
          </div>
        </div>
      ))}
    </div>
  );
}

export function TodayPage() {
  const { user } = useAuth();
  const [enriched, setEnriched] = useState<EnrichedBooking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [menuMap, setMenuMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("all");

  const isKitchen = user?.sub_role === "kitchen";
  const isWait =
    user?.sub_role === "wait" || (!user?.sub_role && user?.role === "staff");
  const isAdmin = user?.role === "admin";
  const isManager = user?.sub_role === "manager";

  const load = useCallback(async () => {
    try {
      const today = getToday();
      const [bookingsData, roomsData, menuItems] = await Promise.all([
        getAllBookings(),
        roomsApi.get<Room[]>("/rooms").then((r) => r.data),
        getActiveMenuItems(),
      ]);
      const mmap: Record<number, string> = {};
      menuItems.forEach((m: MenuItem) => {
        mmap[m.id] = m.name;
      });
      setMenuMap(mmap);
      setRooms(roomsData.filter((r: Room) => r.is_active));
      const todayBookings = bookingsData.filter(
        (b: Booking) =>
          b.booking_date === today && !["CANCELLED"].includes(b.status),
      );
      const enrichedData = await Promise.all(
        todayBookings.map(async (b: Booking) => {
          const [attendees, orders] = await Promise.allSettled([
            getAttendees(b.id),
            getOrdersByBooking(b.id),
          ]);
          const resolvedOrders =
            orders.status === "fulfilled" ? orders.value : [];
          const orderItems: Record<number, OrderItem[]> = {};
          await Promise.all(
            resolvedOrders
              .filter((o: Order) => !o.fired_at)
              .map(async (o: Order) => {
                try {
                  orderItems[o.id] = await getOrderItems(o.id);
                } catch {
                  orderItems[o.id] = [];
                }
              }),
          );
          return {
            booking: b,
            attendees: attendees.status === "fulfilled" ? attendees.value : [],
            orders: resolvedOrders,
            orderItems,
            room: roomsData.find((r: Room) => r.id === b.room_id),
          };
        }),
      );
      setEnriched(enrichedData);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("TodayPage load failed", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [load]);

  const today = getToday();
  const active = enriched.filter((e) =>
    ["SEATED", "SERVICE"].includes(e.booking.status),
  );
  const upcoming = enriched.filter((e) => e.booking.status === "CONFIRMED");
  const totalCovers = enriched
    .filter((e) => !["CANCELLED", "DRAFT"].includes(e.booking.status))
    .reduce((sum, e) => sum + e.booking.party_size, 0);
  const preOrderEnriched = enriched.filter((e) =>
    e.orders.some((o) => !o.fired_at),
  );
  const filteredEnriched = enriched.filter((e) => {
    if (timelineFilter === "active")
      return ["SEATED", "SERVICE"].includes(e.booking.status);
    if (timelineFilter === "arriving") return e.booking.status === "CONFIRMED";
    return true;
  });
  const roleLabel = isKitchen
    ? "Kitchen"
    : isWait
      ? "Front of House"
      : "Service";

  if (loading) {
    return (
      <>
        <style>{`@keyframes today-spin { to { transform: rotate(360deg); } }`}</style>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "60vh",
            gap: "12px",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              width: "22px",
              height: "22px",
              borderRadius: "50%",
              border: "2px solid var(--zinc-200)",
              borderTopColor: "var(--zinc-700)",
              animation: "today-spin 0.8s linear infinite",
            }}
          />
          <span style={{ fontSize: "13px", color: "var(--zinc-400)" }}>
            Loading today's service…
          </span>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        @keyframes today-spin { to { transform: rotate(360deg); } }
        @keyframes today-fade-up { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .today-section { animation: today-fade-up 0.3s ease both; }
        .today-section:nth-child(1) { animation-delay: 0.04s; }
        .today-section:nth-child(2) { animation-delay: 0.08s; }
        .today-section:nth-child(3) { animation-delay: 0.12s; }
        .today-section:nth-child(4) { animation-delay: 0.16s; }
        .today-section:nth-child(5) { animation-delay: 0.20s; }
      `}</style>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          maxWidth: "900px",
        }}
      >
        {/* Header */}
        <div
          className="today-section"
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
                fontWeight: 600,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--accent)",
                marginBottom: "6px",
              }}
            >
              {roleLabel} · Daily Sheet
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: "30px",
                fontWeight: 500,
                fontFamily: "var(--font-display)",
                color: "var(--zinc-900)",
                letterSpacing: "-0.02em",
                lineHeight: 1,
              }}
            >
              {getDayLabel()}
            </h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "var(--success)",
                display: "inline-block",
              }}
            />
            <span
              style={{
                fontSize: "10px",
                fontWeight: 600,
                color: "var(--success)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Live
            </span>
            <span
              style={{
                fontSize: "11px",
                color: "var(--zinc-400)",
                marginLeft: "4px",
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

        {/* Stats + filters */}
        <div
          className="today-section"
          style={{
            display: "flex",
            gap: "4px",
            flexWrap: "wrap",
            alignItems: "stretch",
            borderBottom: "1px solid var(--zinc-200)",
            paddingBottom: "16px",
          }}
        >
          <StatPill label="Covers" value={totalCovers} />
          <StatPill label="Bookings" value={enriched.length} />
          <div
            style={{
              width: "1px",
              background: "var(--zinc-200)",
              margin: "8px 10px",
            }}
          />
          <FilterPill
            label="Active"
            value={active.length}
            selected={timelineFilter === "active"}
            onClick={() => setTimelineFilter("active")}
          />
          <FilterPill
            label="Arriving"
            value={upcoming.length}
            selected={timelineFilter === "arriving"}
            onClick={() => setTimelineFilter("arriving")}
          />
          <FilterPill
            label="All"
            value={enriched.length}
            selected={timelineFilter === "all"}
            onClick={() => setTimelineFilter("all")}
          />
        </div>

        <DemoPanel />

        {isKitchen && !isAdmin && (
          <>
            <Card className="today-section">
              <Kicker>Dietary Restrictions · All Guests Today</Kicker>
              <SectionTitle>Dietary Flags</SectionTitle>
              <DietarySummary enriched={enriched} />
            </Card>
            <Card className="today-section">
              <Kicker>Covers by Service Period</Kicker>
              <SectionTitle>Today's Covers</SectionTitle>
              <CoverBreakdown enriched={enriched} />
            </Card>
            <Card className="today-section">
              <Kicker>Unfired Pre-orders</Kicker>
              <SectionTitle>Pre-orders</SectionTitle>
              <PreOrders enriched={preOrderEnriched} menuMap={menuMap} />
            </Card>
            <Card className="today-section">
              <Kicker>Booking Schedule</Kicker>
              <SectionTitle>Today's Timeline</SectionTitle>
              <BookingTimeline enriched={filteredEnriched} />
            </Card>
          </>
        )}

        {isWait && !isAdmin && (
          <>
            <Card className="today-section">
              <Kicker>Arrival Order · {today}</Kicker>
              <SectionTitle href="/floor" linkLabel="→ Floor">
                Today's Bookings
              </SectionTitle>
              <BookingTimeline enriched={filteredEnriched} />
            </Card>
            <Card className="today-section">
              <Kicker>Current Floor Status</Kicker>
              <SectionTitle>Rooms</SectionTitle>
              <RoomStatus enriched={active} rooms={rooms} />
            </Card>
            <Card className="today-section">
              <Kicker>Guest Dietary Needs</Kicker>
              <SectionTitle>Dietary Flags</SectionTitle>
              <DietarySummary enriched={enriched} />
            </Card>
          </>
        )}

        {(isAdmin || isManager) && (
          <>
            <Card className="today-section">
              <Kicker>Arrival Order · {today}</Kicker>
              <SectionTitle>Today's Bookings</SectionTitle>
              <BookingTimeline enriched={filteredEnriched} />
            </Card>
            <Card className="today-section">
              <Kicker>Current Floor Status</Kicker>
              <SectionTitle>Rooms</SectionTitle>
              <RoomStatus enriched={active} rooms={rooms} />
            </Card>
            <Card className="today-section">
              <Kicker>Dietary Restrictions · All Guests Today</Kicker>
              <SectionTitle>Dietary Flags</SectionTitle>
              <DietarySummary enriched={enriched} />
            </Card>
            <Card className="today-section">
              <Kicker>Unfired Pre-orders</Kicker>
              <SectionTitle>Pre-orders</SectionTitle>
              <PreOrders enriched={preOrderEnriched} menuMap={menuMap} />
            </Card>
          </>
        )}
      </div>
    </>
  );
}
