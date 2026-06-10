import { useEffect, useState, useCallback, useRef } from "react";
import {
  X,
  Utensils,
  Clock,
  Users,
  ChefHat,
  Bell,
  RefreshCw,
  CheckCircle,
  Flame,
  ArrowRight,
} from "lucide-react";
import { bookingsApi, roomsApi } from "../api/client";
import { getAttendees, executeBookingAction } from "../api/bookings";
import {
  getOrdersByBooking,
  getOrderItems,
  fireOrder,
  updateKitchenStatus,
  removeOrderItem,
  cancelOrder,
} from "../api/orders";
import { getMenuItems } from "../api/menu";
import type { Booking, Attendee, Room } from "../types/booking";
import type { Order, OrderItem } from "../api/orders";
import type { MenuItem } from "../api/menu";
import { OrderEntryDrawer } from "../components/bookings/OrderEntryDrawer";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EnrichedBooking {
  booking: Booking;
  attendees: Attendee[];
  orders: Order[];
  room: Room | undefined;
}

interface Toast {
  id: string;
  type: "ready" | "fired";
  orderId?: number;
  bookingId?: number;
  roomName: string;
  message: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTIVE_STATUSES = ["CONFIRMED", "SEATED", "SERVICE"];

const MEAL_LABELS: Record<string, string> = {
  LUNCH: "Lunch",
  DINNER: "Dinner",
  AFTERHOURS: "After Hours",
  SPECIAL_EVENT: "Special Event",
};

const STATUS_CFG: Record<
  string,
  { color: string; bg: string; border: string; dot: string; label: string }
> = {
  CONFIRMED: {
    color: "#1a4fa0",
    bg: "rgba(219,234,254,0.7)",
    border: "rgba(147,197,253,0.6)",
    dot: "#3b82f6",
    label: "Confirmed",
  },
  SEATED: {
    color: "#166534",
    bg: "rgba(220,252,231,0.7)",
    border: "rgba(134,239,172,0.6)",
    dot: "#22c55e",
    label: "Seated",
  },
  SERVICE: {
    color: "#92400e",
    bg: "rgba(254,243,199,0.7)",
    border: "rgba(252,211,77,0.6)",
    dot: "#f59e0b",
    label: "In Service",
  },
};

const KITCHEN_CFG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  INCOMING: { label: "Queued", color: "#52525b", bg: "rgba(113,113,122,0.10)" },
  IN_KITCHEN: {
    label: "In Kitchen",
    color: "#92400e",
    bg: "rgba(254,243,199,0.85)",
  },
  READY: { label: "Ready ✓", color: "#166534", bg: "rgba(220,252,231,0.85)" },
  SERVED: { label: "Served", color: "#a1a1aa", bg: "rgba(244,244,245,0.85)" },
};

const ACTION_MAP: Record<string, string> = {
  CONFIRMED: "confirm",
  DRAFT: "revert-to-draft",
  SEATED: "seat",
  SERVICE: "start-service",
  COMPLETED: "complete",
  CANCELLED: "cancel",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function getDietaryLabel(attendees: Attendee[]): string {
  const parts: string[] = [];
  for (const a of attendees) {
    for (const flag of a.dietary_flags ?? []) {
      if (flag === "OTHER" && a.dietary_other_note)
        parts.push(a.dietary_other_note);
      else if (flag !== "OTHER") parts.push(flag.replace(/_/g, " "));
    }
  }
  return [...new Set(parts)].join(" · ");
}

function minutesSince(iso?: string | null) {
  if (!iso) return null;
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 60000),
  );
}

function minutesUntil(date: string, time?: string | null) {
  if (!time) return null;
  return Math.floor(
    (new Date(`${date}T${time}`).getTime() - Date.now()) / 60000,
  );
}

function formatTime(t?: string | null) {
  return t?.slice(0, 5) ?? "—";
}

