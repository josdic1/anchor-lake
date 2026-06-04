import { Leaf, ShoppingBag } from "lucide-react";
import type { Attendee } from "../../types/booking";

type Props = {
  attendees: Attendee[];
  hasOrders: boolean; // placeholder — wire later
};

export function BookingInfoIcons({ attendees, hasOrders }: Props) {
  const hasDietary = attendees.some((a) => a.dietary_flags.length > 0);

  return (
    <span className="info-icons">
      <span
        className={`info-icon ${hasDietary ? "info-icon--active" : "info-icon--inactive"}`}
        title={hasDietary ? "Dietary requirements" : "No dietary requirements"}
      >
        <Leaf size={14} />
      </span>
      <span
        className={`info-icon ${hasOrders ? "info-icon--active" : "info-icon--inactive"}`}
        title={hasOrders ? "Has orders" : "No orders"}
      >
        <ShoppingBag size={14} />
      </span>
    </span>
  );
}
