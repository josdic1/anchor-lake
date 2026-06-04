import { useEffect, useState, useCallback } from "react";
import { X, RefreshCw, Clock, Users, Utensils, Sparkles } from "lucide-react";
import { getAllBookings, getAttendees } from "../api/bookings";
import { getOrdersByBooking } from "../api/orders";
import { roomsApi } from "../api/client";
import type { Booking, Attendee, Room } from "../types/booking";
import type { Order } from "../api/orders";
import { OrderEntryDrawer } from "../components/bookings/OrderEntryDrawer";

// ─── Constants ───────────────────────────────────────────────────────────────

const ACTIVE_STATUSES = ["CONFIRMED", "SEATED", "SERVICE"];

const STATUS_CONFIG: Record<
  string,
  {
    color: string;
    bg: string;
    ring: string;
    label: string;
    tint: string;
    soft: string;
  }
> = {
  CONFIRMED: {
    color: "#1a4fa0",
    bg: "#dbeafe",
    ring: "#93c5fd",
    label: "Confirmed",
    tint: "rgba(37, 99, 235, 0.12)",
    soft: "rgba(37, 99, 235, 0.06)",
  },
  SEATED: {
    color: "#166534",
    bg: "#dcfce7",
    ring: "#86efac",
    label: "Seated",
    tint: "rgba(22, 163, 74, 0.12)",
    soft: "rgba(22, 163, 74, 0.06)",
  },
  SERVICE: {
    color: "#92400e",
    bg: "#fef3c7",
    ring: "#fcd34d",
    label: "In Service",
    tint: "rgba(217, 119, 6, 0.12)",
    soft: "rgba(217, 119, 6, 0.07)",
  },
};

