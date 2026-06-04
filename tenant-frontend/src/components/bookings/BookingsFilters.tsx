import type { BookingSearchParams } from "../../api/bookings";
import type { Room, BookingStatus, MealType } from "../../types/booking";

type Props = {
  filters: BookingSearchParams;
  rooms: Room[];
  onChange: (next: BookingSearchParams) => void;
  onClear: () => void;
};

const STATUSES: BookingStatus[] = [
  "DRAFT",
  "CONFIRMED",
  "SEATED",
  "SERVICE",
  "COMPLETED",
  "CANCELLED",
];

const MEAL_TYPES: MealType[] = [
  "LUNCH",
  "DINNER",
  "AFTERHOURS",
  "SPECIAL_EVENT",
];

const STATUS_LABELS: Record<BookingStatus, string> = {
  DRAFT: "Draft",
  CONFIRMED: "Confirmed",
  SEATED: "Seated",
  SERVICE: "Service",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const MEAL_LABELS: Record<MealType, string> = {
  LUNCH: "Lunch",
  DINNER: "Dinner",
  AFTERHOURS: "After Hours",
  SPECIAL_EVENT: "Special Event",
};

export function BookingsFilters({ filters, rooms, onChange, onClear }: Props) {
  function set<K extends keyof BookingSearchParams>(
    key: K,
    value: BookingSearchParams[K],
  ) {
    onChange({ ...filters, [key]: value });
  }

  const hasAnyFilter =
    !!filters.dateFrom ||
    !!filters.dateTo ||
    !!filters.status ||
    !!filters.mealType ||
    !!filters.roomId ||
    !!filters.memberQuery;

  return (
    <div className="bookings-filters">
      <div className="filters-row">
        <div className="filter-group">
          <label className="filter-label">From</label>
          <input
            type="date"
            className="filter-input"
            value={filters.dateFrom ?? ""}
            onChange={(e) => set("dateFrom", e.target.value || undefined)}
          />
        </div>

        <div className="filter-group">
          <label className="filter-label">To</label>
          <input
            type="date"
            className="filter-input"
            value={filters.dateTo ?? ""}
            onChange={(e) => set("dateTo", e.target.value || undefined)}
          />
        </div>

        <div className="filter-group">
          <label className="filter-label">Status</label>
          <select
            className="filter-input"
            value={filters.status ?? ""}
            onChange={(e) => set("status", e.target.value || undefined)}
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Meal</label>
          <select
            className="filter-input"
            value={filters.mealType ?? ""}
            onChange={(e) => set("mealType", e.target.value || undefined)}
          >
            <option value="">All meals</option>
            {MEAL_TYPES.map((m) => (
              <option key={m} value={m}>
                {MEAL_LABELS[m]}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Room</label>
          <select
            className="filter-input"
            value={filters.roomId ?? ""}
            onChange={(e) => set("roomId", e.target.value || undefined)}
          >
            <option value="">All rooms</option>
            {rooms.map((r) => (
              <option key={r.id} value={String(r.id)}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group filter-group--wide">
          <label className="filter-label">Member</label>
          <input
            type="text"
            className="filter-input"
            placeholder="Search by member ID or name..."
            value={filters.memberQuery ?? ""}
            onChange={(e) => set("memberQuery", e.target.value || undefined)}
          />
        </div>

        {hasAnyFilter && (
          <div className="filter-group filter-group--action">
            <button className="btn-ghost" onClick={onClear}>
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
