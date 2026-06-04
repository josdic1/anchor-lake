import type { MealWindow } from "../types/booking";
import { bookingsApi } from "./client";

export async function getMealWindows(): Promise<MealWindow[]> {
  const response = await bookingsApi.get<MealWindow[]>("/meal-windows");
  return response.data;
}