function formatDuration(mins: number) {
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

// ─── Toast Stack ──────────────────────────────────────────────────────────────

function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  if (!toasts.length) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        maxWidth: "320px",
      }}
    >
      {toasts.map((t) => (
        <div key={t.id} className={`s360-toast s360-toast--${t.type}`}>
          <div className="s360-toast__icon">
            {t.type === "ready" ? (
              <CheckCircle size={16} />
            ) : (
              <Flame size={16} />
            )}
          </div>
          <div className="s360-toast__body">
            <div className="s360-toast__title">
              {t.type === "ready" ? "Order Ready" : "Fired to Kitchen"}
            </div>
            <div className="s360-toast__detail">
              {t.roomName} · {t.message}
            </div>
          </div>
          <button className="s360-toast__close" onClick={() => onDismiss(t.id)}>
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Upcoming Strip ───────────────────────────────────────────────────────────

function UpcomingStrip({
  enriched,
  onSelect,
}: {
  enriched: EnrichedBooking[];
  onSelect: (id: number) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = enriched
    .filter(
      (e) =>
        e.booking.status === "CONFIRMED" && e.booking.booking_date === today,
    )
    .map((e) => ({
      ...e,
      mins: minutesUntil(e.booking.booking_date, e.booking.estimated_arrival),
    }))
    .filter((e) => e.mins !== null && (e.mins as number) >= -15)
    .sort((a, b) => (a.mins as number) - (b.mins as number))
    .slice(0, 8);

  if (!upcoming.length) return null;

  return (
    <div className="s360-upcoming">
      <div className="s360-upcoming__label">
        <Clock size={11} /> Next Up
      </div>
      <div className="s360-upcoming__scroll">
        {upcoming.map(({ booking, attendees, room, mins }) => (
          <button
            key={booking.id}
            type="button"
            className={`s360-upcoming-chip ${(mins as number) <= 15 ? "urgent" : ""}`}
            onClick={() => onSelect(booking.id)}
          >
            <div className="s360-upcoming-chip__name">
              {getMemberName(attendees)}
            </div>
            <div className="s360-upcoming-chip__meta">
              {room?.name ?? `Room ${booking.room_id}`} · {booking.party_size}{" "}
              guests
            </div>
            <div className="s360-upcoming-chip__time">
              {(mins as number) <= 0 ? "Now" : `${mins}m`}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Room Card ────────────────────────────────────────────────────────────────

function RoomCard({
  room,
  bookings,
  selectedId,
  onSelect,
}: {
  room: Room;
  bookings: EnrichedBooking[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}) {
  const hasReady = bookings.some((e) =>
    e.orders.some((o) => o.kitchen_status === "READY"),
  );
  const active = bookings.filter((e) =>
    ["SEATED", "SERVICE"].includes(e.booking.status),
  );
  const confirmed = bookings.filter((e) => e.booking.status === "CONFIRMED");

  if (!bookings.length)
    return (
      <div className="s360-room-card s360-room-card--empty">
        <div className="s360-room-card__name">{room.name}</div>
        <div className="s360-room-card__empty-label">Available</div>
      </div>
    );

  return (
    <div className={`s360-room-card ${hasReady ? "has-ready" : ""}`}>
      <div className="s360-room-card__header">
        <div>
          <div className="s360-room-card__name">{room.name}</div>
          <div className="s360-room-card__sub">
            {active.length} active · {confirmed.length} arriving
          </div>
        </div>
        {hasReady && (
          <div className="s360-ready-badge">
            <Bell size={11} /> Ready
          </div>
        )}
      </div>
      <div className="s360-room-card__bookings">
        {bookings.map((e) => {
          const cfg = STATUS_CFG[e.booking.status] ?? STATUS_CFG.CONFIRMED;
          const memberName = getMemberName(e.attendees);
          const dietary = getDietaryLabel(e.attendees);
          const readyOrders = e.orders.filter(
            (o) => o.kitchen_status === "READY",
          );
          const inKitchen = e.orders.filter(
            (o) => o.kitchen_status === "IN_KITCHEN",
          );
          const isSelected = selectedId === e.booking.id;
          const seatedMins = minutesSince(
            e.booking.seated_at ?? e.booking.service_at,
          );

          return (
            <button
              key={e.booking.id}
              type="button"
              className={`s360-booking-tile ${isSelected ? "selected" : ""} ${readyOrders.length > 0 ? "tile-ready" : ""}`}
              style={
                {
                  "--tile-color": cfg.color,
                  "--tile-bg": cfg.bg,
                  "--tile-border": cfg.border,
                } as React.CSSProperties
              }
              onClick={() => onSelect(isSelected ? null : e.booking.id)}
            >
              <div className="s360-booking-tile__top">
                <div
                  className="s360-booking-tile__dot"
                  style={{ background: cfg.dot }}
                />
                <div className="s360-booking-tile__name">{memberName}</div>
                <div className="s360-booking-tile__party">
                  <Users size={10} />
                  {e.booking.party_size}
                </div>
              </div>
              <div className="s360-booking-tile__meta">
                <span>{formatTime(e.booking.estimated_arrival)}</span>
                <span>
                  {MEAL_LABELS[e.booking.meal_type] ?? e.booking.meal_type}
                </span>
                {seatedMins !== null && (
                  <span className="s360-booking-tile__timer">
                    <Clock size={9} />
                    {formatDuration(seatedMins)}
                  </span>
                )}
              </div>
              {dietary && (
                <div className="s360-booking-tile__dietary">⚠ {dietary}</div>
              )}
              <div className="s360-booking-tile__orders">
                {readyOrders.length > 0 && (
                  <span className="s360-order-dot ready">
                    {readyOrders.length} ready
                  </span>
                )}
                {inKitchen.length > 0 && (
                  <span className="s360-order-dot kitchen">
                    {inKitchen.length} cooking
                  </span>
                )}
                {e.orders.filter(
                  (o) => !o.fired_at && o.kitchen_status === "INCOMING",
                ).length > 0 && (
                  <span className="s360-order-dot preorder">🧾 pre-order</span>
                )}
                {e.orders.length === 0 && (
                  <span className="s360-order-dot none">no orders</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────

function DetailDrawer({
  enriched,
  menuMap,
  onClose,
  onChanged,
  onToast,
}: {
  enriched: EnrichedBooking;
  menuMap: Record<number, string>;
  onClose: () => void;
  onChanged: () => void;
  onToast: (toast: Omit<Toast, "id">) => void;
}) {
  const { booking, attendees, orders, room } = enriched;
  const [showOrderEntry, setShowOrderEntry] = useState(false);
  const [itemsMap, setItemsMap] = useState<Record<number, OrderItem[]>>({});
  const [firingId, setFiringId] = useState<number | null>(null);
  const [markingId, setMarkingId] = useState<number | null>(null);
  const [actioning, setActioning] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);

  const cfg = STATUS_CFG[booking.status] ?? STATUS_CFG.CONFIRMED;
  const dietary = getDietaryLabel(attendees);
  const canOrder = ["SEATED", "SERVICE"].includes(booking.status);
  const activeOrders = orders.filter((o) => o.kitchen_status !== "SERVED");
  const seatedMins = minutesSince(booking.seated_at ?? booking.service_at);

  // Next possible status actions
  const STATUS_NEXT: Record<
    string,
    {
      action: string;
      label: string;
      style: "primary" | "ghost";
      adminOnly?: boolean;
    }[]
  > = {
    CONFIRMED: [{ action: "SEATED", label: "Seat Party", style: "primary" }],
    SEATED: [{ action: "SERVICE", label: "Start Service", style: "primary" }],
    SERVICE: [],
  };
  const nextActions = STATUS_NEXT[booking.status] ?? [];

  useEffect(() => {
    const load = async () => {
      const entries = await Promise.all(
        orders.map(async (o) => {
          try {
            return [o.id, await getOrderItems(o.id)] as [number, OrderItem[]];
          } catch {
            return [o.id, []] as [number, OrderItem[]];
          }
        }),
      );
      setItemsMap(Object.fromEntries(entries));
    };
    load();
  }, [orders]);

  async function handleFire(orderId: number) {
    setFiringId(orderId);
    try {
      await fireOrder(orderId);
      onToast({
        type: "fired",
        orderId,
        roomName: room?.name ?? "Kitchen",
        message: `Order #${orderId} sent to kitchen`,
      });
      onChanged();
    } catch {
      /* noop */
    } finally {
      setFiringId(null);
    }
  }

  async function handleMarkServed(orderId: number) {
    setMarkingId(orderId);
    try {
      await updateKitchenStatus(orderId, "SERVED");
      onChanged();
    } catch {
      /* noop */
    } finally {
      setMarkingId(null);
    }
  }

  async function handleDeleteItem(orderId: number, itemId: number) {
    setDeletingItemId(itemId);
    try {
      await removeOrderItem(orderId, itemId);
      const remaining = (itemsMap[orderId] ?? []).filter(
        (i) => i.id !== itemId,
      );
      setItemsMap((prev) => ({ ...prev, [orderId]: remaining }));

      // If order is now empty and unfired, delete the shell
      const order = orders.find((o) => o.id === orderId);
      if (remaining.length === 0 && order && order.fired_at === null) {
        await cancelOrder(orderId);
      }

      onChanged();
    } catch (err) {
      console.error("Failed to delete item", err);
    } finally {
      setDeletingItemId(null);
    }
  }

  async function handleStatusAction(action: string) {
    setActioning(true);
    try {
      await executeBookingAction(booking.id, ACTION_MAP[action] ?? action);
      onChanged();
    } catch {
      /* noop */
    } finally {
      setActioning(false);
    }
  }

  return (
    <div className="s360-drawer">
      <div
        className="s360-drawer__header"
        style={{ background: cfg.bg, borderColor: cfg.border }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="s360-drawer__eyebrow">
            {room?.name ?? `Room ${booking.room_id}`}
          </div>
          <div className="s360-drawer__title">{getMemberName(attendees)}</div>
          <div className="s360-drawer__sub">
            <span
              className="s360-status-pill"
              style={{
                color: cfg.color,
                background: "rgba(255,255,255,0.6)",
                borderColor: cfg.border,
              }}
            >
              <span
                className="s360-status-dot"
                style={{ background: cfg.dot }}
              />
              {cfg.label}
            </span>
            <span>Party of {booking.party_size}</span>
            <span>{formatTime(booking.estimated_arrival)}</span>
            {seatedMins !== null && (
              <span>
                <Clock size={10} /> {formatDuration(seatedMins)}
              </span>
            )}
          </div>
        </div>
        <button className="s360-drawer__close" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      <div className="s360-drawer__body">
        {/* Status Actions */}
        {nextActions.length > 0 && (
          <div className="s360-action-row">
            {nextActions.map((a) => (
              <button
                key={a.action}
                className={
                  a.style === "primary"
                    ? "s360-action-btn s360-action-btn--primary"
                    : "s360-action-btn s360-action-btn--ghost"
                }
                disabled={actioning}
                onClick={() => handleStatusAction(a.action)}
              >
                <ArrowRight size={13} />
                {actioning ? "..." : a.label}
              </button>
            ))}
          </div>
        )}

        {dietary && (
          <div className="s360-dietary-alert">
            <span className="s360-dietary-alert__icon">⚠</span>
            <span>{dietary}</span>
          </div>
        )}

        {attendees.length > 0 && (
          <div className="s360-drawer-section">
            <div className="s360-drawer-section__label">Guests</div>
            <div className="s360-attendee-list">
              {attendees.map((a) => (
                <div key={a.id} className="s360-attendee-row">
                  <span className="s360-attendee-row__name">
                    {`${a.guest_first_name ?? ""} ${a.guest_last_name ?? ""}`.trim() ||
                      `Member #${a.linked_member_id}`}
                  </span>
                  {a.dietary_flags.length > 0 && (
                    <span className="s360-attendee-row__flags">
                      {a.dietary_flags
                        .map((f) =>
                          f === "OTHER" && a.dietary_other_note
                            ? a.dietary_other_note
                            : f.replace(/_/g, " "),
                        )
                        .join(", ")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="s360-drawer-section">
          <div className="s360-drawer-section__header">
            <div className="s360-drawer-section__label">
              <ChefHat size={12} /> Orders
            </div>
            {canOrder && (
              <button
                className="s360-add-order-btn"
                onClick={() => setShowOrderEntry(true)}
              >
                <Utensils size={12} /> Add Order
              </button>
            )}
          </div>

          {activeOrders.length === 0 ? (
            <div className="s360-empty-orders">No active orders</div>
          ) : (
            <div className="s360-order-list">
              {activeOrders.map((o) => {
                const items = itemsMap[o.id] ?? [];
                const kCfg = KITCHEN_CFG[o.kitchen_status];
                const canFire =
                  o.kitchen_status === "INCOMING" && o.fired_at === null;
                const canServe = o.kitchen_status === "READY";
                return (
                  <div
                    key={o.id}
                    className={`s360-order-card ${o.kitchen_status === "READY" ? "s360-order-card--ready" : ""}`}
                  >
                    <div className="s360-order-card__header">
                      <span className="s360-order-card__id">Order #{o.id}</span>
                      <span
                        className="s360-order-status"
                        style={{ color: kCfg.color, background: kCfg.bg }}
                      >
                        {kCfg.label}
                      </span>
                    </div>
                    {items.length > 0 && (
                      <div className="s360-order-items">
                        {items.map((item) => (
                          <div key={item.id} className="s360-order-item">
                            <span className="s360-order-item__qty">
                              {item.quantity}×
                            </span>
                            <span className="s360-order-item__name">
                              {menuMap[item.menu_item_id] ??
                                `Item #${item.menu_item_id}`}
                            </span>
                            {item.special_instructions && (
                              <span className="s360-order-item__note">
                                * {item.special_instructions}
                              </span>
                            )}
                            {o.fired_at === null && (
                              <button
                                type="button"
                                disabled={deletingItemId === item.id}
                                onClick={() => handleDeleteItem(o.id, item.id)}
                                style={{
                                  marginLeft: "auto",
                                  background: "none",
                                  border: "none",
                                  cursor:
                                    deletingItemId === item.id
                                      ? "not-allowed"
                                      : "pointer",
                                  color: "#dc2626",
                                  opacity:
                                    deletingItemId === item.id ? 0.4 : 0.7,
                                  padding: "0 2px",
                                  display: "flex",
                                  alignItems: "center",
                                }}
                              >
                                <X size={11} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="s360-order-card__actions">
                      {canFire && items.length > 0 && (
                        <button
                          className="s360-fire-btn"
                          disabled={firingId === o.id}
                          onClick={() => handleFire(o.id)}
                          style={{
                            background:
                              firingId === o.id ? "#166534" : undefined,
                            transition: "background 0.2s ease",
                          }}
                        >
                          {firingId === o.id ? (
                            <>
                              <span
                                style={{
                                  display: "inline-block",
                                  width: "12px",
                                  height: "12px",
                                  border: "2px solid rgba(255,255,255,0.3)",
                                  borderTopColor: "white",
                                  borderRadius: "50%",
                                  animation: "spin 0.7s linear infinite",
                                  flexShrink: 0,
                                }}
                              />
                              Firing...
                            </>
                          ) : (
                            <>
                              <Flame size={13} />
                              Fire to Kitchen
                            </>
                          )}
                        </button>
                      )}

                      {canServe && (
                        <button
                          className="s360-serve-btn"
                          disabled={markingId === o.id}
                          onClick={() => handleMarkServed(o.id)}
                        >
                          <CheckCircle size={13} />
                          {markingId === o.id ? "Marking..." : "Mark Served"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {booking.notes && (
          <div className="s360-drawer-section">
            <div className="s360-drawer-section__label">Notes</div>
            <div className="s360-notes">"{booking.notes}"</div>
          </div>
        )}
      </div>

      {showOrderEntry && (
        <OrderEntryDrawer
          bookingId={booking.id}
          bookingStatus={booking.status}
          onClose={() => setShowOrderEntry(false)}
          onOrderUpdated={() => onChanged()}
        />
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function StaffPage360() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [enriched, setEnriched] = useState<EnrichedBooking[]>([]);
  const [menuMap, setMenuMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const prevReadyRef = useRef<Set<number>>(new Set());

  function addToast(toast: Omit<Toast, "id">) {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      10000,
    );
  }

  const load = useCallback(async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [bookingsRes, roomsRes, menuItems] = await Promise.all([
        bookingsApi.get<Booking[]>("/bookings"),
        roomsApi.get<Room[]>("/rooms"),
        getMenuItems(),
      ]);

      setRooms(roomsRes.data.filter((r: Room) => r.is_active));

      const mmap: Record<number, string> = {};
      (menuItems as MenuItem[]).forEach((m) => {
        mmap[m.id] = m.name;
      });
      setMenuMap(mmap);

      const active = bookingsRes.data.filter(
        (b: Booking) =>
          ACTIVE_STATUSES.includes(b.status) && b.booking_date === today,
      );

      const enrichedData = await Promise.all(
        active.map(async (b: Booking) => {
          const [attendees, orders] = await Promise.allSettled([
            getAttendees(b.id),
            getOrdersByBooking(b.id),
          ]);
          return {
            booking: b,
            attendees: attendees.status === "fulfilled" ? attendees.value : [],
            orders: orders.status === "fulfilled" ? orders.value : [],
            room: (roomsRes.data as Room[]).find((r) => r.id === b.room_id),
          };
        }),
      );

      // Detect newly READY orders → toast
      const nowReady = new Set<number>();
      enrichedData.forEach((e) =>
        e.orders
          .filter((o) => o.kitchen_status === "READY")
          .forEach((o) => nowReady.add(o.id)),
      );
      const newlyReady = [...nowReady].filter(
        (id) => !prevReadyRef.current.has(id),
      );
      newlyReady.forEach((orderId) => {
        const e = enrichedData.find((en) =>
          en.orders.some((o) => o.id === orderId),
        );
        addToast({
          type: "ready",
          orderId,
          roomName: e?.room?.name ?? "Kitchen",
          message: `Order #${orderId} ready for pickup`,
        });
      });
      prevReadyRef.current = nowReady;

      setEnriched(enrichedData);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("StaffPage360 load failed", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 20000);
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

  const totalGuests = enriched.reduce(
    (acc, e) => acc + e.booking.party_size,
    0,
  );
  const readyCount = enriched.reduce(
    (acc, e) =>
      acc + e.orders.filter((o) => o.kitchen_status === "READY").length,
    0,
  );
  const inKitchenCount = enriched.reduce(
    (acc, e) =>
      acc + e.orders.filter((o) => o.kitchen_status === "IN_KITCHEN").length,
    0,
  );

  if (loading) return <div className="table-state">Loading floor...</div>;

  return (
    <div
      className={`s360-shell fade-in ${selectedId ? "s360-panel-open" : ""}`}
    >
      <div className="s360-header">
        <div className="s360-header__left">
          <div className="s360-header__kicker">Live Floor</div>
          <h2 className="s360-header__title">Today's Service</h2>
        </div>
        <div className="s360-header__stats">
          <div className="s360-stat">
            <span className="s360-stat__val">{enriched.length}</span>
            <span className="s360-stat__label">Tables</span>
          </div>
          <div className="s360-stat">
            <span className="s360-stat__val">{totalGuests}</span>
            <span className="s360-stat__label">Guests</span>
          </div>
          {readyCount > 0 && (
            <div className="s360-stat s360-stat--ready">
              <Bell size={13} />
              <span className="s360-stat__val">{readyCount}</span>
              <span className="s360-stat__label">Ready</span>
            </div>
          )}
          {inKitchenCount > 0 && (
            <div className="s360-stat s360-stat--kitchen">
              <ChefHat size={13} />
              <span className="s360-stat__val">{inKitchenCount}</span>
              <span className="s360-stat__label">Cooking</span>
            </div>
          )}
          <button className="s360-refresh-btn" onClick={load}>
            <RefreshCw size={13} />
            {lastRefresh.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </button>
        </div>
      </div>

      <UpcomingStrip enriched={enriched} onSelect={(id) => setSelectedId(id)} />

      <div className="s360-layout">
        <div className="s360-rooms">
          {enriched.length === 0 ? (
            <div className="s360-empty">
              <div className="s360-empty__title">Floor is clear</div>
              <div className="s360-empty__sub">
                No active bookings right now.
              </div>
            </div>
          ) : (
            rooms.map((room) => (
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
          <DetailDrawer
            enriched={selectedEnriched}
            menuMap={menuMap}
            onClose={() => setSelectedId(null)}
            onChanged={load}
            onToast={addToast}
          />
        )}
      </div>

      <ToastStack
        toasts={toasts}
        onDismiss={(id) => setToasts((p) => p.filter((t) => t.id !== id))}
      />

      <style>{`
        .s360-shell {
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-height: 0;
        }

        .s360-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .s360-header__kicker {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--accent, #a38a64);
          margin-bottom: 4px;
        }

        .s360-header__title {
          margin: 0;
          font-family: var(--font-display);
          font-size: 32px;
          font-weight: 500;
          letter-spacing: -0.02em;
          color: #18181b;
          line-height: 1;
        }

        .s360-header__stats {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .s360-stat {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 14px;
          border: 1px solid rgba(223,216,207,0.95);
          background: linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(249,247,244,0.98) 100%);
          box-shadow: 0 6px 16px rgba(0,0,0,0.04);
        }

        .s360-stat--ready {
          background: rgba(220,252,231,0.85);
          border-color: rgba(134,239,172,0.6);
          color: #166534;
          animation: s360-pulse 2s infinite;
        }

        .s360-stat--kitchen {
          background: rgba(254,243,199,0.85);
          border-color: rgba(252,211,77,0.6);
          color: #92400e;
        }

        @keyframes s360-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.25); }
          50% { box-shadow: 0 0 0 6px rgba(34,197,94,0); }
        }

        .s360-stat__val {
          font-size: 18px;
          font-weight: 800;
          color: inherit;
          line-height: 1;
        }

        .s360-stat__label {
          font-size: 10px;
          font-weight: 700;
          color: inherit;
          opacity: 0.7;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .s360-refresh-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          height: 38px;
          padding: 0 14px;
          border-radius: 999px;
          border: 1px solid rgba(223,216,207,0.95);
          background: linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(249,247,244,0.98) 100%);
          color: #5f5a53;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 6px 16px rgba(0,0,0,0.04);
        }

        .s360-upcoming {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 16px;
          border: 1px solid rgba(223,216,207,0.95);
          background: linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(249,247,244,0.96) 100%);
          box-shadow: 0 8px 20px rgba(0,0,0,0.04);
          overflow: hidden;
        }

        .s360-upcoming__label {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 10px;
          font-weight: 700;
          color: #9b948b;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .s360-upcoming__scroll {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          scrollbar-width: none;
          flex: 1;
        }

        .s360-upcoming__scroll::-webkit-scrollbar { display: none; }

        .s360-upcoming-chip {
          flex-shrink: 0;
          padding: 8px 12px;
          border-radius: 12px;
          border: 1px solid rgba(223,216,207,0.95);
          background: rgba(255,255,255,0.85);
          min-width: 120px;
          text-align: left;
          cursor: pointer;
          transition: transform 0.15s ease;
        }

        .s360-upcoming-chip:hover { transform: translateY(-1px); }

        .s360-upcoming-chip.urgent {
          border-color: rgba(252,211,77,0.7);
          background: rgba(254,243,199,0.7);
        }

        .s360-upcoming-chip__name {
          font-size: 12px;
          font-weight: 700;
          color: #18181b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 120px;
        }

        .s360-upcoming-chip__meta {
          font-size: 10px;
          color: #8e887f;
          margin-top: 2px;
        }

        .s360-upcoming-chip__time {
          font-size: 11px;
          font-weight: 800;
          color: #92400e;
          margin-top: 4px;
        }

        .s360-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          align-items: start;
        }

        .s360-shell.s360-panel-open .s360-layout {
          grid-template-columns: 1fr 380px;
        }

        .s360-rooms {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 14px;
          align-items: start;
        }

        .s360-room-card {
          background: linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(250,248,245,0.98) 100%);
          border: 1px solid rgba(223,216,207,0.95);
          border-radius: 20px;
          padding: 16px;
          box-shadow: 0 16px 40px rgba(0,0,0,0.06), 0 6px 16px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.84);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .s360-room-card.has-ready {
          border-color: rgba(134,239,172,0.7);
          box-shadow: 0 16px 40px rgba(34,197,94,0.08), 0 6px 16px rgba(34,197,94,0.05);
        }

        .s360-room-card--empty {
          opacity: 0.4;
          border-style: dashed;
          box-shadow: none;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
        }

        .s360-room-card__header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
        }

        .s360-room-card__name {
          font-family: var(--font-display);
          font-size: 20px;
          font-weight: 500;
          color: #18181b;
          letter-spacing: -0.01em;
        }

        .s360-room-card__sub {
          font-size: 11px;
          color: #8e887f;
          margin-top: 3px;
        }

        .s360-room-card__empty-label {
          font-size: 11px;
          color: #b0a89e;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .s360-ready-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 10px;
          border-radius: 999px;
          background: rgba(220,252,231,0.9);
          border: 1px solid rgba(134,239,172,0.6);
          color: #166534;
          font-size: 10px;
          font-weight: 800;
          animation: s360-pulse 2s infinite;
          flex-shrink: 0;
        }

        .s360-room-card__bookings {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .s360-booking-tile {
          width: 100%;
          text-align: left;
          border: 1.5px solid var(--tile-border);
          background: var(--tile-bg);
          border-radius: 14px;
          padding: 11px 13px;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .s360-booking-tile:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(0,0,0,0.08); }
        .s360-booking-tile.selected { outline: 2px solid #18181b; outline-offset: 1px; box-shadow: 0 10px 24px rgba(0,0,0,0.10); }
        .s360-booking-tile.tile-ready { border-color: rgba(134,239,172,0.8); }

        .s360-booking-tile__top {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .s360-booking-tile__dot {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          flex-shrink: 0;
        }

        .s360-booking-tile__name {
          font-size: 13px;
          font-weight: 700;
          color: #18181b;
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .s360-booking-tile__party {
          display: flex;
          align-items: center;
          gap: 3px;
          font-size: 11px;
          font-weight: 700;
          color: var(--tile-color);
          flex-shrink: 0;
        }

        .s360-booking-tile__meta {
          display: flex;
          gap: 8px;
          font-size: 11px;
          color: #7a746c;
          font-weight: 600;
          align-items: center;
        }

        .s360-booking-tile__timer {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 10px;
          color: #a49d94;
        }

        .s360-booking-tile__dietary {
          font-size: 10px;
          font-weight: 700;
          color: #92400e;
          background: rgba(254,243,199,0.6);
          border-radius: 6px;
          padding: 2px 6px;
        }

        .s360-booking-tile__orders {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .s360-order-dot {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 999px;
        }

        .s360-order-dot.ready { background: rgba(220,252,231,0.9); color: #166534; border: 1px solid rgba(134,239,172,0.5); }
        .s360-order-dot.kitchen { background: rgba(254,243,199,0.9); color: #92400e; border: 1px solid rgba(252,211,77,0.4); }

        .s360-drawer {
          background: linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(250,248,245,0.98) 100%);
          border: 1px solid rgba(223,216,207,0.95);
          border-radius: 22px;
          box-shadow: 0 30px 80px rgba(0,0,0,0.10), 0 10px 28px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.84);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: sticky;
          top: 24px;
          max-height: calc(100vh - 120px);
        }

        .s360-drawer__header {
          padding: 16px 18px;
          border-bottom: 1px solid rgba(234,229,223,0.9);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .s360-drawer__eyebrow {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--accent, #a38a64);
          margin-bottom: 4px;
        }

        .s360-drawer__title {
          font-family: var(--font-display);
          font-size: 22px;
          font-weight: 500;
          color: #18181b;
          line-height: 1.1;
        }

        .s360-drawer__sub {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 6px;
          font-size: 12px;
          color: #7a746c;
        }

        .s360-drawer__close {
          width: 32px;
          height: 32px;
          border-radius: 999px;
          border: 1px solid rgba(230,224,217,0.95);
          background: rgba(255,255,255,0.72);
          cursor: pointer;
          color: #6d675f;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .s360-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 9px;
          border-radius: 999px;
          border: 1px solid;
          font-size: 11px;
          font-weight: 700;
        }

        .s360-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          display: inline-block;
        }

        .s360-drawer__body {
          padding: 14px 18px 18px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          overflow-y: auto;
        }

        .s360-action-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .s360-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 9px 16px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .s360-action-btn:hover { transform: translateY(-1px); }
        .s360-action-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .s360-action-btn--primary {
          background: #18181b;
          color: white;
          border: none;
          box-shadow: 0 10px 24px rgba(0,0,0,0.14);
          flex: 1;
          justify-content: center;
        }

        .s360-action-btn--ghost {
          background: rgba(248,245,241,0.88);
          color: #5f5a53;
          border: 1px solid rgba(223,216,207,0.95);
        }

        .s360-dietary-alert {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 12px;
          background: rgba(254,243,199,0.85);
          border: 1px solid rgba(252,211,77,0.5);
          color: #92400e;
          font-size: 12px;
          font-weight: 700;
        }

        .s360-dietary-alert__icon { font-size: 14px; flex-shrink: 0; }

        .s360-drawer-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .s360-drawer-section__label {
          font-size: 10px;
          font-weight: 700;
          color: #9b948b;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .s360-drawer-section__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .s360-attendee-list { display: flex; flex-direction: column; gap: 6px; }

        .s360-attendee-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 10px;
          background: rgba(248,245,241,0.88);
          border: 1px solid rgba(235,229,223,0.95);
        }

        .s360-attendee-row__name { font-size: 12px; font-weight: 700; color: #2b2824; }
        .s360-attendee-row__flags { font-size: 10px; color: #92400e; font-weight: 700; text-align: right; max-width: 50%; line-height: 1.4; }

        .s360-add-order-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 12px;
          border-radius: 999px;
          border: 1px solid rgba(223,216,207,0.95);
          background: #18181b;
          color: white;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .s360-empty-orders { font-size: 12px; color: #a49d94; padding: 8px 0; }
        .s360-order-list { display: flex; flex-direction: column; gap: 8px; }

        .s360-order-card {
          border: 1px solid rgba(235,229,223,0.95);
          border-radius: 14px;
          overflow: hidden;
          background: rgba(255,255,255,0.75);
        }

        .s360-order-card--ready {
          border-color: rgba(134,239,172,0.7);
          background: rgba(240,253,244,0.6);
        }

        .s360-order-card__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 9px 12px;
          border-bottom: 1px solid rgba(235,229,223,0.8);
        }

        .s360-order-card__id { font-size: 12px; font-weight: 700; color: #3f3a34; }

        .s360-order-status {
          font-size: 10px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 999px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .s360-order-items {
          padding: 8px 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .s360-order-item {
          display: flex;
          align-items: baseline;
          gap: 6px;
          font-size: 12px;
          color: #3f3a34;
          flex-wrap: wrap;
        }

        .s360-order-item__qty { font-weight: 800; color: #18181b; flex-shrink: 0; }
        .s360-order-item__name { font-weight: 600; flex: 1; }
        .s360-order-item__note { font-size: 10px; color: #8b7d6b; font-style: italic; width: 100%; padding-left: 18px; }

        .s360-order-card__actions { padding: 8px 12px; display: flex; gap: 8px; }

        .s360-fire-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 7px 14px;
          border-radius: 999px;
          border: none;
          background: #18181b;
          color: white;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 8px 18px rgba(0,0,0,0.14);
        }

        .s360-fire-btn:disabled, .s360-serve-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .s360-serve-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 7px 14px;
          border-radius: 999px;
          border: 1px solid rgba(134,239,172,0.6);
          background: rgba(220,252,231,0.85);
          color: #166534;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .s360-notes {
          font-size: 12px;
          color: #5e5952;
          font-style: italic;
          line-height: 1.6;
          padding: 8px 10px;
          background: rgba(248,245,241,0.88);
          border-radius: 10px;
          border: 1px solid rgba(235,229,223,0.95);
        }

        .s360-empty {
          text-align: center;
          padding: 60px 24px;
          border-radius: 20px;
          border: 1px dashed rgba(223,216,207,0.95);
          background: linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(250,248,245,0.98) 100%);
        }

        .s360-empty__title { font-family: var(--font-display); font-size: 26px; color: #18181b; margin-bottom: 6px; }
        .s360-empty__sub { font-size: 13px; color: #8e887f; }

        .s360-toast {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 16px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.14);
          backdrop-filter: blur(8px);
          animation: s360-slide-in 0.3s ease;
        }

        .s360-toast--ready {
          background: rgba(220,252,231,0.96);
          border: 1px solid rgba(134,239,172,0.7);
        }

        .s360-toast--fired {
          background: rgba(254,243,199,0.96);
          border: 1px solid rgba(252,211,77,0.6);
        }

        @keyframes s360-slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        .s360-toast__icon { flex-shrink: 0; margin-top: 1px; }
        .s360-toast--ready .s360-toast__icon { color: #166534; }
        .s360-toast--fired .s360-toast__icon { color: #92400e; }

        .s360-toast__body { flex: 1; min-width: 0; }

        .s360-toast__title { font-size: 12px; font-weight: 800; }
        .s360-toast--ready .s360-toast__title { color: #166534; }
        .s360-toast--fired .s360-toast__title { color: #92400e; }

        .s360-toast__detail { font-size: 11px; margin-top: 2px; line-height: 1.4; }
        .s360-toast--ready .s360-toast__detail { color: #15803d; }
        .s360-toast--fired .s360-toast__detail { color: #78350f; }

        .s360-toast__close { background: none; border: none; cursor: pointer; opacity: 0.6; padding: 2px; flex-shrink: 0; color: inherit; }

        @media (max-width: 1100px) {
          .s360-shell.s360-panel-open .s360-layout { grid-template-columns: 1fr; }
          .s360-drawer { position: static; max-height: none; }
        }

        @media (max-width: 760px) {
          .s360-header { flex-direction: column; align-items: flex-start; }
          .s360-rooms { grid-template-columns: 1fr; }
          .s360-header__title { font-size: 26px; }
        }

        .s360-order-dot.preorder {
  background: rgba(238,242,255,0.9);
  color: #4338ca;
  border: 1px solid rgba(129,140,248,0.4);
}
.s360-order-dot.none {
  background: rgba(244,244,245,0.8);
  color: #a1a1aa;
  border: 1px solid rgba(228,228,231,0.6);
}
  @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
