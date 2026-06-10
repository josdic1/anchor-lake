import { useState } from "react";
import { usersApi } from "../../api/client";
import { useAuth } from "../../hooks/useAuth";
import { Sparkles, RotateCcw } from "lucide-react";
import { TenantLoader } from "./TenantLoader";
import type { LoginRequest } from "../../types/auth";

export function DemoPanel() {
  const { loginUser } = useAuth();
  const [loading, setLoading] = useState<"sample" | "fresh" | null>(null);
  const [error, setError] = useState("");

  async function handleSample() {
    setLoading("sample");
    setError("");
    try {
      await usersApi.post("/demo/reset-sample");
      await loginUser({
        email: "admin@demo.com",
        password: "111111",
      } as LoginRequest);
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(null);
    }
  }

  async function handleFresh() {
    setLoading("fresh");
    setError("");
    try {
      await usersApi.post("/demo/reset-app");
      await loginUser({
        email: "admin@demo.com",
        password: "111111",
      } as LoginRequest);
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(null);
    }
  }

  return (
    <>
      {loading && (
        <TenantLoader
          message={
            loading === "sample"
              ? "Seeding bookings, members, and menu. Just a moment."
              : "Clearing data and preparing your app."
          }
        />
      )}

      <div
        style={{
          border: "1px solid var(--zinc-200)",
          borderRadius: "var(--radius-md, 16px)",
          background: "var(--bg-surface)",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--zinc-400)",
            fontFamily: "var(--font-body)",
            marginBottom: "2px",
          }}
        >
          Demo Controls
        </div>
        <button
          type="button"
          onClick={handleSample}
          disabled={!!loading}
          style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: "var(--radius-sm, 10px)",
            border: "none",
            background: "var(--zinc-900)",
            color: "white",
            fontSize: "13px",
            fontWeight: 600,
            fontFamily: "var(--font-body)",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <Sparkles size={14} />
          Explore with Sample Data
        </button>
        <button
          type="button"
          onClick={handleFresh}
          disabled={!!loading}
          style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: "var(--radius-sm, 10px)",
            border: "1.5px solid var(--zinc-200)",
            background: "transparent",
            color: "var(--zinc-600)",
            fontSize: "13px",
            fontWeight: 500,
            fontFamily: "var(--font-body)",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <RotateCcw size={14} />
          Start with Empty App
        </button>
        {error && (
          <div
            style={{
              fontSize: "13px",
              color: "var(--error)",
              background: "var(--error-bg)",
              padding: "10px 14px",
              borderRadius: "8px",
            }}
          >
            {error}
          </div>
        )}
      </div>
    </>
  );
}
