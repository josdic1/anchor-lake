import { createContext } from "react";

interface LoadingContextType {
  loading: boolean;
  message: string | undefined;
  setLoading: (loading: boolean, message?: string) => void;
}

export const LoadingContext = createContext<LoadingContextType>({
  loading: false,
  message: undefined,
  setLoading: () => {},
});
