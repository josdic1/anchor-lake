import { useState, useMemo } from "react";
import type { BookingDraftForm, MealWindow, Room } from "../../types/booking";

type Props = {
  form: BookingDraftForm;
  rooms: Room[];
  roomsLoading: boolean;
  roomsError: string;
  arrivalError: string;
  mealWindows: MealWindow[];
  onFieldChange: <K extends keyof BookingDraftForm>(
    key: K,
    value: BookingDraftForm[K],
  ) => void;
  onArrivalChange: (time: string) => void;
};

const MEAL_TYPE_LABELS: Record<string, string> = {
  LUNCH: "Lunch",
  DINNER: "Dinner",
  AFTERHOURS: "After Hours",
  SPECIAL_EVENT: "Special Event",
};

const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const TIME_SLOTS = [
  { label: "11:00", value: "11:00" },
  { label: "11:30", value: "11:30" },
  { label: "12:00", value: "12:00" },
  { label: "12:30", value: "12:30" },
  { label: "1:00", value: "13:00" },
  { label: "1:30", value: "13:30" },
  { label: "2:00", value: "14:00" },
  { label: "2:30", value: "14:30" },
  { label: "5:00", value: "17:00" },
  { label: "5:30", value: "17:30" },
  { label: "6:00", value: "18:00" },
  { label: "6:30", value: "18:30" },
];

function toISODate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseISODate(iso: string) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return { year: y, month: m - 1, day: d };
}

