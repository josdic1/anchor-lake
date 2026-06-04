import { useEffect, useState } from "react";
import { getMealWindows } from "../../api/mealWindows";
import type { MealWindow } from "../../types/booking";
import HoursOfOperation from "./HoursOfOperation";

type HoursOfOperationModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

function timeToMinutes(t: string): number {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

function NowAvailable() {
  const [windows, setWindows] = useState<MealWindow[]>([]);

  useEffect(() => {
    getMealWindows().then(setWindows);
  }, []);

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const jsDay = now.getDay();
  const dayOfWeek = jsDay === 0 ? 7 : jsDay;

  const openWindows = windows.filter((w) => {
    const onDay = w.available_days.includes(dayOfWeek);
    const inTime =
      currentMinutes >= timeToMinutes(w.start_time) &&
      currentMinutes <= timeToMinutes(w.last_order_time);
    return onDay && inTime;
  });

  if (windows.length === 0) return null;

  return (
    <div
      style={{
        background: "var(--accent-light)",
        border: "1px solid var(--zinc-200)",
        borderRadius: "var(--radius-sm)",
        padding: "0.875rem 1rem",
        marginBottom: "1.25rem",
      }}
    >
      <div
        style={{
          fontSize: "10px",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--zinc-500)",
          marginBottom: "0.625rem",
        }}
      >
        Right Now
      </div>
      {openWindows.length === 0 ? (
        <div
          style={{
            fontSize: "13px",
            color: "var(--zinc-500)",
            fontStyle: "italic",
          }}
        >
          No service currently available.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {openWindows.map((w) => (
            <div
              key={w.meal_type}
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: "13px",
                color: "var(--zinc-800)",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#10b981",
                  marginRight: "6px",
                }}
              />
              <span>{w.meal_type.replace("_", " ")} — Open</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function HoursOfOperationModal({
  isOpen,
  onClose,
}: HoursOfOperationModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="hours-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hours-modal-title"
      onClick={onClose}
    >
      <div className="hours-modal__panel" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="hours-modal__close"
          onClick={onClose}
          aria-label="Close hours of operation"
        >
          ×
        </button>
        <div id="hours-modal-title" className="sr-only">
          Hours of Operation
        </div>
        <NowAvailable />
        <HoursOfOperation />
      </div>
    </div>
  );
}
