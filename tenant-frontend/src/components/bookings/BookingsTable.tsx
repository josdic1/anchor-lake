import { useMemo, useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import type { Attendee, Booking, Room } from "../../types/booking";
import { BookingRow } from "./BookingRow";

type Props = {
  bookings: Booking[];
  rooms: Room[];
  attendeeMap: Record<number, Attendee[]>;
  ordersMap: Record<number, boolean>;
  selectedBookingId: number | null;
  onSelectBooking: (id: number) => void;
  loading: boolean;
  error: string;
};

type SortKey =
  | "id"
  | "booking_date"
  | "estimated_arrival"
  | "meal_type"
  | "room_id"
  | "party_size"
  | "status"
  | "member_name";
type SortOrder = "asc" | "desc";

function getRoomName(rooms: Room[], roomId: number): string {
  return rooms.find((r) => r.id === roomId)?.name ?? `Room ${roomId}`;
}

export function BookingsTable({
  bookings,
  rooms,
  attendeeMap,
  ordersMap,
  selectedBookingId,
  onSelectBooking,
  loading,
  error,
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("booking_date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const getMemberName = (bookingId: number) => {
    const attendees = attendeeMap[bookingId] || [];
    const memberAttendee = attendees.find((a) => a.linked_member_id !== null);
    if (
      memberAttendee &&
      (memberAttendee.guest_first_name || memberAttendee.guest_last_name)
    ) {
      return `${memberAttendee.guest_first_name ?? ""} ${memberAttendee.guest_last_name ?? ""}`.trim();
    }
    if (attendees.length > 0) {
      const first = attendees[0];
      const name =
        `${first.guest_first_name ?? ""} ${first.guest_last_name ?? ""}`.trim();
      return name || "Unnamed Guest";
    }
    return "No Attendees";
  };

  const sortedBookings = useMemo(() => {
    return [...bookings].sort((a, b) => {
      let aVal: unknown;
      let bVal: unknown;

      if (sortKey === "member_name") {
        aVal = getMemberName(a.id);
        bVal = getMemberName(b.id);
      } else {
        aVal = a[sortKey as keyof Booking];
        bVal = b[sortKey as keyof Booking];
      }

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (sortOrder === "asc") return aVal > bVal ? 1 : -1;
      else return aVal < bVal ? 1 : -1;
    });
  }, [bookings, sortKey, sortOrder, attendeeMap]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  if (loading) return <div className="table-state">Loading bookings...</div>;
  if (error)
    return <div className="table-state table-state--error">{error}</div>;

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return null;
    return sortOrder === "asc" ? (
      <ChevronUp size={14} />
    ) : (
      <ChevronDown size={14} />
    );
  };

  return (
    <div className="bookings-table-wrap">
      <div className="table-toolbar">
        <span className="table-count">
          {bookings.length} {bookings.length === 1 ? "booking" : "bookings"}
        </span>
      </div>

      {bookings.length === 0 ? (
        <div className="table-state">No bookings match your filters.</div>
      ) : (
        <div className="table-scroll">
          <table className="bookings-table">
            <thead>
              <tr>
                {(
                  [
                    ["id", "ID"],
                    ["member_name", "Member"],
                    ["booking_date", "Date"],
                    ["estimated_arrival", "Arrival"],
                    ["meal_type", "Meal"],
                    ["room_id", "Room"],
                    ["party_size", "Party"],
                    ["status", "Status"],
                  ] as [SortKey, string][]
                ).map(([key, label]) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    style={{ cursor: "pointer" }}
                    className={key === "party_size" ? "th-center" : undefined}
                  >
                    <div
                      className="row"
                      style={{
                        gap: "4px",
                        justifyContent:
                          key === "party_size" ? "center" : undefined,
                      }}
                    >
                      {label} <SortIcon column={key} />
                    </div>
                  </th>
                ))}
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sortedBookings.map((booking) => (
                <BookingRow
                  key={booking.id}
                  booking={booking}
                  memberName={getMemberName(booking.id)}
                  roomName={getRoomName(rooms, booking.room_id)}
                  attendees={attendeeMap[booking.id] || []}
                  hasOrders={ordersMap[booking.id] ?? false}
                  isSelected={booking.id === selectedBookingId}
                  onSelect={onSelectBooking}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
