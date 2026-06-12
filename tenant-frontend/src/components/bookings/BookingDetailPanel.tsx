import { useEffect, useState } from "react";
import { X, PlusCircle, Receipt, UserPlus, UserMinus } from "lucide-react";
import type {
  Attendee,
  Booking,
  BookingStatus,
  MealType,
} from "../../types/booking";
import type { Order } from "../../api/orders";
import { getOrdersByBooking } from "../../api/orders";
import {
  getBookingFull,
  executeBookingAction,
  addMemberAttendee,
  addGuestAttendee,
  removeAttendee,
  updateBookingDetails,
} from "../../api/bookings";
import type { AllowedAction } from "../../types/booking";
import { getAvailableRooms } from "../../api/rooms";
import { getHouseholdMembers, getDietaryOptions } from "../../api/users";
import { OrderEntryDrawer } from "./OrderEntryDrawer";
import { OrderSummary } from "./OrderSummary";
import { useAuth } from "../../hooks/useAuth";
import { MemberAutocomplete } from "./MemberAutocomplete";

interface Props {
  bookingId: number;
  rooms: { id: number; name: string }[];
  onClose: () => void;
  onUpdated: (booking: Booking) => void;
  onCancelled: (bookingId: number) => void;
}

const STATUS_LABELS: Record<BookingStatus, string> = {
  DRAFT: "Draft",
  CONFIRMED: "Confirmed",
  SEATED: "Seated",
  SERVICE: "In Service",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const MEAL_LABELS: Record<string, string> = {
  LUNCH: "Lunch",
  DINNER: "Dinner",
  AFTERHOURS: "After Hours",
  SPECIAL_EVENT: "Special Event",
};

// ─── Inline Attendee Editor ──────────────────────────────────────────────────

interface AttendeeEditorProps {
  bookingId: number;
  attendees: Attendee[];
  onChanged: () => void;
}

function AttendeeEditor({
  bookingId,
  attendees,
  onChanged,
}: AttendeeEditorProps) {
  const { user } = useAuth();
  const [householdMembers, setHouseholdMembers] = useState<
    {
      id: number;
      first_name: string;
      last_name: string;
      relation: string;
      dietary_flags: string[];
    }[]
  >([]);
  const [dietaryOptions, setDietaryOptions] = useState<string[]>([]);
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [guestForm, setGuestForm] = useState({
    first_name: "",
    last_name: "",
    dietary_flags: [] as string[],
    dietary_other_note: "",
    is_member_guest: false,
  });
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<number | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!user?.userId) return;
    Promise.all([getHouseholdMembers(user.userId), getDietaryOptions()])
      .then(([members, dietary]) => {
        setHouseholdMembers(members);
        setDietaryOptions(dietary);
      })
      .catch(() => {});
  }, [user?.userId]);

  const linkedMemberIds = new Set(
    attendees.map((a) => a.linked_member_id).filter(Boolean),
  );

  async function handleAddMember(memberId: number) {
    setSaving(true);
    setErr("");
    try {
      await addMemberAttendee(bookingId, {
        linked_member_id: memberId,
        dietary_flags: [],
      });
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to add member.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddGuest() {
    if (!guestForm.first_name.trim() || !guestForm.last_name.trim()) {
      setErr("First and last name required.");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      await addGuestAttendee(bookingId, {
        id: crypto.randomUUID(),
        first_name: guestForm.first_name.trim(),
        last_name: guestForm.last_name.trim(),
        dietary_flags: guestForm.dietary_flags,
        dietary_other_note: guestForm.dietary_flags.includes("OTHER")
          ? guestForm.dietary_other_note.trim()
          : "",
        is_member_guest: false,
        linked_member_id: null,
      });
      setGuestForm({
        first_name: "",
        last_name: "",
        dietary_flags: [],
        dietary_other_note: "",
        is_member_guest: false,
      });
      setShowAddGuest(false);
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to add guest.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(attendeeId: number) {
    setRemoving(attendeeId);
    setErr("");
    try {
      await removeAttendee(bookingId, attendeeId);
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to remove attendee.");
    } finally {
      setRemoving(null);
    }
  }

  function toggleGuestFlag(flag: string) {
    setGuestForm((f) => ({
      ...f,
      dietary_flags: f.dietary_flags.includes(flag)
        ? f.dietary_flags.filter((x) => x !== flag)
        : [...f.dietary_flags, flag],
    }));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {attendees.length === 0 ? (
        <p style={{ fontSize: "13px", color: "var(--zinc-500)" }}>
          No attendees yet.
        </p>
      ) : (
        <ul className="detail-attendees">
          {attendees.map((a) => (
            <li
              key={a.id}
              className="detail-attendee"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <div className="detail-attendee__name">
                  {`${a.guest_first_name ?? ""} ${a.guest_last_name ?? ""}`.trim() ||
                    `Member #${a.linked_member_id}`}
                  {a.is_member_guest && (
                    <span className="detail-attendee__tag">Member Guest</span>
                  )}
                  {!a.linked_member_id && !a.is_member_guest && (
                    <span className="detail-attendee__tag">Guest</span>
                  )}
                </div>
                {a.dietary_flags.length > 0 && (
                  <div className="detail-attendee__dietary">
                    {a.dietary_flags.join(", ").replace(/_/g, " ")}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleRemove(a.id)}
                disabled={removing === a.id}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--error)",
                  opacity: removing === a.id ? 0.4 : 0.7,
                  padding: "2px 4px",
                  flexShrink: 0,
                }}
                title="Remove attendee"
              >
                <UserMinus size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {householdMembers.filter((m) => !linkedMemberIds.has(m.id)).length >
        0 && (
        <div>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "var(--zinc-500)",
              textTransform: "uppercase" as const,
              letterSpacing: "0.05em",
            }}
          >
            Add Household Member
          </span>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              marginTop: "6px",
            }}
          >
            {householdMembers
              .filter((m) => !linkedMemberIds.has(m.id))
              .map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleAddMember(m.id)}
                  disabled={saving}
                  style={{
                    padding: "4px 10px",
                    fontSize: "12px",
                    borderRadius: "20px",
                    border: "1px solid var(--zinc-200)",
                    background: "var(--bg-surface)",
                    cursor: "pointer",
                    color: "var(--zinc-700)",
                  }}
                >
                  + {m.first_name} {m.last_name}
                </button>
              ))}
          </div>
        </div>
      )}

      <MemberAutocomplete
        onSelectMember={(member) => {
          setSaving(true);
          setErr("");
          addMemberAttendee(bookingId, {
            linked_member_id: member.id,
            dietary_flags: member.dietary_flags,
          })
            .then(() => onChanged())
            .catch((e) =>
              setErr(
                e instanceof Error ? e.message : "Failed to add member guest.",
              ),
            )
            .finally(() => setSaving(false));
        }}
        disabled={saving}
      />

      {!showAddGuest ? (
        <button
          type="button"
          className="btn-ghost btn-ghost--small"
          onClick={() => setShowAddGuest(true)}
          style={{ alignSelf: "flex-start" }}
        >
          <UserPlus size={13} /> Add Guest
        </button>
      ) : (
        <div
          style={{
            border: "1px solid var(--zinc-200)",
            borderRadius: "var(--radius-sm)",
            padding: "0.75rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.625rem",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.5rem",
            }}
          >
            <input
              type="text"
              placeholder="First name"
              value={guestForm.first_name}
              onChange={(e) =>
                setGuestForm({ ...guestForm, first_name: e.target.value })
              }
              style={{
                padding: "6px 8px",
                border: "1px solid var(--zinc-300)",
                borderRadius: "4px",
                fontSize: "13px",
              }}
            />
            <input
              type="text"
              placeholder="Last name"
              value={guestForm.last_name}
              onChange={(e) =>
                setGuestForm({ ...guestForm, last_name: e.target.value })
              }
              style={{
                padding: "6px 8px",
                border: "1px solid var(--zinc-300)",
                borderRadius: "4px",
                fontSize: "13px",
              }}
            />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
            {dietaryOptions.map((flag) => {
              const active = guestForm.dietary_flags.includes(flag);
              return (
                <button
                  key={flag}
                  type="button"
                  onClick={() => toggleGuestFlag(flag)}
                  style={{
                    padding: "2px 8px",
                    fontSize: "11px",
                    borderRadius: "20px",
                    cursor: "pointer",
                    border: `1px solid ${active ? "var(--zinc-900)" : "var(--zinc-200)"}`,
                    background: active
                      ? "var(--zinc-900)"
                      : "var(--bg-surface)",
                    color: active ? "white" : "var(--zinc-600)",
                  }}
                >
                  {flag.replace(/_/g, " ")}
                </button>
              );
            })}
          </div>
          {guestForm.dietary_flags.includes("OTHER") && (
            <input
              type="text"
              placeholder="Describe dietary restriction..."
              value={guestForm.dietary_other_note}
              onChange={(e) =>
                setGuestForm({
                  ...guestForm,
                  dietary_other_note: e.target.value,
                })
              }
              style={{
                padding: "6px 8px",
                border: "1px solid var(--zinc-300)",
                borderRadius: "4px",
                fontSize: "13px",
                width: "100%",
              }}
            />
          )}
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className="btn-primary"
              onClick={handleAddGuest}
              disabled={saving}
              style={{ fontSize: "12px", padding: "5px 12px" }}
            >
              {saving ? "Adding..." : "Add Guest"}
            </button>
            <button
              className="btn-ghost btn-ghost--small"
              onClick={() => {
                setShowAddGuest(false);
                setGuestForm({
                  first_name: "",
                  last_name: "",
                  dietary_flags: [],
                  dietary_other_note: "",
                  is_member_guest: false,
                });
              }}
            >
              Nevermind
            </button>
          </div>
        </div>
      )}

      {err && <p className="error-text">{err}</p>}
    </div>
  );
}

