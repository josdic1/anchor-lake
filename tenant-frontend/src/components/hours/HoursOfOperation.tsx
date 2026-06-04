import { useEffect, useState } from "react";
import { getMealWindows } from "../../api/mealWindows";
import type { MealWindow } from "../../types/booking";

const DAY_NAMES = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatTime(t: string): string {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function formatDays(days: number[]): string {
  if (days.length === 7) return "Every day";
  if (days.length === 0) return "Unavailable";
  const sorted = [...days].sort((a, b) => a - b);
  return sorted.map((d) => DAY_NAMES[d]).join(", ");
}

type HoursOfOperationProps = {
  className?: string;
};

export default function HoursOfOperation({
  className = "",
}: HoursOfOperationProps) {
  const [windows, setWindows] = useState<MealWindow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMealWindows()
      .then(setWindows)
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div style={{ padding: "1rem", color: "var(--zinc-400)" }}>
        Loading hours...
      </div>
    );

  return (
    <div className={`hours-popup ${className}`.trim()}>
      <div className="hours-popup__eyebrow">Service Information</div>
      <h2 className="hours-popup__title">Hours of Operation</h2>
      <p className="hours-popup__intro">
        Current service hours for each meal period.
      </p>

      <div className="hours-popup__card-list">
        {windows.map((w) => (
          <div key={w.meal_type} className="hours-popup__section">
            <div className="hours-popup__label">
              {w.meal_type.replace("_", " ")}
            </div>
            <div className="hours-popup__card-list">
              <div className="hours-popup__card">
                <span className="hours-popup__card-day">
                  {formatDays(w.available_days)}
                </span>
                <span className="hours-popup__card-time">
                  {formatTime(w.start_time)} – {formatTime(w.last_order_time)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
