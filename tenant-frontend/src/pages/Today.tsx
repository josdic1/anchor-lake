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

function getMealPeriod(): string {
  const h = new Date().getHours();
  if (h < 15) return "LUNCH";
  if (h < 19) return "DINNER";
  return "AFTERHOURS";
}

const MEAL_LABELS: Record<string, string> = {
  LUNCH: "Lunch",
  DINNER: "Dinner",
  AFTERHOURS: "After Hours",
  SPECIAL_EVENT: "Special Event",
};

const STATUS_DOT: Record<string, string> = {
  CONFIRMED: "#3b82f6",
  SEATED: "#22c55e",
  SERVICE: "#f59e0b",
  COMPLETED: "#a1a1aa",
  CANCELLED: "#ef4444",
  DRAFT: "#d4d4d8",
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

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: "9px",
        fontWeight: 800,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "var(--accent, #a38a64)",
        marginBottom: "6px",
        fontFamily: "var(--font-body)",
      }}
    >
      {children}
    </div>
  );
}

function Card({
  children,
  style,
  className,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        background: "rgba(255,255,255,0.97)",
        border: "1px solid rgba(228,222,214,0.9)",
        borderRadius: "20px",
        padding: "22px 24px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.03)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function StatPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "14px 20px",
        background: accent ? `${accent}12` : "rgba(248,245,241,0.9)",
        border: `1px solid ${accent ? `${accent}30` : "rgba(228,222,214,0.8)"}`,
        borderRadius: "14px",
        minWidth: "80px",
      }}
    >
      <span
        style={{
          fontSize: "28px",
          fontWeight: 700,
          color: accent ?? "#18181b",
          lineHeight: 1,
          fontFamily: "var(--font-display)",
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: "10px",
          fontWeight: 700,
          color: accent ?? "#9b948b",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginTop: "5px",
          fontFamily: "var(--font-body)",
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
  accent,
  selected,
  onClick,
}: {
  label: string;
  value: string | number;
  accent?: string;
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
        background: selected
          ? (accent ?? "#18181b")
          : accent
            ? `${accent}12`
            : "rgba(248,245,241,0.9)",
        border: selected
          ? `1.5px solid ${accent ?? "#18181b"}`
          : `1px solid ${accent ? `${accent}30` : "rgba(228,222,214,0.8)"}`,
        borderRadius: "14px",
        minWidth: "80px",
        cursor: "pointer",
        transition: "all 0.15s ease",
        outline: "none",
        boxShadow: selected ? "0 4px 14px rgba(0,0,0,0.12)" : "none",
      }}
    >
      <span
        style={{
          fontSize: "28px",
          fontWeight: 700,
          color: selected ? "white" : (accent ?? "#18181b"),
          lineHeight: 1,
          fontFamily: "var(--font-display)",
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: "10px",
          fontWeight: 700,
          color: selected ? "rgba(255,255,255,0.85)" : (accent ?? "#9b948b"),
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginTop: "5px",
          fontFamily: "var(--font-body)",
        }}
      >
        {label}
      </span>
    </button>
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
          color: "#18181b",
        }}
      >
        {children}
      </div>
      {href && linkLabel && (
        <a
          href={href}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 18px",
            borderRadius: "999px",
            background: "#18181b",
            color: "white",
            fontSize: "12px",
            fontWeight: 600,
            fontFamily: "var(--font-body)",
            letterSpacing: "0.04em",
            textDecoration: "none",
            boxShadow: "0 2px 8px rgba(0,0,0,0.14)",
          }}
        >
          {linkLabel}
        </a>
      )}
    </div>
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
          fontSize: "14px",
          color: "#9b948b",
          fontStyle: "italic",
        }}
      >
        No bookings for this filter
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {sorted.map((e) => {
        const { booking, attendees, room } = e;
        const dot = STATUS_DOT[booking.status] ?? "#d4d4d8";

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
        const isUpcoming = booking.status === "CONFIRMED";

        return (
          <div
            key={booking.id}
            style={{
              display: "grid",
              gridTemplateColumns: "60px 8px 1fr",
              gap: "0 14px",
              alignItems: "start",
              opacity: ["COMPLETED", "CANCELLED"].includes(booking.status)
                ? 0.4
                : 1,
            }}
          >
            <div
              style={{
                textAlign: "right",
                paddingTop: "10px",
                fontSize: "13px",
                fontWeight: 600,
                color: isCurrent ? "#18181b" : "#7a746c",
                fontFamily: "var(--font-body)",
                letterSpacing: "-0.01em",
              }}
            >
              {fmt(booking.estimated_arrival)}
            </div>

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
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: dot,
                  flexShrink: 0,
                  boxShadow: isCurrent ? `0 0 0 3px ${dot}30` : "none",
                }}
              />
            </div>

            <div
              style={{
                background: isCurrent
                  ? "rgba(255,255,255,0.98)"
                  : "rgba(250,248,245,0.7)",
                border: `1px solid ${isCurrent ? "rgba(220,213,204,0.9)" : "rgba(232,227,220,0.6)"}`,
                borderRadius: "14px",
                padding: "10px 14px",
                marginBottom: "6px",
              }}
            >
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#18181b",
                  fontFamily: "var(--font-display)",
                  marginBottom: "2px",
                  lineHeight: 1.2,
                }}
              >
                {memberName}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#7a746c",
                  fontFamily: "var(--font-body)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  flexWrap: "wrap",
                  marginBottom: "2px",
                }}
              >
                <span style={{ fontWeight: 600, color: "#5a544d" }}>
                  {room?.name ?? `Room ${booking.room_id}`}
                </span>
                <span style={{ color: "#ccc" }}>·</span>
                <span style={{ color: "#b0a89e" }}>#{booking.id}</span>
                <span style={{ color: "#ccc" }}>·</span>
                <span>
                  {booking.party_size} guest
                  {booking.party_size !== 1 ? "s" : ""}
                </span>
                <span style={{ color: "#ccc" }}>·</span>
                <span>
                  {MEAL_LABELS[booking.meal_type] ?? booking.meal_type}
                </span>
                {isUpcoming && (
                  <>
                    <span style={{ color: "#ccc" }}>·</span>
                    <span style={{ color: "#3b82f6", fontWeight: 600 }}>
                      Arriving
                    </span>
                  </>
                )}
                {booking.status === "SEATED" && (
                  <>
                    <span style={{ color: "#ccc" }}>·</span>
                    <span style={{ color: "#22c55e", fontWeight: 600 }}>
                      Seated
                    </span>
                  </>
                )}
                {booking.status === "SERVICE" && (
                  <>
                    <span style={{ color: "#ccc" }}>·</span>
                    <span style={{ color: "#f59e0b", fontWeight: 600 }}>
                      In Service
                    </span>
                  </>
                )}
              </div>

              {dietary.length > 0 && (
                <div
                  style={{
                    marginTop: "8px",
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

              {booking.notes && (
                <div
                  style={{
                    marginTop: "7px",
                    fontSize: "12px",
                    color: "#7a746c",
                    fontStyle: "italic",
                    fontFamily: "var(--font-body)",
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
        gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
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
              background: isEmpty
                ? "rgba(248,245,241,0.6)"
                : "rgba(255,255,255,0.97)",
              border: `1px solid ${isEmpty ? "rgba(228,222,214,0.5)" : "rgba(220,213,204,0.9)"}`,
              borderRadius: "14px",
              opacity: isEmpty ? 0.6 : 1,
            }}
          >
            <div
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "#18181b",
                fontFamily: "var(--font-display)",
                marginBottom: "8px",
              }}
            >
              {room.name}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "#9b948b",
                fontFamily: "var(--font-body)",
                marginBottom: "8px",
              }}
            >
              {isEmpty ? "Available" : `${seated} / ${room.capacity} seated`}
            </div>
            <div
              style={{
                height: "5px",
                background: "rgba(228,222,214,0.8)",
                borderRadius: "999px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${pct}%`,
                  background:
                    pct > 80 ? "#ef4444" : pct > 50 ? "#f59e0b" : "#22c55e",
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
          color: "#9b948b",
          fontStyle: "italic",
          padding: "8px 0",
        }}
      >
        No dietary restrictions today
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {entries.map(([flag, names]) => (
        <div
          key={flag}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 14px",
            background: "rgba(254,243,199,0.5)",
            border: "1px solid rgba(245,196,83,0.35)",
            borderRadius: "12px",
            gap: "16px",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "#78350f",
              fontFamily: "var(--font-body)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              flexShrink: 0,
            }}
          >
            {flag}
          </div>
          <div
            style={{
              fontSize: "12px",
              color: "#92400e",
              fontFamily: "var(--font-body)",
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
          color: "#9b948b",
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
            padding: "9px 14px",
            background: "rgba(248,245,241,0.8)",
            border: "1px solid rgba(228,222,214,0.7)",
            borderRadius: "12px",
          }}
        >
          <span
            style={{
              fontSize: "13px",
              color: "#2b2824",
              fontFamily: "var(--font-body)",
              fontWeight: 500,
            }}
          >
            {item.name}
          </span>
          <span
            style={{
              fontSize: "14px",
              fontWeight: 800,
              color: "#18181b",
              fontFamily: "var(--font-display)",
              background: "rgba(255,255,255,0.9)",
              border: "1px solid rgba(220,213,204,0.8)",
              borderRadius: "8px",
              padding: "2px 10px",
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
    const meal = e.booking.meal_type;
    byMeal[meal] = (byMeal[meal] ?? 0) + e.booking.party_size;
  }

  const entries = Object.entries(byMeal);
  if (entries.length === 0) {
    return (
      <div style={{ fontSize: "13px", color: "#9b948b", fontStyle: "italic" }}>
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
            padding: "12px 18px",
            background: "rgba(248,245,241,0.8)",
            border: "1px solid rgba(228,222,214,0.7)",
            borderRadius: "14px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "26px",
              fontWeight: 700,
              color: "#18181b",
              fontFamily: "var(--font-display)",
              lineHeight: 1,
            }}
          >
            {count}
          </div>
          <div
            style={{
              fontSize: "10px",
              fontWeight: 700,
              color: "#9b948b",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginTop: "4px",
              fontFamily: "var(--font-body)",
            }}
          >
            {MEAL_LABELS[meal] ?? meal}
          </div>
        </div>
      ))}
    </div>
  );
}

