import { createContext } from "react";
import type { MealWindow } from "../types/booking";

export type MealWindowsContextValue = {
  mealWindows: MealWindow[];
};

export const MealWindowsContext = createContext<MealWindowsContextValue>({
  mealWindows: [],
});
