import { useEffect, useState, type ReactNode } from "react";
import { getMealWindows } from "../api/mealWindows";
import { MealWindowsContext } from "../contexts/MealWindowsContext";
import type { MealWindow } from "../types/booking";

type Props = { children: ReactNode };

export function MealWindowsProvider({ children }: Props) {
  const [mealWindows, setMealWindows] = useState<MealWindow[]>([]);

  useEffect(() => {
    getMealWindows()
      .then(setMealWindows)
      .catch(() => {
        // fail silently — form will show no meal types until resolved
      });
  }, []);

  return (
    <MealWindowsContext.Provider value={{ mealWindows }}>
      {children}
    </MealWindowsContext.Provider>
  );
}