function LiveDot() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        fontSize: "10px",
        fontWeight: 700,
        color: "#22c55e",
        fontFamily: "var(--font-body)",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
      }}
    >
      <span
        style={{
          width: "7px",
          height: "7px",
          borderRadius: "50%",
          background: "#22c55e",
          display: "inline-block",
          animation: "today-pulse 2s infinite",
        }}
      />
      Live
    </span>
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
  const currentPeriod = getMealPeriod();
  const preOrderEnriched = enriched.filter((e) =>
    e.orders.some((o) => !o.fired_at),
  );

  const filteredEnriched = enriched.filter((e) => {
    if (timelineFilter === "active")
      return ["SEATED", "SERVICE"].includes(e.booking.status);
    if (timelineFilter === "arriving") return e.booking.status === "CONFIRMED";
    return true;
  });

  if (loading) {
    return (
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
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            border: "2px solid #e8e4de",
            borderTopColor: "#18181b",
            animation: "today-spin 0.8s linear infinite",
          }}
        />
        <span
          style={{
            fontSize: "13px",
            color: "#9b948b",
            fontFamily: "var(--font-body)",
          }}
        >
          Loading today's service…
        </span>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes today-spin { to { transform: rotate(360deg); } }
        @keyframes today-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        @keyframes today-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .today-section { animation: today-fade-up 0.4s ease both; }
        .today-section:nth-child(1) { animation-delay: 0.05s; }
        .today-section:nth-child(2) { animation-delay: 0.10s; }
        .today-section:nth-child(3) { animation-delay: 0.15s; }
        .today-section:nth-child(4) { animation-delay: 0.20s; }
        .today-section:nth-child(5) { animation-delay: 0.25s; }
      `}</style>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          maxWidth: "900px",
        }}
      >
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
                fontWeight: 800,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--accent, #a38a64)",
                marginBottom: "6px",
                fontFamily: "var(--font-body)",
              }}
            >
              {isKitchen ? "Kitchen" : isWait ? "Front of House" : "Service"} ·
              Daily Sheet
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
              {getDayLabel()}
            </h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <LiveDot />
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

        <div
          className="today-section"
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            alignItems: "stretch",
          }}
        >
          <StatPill label="Covers" value={totalCovers} />
          <StatPill label="Bookings" value={enriched.length} />
          <FilterPill
            label="Active"
            value={active.length}
            accent="#22c55e"
            selected={timelineFilter === "active"}
            onClick={() => setTimelineFilter("active")}
          />
          <FilterPill
            label="Arriving"
            value={upcoming.length}
            accent="#3b82f6"
            selected={timelineFilter === "arriving"}
            onClick={() => setTimelineFilter("arriving")}
          />
          <FilterPill
            label="All"
            value={enriched.length}
            selected={timelineFilter === "all"}
            onClick={() => setTimelineFilter("all")}
          />
          <StatPill
            label={MEAL_LABELS[currentPeriod] ?? "Period"}
            value={
              currentPeriod === "LUNCH"
                ? "🍽"
                : currentPeriod === "DINNER"
                  ? "🌙"
                  : "🍸"
            }
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

        {isAdmin && (
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

        {isManager && (
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