// ─── Main Panel ──────────────────────────────────────────────────────────────

interface EditFormState {
  booking_date: string;
  estimated_arrival: string;
  room_id: string;
  meal_type: MealType;
  notes: string;
}

export function BookingDetailPanel({
  bookingId,
  rooms,
  onClose,
  onUpdated,
  onCancelled,
}: Props) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState("");
  const [actioning, setActioning] = useState(false);
  const [showOrderEntry, setShowOrderEntry] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [allowedActions, setAllowedActions] = useState<AllowedAction[]>([]);
  const [pendingAction, setPendingAction] = useState<AllowedAction | null>(
    null,
  );
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState>({
    booking_date: "",
    estimated_arrival: "",
    room_id: "",
    meal_type: "LUNCH",
    notes: "",
  });
  const [editRooms, setEditRooms] = useState<
    { id: number; name: string; capacity: number }[]
  >([]);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const reloadBooking = async () => {
    try {
      const data = await getBookingFull(bookingId);
      setBooking(data.booking);
      setAttendees(data.attendees);
      setAllowedActions(data.allowed_actions);
      return data.booking;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    setLoading(true);
    setConfirmCancel(false);
    setPendingAction(null);
    Promise.all([getBookingFull(bookingId), getOrdersByBooking(bookingId)])
      .then(([data, ordersData]) => {
        setBooking(data.booking);
        setAttendees(data.attendees);
        setAllowedActions(data.allowed_actions);
        setOrders(ordersData);
      })
      .catch(() => setBooking(null))
      .finally(() => setLoading(false));
  }, [bookingId]);

  const loadOrders = async () => {
    try {
      const data = await getOrdersByBooking(bookingId);
      setOrders(data);
    } catch {
      // silent
    }
  };

  async function handleAction(action: AllowedAction) {
    if (!booking) return;
    if (action.confirm) {
      setPendingAction(action);
      setConfirmCancel(true);
      return;
    }
    setActioning(true);
    setActionError("");
    try {
      const actionMap: Record<string, string> = {
        CONFIRMED: "confirm",
        DRAFT: "revert-to-draft",
        SEATED: "seat",
        SERVICE: "start-service",
        COMPLETED: "complete",
        CANCELLED: "cancel",
      };
      const result = await executeBookingAction(
        booking.id,
        actionMap[action.action] || action.action,
      );
      const { allowed_actions, ...bookingData } = result;
      setBooking(bookingData as Booking);
      setAllowedActions(allowed_actions);
      onUpdated(bookingData as Booking);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setActioning(false);
    }
  }

  async function handleConfirmCancel() {
    if (!booking || !pendingAction) return;
    setActioning(true);
    setActionError("");
    setConfirmCancel(false);
    try {
      const actionMap: Record<string, string> = {
        CONFIRMED: "confirm",
        DRAFT: "revert-to-draft",
        SEATED: "seat",
        SERVICE: "start-service",
        COMPLETED: "complete",
        CANCELLED: "cancel",
      };
      const result = await executeBookingAction(
        booking.id,
        actionMap[pendingAction.action] || pendingAction.action,
      );
      const { allowed_actions, ...bookingData } = result;
      setBooking(bookingData as Booking);
      setAllowedActions(allowed_actions);
      onUpdated(bookingData as Booking);
      if (pendingAction.action === "CANCELLED") {
        onCancelled(booking.id);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setActioning(false);
      setPendingAction(null);
    }
  }

  const isActive = booking
    ? !["COMPLETED", "CANCELLED"].includes(booking.status)
    : false;
  const isDraft = booking?.status === "DRAFT";
  const isEditable = booking
    ? ["DRAFT", "CONFIRMED"].includes(booking.status)
    : false;
  const roomName = booking
    ? (rooms.find((r) => r.id === booking.room_id)?.name ??
      `Room ${booking.room_id}`)
    : "";
  const hasNoMembers = attendees.filter((a) => a.linked_member_id).length === 0;

  function startEditing() {
    if (!booking) return;
    setEditForm({
      booking_date: booking.booking_date,
      estimated_arrival: booking.estimated_arrival?.slice(0, 5) ?? "",
      room_id: String(booking.room_id),
      meal_type: booking.meal_type,
      notes: booking.notes ?? "",
    });
    setEditing(true);
    setEditError("");
    getAvailableRooms(booking.booking_date, booking.meal_type)
      .then(setEditRooms)
      .catch(() => {});
  }

  async function saveEdit() {
    if (!booking) return;
    setEditSaving(true);
    setEditError("");
    try {
      const payload: Record<string, any> = {};
      if (editForm.booking_date !== booking.booking_date)
        payload.booking_date = editForm.booking_date;
      if (editForm.estimated_arrival !== booking.estimated_arrival?.slice(0, 5))
        payload.estimated_arrival = editForm.estimated_arrival;
      if (editForm.room_id !== String(booking.room_id))
        payload.room_id = Number(editForm.room_id);
      if (editForm.meal_type !== booking.meal_type)
        payload.meal_type = editForm.meal_type;
      if ((editForm.notes ?? "") !== (booking.notes ?? ""))
        payload.notes = editForm.notes || null;

      if (Object.keys(payload).length === 0) {
        setEditing(false);
        return;
      }

      await updateBookingDetails(booking.id, payload);
      const updated = await reloadBooking();
      if (updated) onUpdated(updated);
      setEditing(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Update failed.";
      if (typeof err === "object" && err !== null && "response" in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        setEditError(axiosErr.response?.data?.detail ?? msg);
      } else {
        setEditError(msg);
      }
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <div className="detail-panel">
      <div className="detail-panel__header">
        <button className="detail-panel__close" onClick={onClose}>
          <X size={18} />
        </button>
        <span className="detail-panel__title">Booking #{bookingId}</span>
      </div>

      {loading && <div className="detail-panel__state">Loading...</div>}

      {booking && !loading && (
        <div className="detail-panel__body">
          <div className="detail-meta">
            {[
              ["Status", STATUS_LABELS[booking.status]],
              ["Date", booking.booking_date],
              ["Arrival", booking.estimated_arrival?.slice(0, 5)],
              ["Meal", MEAL_LABELS[booking.meal_type] ?? booking.meal_type],
              ["Room", roomName],
              ["Party", String(booking.party_size)],
              ...(booking.notes ? [["Notes", booking.notes]] : []),
            ].map(([label, value]) => (
              <div key={label} className="detail-meta__row">
                <span>{label}</span>
                <span
                  style={{
                    textAlign: "right",
                    fontSize: label === "Notes" ? "12px" : undefined,
                  }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>

          {isDraft && !editing && (
            <button
              className="btn-ghost btn-ghost--small"
              onClick={startEditing}
              style={{ alignSelf: "flex-start", marginBottom: "0.5rem" }}
            >
              ✏️ Edit date, time & room
            </button>
          )}

          {editing && (
            <div
              style={{
                border: "1px solid var(--zinc-200)",
                borderRadius: "var(--radius-sm)",
                padding: "0.75rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.625rem",
                marginBottom: "0.75rem",
              }}
            >
              <div>
                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--zinc-500)",
                  }}
                >
                  Date
                </label>
                <input
                  type="date"
                  value={editForm.booking_date}
                  onChange={(e) => {
                    setEditForm((f) => ({
                      ...f,
                      booking_date: e.target.value,
                    }));
                    getAvailableRooms(e.target.value, editForm.meal_type)
                      .then(setEditRooms)
                      .catch(() => {});
                  }}
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    border: "1px solid var(--zinc-300)",
                    borderRadius: "4px",
                    fontSize: "13px",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--zinc-500)",
                  }}
                >
                  Arrival Time
                </label>
                <input
                  type="time"
                  value={editForm.estimated_arrival}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      estimated_arrival: e.target.value,
                    }))
                  }
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    border: "1px solid var(--zinc-300)",
                    borderRadius: "4px",
                    fontSize: "13px",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--zinc-500)",
                  }}
                >
                  Meal Type
                </label>
                <select
                  value={editForm.meal_type}
                  onChange={(e) => {
                    const newMeal = e.target.value as MealType;
                    setEditForm((f) => ({ ...f, meal_type: newMeal }));
                    getAvailableRooms(editForm.booking_date, newMeal)
                      .then(setEditRooms)
                      .catch(() => {});
                  }}
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    border: "1px solid var(--zinc-300)",
                    borderRadius: "4px",
                    fontSize: "13px",
                  }}
                >
                  <option value="LUNCH">Lunch</option>
                  <option value="DINNER">Dinner</option>
                  <option value="AFTERHOURS">After Hours</option>
                  <option value="SPECIAL_EVENT">Special Event</option>
                </select>
              </div>
              <div>
                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--zinc-500)",
                  }}
                >
                  Room
                </label>
                <select
                  value={editForm.room_id}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, room_id: e.target.value }))
                  }
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    border: "1px solid var(--zinc-300)",
                    borderRadius: "4px",
                    fontSize: "13px",
                  }}
                >
                  {editRooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} (capacity: {r.capacity})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--zinc-500)",
                  }}
                >
                  Notes
                </label>
                <textarea
                  value={editForm.notes ?? ""}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  placeholder="Special requests, occasion, etc."
                  rows={2}
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    border: "1px solid var(--zinc-300)",
                    borderRadius: "4px",
                    fontSize: "13px",
                    resize: "none",
                    fontFamily: "inherit",
                  }}
                />
              </div>
              {editError && <p className="error-text">{editError}</p>}
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className="btn-primary"
                  onClick={saveEdit}
                  disabled={editSaving}
                  style={{ fontSize: "12px", padding: "5px 12px" }}
                >
                  {editSaving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  className="btn-ghost btn-ghost--small"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="detail-section">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.5rem",
              }}
            >
              <span className="detail-section__label">
                Attendees ({attendees.length})
              </span>
            </div>
            {isDraft ? (
              <AttendeeEditor
                bookingId={bookingId}
                attendees={attendees}
                onChanged={async () => {
                  const updated = await reloadBooking();
                  if (updated) onUpdated(updated);
                }}
              />
            ) : attendees.length === 0 ? (
              <p style={{ fontSize: "13px", color: "var(--zinc-500)" }}>
                No attendees.
              </p>
            ) : (
              <ul className="detail-attendees">
                {attendees.map((a) => (
                  <li key={a.id} className="detail-attendee">
                    <div className="detail-attendee__name">
                      {`${a.guest_first_name ?? ""} ${a.guest_last_name ?? ""}`.trim() ||
                        `Member #${a.linked_member_id}`}
                      {a.is_member_guest && (
                        <span className="detail-attendee__tag">
                          Member Guest
                        </span>
                      )}
                      {!a.linked_member_id && !a.is_member_guest && (
                        <span className="detail-attendee__tag">Guest</span>
                      )}
                    </div>
                    {a.dietary_flags.length > 0 && (
                      <div className="detail-attendee__dietary">
                        {a.dietary_flags.join(", ").replace(/_/g, " ")}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="detail-section">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span className="detail-section__label">
                <Receipt
                  size={13}
                  style={{ display: "inline", marginRight: "6px" }}
                />
                Orders
              </span>
              {isActive && booking.meal_type !== "AFTERHOURS" && (
                <button
                  className="btn-ghost btn-ghost--small"
                  onClick={() => setShowOrderEntry(true)}
                >
                  <PlusCircle size={13} />
                  {booking.status === "SEATED" || booking.status === "SERVICE"
                    ? "Add to Order"
                    : "Pre-order"}
                </button>
              )}
            </div>
            <OrderSummary
              orders={orders}
              editable={isEditable}
              onChanged={loadOrders}
            />
          </div>

          {confirmCancel && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "var(--radius-sm)",
                padding: "1rem",
                marginBottom: "0.75rem",
              }}
            >
              <p
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#991b1b",
                  marginBottom: "0.5rem",
                }}
              >
                Cancel this booking?
              </p>
              <p
                style={{
                  fontSize: "12px",
                  color: "#78716c",
                  marginBottom: "0.75rem",
                }}
              >
                This cannot be undone. The booking will be marked as cancelled.
              </p>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className="btn-ghost btn-ghost--small"
                  style={{ color: "var(--error)", borderColor: "var(--error)" }}
                  disabled={actioning}
                  onClick={handleConfirmCancel}
                >
                  Yes, cancel booking
                </button>
                <button
                  className="btn-ghost btn-ghost--small"
                  onClick={() => {
                    setConfirmCancel(false);
                    setPendingAction(null);
                  }}
                >
                  Nevermind
                </button>
              </div>
            </div>
          )}

          {allowedActions.length > 0 && !confirmCancel && (
            <div className="detail-actions">
              {allowedActions.map((action) => {
                const isConfirm = action.action === "CONFIRMED";
                const isDisabled = actioning || (isConfirm && hasNoMembers);
                return (
                  <button
                    key={action.action}
                    className={
                      action.variant === "primary" ? "btn-primary" : "btn-ghost"
                    }
                    style={
                      action.variant === "danger"
                        ? { color: "var(--error)", borderColor: "var(--error)" }
                        : undefined
                    }
                    disabled={isDisabled}
                    onClick={() => handleAction(action)}
                    title={
                      isConfirm && hasNoMembers
                        ? "Add at least one household member before confirming"
                        : undefined
                    }
                  >
                    {actioning ? "..." : action.label}
                  </button>
                );
              })}
              {hasNoMembers &&
                allowedActions.some((a) => a.action === "CONFIRMED") && (
                  <p
                    style={{
                      fontSize: "12px",
                      color: "var(--zinc-400)",
                      margin: "0.25rem 0 0",
                      textAlign: "center",
                    }}
                  >
                    Add at least one household member to confirm.
                  </p>
                )}
            </div>
          )}

          {actionError && <p className="error-text">{actionError}</p>}
        </div>
      )}

      {showOrderEntry && booking && (
        <OrderEntryDrawer
          bookingId={booking.id}
          bookingStatus={booking.status}
          onClose={() => setShowOrderEntry(false)}
          onOrderUpdated={loadOrders}
        />
      )}
    </div>
  );
}
