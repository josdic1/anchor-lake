import { useNavigate } from "react-router-dom";
import type { HouseholdMember } from "../../api/users";
import type { GuestForm } from "./AttendeeSection";
import type { Booking } from "../../types/booking";

const MEAL_LABELS: Record<string, string> = {
  LUNCH: "Lunch",
  DINNER: "Dinner",
  AFTERHOURS: "After Hours",
  SPECIAL_EVENT: "Special Event",
};

type Props = {
  booking: Booking;
  mode: "draft" | "confirmed";
  attendedMembers: HouseholdMember[];
  attendedGuests: GuestForm[];
  onReset: () => void;
};

export function BookingSuccessScreen({
  booking,
  mode,
  attendedMembers,
  attendedGuests,
  onReset,
}: Props) {
  const navigate = useNavigate();
  const totalAttendees = attendedMembers.length + attendedGuests.length;
  const isConfirmed = mode === "confirmed";

  return (
    <section className="panel">
      <h2>{isConfirmed ? "Booking Confirmed" : "Draft Saved"}</h2>

      <div className="success-meta">
        {[
          ["Booking", `#${booking.id} — ${booking.status}`],
          ["Date", booking.booking_date],
          ["Arrival", booking.estimated_arrival?.slice(0, 5)],
          ["Meal", MEAL_LABELS[booking.meal_type] ?? booking.meal_type],
          ["Party size", String(booking.party_size ?? totalAttendees)],
        ].map(([label, value]) => (
          <div key={label} className="success-meta__row">
            <span>{label}</span>
            <span>{value}</span>
          </div>
        ))}
      </div>

      {totalAttendees > 0 ? (
        <div className="success-attendees">
          <span className="field-label">Attendees</span>
          <ul className="success-attendees__list">
            {attendedMembers.map((m) => (
              <li key={m.id}>
                {m.first_name} {m.last_name}
                <span className="success-attendees__tag">{m.relation}</span>
              </li>
            ))}
            {attendedGuests.map((g) => (
              <li key={g.id}>
                {g.first_name} {g.last_name}
                <span className="success-attendees__tag">
                  {g.is_member_guest ? "Member Guest" : "Guest"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="attendee-empty">Saved without attendees.</p>
      )}

      {/* Primary actions */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          marginTop: "1.5rem",
        }}
      >
        <button className="btn-primary" onClick={() => navigate("/bookings")}>
          View My Bookings
        </button>

        <button
          className="btn-ghost"
          onClick={() => navigate(`/bookings?open=${booking.id}`)}
        >
          {isConfirmed ? "Add Pre-order" : "Edit This Booking"}
        </button>

        <button
          className="btn-ghost"
          style={{ fontSize: "13px", color: "var(--zinc-400)" }}
          onClick={onReset}
        >
          Start Another Booking
        </button>
      </div>

      {!isConfirmed && (
        <p
          style={{
            fontSize: "12px",
            color: "var(--zinc-400)",
            marginTop: "1rem",
            lineHeight: 1.5,
          }}
        >
          This booking is saved as a draft. To hold your spot, open the booking
          and confirm it.
        </p>
      )}
    </section>
  );
}
