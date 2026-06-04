import { useState } from "react";
import { usersApi } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { useTenant } from "../hooks/useTenant";

export function ChangePasswordPage() {
  const { logoutUser } = useAuth();
  const { name } = useTenant();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function handleSubmit() {
    setErr("");
    if (!current || !next || !confirm) {
      setErr("All fields are required.");
      return;
    }
    if (next.length < 8) {
      setErr("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setErr("Passwords do not match.");
      return;
    }
    if (next === current) {
      setErr("New password must be different from your current password.");
      return;
    }

    setSaving(true);
    try {
      await usersApi.patch("/users/me/password", {
        current_password: current,
        new_password: next,
      });
      localStorage.setItem("apr_force_pw_change", "0");
      window.location.reload();
    } catch (e: any) {
      setErr(
        e?.response?.data?.detail ??
          "Failed to update password. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#faf9f7",
        fontFamily: "'Georgia', serif",
        padding: "1.5rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: "400px" }}>
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: 400,
              letterSpacing: "0.04em",
              marginBottom: "0.5rem",
            }}
          >
            {name}
          </h1>
          <p
            style={{
              fontSize: "14px",
              color: "#78716c",
              fontFamily: "sans-serif",
              lineHeight: 1.6,
            }}
          >
            Welcome. Please set a new password before continuing.
          </p>
        </div>

        <div
          style={{
            background: "white",
            borderRadius: "16px",
            border: "1px solid #e7e5e4",
            padding: "2rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          {[
            { label: "Current Password", value: current, onChange: setCurrent },
            { label: "New Password", value: next, onChange: setNext },
            {
              label: "Confirm New Password",
              value: confirm,
              onChange: setConfirm,
            },
          ].map(({ label, value, onChange }) => (
            <div key={label}>
              <label
                style={{
                  display: "block",
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase" as const,
                  color: "#a8a29e",
                  fontFamily: "sans-serif",
                  marginBottom: "6px",
                }}
              >
                {label}
              </label>
              <input
                type="password"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  fontSize: "16px",
                  border: "1.5px solid #e7e5e4",
                  borderRadius: "10px",
                  background: "white",
                  color: "#1c1917",
                  fontFamily: "inherit",
                  outline: "none",
                  boxSizing: "border-box" as const,
                }}
              />
            </div>
          ))}

          {err && (
            <p
              style={{
                fontSize: "13px",
                color: "#dc2626",
                fontFamily: "sans-serif",
                margin: 0,
              }}
            >
              {err}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              width: "100%",
              padding: "15px",
              fontSize: "14px",
              fontWeight: 400,
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
              background: saving ? "#a8a29e" : "#1c1917",
              color: "white",
              border: "none",
              borderRadius: "10px",
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "sans-serif",
              marginTop: "0.5rem",
            }}
          >
            {saving ? "Updating..." : "Set New Password"}
          </button>
        </div>

        <button
          onClick={logoutUser}
          style={{
            display: "block",
            margin: "1.25rem auto 0",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "13px",
            color: "#a8a29e",
            fontFamily: "sans-serif",
          }}
        >
          Log out
        </button>
      </div>
    </div>
  );
}
