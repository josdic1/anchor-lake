import { useState } from "react";
import { LoadingContext } from "../contexts/LoadingContext";
import { TenantLoader } from "../components/shared/TenantLoader";

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoadingState] = useState(false);
  const [message, setMessage] = useState<string | undefined>(undefined);

  function setLoading(val: boolean, msg?: string) {
    setLoadingState(val);
    setMessage(msg);
  }

  return (
    <LoadingContext.Provider value={{ loading, message, setLoading }}>
      {loading && <TenantLoader message={message} />}
      {children}
    </LoadingContext.Provider>
  );
}