export function BookingDetailsForm({
  form,
  rooms,
  roomsLoading,
  roomsError,
  arrivalError,
  onFieldChange,
  onArrivalChange,
}: Props) {
  const today = new Date();
  const todayISO = toISODate(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  const mealTypeLabel = form.mealType
    ? (MEAL_TYPE_LABELS[form.mealType] ?? form.mealType)
    : null;
  const selectedDate = parseISODate(form.bookingDate);

  const calDays = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [calYear, calMonth]);

  function prevMonth() {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else setCalMonth((m) => m - 1);
  }

  function nextMonth() {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else setCalMonth((m) => m + 1);
  }

  function isPast(day: number) {
    return toISODate(calYear, calMonth, day) < todayISO;
  }

  function isSelected(day: number) {
    return (
      !!selectedDate &&
      selectedDate.year === calYear &&
      selectedDate.month === calMonth &&
      selectedDate.day === day
    );
  }

  function isToday(day: number) {
    return toISODate(calYear, calMonth, day) === todayISO;
  }

  return (
    <>
      {/* ── CALENDAR ── */}
      <div>
        <span
          className="field-label"
          style={{ marginBottom: "0.75rem", display: "block" }}
        >
          Booking Date
        </span>
        <div
          style={{
            border: "1px solid var(--zinc-200)",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
            maxWidth: "300px",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.625rem 0.875rem",
              borderBottom: "1px solid var(--zinc-100)",
              backgroundColor: "var(--zinc-50)",
            }}
          >
            <button
              type="button"
              onClick={prevMonth}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "2px 6px",
                fontSize: "18px",
                color: "var(--zinc-500)",
                lineHeight: 1,
              }}
            >
              ‹
            </button>
            <span
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--zinc-800)",
              }}
            >
              {MONTH_NAMES[calMonth]} {calYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "2px 6px",
                fontSize: "18px",
                color: "var(--zinc-500)",
                lineHeight: 1,
              }}
            >
              ›
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              padding: "0.5rem 0.625rem 0",
              backgroundColor: "var(--bg-surface)",
            }}
          >
            {DAY_NAMES.map((d) => (
              <div
                key={d}
                style={{
                  textAlign: "center",
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "var(--zinc-400)",
                  letterSpacing: "0.04em",
                  paddingBottom: "4px",
                }}
              >
                {d}
              </div>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              padding: "0 0.625rem 0.625rem",
              gap: "2px",
              backgroundColor: "var(--bg-surface)",
            }}
          >
            {calDays.map((day, i) => {
              if (!day) return <div key={`e-${i}`} />;
              const past = isPast(day);
              const sel = isSelected(day);
              const tod = isToday(day);
              return (
                <button
                  key={day}
                  type="button"
                  disabled={past}
                  onClick={() =>
                    !past &&
                    onFieldChange(
                      "bookingDate",
                      toISODate(calYear, calMonth, day),
                    )
                  }
                  style={{
                    aspectRatio: "1",
                    border:
                      tod && !sel
                        ? "1px solid var(--accent)"
                        : "1px solid transparent",
                    borderRadius: "5px",
                    fontSize: "12px",
                    fontWeight: sel ? 700 : 400,
                    cursor: past ? "not-allowed" : "pointer",
                    color: past
                      ? "var(--zinc-300)"
                      : sel
                        ? "white"
                        : tod
                          ? "var(--accent)"
                          : "var(--zinc-800)",
                    backgroundColor: sel ? "var(--zinc-900)" : "transparent",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        <input
          type="date"
          value={form.bookingDate}
          onChange={(e) => onFieldChange("bookingDate", e.target.value)}
          style={{
            marginTop: "0.5rem",
            padding: "0.375rem 0.75rem",
            border: "1px solid var(--zinc-200)",
            borderRadius: "var(--radius-sm)",
            fontSize: "12px",
            color: "var(--zinc-500)",
            backgroundColor: "var(--zinc-50)",
            width: "100%",
            maxWidth: "300px",
          }}
        />
      </div>

      {/* ── ARRIVAL TIME ── */}
      <div>
        <span
          className="field-label"
          style={{ marginBottom: "0.75rem", display: "block" }}
        >
          Estimated Arrival
        </span>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "6px",
            marginBottom: "0.75rem",
            opacity: !form.bookingDate ? 0.4 : 1,
            pointerEvents: !form.bookingDate ? "none" : "auto",
          }}
        >
          {TIME_SLOTS.map((slot) => {
            const active = form.estimatedArrival === slot.value;
            return (
              <button
                key={slot.value}
                type="button"
                disabled={!form.bookingDate}
                onClick={() => onArrivalChange(slot.value)}
                style={{
                  padding: "5px 11px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: active ? 600 : 400,
                  border: `1px solid ${active ? "var(--zinc-900)" : "var(--zinc-200)"}`,
                  backgroundColor: active
                    ? "var(--zinc-900)"
                    : "var(--bg-surface)",
                  color: active ? "white" : "var(--zinc-600)",
                  cursor: "pointer",
                }}
              >
                {slot.label}
              </button>
            );
          })}
        </div>

        <input
          type="time"
          value={form.estimatedArrival}
          disabled={!form.bookingDate}
          onChange={(e) => onArrivalChange(e.target.value)}
          className="filter-input"
          style={{ maxWidth: "300px" }}
        />
        {!form.bookingDate && (
          <span
            className="field-hint"
            style={{ display: "block", marginTop: "0.25rem" }}
          >
            Pick a date first
          </span>
        )}
        {arrivalError && (
          <span
            className="error-text"
            style={{ display: "block", marginTop: "0.5rem" }}
          >
            {arrivalError}
          </span>
        )}
      </div>

      {/* ── MEAL TYPE ── */}
      <div>
        <span className="field-label">Meal Type</span>
        {mealTypeLabel ? (
          <div
            className="meal-type-display meal-type-display--set"
            style={{ marginTop: "0.5rem" }}
          >
            {mealTypeLabel}
            <span className="meal-type-display__hint">
              auto-selected from arrival time
            </span>
          </div>
        ) : (
          <div
            className="meal-type-display meal-type-display--empty"
            style={{ marginTop: "0.5rem" }}
          >
            {!form.bookingDate
              ? "Pick a date first"
              : !form.estimatedArrival
                ? "Enter arrival time above"
                : "—"}
          </div>
        )}
      </div>

      {/* ── ROOM ── */}
      <div>
        <span
          className="field-label"
          style={{ marginBottom: "0.75rem", display: "block" }}
        >
          Room
          {roomsLoading && (
            <span
              style={{
                fontWeight: 400,
                color: "var(--zinc-400)",
                marginLeft: "0.5rem",
                fontSize: "11px",
              }}
            >
              loading...
            </span>
          )}
        </span>

        {!roomsLoading && rooms.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              marginBottom: "0.75rem",
            }}
          >
            {rooms.map((room) => {
              const active = form.roomId === String(room.id);
              return (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => onFieldChange("roomId", String(room.id))}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "var(--radius-sm)",
                    border: `1px solid ${active ? "var(--zinc-900)" : "var(--zinc-200)"}`,
                    backgroundColor: active
                      ? "var(--zinc-900)"
                      : "var(--bg-surface)",
                    color: active ? "white" : "var(--zinc-700)",
                    fontSize: "13px",
                    fontWeight: active ? 600 : 400,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: "1px",
                  }}
                >
                  <span>{room.name}</span>
                  <span
                    style={{ fontSize: "10px", fontWeight: 400, opacity: 0.6 }}
                  >
                    cap. {room.capacity}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <select
          className="filter-input"
          value={form.roomId}
          onChange={(e) => onFieldChange("roomId", e.target.value)}
          disabled={!form.bookingDate || roomsLoading}
          style={{ maxWidth: "300px" }}
        >
          <option value="">
            {!form.bookingDate
              ? "Pick a date first"
              : roomsLoading
                ? "Loading rooms..."
                : rooms.length === 0
                  ? "No rooms available"
                  : "Select a room"}
          </option>
          {rooms.map((room) => (
            <option key={room.id} value={String(room.id)}>
              {room.name} (capacity {room.capacity})
            </option>
          ))}
        </select>
        {roomsError && (
          <span
            className="error-text"
            style={{ display: "block", marginTop: "0.5rem" }}
          >
            {roomsError}
          </span>
        )}
      </div>

      {/* ── NOTES ── */}
      <label>
        <span>Notes</span>
        <textarea
          rows={3}
          value={form.notes}
          onChange={(e) => onFieldChange("notes", e.target.value)}
          placeholder="Add any booking notes"
        />
      </label>
    </>
  );
}
