import type { MealType, MealWindow } from "../types/booking";

const OPERATING_START = "09:00";
const OPERATING_END = "22:00";

export function timeToMinutes(time: string): number {
  const [h, m] = time.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

export function getDayOfWeek(isoDate: string): number {
  const [year, month, day] = isoDate.split("-").map(Number);
  const jsDay = new Date(year, month - 1, day).getDay();
  return jsDay === 0 ? 7 : jsDay;
}

export function windowIsOpenOnDay(window: MealWindow, dayOfWeek: number): boolean {
  if (!window.available_days || window.available_days.length === 0) return true;
  return window.available_days.includes(dayOfWeek);
}

export function windowContainsTime(window: MealWindow, arrivalMinutes: number): boolean {
  const start = timeToMinutes(window.start_time);
  const end = timeToMinutes(window.last_order_time);
  return arrivalMinutes >= start && arrivalMinutes <= end;
}

export function getAutoMealType(
  isoDate: string,
  timeString: string,
  mealWindows: MealWindow[],
): MealType | null {
  if (!isoDate || !timeString || mealWindows.length === 0) return null;

  const arrivalMinutes = timeToMinutes(timeString);
  const opStart = timeToMinutes(OPERATING_START);
  const opEnd = timeToMinutes(OPERATING_END);

  if (arrivalMinutes < opStart || arrivalMinutes > opEnd) return null;

  const dayOfWeek = getDayOfWeek(isoDate);

  const lunchWindow = mealWindows.find((w) => w.meal_type === "LUNCH");
  if (lunchWindow && windowIsOpenOnDay(lunchWindow, dayOfWeek) && windowContainsTime(lunchWindow, arrivalMinutes)) {
    return "LUNCH";
  }

  const dinnerWindow = mealWindows.find((w) => w.meal_type === "DINNER");
  if (dinnerWindow && windowIsOpenOnDay(dinnerWindow, dayOfWeek) && windowContainsTime(dinnerWindow, arrivalMinutes)) {
    return "DINNER";
  }

  return null;
}