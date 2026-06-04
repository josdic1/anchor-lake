import { useEffect, useMemo, useState } from "react";
import {
  Users,
  Clock,
  Utensils,
  DoorOpen,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChefHat,
} from "lucide-react";
import { bookingsApi, roomsApi, ordersApi } from "../api/client";
import { getAttendees } from "../api/bookings";
import type { Booking, Room, Attendee } from "../types/booking";
import type { Order } from "../api/orders";

type DateFilter = "today" | "upcoming" | "past";

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  DRAFT: { bg: "#f3f4f6", color: "#6b7280" },
  CONFIRMED: { bg: "#dcfce7", color: "#166534" },
  SEATED: { bg: "#dbeafe", color: "#1e40af" },
  SERVICE: { bg: "#fef3c7", color: "#92400e" },
  COMPLETED: { bg: "#f5f5f5", color: "#444" },
  CANCELLED: { bg: "#fee2e2", color: "#991b1b" },
};

const KITCHEN_COLORS: Record<string, { bg: string; color: string }> = {
  INCOMING: { bg: "#f3f4f6", color: "#555" },
  IN_KITCHEN: { bg: "#fef3c7", color: "#92400e" },
  READY: { bg: "#dcfce7", color: "#166534" },
  SERVED: { bg: "#f5f5f5", color: "#888" },
};

const MEAL_LABELS: Record<string, string> = {
  LUNCH: "Lunch",
  DINNER: "Dinner",
  AFTERHOURS: "After Hours",
  SPECIAL_EVENT: "Special Event",
};

const FILTER_TABS: { key: DateFilter; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
];

type AttentionItem = {
  key: string;
  tone: "danger" | "warn" | "info" | "success";
  title: string;
  detail: string;
  count: number;
};

function minutesSince(iso?: string | null) {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - then) / 60000));
}

function minutesUntil(date: string, time?: string | null) {
  if (!time) return null;
  const target = new Date(`${date}T${time}`).getTime();
  const now = Date.now();
  return Math.floor((target - now) / 60000);
}

function formatClock(time?: string | null) {
  return time?.slice(0, 5) ?? "—";
}

function getMemberName(attendees: Attendee[]): string {
  if (!attendees.length) return "—";
  const first =
    attendees.find((a) => a.linked_member_id !== null) ?? attendees[0];
  return (
    `${first.guest_first_name ?? ""} ${first.guest_last_name ?? ""}`.trim() ||
    "—"
  );
}

