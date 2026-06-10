import { useEffect, useState } from "react";
import { getAvailableRooms } from "../api/rooms";
import type { HouseholdMember } from "../api/users";
import { useMealWindows } from "../hooks/useMealWindows";
import { useBookingSubmit } from "../hooks/useBookingSubmit";
import { useAuth } from "../hooks/useAuth";
import { usersApi } from "../api/client";
import {
  AttendeeSection,
  type GuestForm,
} from "../components/bookings/AttendeeSection";
import { BookingDetailsForm } from "../components/bookings/BookingDetailsForm";
import { BookingSuccessScreen } from "../components/bookings/BookingSuccessScreen";
import type { BookingDraftForm, Room } from "../types/booking";
import { getAutoMealType } from "../utils/mealWindows";

const INITIAL_FORM: BookingDraftForm = {
  bookingDate: "",
  roomId: "",
  mealType: "",
  estimatedArrival: "",
  notes: "",
};

type UserOption = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
};

export function NewBookingPage() {
  const { user } = useAuth();
  const { mealWindows } = useMealWindows();
  const { submit, saving, saveError, result, reset } = useBookingSubmit();

  const isStaffOrAdmin = user?.role === "admin" || user?.role === "staff";

  const [form, setForm] = useState<BookingDraftForm>(INITIAL_FORM);
  const [arrivalError, setArrivalError] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsError, setRoomsError] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [guests, setGuests] = useState<GuestForm[]>([]);
  const [resolvedMembers, setResolvedMembers] = useState<HouseholdMember[]>([]);

  // Admin/staff: list of all member users to book on behalf of
  const [memberUsers, setMemberUsers] = useState<UserOption[]>([]);
  const [onBehalfOfUserId, setOnBehalfOfUserId] = useState<number | null>(null);

  useEffect(() => {
    if (!isStaffOrAdmin) return;
    usersApi
      .get<UserOption[]>("/users")
      .then((r) => {
        setMemberUsers(r.data.filter((u) => u.role === "member"));
      })
      .catch(() => {});
  }, [isStaffOrAdmin]);

  // When on_behalf_of changes, reset attendee selections
  useEffect(() => {
    setSelectedMemberIds([]);
    setGuests([]);
    setResolvedMembers([]);
  }, [onBehalfOfUserId]);

  // The user ID to use for household lookup and booking ownership
  const effectiveUserId = isStaffOrAdmin
    ? (onBehalfOfUserId ?? null)
    : (user?.userId ?? null);

  function updateField<K extends keyof BookingDraftForm>(
    key: K,
    value: BookingDraftForm[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function fetchRooms(bookingDate: string, mealType: string) {
    setRoomsLoading(true);
    setRoomsError("");

    getAvailableRooms(bookingDate, mealType || undefined)
      .then((nextRooms) => {
        setRooms(nextRooms);
        setForm((prev) => ({
          ...prev,
          roomId: nextRooms.some((r) => String(r.id) === prev.roomId)
            ? prev.roomId
            : "",
        }));
      })
      .catch((err) => {
        setRooms([]);
        setForm((prev) => ({ ...prev, roomId: "" }));
        setRoomsError(
          err instanceof Error ? err.message : "Failed to load rooms.",
        );
      })
      .finally(() => setRoomsLoading(false));
  }

  useEffect(() => {
    if (!form.bookingDate) {
      setRooms([]);
      setRoomsError("");
      setForm((prev) => ({
        ...prev,
        roomId: "",
        mealType: "",
        estimatedArrival: "",
      }));
      return;
    }
    fetchRooms(form.bookingDate, form.mealType);
  }, [form.bookingDate]);

  function handleArrivalChange(timeString: string) {
    setArrivalError("");

    if (!timeString) {
      updateField("estimatedArrival", "");
      updateField("mealType", "");
      return;
    }

    const autoMealType = getAutoMealType(
      form.bookingDate,
      timeString,
      mealWindows,
    );

    if (autoMealType === null) {
      if (isStaffOrAdmin) {
        // Admin/staff exception: outside normal service hours books as AFTERHOURS
        setForm((prev) => ({
          ...prev,
          estimatedArrival: timeString,
          mealType: "AFTERHOURS",
        }));
        fetchRooms(form.bookingDate, "AFTERHOURS");
      } else {
        setArrivalError(
          "No service available at this time. Please check hours of operation.",
        );
        setForm((prev) => ({
          ...prev,
          estimatedArrival: timeString,
          mealType: "",
        }));
      }
      return;
    }

    setForm((prev) => ({
      ...prev,
      estimatedArrival: timeString,
      mealType: autoMealType,
    }));
    fetchRooms(form.bookingDate, autoMealType);
  }

  function toggleMember(memberId: number) {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId],
    );
  }

  function resetPage() {
    setForm(INITIAL_FORM);
    setArrivalError("");
    setRooms([]);
    setRoomsError("");
    setSelectedMemberIds([]);
    setGuests([]);
    setResolvedMembers([]);
    setOnBehalfOfUserId(null);
    reset();
  }

  const canSave =
    !!form.bookingDate &&
    !!form.roomId &&
    !!form.mealType &&
    !!form.estimatedArrival &&
    !arrivalError;

  const hasAttendees =
    selectedMemberIds.length > 0 ||
    guests.some((g) => g.first_name.trim() && g.last_name.trim());

  const canConfirm = canSave && hasAttendees;

  // For staff/admin, require a member to be selected before showing attendees
  const showAttendeeSection = !isStaffOrAdmin || onBehalfOfUserId !== null;

  if (result) {
    return (
      <BookingSuccessScreen
        booking={result.booking}
        mode={result.mode}
        attendedMembers={result.attendedMembers}
        attendedGuests={result.attendedGuests}
        onReset={resetPage}
      />
    );
  }

  return (
    <section className="panel">
      <h2>New Booking</h2>

      <form className="form-stack" onSubmit={(e) => e.preventDefault()}>
        {/* Admin/Staff: pick who this booking is for */}
        {isStaffOrAdmin && (
          <div className="form-stack" style={{ marginBottom: "1rem" }}>
            <label>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--zinc-500)",
                }}
              >
                Booking for
              </span>
              <select
                value={onBehalfOfUserId ?? ""}
                onChange={(e) =>
                  setOnBehalfOfUserId(
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
              >
                <option value="">Select a member...</option>
                {memberUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.first_name} {u.last_name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        <BookingDetailsForm
          form={form}
          rooms={rooms}
          roomsLoading={roomsLoading}
          roomsError={roomsError}
          arrivalError={arrivalError}
          mealWindows={mealWindows}
          onFieldChange={updateField}
          onArrivalChange={handleArrivalChange}
        />

        {showAttendeeSection && (
          <>
            <hr />
            <AttendeeSection
              userId={effectiveUserId}
              selectedMemberIds={selectedMemberIds}
              guests={guests}
              onMemberToggle={toggleMember}
              onGuestsChange={setGuests}
              onResolvedMembersChange={setResolvedMembers}
            />
          </>
        )}

        {isStaffOrAdmin && !onBehalfOfUserId && (
          <p
            style={{
              fontSize: "13px",
              color: "var(--zinc-400)",
              margin: "0.5rem 0",
            }}
          >
            Select a member above to add attendees.
          </p>
        )}

        {saveError && <p className="error-text">{saveError}</p>}

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button
            type="button"
            disabled={
              !canSave || saving || (isStaffOrAdmin && !onBehalfOfUserId)
            }
            onClick={() =>
              submit(
                "draft",
                form,
                resolvedMembers,
                guests,
                onBehalfOfUserId ?? undefined,
              )
            }
          >
            {saving ? "Saving..." : "Save Draft"}
          </button>

          <button
            type="button"
            disabled={
              !canConfirm || saving || (isStaffOrAdmin && !onBehalfOfUserId)
            }
            onClick={() =>
              submit(
                "confirmed",
                form,
                resolvedMembers,
                guests,
                onBehalfOfUserId ?? undefined,
              )
            }
          >
            {saving ? "Confirming..." : "Confirm Booking"}
          </button>
        </div>
      </form>
    </section>
  );
}
