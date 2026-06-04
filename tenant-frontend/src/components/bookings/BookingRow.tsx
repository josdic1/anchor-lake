import { Leaf, ShoppingBag } from "lucide-react";
import type {
  Attendee,
  Booking,
  BookingStatus,
  MealType,
} from "../../types/booking";

type Props = {
  booking: Booking;
  memberName: string;
  roomName: string;
  attendees: Attendee[];
  hasOrders: boolean;
  isSelected: boolean;
  onSelect: (id: number) => void;
};

const STATUS_COLORS: Record<BookingStatus, { bg: string; color: string }> = {
  DRAFT: { bg: "#f0f0f0", color: "#666" },
  CONFIRMED: { bg: "#e8f4e8", color: "#2d7a2d" },
  SEATED: { bg: "#e8f0fb", color: "#1a4fa0" },
  SERVICE: { bg: "#fff4e0", color: "#b36a00" },
  COMPLETED: { bg: "#f5f5f5", color: "#444" },
  CANCELLED: { bg: "#fdecea", color: "#c0392b" },
};

const MEAL_LABELS: Record<MealType, string> = {
  LUNCH: "Lunch",
  DINNER: "Dinner",
  AFTERHOURS: "After Hours",
  SPECIAL_EVENT: "Special Event",
};

function StatusBadge({ status }: { status: BookingStatus }) {
  const { bg, color } = STATUS_COLORS[status] ?? { bg: "#eee", color: "#333" };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "3px",
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        background: bg,
        color,
      }}
    >
      {status}
    </span>
  );
}

export function BookingRow({
  booking,
  memberName,
  roomName,
  attendees = [],
  hasOrders,
  isSelected,
  onSelect,
}: Props) {
  const hasDietary = attendees.some((a) => a.dietary_flags?.length > 0);

  return (
    <tr
      className={`booking-row ${isSelected ? "booking-row--selected" : ""}`}
      onClick={() => onSelect(booking.id)}
    >
      <td className="td-mono">#{booking.id}</td>
      <td style={{ fontWeight: 500 }}>{memberName}</td>
      <td>{booking.booking_date}</td>
      <td>{booking.estimated_arrival?.slice(0, 5)}</td>
      <td>{MEAL_LABELS[booking.meal_type] ?? booking.meal_type}</td>
      <td>{roomName}</td>
      <td className="td-center">{booking.party_size}</td>
      <td>
        <StatusBadge status={booking.status} />
      </td>
      <td className="td-muted">{booking.notes ?? "—"}</td>
      <td className="td-icons">
        <div className="info-icons">
          <span
            className={`info-icon ${hasDietary ? "info-icon--active" : "info-icon--inactive"}`}
            title={
              hasDietary ? "Dietary requirements" : "No dietary requirements"
            }
          >
            <Leaf size={13} />
          </span>
          <span
            className={`info-icon ${hasOrders ? "info-icon--active" : "info-icon--inactive"}`}
            title={hasOrders ? "Has orders" : "No orders"}
          >
            <ShoppingBag size={13} />
          </span>
        </div>
      </td>
    </tr>
  );
}