function Badge({
  label,
  colors,
}: {
  label: string;
  colors: { bg: string; color: string };
}) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 9px",
        borderRadius: "999px",
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        background: colors.bg,
        color: colors.color,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function HeroStat({
  label,
  value,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  tone?: "neutral" | "blue" | "green" | "amber";
}) {
  const tones = {
    neutral: {
      iconBg: "rgba(24,24,27,0.06)",
      iconColor: "#3f3a34",
    },
    blue: {
      iconBg: "rgba(37,99,235,0.10)",
      iconColor: "#1d4ed8",
    },
    green: {
      iconBg: "rgba(22,163,74,0.10)",
      iconColor: "#15803d",
    },
    amber: {
      iconBg: "rgba(217,119,6,0.12)",
      iconColor: "#b45309",
    },
  }[tone];

  return (
    <div className="dash-hero-stat">
      <div
        className="dash-hero-stat__icon"
        style={{ background: tones.iconBg, color: tones.iconColor }}
      >
        <Icon size={18} />
      </div>
      <div>
        <div className="dash-hero-stat__value">{value}</div>
        <div className="dash-hero-stat__label">{label}</div>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  kicker,
  children,
  right,
}: {
  title: string;
  kicker?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="dash-section-card">
      <div className="dash-section-card__header">
        <div>
          {kicker && <div className="dash-section-card__kicker">{kicker}</div>}
          <h3 className="dash-section-card__title">{title}</h3>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

export function DashboardPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [roomMap, setRoomMap] = useState<Record<number, string>>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [attendeeMap, setAttendeeMap] = useState<Record<number, Attendee[]>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");

  async function load() {
    try {
      const [bookingsRes, roomsRes, incomingRes, inKitchenRes, readyRes] =
        await Promise.all([
          bookingsApi.get<Booking[]>("/bookings"),
          roomsApi.get<Room[]>("/rooms"),
          ordersApi.get<Order[]>("/kitchen/incoming"),
          ordersApi.get<Order[]>("/kitchen/in-kitchen"),
          ordersApi.get<Order[]>("/kitchen/ready"),
        ]);

      const allBookings = bookingsRes.data;
      setBookings(allBookings);
      setOrders([...incomingRes.data, ...inKitchenRes.data, ...readyRes.data]);
      setLastRefresh(new Date());

      const rmap: Record<number, string> = {};
      roomsRes.data.forEach((r: Room) => {
        rmap[r.id] = r.name;
      });
      setRoomMap(rmap);

      const entries = await Promise.all(
        allBookings
          .filter((b) => b.status !== "CANCELLED")
          .map(async (b) => {
            try {
              const attendees = await getAttendees(b.id);
              return [b.id, attendees] as [number, Attendee[]];
            } catch {
              return [b.id, []] as [number, Attendee[]];
            }
          }),
      );
      setAttendeeMap(Object.fromEntries(entries));
    } catch (err) {
      console.error("Dashboard load failed", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const today = new Date().toISOString().slice(0, 10);

  const filteredBookings = useMemo(() => {
    return bookings
      .filter((b) => b.status !== "CANCELLED")
      .filter((b) => {
        if (dateFilter === "today") return b.booking_date === today;
        if (dateFilter === "upcoming") return b.booking_date > today;
        if (dateFilter === "past") return b.booking_date < today;
        return true;
      });
  }, [bookings, dateFilter, today]);

  const activeOrders =
    dateFilter === "today"
      ? orders.filter((o) => o.kitchen_status !== "SERVED")
      : [];

  const seatedNow = filteredBookings.filter((b) => b.status === "SEATED");
  const serviceNow = filteredBookings.filter((b) => b.status === "SERVICE");
  const confirmedToday = filteredBookings.filter(
    (b) => b.status === "CONFIRMED",
  );
  const totalCovers = filteredBookings.reduce(
    (acc, b) => acc + b.party_size,
    0,
  );

  const sortedBookings = [...filteredBookings].sort((a, b) => {
    if (dateFilter === "past") {
      return (
        b.booking_date.localeCompare(a.booking_date) ||
        a.estimated_arrival.localeCompare(b.estimated_arrival)
      );
    }
    return (
      a.booking_date.localeCompare(b.booking_date) ||
      a.estimated_arrival.localeCompare(b.estimated_arrival)
    );
  });

  const nextArrivals =
    dateFilter !== "today"
      ? []
      : filteredBookings
          .filter((b) => b.status === "CONFIRMED")
          .map((b) => ({
            booking: b,
            minsUntil: minutesUntil(b.booking_date, b.estimated_arrival),
          }))
          .filter((x) => x.minsUntil !== null && (x.minsUntil as number) >= -10)
          .sort((a, b) => (a.minsUntil as number) - (b.minsUntil as number))
          .slice(0, 6);

  const readyOrders = activeOrders.filter((o) => o.kitchen_status === "READY");
  const incomingOrders = activeOrders.filter(
    (o) => o.kitchen_status === "INCOMING",
  );
  const inKitchenOrders = activeOrders.filter(
    (o) => o.kitchen_status === "IN_KITCHEN",
  );

  const staleService = serviceNow.filter((b) => {
    const mins = minutesSince(b.service_at ?? b.seated_at ?? null);
    return mins !== null && mins >= 90;
  });

  const staleSeated = seatedNow.filter((b) => {
    const mins = minutesSince(b.seated_at ?? null);
    const hasOrder = activeOrders.some((o) => o.booking_id === b.id);
    return mins !== null && mins >= 20 && !hasOrder;
  });

  const attentionItems: AttentionItem[] = [
    {
      key: "ready",
      tone: readyOrders.length > 0 ? "danger" : "success",
      title: "Ready orders waiting pickup",
      detail:
        readyOrders.length > 0
          ? "Food is ready now."
          : "Nothing waiting at pickup.",
      count: readyOrders.length,
    },
    {
      key: "soon",
      tone:
        nextArrivals.filter((x) => (x.minsUntil as number) <= 30).length > 0
          ? "warn"
          : "info",
      title: "Arrivals due soon",
      detail:
        nextArrivals.filter((x) => (x.minsUntil as number) <= 30).length > 0
          ? "Confirmed bookings arriving within 30 minutes."
          : "No near-term arrivals.",
      count: nextArrivals.filter((x) => (x.minsUntil as number) <= 30).length,
    },
    {
      key: "seated-no-order",
      tone: staleSeated.length > 0 ? "warn" : "success",
      title: "Seated tables with no order",
      detail:
        staleSeated.length > 0
          ? "Guests are seated but service has not started."
          : "No seated tables waiting on orders.",
      count: staleSeated.length,
    },
    {
      key: "stale-service",
      tone: staleService.length > 0 ? "danger" : "success",
      title: "Tables stuck in service",
      detail:
        staleService.length > 0
          ? "These tables have been in service for 90+ minutes."
          : "No tables look stuck in service.",
      count: staleService.length,
    },
  ];

  const floorSnapshot = Object.entries(
    filteredBookings.reduce(
      (acc, b) => {
        const room = roomMap[b.room_id] ?? `Room ${b.room_id}`;
        if (!acc[room]) {
          acc[room] = {
            room,
            covers: 0,
            seated: 0,
            service: 0,
            confirmed: 0,
          };
        }
        acc[room].covers += b.party_size;
        if (b.status === "SEATED") acc[room].seated += 1;
        if (b.status === "SERVICE") acc[room].service += 1;
        if (b.status === "CONFIRMED") acc[room].confirmed += 1;
        return acc;
      },
      {} as Record<
        string,
        {
          room: string;
          covers: number;
          seated: number;
          service: number;
          confirmed: number;
        }
      >,
    ),
  )
    .map(([, value]) => value)
    .sort((a, b) => b.covers - a.covers);

  if (loading) return <div className="table-state">Loading dashboard...</div>;

  return (
    <div className="fade-in dash-shell">
      <div className="dash-hero">
        <div>
          <div className="dash-hero__kicker">Operations Snapshot</div>
          <h2 className="dash-hero__title">Dashboard</h2>
          <div className="dash-hero__sub">
            The no-BS view: what matters now, what needs attention, and what is
            coming next.
          </div>
        </div>

        <div className="dash-hero__controls">
          <div className="dash-filter-group">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setDateFilter(tab.key)}
                className={`dash-filter-pill ${dateFilter === tab.key ? "active" : ""}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="dash-refresh-wrap">
            <span className="dash-refresh-time">
              {lastRefresh.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <button className="dash-refresh-btn" onClick={load}>
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="dash-hero-stats">
        <HeroStat
          label="Guests in scope"
          value={totalCovers}
          icon={DoorOpen}
          tone="green"
        />
        <HeroStat
          label="Confirmed"
          value={confirmedToday.length}
          icon={Clock}
          tone="neutral"
        />
        <HeroStat
          label="Seated / In service"
          value={`${seatedNow.length} / ${serviceNow.length}`}
          icon={Users}
          tone="blue"
        />
        <HeroStat
          label="Live orders"
          value={activeOrders.length}
          icon={Utensils}
          tone="amber"
        />
      </div>

      <div className="dash-main-grid">
        <div className="dash-left-col">
          <SectionCard
            title="Needs Attention"
            kicker="Triage First"
            right={
              <span className="dash-section-chip">
                {attentionItems.reduce((acc, item) => acc + item.count, 0)}{" "}
                flags
              </span>
            }
          >
            <div className="dash-attention-list">
              {attentionItems.map((item) => (
                <div
                  key={item.key}
                  className={`dash-attention-item tone-${item.tone}`}
                >
                  <div className="dash-attention-item__icon">
                    {item.tone === "danger" || item.tone === "warn" ? (
                      <AlertTriangle size={15} />
                    ) : (
                      <CheckCircle2 size={15} />
                    )}
                  </div>
                  <div className="dash-attention-item__body">
                    <div className="dash-attention-item__title">
                      {item.title}
                    </div>
                    <div className="dash-attention-item__detail">
                      {item.detail}
                    </div>
                  </div>
                  <div className="dash-attention-item__count">{item.count}</div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Next Up"
            kicker="Arrivals"
            right={
              <span className="dash-section-chip">
                {dateFilter === "today" ? "Today only" : "Hidden"}
              </span>
            }
          >
            {dateFilter !== "today" ? (
              <div className="dash-empty-lite">
                Next arrivals are only meaningful on Today view.
              </div>
            ) : nextArrivals.length === 0 ? (
              <div className="dash-empty-lite">
                No confirmed arrivals coming up.
              </div>
            ) : (
              <div className="dash-list">
                {nextArrivals.map(({ booking, minsUntil }) => (
                  <div key={booking.id} className="dash-list-row">
                    <div>
                      <div className="dash-list-row__title">
                        {getMemberName(attendeeMap[booking.id] ?? [])}
                      </div>
                      <div className="dash-list-row__meta">
                        {roomMap[booking.room_id] ?? `Room ${booking.room_id}`}{" "}
                        · {MEAL_LABELS[booking.meal_type] ?? booking.meal_type}{" "}
                        · Party of {booking.party_size}
                      </div>
                    </div>
                    <div className="dash-list-row__right">
                      <div className="dash-list-row__time">
                        {formatClock(booking.estimated_arrival)}
                      </div>
                      <div className="dash-list-row__mins">
                        {(minsUntil as number) <= 0
                          ? "due now"
                          : `${minsUntil} min`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Bookings" kicker="Reference">
            {filteredBookings.length === 0 ? (
              <div className="dash-empty-lite">
                No bookings for this period.
              </div>
            ) : (
              <div className="dash-list">
                {sortedBookings.slice(0, 12).map((b) => (
                  <div key={b.id} className="dash-list-row">
                    <div>
                      <div className="dash-list-row__title">
                        {getMemberName(attendeeMap[b.id] ?? [])}
                      </div>
                      <div className="dash-list-row__meta">
                        {dateFilter !== "today" && `${b.booking_date} · `}
                        {formatClock(b.estimated_arrival)} ·{" "}
                        {MEAL_LABELS[b.meal_type] ?? b.meal_type} ·{" "}
                        {roomMap[b.room_id] ?? `Room ${b.room_id}`} · Party of{" "}
                        {b.party_size}
                      </div>
                    </div>
                    <Badge
                      label={formatStatusLabel(b.status)}
                      colors={
                        STATUS_COLORS[b.status] ?? { bg: "#eee", color: "#333" }
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="dash-right-col">
          <SectionCard
            title="Kitchen Snapshot"
            kicker="Live"
            right={<ChefHat size={15} color="#8b7d6b" />}
          >
            {dateFilter !== "today" ? (
              <div className="dash-empty-lite">
                Kitchen activity is shown on Today view only.
              </div>
            ) : (
              <>
                <div className="dash-mini-stats">
                  <div className="dash-mini-stat">
                    <div className="dash-mini-stat__value">
                      {incomingOrders.length}
                    </div>
                    <div className="dash-mini-stat__label">Incoming</div>
                  </div>
                  <div className="dash-mini-stat">
                    <div className="dash-mini-stat__value">
                      {inKitchenOrders.length}
                    </div>
                    <div className="dash-mini-stat__label">In kitchen</div>
                  </div>
                  <div className="dash-mini-stat">
                    <div className="dash-mini-stat__value">
                      {readyOrders.length}
                    </div>
                    <div className="dash-mini-stat__label">Ready</div>
                  </div>
                </div>

                {activeOrders.length === 0 ? (
                  <div className="dash-empty-lite">
                    No active kitchen orders.
                  </div>
                ) : (
                  <div className="dash-list compact">
                    {activeOrders.slice(0, 8).map((o) => {
                      const booking = bookings.find(
                        (b) => b.id === o.booking_id,
                      );
                      return (
                        <div key={o.id} className="dash-list-row">
                          <div>
                            <div className="dash-list-row__title">
                              {getMemberName(attendeeMap[o.booking_id] ?? [])}
                            </div>
                            <div className="dash-list-row__meta">
                              Order #{o.id} ·{" "}
                              {booking
                                ? (roomMap[booking.room_id] ??
                                  `Room ${booking.room_id}`)
                                : `Booking #${o.booking_id}`}
                            </div>
                          </div>
                          <Badge
                            label={o.kitchen_status.replace("_", " ")}
                            colors={
                              KITCHEN_COLORS[o.kitchen_status] ?? {
                                bg: "#eee",
                                color: "#333",
                              }
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </SectionCard>

          <SectionCard title="Floor Snapshot" kicker="By Room">
            {floorSnapshot.length === 0 ? (
              <div className="dash-empty-lite">
                No room activity for this period.
              </div>
            ) : (
              <div className="dash-room-grid">
                {floorSnapshot.map((row) => (
                  <div key={row.room} className="dash-room-card">
                    <div className="dash-room-card__name">{row.room}</div>
                    <div className="dash-room-card__covers">
                      {row.covers} covers
                    </div>
                    <div className="dash-room-card__meta">
                      <span>Confirmed {row.confirmed}</span>
                      <span>Seated {row.seated}</span>
                      <span>Service {row.service}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="What matters on this page" kicker="Intent">
            <div className="dash-principles">
              <div className="dash-principle">
                <ArrowRight size={14} />
                <span>
                  Come here first when you need the current truth fast.
                </span>
              </div>
              <div className="dash-principle">
                <ArrowRight size={14} />
                <span>
                  Top = urgency. Middle = what’s next. Bottom = reference.
                </span>
              </div>
              <div className="dash-principle">
                <ArrowRight size={14} />
                <span>
                  Kitchen and seating pages stay specialized. This page should
                  triage.
                </span>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      <style>{`
        .dash-shell {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .dash-hero {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
        }

        .dash-hero__kicker {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--accent, #a38a64);
          margin-bottom: 6px;
        }

        .dash-hero__title {
          margin: 0;
          font-family: var(--font-display);
          font-size: 36px;
          font-weight: 500;
          line-height: 1.02;
          letter-spacing: -0.02em;
          color: #18181b;
        }

        .dash-hero__sub {
          margin-top: 8px;
          font-size: 14px;
          color: #7a746c;
          line-height: 1.6;
          max-width: 560px;
        }

        .dash-hero__controls {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 10px;
          flex-shrink: 0;
        }

        .dash-filter-group {
          display: flex;
          background: rgba(24,24,27,0.05);
          border-radius: 999px;
          padding: 4px;
          gap: 4px;
          border: 1px solid rgba(223, 216, 207, 0.95);
        }

        .dash-filter-pill {
          padding: 7px 14px;
          border: none;
          border-radius: 999px;
          background: transparent;
          color: #6d675f;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.16s ease;
        }

        .dash-filter-pill.active {
          background: #18181b;
          color: white;
          box-shadow: 0 8px 20px rgba(0,0,0,0.14);
        }

        .dash-refresh-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .dash-refresh-time {
          font-size: 12px;
          color: #9a948b;
          font-weight: 600;
        }

        .dash-refresh-btn {
          height: 38px;
          padding: 0 14px;
          border-radius: 999px;
          border: 1px solid rgba(223, 216, 207, 0.95);
          background: linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(249,247,244,0.98) 100%);
          color: #3f3a34;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          box-shadow: 0 10px 24px rgba(0,0,0,0.05);
        }

        .dash-hero-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }

        .dash-hero-stat {
          background: linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(250,248,245,0.98) 100%);
          border: 1px solid rgba(223, 216, 207, 0.95);
          border-radius: 18px;
          padding: 18px;
          display: flex;
          align-items: center;
          gap: 14px;
          box-shadow:
            0 18px 44px rgba(0,0,0,0.05),
            0 6px 20px rgba(0,0,0,0.03),
            inset 0 1px 0 rgba(255,255,255,0.84);
        }

        .dash-hero-stat__icon {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .dash-hero-stat__value {
          font-size: 26px;
          font-weight: 800;
          color: #18181b;
          line-height: 1;
        }

        .dash-hero-stat__label {
          margin-top: 4px;
          font-size: 12px;
          color: #8e887f;
        }

        .dash-main-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.45fr) minmax(320px, 0.9fr);
          gap: 18px;
          align-items: start;
        }

        .dash-left-col,
        .dash-right-col {
          display: flex;
          flex-direction: column;
          gap: 18px;
          min-width: 0;
        }

        .dash-section-card {
          background: linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(250,248,245,0.98) 100%);
          border: 1px solid rgba(223, 216, 207, 0.95);
          border-radius: 22px;
          padding: 18px;
          box-shadow:
            0 24px 60px rgba(0,0,0,0.06),
            0 8px 22px rgba(0,0,0,0.04),
            inset 0 1px 0 rgba(255,255,255,0.84);
        }

        .dash-section-card__header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 14px;
        }

        .dash-section-card__kicker {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--accent, #a38a64);
          margin-bottom: 5px;
        }

        .dash-section-card__title {
          margin: 0;
          font-family: var(--font-display);
          font-size: 24px;
          font-weight: 500;
          line-height: 1.05;
          color: #18181b;
        }

        .dash-section-chip {
          display: inline-flex;
          align-items: center;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          color: #6e675f;
          background: rgba(24,24,27,0.05);
          white-space: nowrap;
        }

        .dash-attention-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .dash-attention-item {
          display: grid;
          grid-template-columns: 36px 1fr auto;
          align-items: center;
          gap: 12px;
          padding: 12px 12px;
          border-radius: 16px;
          border: 1px solid rgba(235,229,223,0.95);
          background: rgba(255,255,255,0.74);
        }

        .dash-attention-item.tone-danger {
          background: rgba(254, 242, 242, 0.92);
        }

        .dash-attention-item.tone-warn {
          background: rgba(255, 251, 235, 0.92);
        }

        .dash-attention-item.tone-info {
          background: rgba(239, 246, 255, 0.92);
        }

        .dash-attention-item.tone-success {
          background: rgba(240, 253, 244, 0.92);
        }

        .dash-attention-item__icon {
          width: 36px;
          height: 36px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #5f5a53;
          background: rgba(255,255,255,0.7);
        }

        .dash-attention-item__title {
          font-size: 13px;
          font-weight: 700;
          color: #18181b;
          margin-bottom: 2px;
        }

        .dash-attention-item__detail {
          font-size: 12px;
          color: #7d766e;
          line-height: 1.45;
        }

        .dash-attention-item__count {
          min-width: 34px;
          height: 34px;
          padding: 0 10px;
          border-radius: 999px;
          background: rgba(24,24,27,0.06);
          color: #18181b;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 800;
        }

        .dash-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .dash-list.compact {
          gap: 8px;
        }

        .dash-list-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 12px 12px;
          border-radius: 14px;
          border: 1px solid rgba(235,229,223,0.95);
          background: rgba(255,255,255,0.75);
        }

        .dash-list-row__title {
          font-size: 13px;
          font-weight: 700;
          color: #18181b;
        }

        .dash-list-row__meta {
          margin-top: 3px;
          font-size: 12px;
          color: #7f786f;
          line-height: 1.45;
        }

        .dash-list-row__right {
          text-align: right;
          flex-shrink: 0;
        }

        .dash-list-row__time {
          font-size: 13px;
          font-weight: 700;
          color: #18181b;
        }

        .dash-list-row__mins {
          margin-top: 3px;
          font-size: 11px;
          color: #9a948b;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .dash-mini-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 12px;
        }

        .dash-mini-stat {
          border-radius: 16px;
          border: 1px solid rgba(235,229,223,0.95);
          background: rgba(255,255,255,0.78);
          padding: 12px;
          text-align: center;
        }

        .dash-mini-stat__value {
          font-size: 24px;
          font-weight: 800;
          color: #18181b;
          line-height: 1;
        }

        .dash-mini-stat__label {
          margin-top: 5px;
          font-size: 11px;
          color: #8e887f;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-weight: 700;
        }

        .dash-room-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }

        .dash-room-card {
          border-radius: 16px;
          border: 1px solid rgba(235,229,223,0.95);
          background: rgba(255,255,255,0.75);
          padding: 13px;
        }

        .dash-room-card__name {
          font-size: 14px;
          font-weight: 700;
          color: #18181b;
        }

        .dash-room-card__covers {
          margin-top: 4px;
          font-size: 12px;
          color: #6d675f;
          font-weight: 700;
        }

        .dash-room-card__meta {
          margin-top: 8px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          font-size: 11px;
          color: #928b82;
        }

        .dash-empty-lite {
          padding: 18px 6px 4px;
          color: #a09a92;
          font-size: 13px;
        }

        .dash-principles {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .dash-principle {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          font-size: 13px;
          color: #6f695f;
          line-height: 1.55;
        }

        @media (max-width: 1100px) {
          .dash-main-grid {
            grid-template-columns: 1fr;
          }

          .dash-hero-stats {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 760px) {
          .dash-hero {
            flex-direction: column;
            align-items: flex-start;
          }

          .dash-hero__controls {
            align-items: flex-start;
            width: 100%;
          }

          .dash-filter-group {
            flex-wrap: wrap;
            border-radius: 18px;
          }

          .dash-hero__title {
            font-size: 30px;
          }

          .dash-hero-stats {
            grid-template-columns: 1fr;
          }

          .dash-mini-stats {
            grid-template-columns: 1fr;
          }

          .dash-list-row,
          .dash-attention-item {
            grid-template-columns: 1fr;
          }

          .dash-attention-item__count,
          .dash-list-row__right {
            text-align: left;
          }
        }
      `}</style>
    </div>
  );
}

function formatStatusLabel(status: string) {
  if (status === "SERVICE") return "In Service";
  return status;
}