const MEAL_LABELS: Record<string, string> = {
  LUNCH: "Lunch",
  DINNER: "Dinner",
  AFTERHOURS: "After Hours",
  SPECIAL_EVENT: "Special Event",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface EnrichedBooking {
  booking: Booking;
  attendees: Attendee[];
  orders: Order[];
  room: Room | undefined;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(value?: string | null) {
  return value?.slice(0, 5) ?? "—";
}

// ─── Table Circle ─────────────────────────────────────────────────────────────

interface TableProps {
  enriched: EnrichedBooking;
  isSelected: boolean;
  onClick: () => void;
}

function TableCircle({ enriched, isSelected, onClick }: TableProps) {
  const { booking, orders } = enriched;
  const cfg = STATUS_CONFIG[booking.status];
  const hasActiveOrders = orders.some((o) => o.kitchen_status !== "SERVED");
  const size = Math.max(80, Math.min(120, 60 + booking.party_size * 8));

  return (
    <button
      type="button"
      onClick={onClick}
      className={`seating-table-circle ${isSelected ? "selected" : ""}`}
      style={
        {
          width: `${size}px`,
          height: `${size}px`,
          "--table-color": cfg.color,
          "--table-ring": cfg.ring,
          "--table-bg": cfg.bg,
          "--table-soft": cfg.soft,
        } as React.CSSProperties
      }
    >
      <span className="seating-table-circle__inner" />

      {hasActiveOrders && (
        <span className="seating-table-circle__order-dot">
          <span className="seating-table-circle__order-dot-core" />
        </span>
      )}

      <span className="seating-table-circle__party">{booking.party_size}p</span>
      <span className="seating-table-circle__booking">
        Booking #{booking.id}
      </span>
      <span className="seating-table-circle__time">
        {formatTime(booking.estimated_arrival)}
      </span>
    </button>
  );
}

// ─── Room Card ────────────────────────────────────────────────────────────────

interface RoomCardProps {
  room: Room;
  bookings: EnrichedBooking[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}

function RoomCard({ room, bookings, selectedId, onSelect }: RoomCardProps) {
  const occupiedSeats = bookings
    .filter((e) => ["SEATED", "SERVICE"].includes(e.booking.status))
    .reduce((acc, e) => acc + e.booking.party_size, 0);

  const fillPct =
    room.capacity > 0
      ? Math.min(100, (occupiedSeats / room.capacity) * 100)
      : 0;

  const activeServices = bookings.filter(
    (e) => e.booking.status === "SERVICE",
  ).length;

  return (
    <div className="seating-room-card">
      <div className="seating-room-card__header">
        <div>
          <div className="seating-room-card__kicker">Room</div>
          <h3 className="seating-room-card__title">{room.name}</h3>
          <div className="seating-room-card__sub">
            Capacity {room.capacity} · {bookings.length} active booking
            {bookings.length !== 1 ? "s" : ""}
          </div>
        </div>

        <div className="seating-room-card__stats">
          <div className="seating-room-card__stat-main">
            {occupiedSeats}/{room.capacity}
          </div>
          <div className="seating-room-card__stat-sub">
            {activeServices} in service
          </div>
        </div>
      </div>

      <div className="seating-room-card__meter">
        <div
          className="seating-room-card__meter-fill"
          style={{
            width: `${fillPct}%`,
            background:
              fillPct > 80
                ? "linear-gradient(90deg, #ef4444 0%, #f87171 100%)"
                : fillPct > 50
                  ? "linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)"
                  : "linear-gradient(90deg, #10b981 0%, #34d399 100%)",
          }}
        />
      </div>

      {bookings.length === 0 ? (
        <div className="seating-room-card__empty">No active bookings</div>
      ) : (
        <div className="seating-room-card__tables">
          {bookings.map((e) => (
            <TableCircle
              key={e.booking.id}
              enriched={e}
              isSelected={selectedId === e.booking.id}
              onClick={() =>
                onSelect(selectedId === e.booking.id ? null : e.booking.id)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

interface DetailPanelProps {
  enriched: EnrichedBooking;
  onClose: () => void;
  onOrdersChanged: () => void;
}

function DetailPanel({ enriched, onClose, onOrdersChanged }: DetailPanelProps) {
  const { booking, attendees, orders, room } = enriched;
  const [showOrderEntry, setShowOrderEntry] = useState(false);

  const cfg = STATUS_CONFIG[booking.status] ?? {
    color: "#666",
    bg: "#f0f0f0",
    ring: "#ccc",
    label: booking.status,
    tint: "rgba(0,0,0,0.06)",
    soft: "rgba(0,0,0,0.04)",
  };

  const allDietary = [...new Set(attendees.flatMap((a) => a.dietary_flags))];
  const activeOrders = orders.filter((o) => o.kitchen_status !== "SERVED");
  const canOrder =
    ["SEATED", "SERVICE"].includes(booking.status) &&
    booking.meal_type !== "AFTERHOURS";

  const KITCHEN_LABELS: Record<string, string> = {
    INCOMING: "Queued",
    IN_KITCHEN: "In Kitchen",
    READY: "Ready",
    SERVED: "Served",
  };

  return (
    <div className="seating-detail-panel">
      <div
        className="seating-detail-panel__header"
        style={{
          background: `linear-gradient(180deg, ${cfg.soft} 0%, rgba(255,255,255,0.9) 100%)`,
        }}
      >
        <div>
          <div className="seating-detail-panel__eyebrow">Selected Table</div>
          <div className="seating-detail-panel__title">
            {room?.name ?? `Room ${booking.room_id}`}
          </div>
          <div className="seating-detail-panel__subtitle">
            Booking #{booking.id}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="seating-detail-panel__close"
        >
          <X size={16} />
        </button>
      </div>

      <div className="seating-detail-panel__body">
        <div
          className="seating-status-pill"
          style={{
            color: cfg.color,
            background: cfg.tint,
            borderColor: cfg.ring,
          }}
        >
          <span
            className="seating-status-pill__dot"
            style={{ background: cfg.color }}
          />
          {cfg.label}
        </div>

        <div className="seating-meta-grid">
          {[
            [
              <Clock size={12} />,
              "Arrival",
              formatTime(booking.estimated_arrival),
            ],
            [<Users size={12} />, "Party", String(booking.party_size)],
            [
              <Utensils size={12} />,
              "Meal",
              MEAL_LABELS[booking.meal_type] ?? booking.meal_type,
            ],
            [null, "Date", booking.booking_date],
            ...(booking.seated_at
              ? [
                  [
                    null,
                    "Seated",
                    new Date(booking.seated_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    }),
                  ],
                ]
              : []),
          ].map(([icon, label, value], i) => (
            <div key={i} className="seating-meta-card">
              <div className="seating-meta-card__label">
                {icon}
                {label}
              </div>
              <div className="seating-meta-card__value">{value as string}</div>
            </div>
          ))}
        </div>

        {booking.notes && (
          <div className="seating-notes-card">
            <div className="seating-section-title">Notes</div>
            <div className="seating-notes-card__text">“{booking.notes}”</div>
          </div>
        )}

        {attendees.length > 0 && (
          <div className="seating-section-card">
            <div className="seating-section-title">
              Attendees <span>({attendees.length})</span>
            </div>

            <div className="seating-attendee-list">
              {attendees.map((a) => (
                <div key={a.id} className="seating-attendee-row">
                  <div className="seating-attendee-row__main">
                    <div className="seating-attendee-row__name">
                      {`${a.guest_first_name ?? ""} ${a.guest_last_name ?? ""}`.trim() ||
                        `Member #${a.linked_member_id}`}
                    </div>
                    {a.is_member_guest && (
                      <div className="seating-attendee-row__tag">
                        member guest
                      </div>
                    )}
                  </div>

                  {a.dietary_flags.length > 0 && (
                    <div className="seating-attendee-row__dietary">
                      {a.dietary_flags
                        .map((f) => f.replace(/_/g, " "))
                        .join(", ")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {allDietary.length > 0 && (
          <div className="seating-section-card">
            <div className="seating-section-title">Dietary Flags</div>
            <div className="seating-flag-wrap">
              {allDietary.map((flag) => (
                <span key={flag} className="seating-flag-pill">
                  {flag.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </div>
        )}

        {activeOrders.length > 0 && (
          <div className="seating-section-card">
            <div className="seating-section-title">
              Active Orders <span>({activeOrders.length})</span>
            </div>

            <div className="seating-order-list">
              {activeOrders.map((o) => (
                <div key={o.id} className="seating-order-row">
                  <span className="seating-order-row__name">Order #{o.id}</span>
                  <span
                    className={`seating-order-row__status status-${o.kitchen_status.toLowerCase()}`}
                  >
                    {KITCHEN_LABELS[o.kitchen_status]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {canOrder && (
          <button
            className="seating-order-btn"
            onClick={() => setShowOrderEntry(true)}
          >
            <Utensils size={14} />
            Add to Order
          </button>
        )}
      </div>

      {showOrderEntry && (
        <OrderEntryDrawer
          bookingId={booking.id}
          bookingStatus={booking.status}
          onClose={() => setShowOrderEntry(false)}
          onOrderUpdated={onOrdersChanged}
        />
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function SeatingPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [enriched, setEnriched] = useState<EnrichedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = useCallback(async () => {
    try {
      const [bookingsData, roomsData] = await Promise.all([
        getAllBookings(),
        roomsApi.get<Room[]>("/rooms").then((r) => r.data),
      ]);

      setRooms(roomsData);

      const today = new Date().toISOString().slice(0, 10);
      const active = bookingsData.filter(
        (b) => ACTIVE_STATUSES.includes(b.status) && b.booking_date === today,
      );

      const enrichedData = await Promise.all(
        active.map(async (b) => {
          const [attendees, orders] = await Promise.allSettled([
            getAttendees(b.id),
            getOrdersByBooking(b.id),
          ]);
          return {
            booking: b,
            attendees: attendees.status === "fulfilled" ? attendees.value : [],
            orders: orders.status === "fulfilled" ? orders.value : [],
            room: roomsData.find((r) => r.id === b.room_id),
          };
        }),
      );

      setEnriched(enrichedData);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("SeatingPage load failed", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  const selectedEnriched =
    enriched.find((e) => e.booking.id === selectedId) ?? null;

  const byRoom: Record<number, EnrichedBooking[]> = {};
  enriched.forEach((e) => {
    const rid = e.booking.room_id;
    if (!byRoom[rid]) byRoom[rid] = [];
    byRoom[rid].push(e);
  });

  const counts = ACTIVE_STATUSES.reduce(
    (acc, s) => {
      acc[s] = enriched.filter((e) => e.booking.status === s).length;
      return acc;
    },
    {} as Record<string, number>,
  );

  const totalGuests = enriched.reduce(
    (acc, e) => acc + e.booking.party_size,
    0,
  );

  if (loading) return <div className="table-state">Loading floor plan...</div>;

  return (
    <div className="fade-in seating-page-shell">
      <div className="seating-page-hero">
        <div className="seating-page-hero__left">
          <div className="seating-page-hero__kicker">Live Floor</div>
          <h2 className="seating-page-hero__title">Seating</h2>
          <div className="seating-page-hero__sub">
            A live view of today’s active floor, service flow, and guest count.
          </div>
        </div>

        <div className="seating-page-hero__right">
          <div className="seating-stat-chip">
            <span className="seating-stat-chip__label">Bookings</span>
            <span className="seating-stat-chip__value">{enriched.length}</span>
          </div>
          <div className="seating-stat-chip">
            <span className="seating-stat-chip__label">Guests</span>
            <span className="seating-stat-chip__value">{totalGuests}</span>
          </div>
          <button className="seating-refresh-btn" onClick={load}>
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      <div className="seating-legend-bar">
        <div className="seating-legend-bar__items">
          {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
            <div key={status} className="seating-legend-item">
              <span
                className="seating-legend-item__dot"
                style={{ background: cfg.ring }}
              />
              <span className="seating-legend-item__label">{cfg.label}</span>
              <span className="seating-legend-item__count">
                {counts[status] ?? 0}
              </span>
            </div>
          ))}
        </div>

        <div className="seating-legend-bar__timestamp">
          <Sparkles size={12} />
          Updated{" "}
          {lastRefresh.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>

      <div className="seating-layout">
        <div className="seating-layout__main">
          {enriched.length === 0 ? (
            <div className="seating-empty-state">
              <div className="seating-empty-state__title">
                No active bookings today
              </div>
              <div className="seating-empty-state__text">
                The floor is clear right now. Active bookings will appear here
                as guests move into service.
              </div>
            </div>
          ) : (
            rooms
              .filter((r) => r.is_active)
              .map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  bookings={byRoom[room.id] ?? []}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
              ))
          )}
        </div>

        {selectedEnriched && (
          <DetailPanel
            enriched={selectedEnriched}
            onClose={() => setSelectedId(null)}
            onOrdersChanged={load}
          />
        )}
      </div>

      <style>{`
        .seating-page-shell {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .seating-page-hero {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
        }

        .seating-page-hero__kicker {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--accent, #a38a64);
          margin-bottom: 6px;
        }

        .seating-page-hero__title {
          margin: 0;
          font-family: var(--font-display);
          font-size: 36px;
          font-weight: 500;
          letter-spacing: -0.02em;
          color: #18181b;
          line-height: 1.02;
        }

        .seating-page-hero__sub {
          margin-top: 8px;
          font-size: 14px;
          color: #7a746c;
          line-height: 1.6;
          max-width: 540px;
        }

        .seating-page-hero__right {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .seating-stat-chip {
          min-width: 92px;
          padding: 10px 14px;
          border-radius: 16px;
          border: 1px solid rgba(223, 216, 207, 0.95);
          background: linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(249,247,244,0.98) 100%);
          box-shadow: 0 10px 24px rgba(0,0,0,0.05);
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .seating-stat-chip__label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #9b948b;
        }

        .seating-stat-chip__value {
          font-size: 20px;
          font-weight: 700;
          color: #18181b;
          line-height: 1;
        }

        .seating-refresh-btn {
          height: 42px;
          padding: 0 16px;
          border-radius: 999px;
          border: 1px solid rgba(223, 216, 207, 0.95);
          background: linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(249,247,244,0.98) 100%);
          color: #3f3a34;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 10px 24px rgba(0,0,0,0.05);
          transition: transform 0.16s ease, box-shadow 0.16s ease;
        }

        .seating-refresh-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 28px rgba(0,0,0,0.08);
        }

        .seating-legend-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          border-radius: 18px;
          border: 1px solid rgba(223, 216, 207, 0.95);
          background: linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(249,247,244,0.96) 100%);
          box-shadow: 0 14px 34px rgba(0,0,0,0.05);
          flex-wrap: wrap;
        }

        .seating-legend-bar__items {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .seating-legend-item {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 10px;
          border-radius: 999px;
          background: rgba(255,255,255,0.82);
          border: 1px solid rgba(231, 226, 219, 0.95);
        }

        .seating-legend-item__dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          display: inline-block;
        }

        .seating-legend-item__label {
          font-size: 12px;
          color: #5f5a53;
          font-weight: 600;
        }

        .seating-legend-item__count {
          min-width: 18px;
          height: 18px;
          padding: 0 6px;
          border-radius: 999px;
          background: rgba(24,24,27,0.06);
          color: #2f2a25;
          font-size: 10px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .seating-legend-bar__timestamp {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #8f887f;
          font-weight: 600;
        }

        .seating-layout {
          display: flex;
          gap: 24px;
          align-items: flex-start;
        }

        .seating-layout__main {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-width: 0;
        }

        .seating-room-card {
          background: linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(250,248,245,0.98) 100%);
          border: 1px solid rgba(223, 216, 207, 0.95);
          border-radius: 22px;
          padding: 22px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          box-shadow:
            0 24px 60px rgba(0,0,0,0.07),
            0 8px 22px rgba(0,0,0,0.04),
            inset 0 1px 0 rgba(255,255,255,0.84);
          min-height: 178px;
        }

        .seating-room-card__header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }

        .seating-room-card__kicker {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--accent, #a38a64);
          margin-bottom: 6px;
        }

        .seating-room-card__title {
          font-family: var(--font-display);
          font-size: 24px;
          font-weight: 500;
          color: #18181b;
          margin: 0;
          letter-spacing: -0.01em;
          line-height: 1.08;
        }

        .seating-room-card__sub {
          font-size: 12px;
          color: #8e887f;
          margin-top: 6px;
        }

        .seating-room-card__stats {
          text-align: right;
          flex-shrink: 0;
        }

        .seating-room-card__stat-main {
          font-size: 18px;
          font-weight: 700;
          color: #18181b;
          line-height: 1;
        }

        .seating-room-card__stat-sub {
          font-size: 11px;
          color: #958f86;
          margin-top: 5px;
        }

        .seating-room-card__meter {
          width: 100%;
          height: 8px;
          background: rgba(235,230,224,0.9);
          border-radius: 999px;
          overflow: hidden;
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.04);
        }

        .seating-room-card__meter-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 0.28s ease;
        }

        .seating-room-card__tables {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          align-items: center;
        }

        .seating-room-card__empty {
          font-size: 13px;
          color: #a49d94;
          font-style: italic;
          padding: 16px 0 6px;
        }

        .seating-table-circle {
          border: none;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          position: relative;
          flex-shrink: 0;
          overflow: hidden;
          background:
            radial-gradient(circle at 30% 24%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.25) 18%, transparent 36%),
            linear-gradient(180deg, var(--table-bg) 0%, color-mix(in srgb, var(--table-bg) 76%, white 24%) 100%);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.75),
            0 10px 24px rgba(0,0,0,0.08);
          transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
          outline: 2px solid var(--table-ring);
          outline-offset: 0;
        }

        .seating-table-circle:hover {
          transform: translateY(-1px) scale(1.01);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.78),
            0 16px 30px rgba(0,0,0,0.12);
        }

        .seating-table-circle.selected {
          outline: 3px solid #18181b;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.78),
            0 0 0 5px rgba(24,24,27,0.08),
            0 16px 34px rgba(0,0,0,0.14);
        }

        .seating-table-circle__inner {
          position: absolute;
          inset: 8px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.45);
          pointer-events: none;
        }

        .seating-table-circle__order-dot {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 13px;
          height: 13px;
          border-radius: 50%;
          background: rgba(255,255,255,0.95);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px rgba(0,0,0,0.12);
        }

        .seating-table-circle__order-dot-core {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #f59e0b;
        }

        .seating-table-circle__party {
          font-size: 12px;
          font-weight: 800;
          color: var(--table-color);
          line-height: 1;
        }

        .seating-table-circle__booking {
          font-size: 9px;
          font-weight: 700;
          color: color-mix(in srgb, var(--table-color) 80%, #000 20%);
          opacity: 0.9;
          line-height: 1;
        }

        .seating-table-circle__time {
          font-size: 9px;
          color: color-mix(in srgb, var(--table-color) 78%, #000 22%);
          font-weight: 700;
          line-height: 1;
        }

        .seating-detail-panel {
          width: 360px;
          flex-shrink: 0;
          background: linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(250,248,245,0.98) 100%);
          border: 1px solid rgba(223, 216, 207, 0.95);
          border-radius: 24px;
          box-shadow:
            0 30px 80px rgba(0,0,0,0.10),
            0 10px 28px rgba(0,0,0,0.05),
            inset 0 1px 0 rgba(255,255,255,0.84);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          align-self: flex-start;
          position: sticky;
          top: 24px;
        }

        .seating-detail-panel__header {
          padding: 18px 20px 16px;
          border-bottom: 1px solid rgba(234,229,223,0.9);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .seating-detail-panel__eyebrow {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--accent, #a38a64);
          margin-bottom: 6px;
        }

        .seating-detail-panel__title {
          font-family: var(--font-display);
          font-size: 24px;
          font-weight: 500;
          color: #18181b;
          line-height: 1.08;
        }

        .seating-detail-panel__subtitle {
          font-size: 12px;
          color: #8f887f;
          margin-top: 5px;
        }

        .seating-detail-panel__close {
          background: rgba(255,255,255,0.72);
          border: 1px solid rgba(230,224,217,0.95);
          width: 34px;
          height: 34px;
          border-radius: 999px;
          cursor: pointer;
          color: #6d675f;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .seating-detail-panel__body {
          padding: 18px 20px 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          overflow-y: auto;
        }

        .seating-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 12px;
          border-radius: 999px;
          border: 1px solid;
          font-size: 12px;
          font-weight: 700;
          width: fit-content;
        }

        .seating-status-pill__dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          display: inline-block;
        }

        .seating-meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .seating-meta-card {
          background: rgba(248,245,241,0.88);
          border: 1px solid rgba(235,229,223,0.95);
          border-radius: 14px;
          padding: 10px 12px;
        }

        .seating-meta-card__label {
          font-size: 10px;
          color: #9b948b;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 5px;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .seating-meta-card__value {
          font-size: 13px;
          font-weight: 700;
          color: #2b2824;
        }

        .seating-section-card,
        .seating-notes-card {
          background: rgba(248,245,241,0.88);
          border: 1px solid rgba(235,229,223,0.95);
          border-radius: 16px;
          padding: 13px 14px;
        }

        .seating-section-title {
          font-size: 10px;
          font-weight: 700;
          color: #9b948b;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 10px;
        }

        .seating-section-title span {
          color: #6c665f;
        }

        .seating-notes-card__text {
          font-size: 13px;
          color: #5e5952;
          font-style: italic;
          line-height: 1.6;
        }

        .seating-attendee-list,
        .seating-order-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .seating-attendee-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(236,231,225,0.9);
        }

        .seating-attendee-row:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .seating-attendee-row__name {
          font-size: 13px;
          color: #27241f;
          font-weight: 700;
        }

        .seating-attendee-row__tag {
          font-size: 10px;
          color: #9a948b;
          margin-top: 3px;
          text-transform: lowercase;
        }

        .seating-attendee-row__dietary {
          font-size: 10px;
          color: #8b5a19;
          font-weight: 700;
          text-align: right;
          line-height: 1.45;
          max-width: 42%;
        }

        .seating-flag-wrap {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .seating-flag-pill {
          padding: 4px 9px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 700;
          background: #fef3c7;
          color: #92400e;
          border: 1px solid rgba(245, 196, 83, 0.45);
        }

        .seating-order-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          background: rgba(255,255,255,0.7);
          border: 1px solid rgba(234,229,223,0.95);
          padding: 9px 10px;
          border-radius: 12px;
        }

        .seating-order-row__name {
          font-size: 12px;
          color: #5f5a53;
          font-weight: 600;
        }

        .seating-order-row__status {
          font-size: 10px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 999px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .seating-order-row__status.status-incoming {
          background: rgba(113,113,122,0.12);
          color: #52525b;
        }

        .seating-order-row__status.status-in_kitchen {
          background: #fef3c7;
          color: #92400e;
        }

        .seating-order-row__status.status-ready {
          background: #dcfce7;
          color: #166534;
        }

        .seating-order-row__status.status-served {
          background: rgba(113,113,122,0.12);
          color: #52525b;
        }

        .seating-order-btn {
          width: 100%;
          margin-top: 2px;
          border: none;
          border-radius: 999px;
          padding: 12px 16px;
          background: #18181b;
          color: white;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 14px 28px rgba(0,0,0,0.14);
        }

        .seating-empty-state {
          text-align: center;
          padding: 72px 24px;
          border-radius: 22px;
          border: 1px solid rgba(223, 216, 207, 0.95);
          background: linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(250,248,245,0.98) 100%);
          box-shadow:
            0 24px 60px rgba(0,0,0,0.06),
            0 8px 22px rgba(0,0,0,0.04);
        }

        .seating-empty-state__title {
          font-family: var(--font-display);
          font-size: 28px;
          color: #18181b;
          margin-bottom: 8px;
        }

        .seating-empty-state__text {
          font-size: 14px;
          color: #827b72;
          max-width: 440px;
          margin: 0 auto;
          line-height: 1.7;
        }

        @media (max-width: 1180px) {
          .seating-layout {
            flex-direction: column;
          }

          .seating-detail-panel {
            width: 100%;
            position: static;
          }
        }

        @media (max-width: 760px) {
          .seating-page-hero {
            flex-direction: column;
            align-items: flex-start;
          }

          .seating-page-hero__title {
            font-size: 30px;
          }

          .seating-room-card {
            padding: 18px;
            border-radius: 18px;
          }

          .seating-detail-panel {
            border-radius: 18px;
          }

          .seating-meta-grid {
            grid-template-columns: 1fr;
          }

          .seating-room-card__header {
            flex-direction: column;
            align-items: flex-start;
          }

          .seating-room-card__stats {
            text-align: left;
          }

          .seating-table-circle__booking,
          .seating-table-circle__time {
            font-size: 8px;
          }
        }
      `}</style>
    </div>
  );
}
