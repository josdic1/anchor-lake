import { useContext } from "react";
import { LoadingContext } from "../contexts/LoadingContext";

export function useLoading() {
  return useContext(LoadingContext);
}
