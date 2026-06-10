import { useEffect, useState } from "react";
import type { Order, OrderItem } from "../api/orders";
import {
  getOrderItems,
  voidOrderItem,
  updateKitchenStatus,
} from "../api/orders";
import { getBooking, getAttendees } from "../api/bookings";
import type { Booking, Attendee } from "../types/booking";
import { X } from "lucide-react";

interface KitchenCardProps {
  order: Order;
  menuMap: Record<number, string>;
  roomMap: Record<number, string>;
  nextLabel?: string;
  onNext?: (id: number) => void;
  isAdmin?: boolean;
  onAction?: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#888",
  CONFIRMED: "#1a4fa0",
  SEATED: "#166534",
  SERVICE: "#b36a00",
  COMPLETED: "#444",
  CANCELLED: "#c0392b",
};

const MEAL_LABELS: Record<string, string> = {
  LUNCH: "Lunch",
  DINNER: "Dinner",
  AFTERHOURS: "After Hours",
  SPECIAL_EVENT: "Special Event",
};

export function KitchenCard({
  order,
  menuMap,
  roomMap,
  nextLabel,
  onNext,
  isAdmin = false,
  onAction,
}: KitchenCardProps) {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [voidingItemId, setVoidingItemId] = useState<number | null>(null);
  const [voidedIds, setVoidedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    setLoadingItems(true);
    Promise.all([
      getOrderItems(order.id),
      getBooking(order.booking_id),
      getAttendees(order.booking_id),
    ])
      .then(([orderItems, bookingData, attendeeData]) => {
        setItems(orderItems);
        setBooking(bookingData);
        setAttendees(attendeeData);
      })
      .catch((err) => console.error("KitchenCard load failed", order.id, err))
      .finally(() => setLoadingItems(false));
  }, [order.id, order.booking_id]);

  async function handleVoidItem(itemId: number) {
    setVoidingItemId(itemId);
    try {
      await voidOrderItem(order.id, itemId);
      const newVoided = new Set([...voidedIds, itemId]);
      setVoidedIds(newVoided);
      onAction?.();
    } catch (err) {
      console.error("Failed to void item", err);
    } finally {
      setVoidingItemId(null);
    }
  }

  const allDietary = [...new Set(attendees.flatMap((a) => a.dietary_flags))];
  const firedTime = order.fired_at
    ? new Date(order.fired_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="kitchen-card fade-in">
      <div className="kitchen-card__body">
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "10px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="order-id">Order #{order.id}</span>
              {booking && (
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase" as const,
                    padding: "1px 6px",
                    borderRadius: "3px",
                    background: `${STATUS_COLORS[booking.status]}18`,
                    color: STATUS_COLORS[booking.status],
                  }}
                >
                  {booking.status}
                </span>
              )}
            </div>
            {booking && (
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--zinc-500)",
                  marginTop: "3px",
                }}
              >
                Booking #{booking.id}
              </div>
            )}
          </div>
          <span
            style={{
              fontSize: "11px",
              color: "var(--zinc-400)",
              textAlign: "right" as const,
            }}
          >
            {firedTime ? `Fired ${firedTime}` : "not fired"}
          </span>
        </div>

        {/* Booking context */}
        {booking && (
          <div
            style={{
              background: "var(--zinc-50)",
              borderRadius: "6px",
              padding: "8px 10px",
              marginBottom: "10px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "4px 12px",
            }}
          >
            {(
              [
                ["Room", roomMap[booking.room_id] ?? `Room ${booking.room_id}`],
                ["Arrival", booking.estimated_arrival?.slice(0, 5) ?? "—"],
                ["Meal", MEAL_LABELS[booking.meal_type] ?? booking.meal_type],
                ["Party", String(booking.party_size)],
              ] as [string, string][]
            ).map(([label, value]) => (
              <div
                key={label}
                style={{ display: "flex", gap: "4px", fontSize: "11px" }}
              >
                <span style={{ color: "var(--zinc-400)", minWidth: "40px" }}>
                  {label}
                </span>
                <span style={{ color: "var(--zinc-800)", fontWeight: 500 }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Attendee names */}
        {attendees.length > 0 && (
          <div
            style={{
              fontSize: "11px",
              color: "var(--zinc-600)",
              marginBottom: "8px",
            }}
          >
            <span style={{ color: "var(--zinc-400)", marginRight: "4px" }}>
              Party:
            </span>
            {attendees.map((a, i) => (
              <span key={a.id}>
                {`${a.guest_first_name ?? ""} ${a.guest_last_name ?? ""}`.trim() ||
                  `Member #${a.linked_member_id}`}
                {i < attendees.length - 1 ? ", " : ""}
              </span>
            ))}
          </div>
        )}

        {/* Dietary flags */}
        {allDietary.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "4px",
              marginBottom: "10px",
            }}
          >
            {allDietary.map((flag) => {
              const otherNote =
                flag === "OTHER"
                  ? attendees
                      .map((a) => a.dietary_other_note)
                      .filter(Boolean)
                      .join(", ")
                  : null;
              return (
                <span
                  key={flag}
                  style={{
                    padding: "1px 7px",
                    borderRadius: "20px",
                    fontSize: "10px",
                    fontWeight: 600,
                    background: "#fef3c7",
                    color: "#92400e",
                  }}
                >
                  {flag === "OTHER" && otherNote
                    ? `OTHER: ${otherNote}`
                    : flag.replace(/_/g, " ")}
                </span>
              );
            })}
          </div>
        )}

        {/* Divider */}
        <div
          style={{ borderTop: "1px solid var(--zinc-100)", margin: "8px 0" }}
        />

        {/* Order items */}
        <div className="order-items-list">
          {loadingItems ? (
            <div style={{ fontSize: "12px", color: "var(--zinc-400)" }}>
              Loading items...
            </div>
          ) : items.length === 0 ? (
            <div style={{ fontSize: "12px", color: "var(--zinc-400)" }}>
              No items
            </div>
          ) : (
            items.map((item) => {
              const isVoided = voidedIds.has(item.id) || item.voided === true;
              return (
                <div key={item.id} className="order-item-group">
                  <div
                    className="base-item"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      opacity: isVoided ? 0.4 : 1,
                    }}
                  >
                    <span
                      className="item-qty"
                      style={{
                        textDecoration: isVoided ? "line-through" : "none",
                      }}
                    >
                      {item.quantity}×
                    </span>
                    <span
                      className="item-name"
                      style={{
                        flex: 1,
                        textDecoration: isVoided ? "line-through" : "none",
                      }}
                    >
                      {menuMap[item.menu_item_id] ??
                        `Item #${item.menu_item_id}`}
                    </span>
                    {isVoided && (
                      <span
                        style={{
                          fontSize: "9px",
                          fontWeight: 700,
                          color: "#dc2626",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        VOIDED
                      </span>
                    )}
                    {isAdmin && !isVoided && (
                      <button
                        type="button"
                        disabled={voidingItemId === item.id}
                        onClick={() => handleVoidItem(item.id)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor:
                            voidingItemId === item.id
                              ? "not-allowed"
                              : "pointer",
                          color: "#dc2626",
                          opacity: voidingItemId === item.id ? 0.4 : 0.7,
                          padding: "0 2px",
                          display: "flex",
                          alignItems: "center",
                          flexShrink: 0,
                        }}
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                  {(item.modifier_ids || []).map((mid) => (
                    <div
                      key={mid}
                      style={{
                        fontSize: "11px",
                        color: "var(--zinc-500)",
                        paddingLeft: "24px",
                        textDecoration: isVoided ? "line-through" : "none",
                        opacity: isVoided ? 0.4 : 1,
                      }}
                    >
                      ↳ {menuMap[mid] ?? `Mod #${mid}`}
                    </div>
                  ))}
                  {item.special_instructions && (
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--zinc-400)",
                        paddingLeft: "24px",
                        fontStyle: "italic",
                        opacity: isVoided ? 0.4 : 1,
                      }}
                    >
                      {item.special_instructions}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Order notes */}
        {order.notes && (
          <div
            style={{
              fontSize: "12px",
              color: "var(--zinc-500)",
              marginTop: "8px",
              fontStyle: "italic",
            }}
          >
            {order.notes}
          </div>
        )}

        {/* Action button */}
        {(() => {
          const allVoided =
            items.length > 0 &&
            items.every((i) => i.voided || voidedIds.has(i.id));
          if (allVoided) {
            return (
              <button
                type="button"
                className="btn-primary btn-block"
                style={{ marginTop: "12px", background: "#dc2626" }}
                onClick={async () => {
                  await updateKitchenStatus(order.id, "SERVED");
                  onAction?.();
                }}
              >
                Clear Voided Order
              </button>
            );
          }
          if (nextLabel && onNext) {
            return (
              <button
                type="button"
                className="btn-primary btn-block"
                style={{ marginTop: "12px" }}
                onClick={() => onNext(order.id)}
              >
                {nextLabel}
              </button>
            );
          }
          return null;
        })()}
      </div>
    </div>
  );
}
