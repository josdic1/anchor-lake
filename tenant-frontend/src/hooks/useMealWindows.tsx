import { useContext } from "react";
import { MealWindowsContext } from "../contexts/MealWindowsContext";

export function useMealWindows() {
  const context = useContext(MealWindowsContext);
  if (!context) {
    throw new Error("useMealWindows must be used inside MealWindowsProvider");
  }
  return context;
}
