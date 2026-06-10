import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useTenant } from "../hooks/useTenant";
import { usersApi } from "../api/client";
import type { LoginRequest } from "../types/auth";
import { Sparkles, RotateCcw } from "lucide-react";

type PageMode = "checking" | "setup" | "login";
type SetupStep =
  | "choose"
  | "fresh-confirm"
  | "sample-confirm"
  | "sample-done"
  | "working";

type DemoUser = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: "admin" | "staff" | "member";
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "7px 14px",
        borderRadius: "7px",
        border: "1.5px solid var(--zinc-200)",
        background: copied ? "var(--accent-light)" : "var(--bg-surface)",
        color: copied ? "var(--accent)" : "var(--zinc-700)",
        fontSize: "13px",
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: "ui-monospace, monospace",
        transition: "all 0.15s ease",
      }}
    >
      {copied ? "✓ Copied" : text}
    </button>
  );
}

const ROLE_STYLE: Record<string, { bg: string; color: string }> = {
  admin: { bg: "var(--error-bg)", color: "var(--error)" },
  staff: { bg: "var(--zinc-100)", color: "var(--zinc-700)" },
  member: { bg: "var(--accent-light)", color: "var(--accent-hover)" },
};

function DemoLoginPanel({
  onLogin,
  loggingIn,
  open,
}: {
  onLogin: (email: string) => void;
  loggingIn: string | null;
  open: boolean;
}) {
  const [users, setUsers] = useState<DemoUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    usersApi
      .get("/demo/users")
      .then((r) => setUsers(r.data))
      .finally(() => setLoading(false));
  }, [open]);

  const groups = [
    { label: "Admin", role: "admin" },
    { label: "Staff", role: "staff" },
    { label: "Members", role: "member" },
  ];

  if (loading) {
    return (
      <div
        style={{
          padding: "24px",
          textAlign: "center",
          color: "var(--zinc-400)",
          fontSize: "13px",
        }}
      >
        Loading accounts...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {groups.map(({ label, role }) => {
        const list = users.filter((u) => u.role === role);
        if (!list.length) return null;
        return (
          <div key={role}>
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--zinc-400)",
                marginBottom: "8px",
              }}
            >
              {label}
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "5px" }}
            >
              {list.map((u) => {
                const rs = ROLE_STYLE[u.role];
                const active = loggingIn === u.email;
                return (
                  <button
                    key={u.id}
                    onClick={() => onLogin(u.email)}
                    disabled={!!loggingIn}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      border: "1.5px solid var(--zinc-200)",
                      borderRadius: "10px",
                      background: active
                        ? "var(--accent-light)"
                        : "var(--bg-surface)",
                      cursor: loggingIn ? "not-allowed" : "pointer",
                      opacity: loggingIn && !active ? 0.5 : 1,
                      transition: "all 0.15s ease",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => {
                      if (!loggingIn)
                        (e.currentTarget as HTMLElement).style.borderColor =
                          "var(--accent)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor =
                        "var(--zinc-200)";
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          background: rs.bg,
                          color: rs.color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "11px",
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {u.first_name[0]}
                        {u.last_name[0]}
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "var(--zinc-900)",
                          }}
                        >
                          {u.first_name} {u.last_name}
                        </div>
                        <div
                          style={{ fontSize: "11px", color: "var(--zinc-500)" }}
                        >
                          {u.email}
                        </div>
                      </div>
                    </div>
                    {active ? (
                      <div
                        style={{
                          width: "14px",
                          height: "14px",
                          border: "2px solid var(--zinc-200)",
                          borderTopColor: "var(--accent)",
                          borderRadius: "50%",
                          animation: "spin 0.6s linear infinite",
                        }}
                      />
                    ) : (
                      <span
                        style={{ fontSize: "14px", color: "var(--zinc-400)" }}
                      >
                        →
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function SetupFlow({
  onSetupDone,
  onLogin,
}: {
  onSetupDone: () => void;
  onLogin: (email: string) => void;
}) {
  const [step, setStep] = useState<SetupStep>("choose");
  const [error, setError] = useState("");
  const [loggingIn, setLoggingIn] = useState<string | null>(null);

  async function doFresh() {
    setStep("working");
    setError("");
    try {
      await usersApi.post("/demo/reset-fresh");
      onSetupDone();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Reset failed.");
      setStep("fresh-confirm");
    }
  }

  async function doSample() {
    setStep("working");
    setError("");
    try {
      await usersApi.post("/demo/reset-sample");
      setStep("sample-done");
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Seed failed.");
      setStep("sample-confirm");
    }
  }

  async function handleQuickLogin(email: string) {
    setLoggingIn(email);
    onLogin(email);
  }

  if (step === "working") {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "40px 0",
          color: "var(--zinc-500)",
          fontSize: "14px",
        }}
      >
        <div
          style={{
            width: "28px",
            height: "28px",
            margin: "0 auto 16px",
            border: "3px solid var(--zinc-200)",
            borderTopColor: "var(--accent)",
            borderRadius: "50%",
            animation: "spin 0.7s linear infinite",
          }}
        />
        Setting up...
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (step === "choose") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ marginBottom: "8px" }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "24px",
              fontWeight: 500,
              color: "var(--zinc-900)",
              marginBottom: "6px",
            }}
          >
            Welcome
          </div>
          <div style={{ fontSize: "13px", color: "var(--zinc-500)" }}>
            How would you like to get started?
          </div>
        </div>
        <button
          onClick={() => setStep("fresh-confirm")}
          style={{
            padding: "20px 22px",
            borderRadius: "12px",
            border: "1.5px solid var(--zinc-200)",
            background: "var(--bg-surface)",
            cursor: "pointer",
            textAlign: "left",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.borderColor =
              "var(--zinc-900)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.borderColor =
              "var(--zinc-200)")
          }
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "4px",
            }}
          >
            <span
              style={{
                fontSize: "15px",
                fontWeight: 600,
                color: "var(--zinc-900)",
              }}
            >
              Start Fresh
            </span>
            <span>🚀</span>
          </div>
          <div
            style={{
              fontSize: "13px",
              color: "var(--zinc-500)",
              lineHeight: 1.5,
            }}
          >
            Clean slate. One admin account. Set up your own rooms, menu, and
            members.
          </div>
        </button>
        <button
          onClick={() => setStep("sample-confirm")}
          style={{
            padding: "20px 22px",
            borderRadius: "12px",
            border: "1.5px solid var(--zinc-200)",
            background: "var(--bg-surface)",
            cursor: "pointer",
            textAlign: "left",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.borderColor =
              "var(--accent)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.borderColor =
              "var(--zinc-200)")
          }
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "4px",
            }}
          >
            <span
              style={{
                fontSize: "15px",
                fontWeight: 600,
                color: "var(--zinc-900)",
              }}
            >
              Explore with Sample Data
            </span>
            <span>🔬</span>
          </div>
          <div
            style={{
              fontSize: "13px",
              color: "var(--zinc-500)",
              lineHeight: 1.5,
            }}
          >
            2 months of bookings, orders, and members. Run reports, try to break
            things.
          </div>
        </button>
      </div>
    );
  }

  if (step === "fresh-confirm") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "22px",
              fontWeight: 500,
              marginBottom: "6px",
            }}
          >
            Start Fresh
          </div>
          <div
            style={{
              fontSize: "13px",
              color: "var(--zinc-500)",
              lineHeight: 1.6,
            }}
          >
            Creates a single admin account. Log in, then set up rooms, menu, and
            members from Admin.
          </div>
        </div>
        <div
          style={{
            background: "var(--zinc-50)",
            border: "1px solid var(--zinc-200)",
            borderRadius: "10px",
            padding: "16px 18px",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--zinc-400)",
              marginBottom: "12px",
            }}
          >
            Your first login
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            <div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--zinc-400)",
                  marginBottom: "4px",
                }}
              >
                Email
              </div>
              <CopyButton text="admin@demo.com" />
            </div>
            <div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--zinc-400)",
                  marginBottom: "4px",
                }}
              >
                Password
              </div>
              <CopyButton text="111111" />
            </div>
          </div>
        </div>
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
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={doFresh}
            style={{
              flex: 1,
              padding: "11px",
              borderRadius: "9px",
              border: "none",
              background: "var(--zinc-900)",
              color: "var(--bg-canvas)",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            I get it — let's go
          </button>
          <button
            onClick={() => setStep("choose")}
            style={{
              padding: "11px 18px",
              borderRadius: "9px",
              border: "1.5px solid var(--zinc-200)",
              background: "transparent",
              color: "var(--zinc-600)",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  if (step === "sample-confirm") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "22px",
              fontWeight: 500,
              marginBottom: "6px",
            }}
          >
            Load Sample Data
          </div>
          <div
            style={{
              fontSize: "13px",
              color: "var(--zinc-500)",
              lineHeight: 1.6,
            }}
          >
            Seeds realistic data so you can explore every part of the platform.
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[
            { icon: "👥", text: "8 member households with dietary flags" },
            { icon: "🍽️", text: "Full menu — starters, mains, sides, drinks" },
            { icon: "📅", text: "60 days of bookings — past, active, today" },
            {
              icon: "🧾",
              text: "Realistic orders with fired and served states",
            },
            {
              icon: "🔑",
              text: "Admin, staff, and member accounts — all pw 111111",
            },
          ].map(({ icon, text }) => (
            <div
              key={text}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "13px",
                color: "var(--zinc-600)",
              }}
            >
              <span>{icon}</span>
              {text}
            </div>
          ))}
        </div>
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
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={doSample}
            style={{
              flex: 1,
              padding: "11px",
              borderRadius: "9px",
              border: "none",
              background: "var(--zinc-900)",
              color: "var(--bg-canvas)",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Load sample data
          </button>
          <button
            onClick={() => setStep("choose")}
            style={{
              padding: "11px 18px",
              borderRadius: "9px",
              border: "1.5px solid var(--zinc-200)",
              background: "transparent",
              color: "var(--zinc-600)",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  if (step === "sample-done") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "22px",
              fontWeight: 500,
              marginBottom: "6px",
            }}
          >
            Ready to explore
          </div>
          <div
            style={{
              fontSize: "13px",
              color: "var(--zinc-500)",
              lineHeight: 1.6,
            }}
          >
            Sample data loaded. Pick an account below to log in instantly.
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            padding: "14px 16px",
            background: "var(--zinc-50)",
            borderRadius: "10px",
            border: "1px solid var(--zinc-200)",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--zinc-400)",
              marginBottom: "4px",
            }}
          >
            Try as admin
          </div>
          <div style={{ fontSize: "13px", color: "var(--zinc-600)" }}>
            Run reports, manage menu, handle stuck bookings.
          </div>
          <CopyButton text="admin@demo.com" />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            padding: "14px 16px",
            background: "var(--zinc-50)",
            borderRadius: "10px",
            border: "1px solid var(--zinc-200)",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--zinc-400)",
              marginBottom: "4px",
            }}
          >
            Try as a member
          </div>
          <div style={{ fontSize: "13px", color: "var(--zinc-600)" }}>
            Make bookings, manage household, see the member view.
          </div>
          <CopyButton text="james.hartwell@demo.com" />
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={onSetupDone}
            style={{
              flex: 1,
              padding: "11px",
              borderRadius: "9px",
              border: "none",
              background: "var(--zinc-900)",
              color: "var(--bg-canvas)",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Go to login →
          </button>
        </div>
        <DemoLoginPanel
          onLogin={handleQuickLogin}
          loggingIn={loggingIn}
          open={true}
        />
      </div>
    );
  }

  return null;
}

export function LoginPage() {
  const { loginUser } = useAuth();
  const { name, logo_url } = useTenant();
  const [pageMode, setPageMode] = useState<PageMode>("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState("");

  useEffect(() => {
    async function check() {
      try {
        const res = await usersApi.get("/demo/needs-setup");
        setPageMode(res.data.needs_setup ? "setup" : "login");
      } catch {
        setPageMode("login");
      }
    }
    check();
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await loginUser({ email, password } as LoginRequest);
    } catch {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickLogin(userEmail: string) {
    setError("");
    try {
      await loginUser({ email: userEmail, password: "111111" } as LoginRequest);
    } catch {
      setError(`Login failed for ${userEmail}`);
    }
  }

  async function handleTryDemo() {
    setLoading(true);
    setError("");
    try {
      await usersApi.post("/demo/reset-sample");
      await loginUser({
        email: "admin@demo.com",
        password: "111111",
      } as LoginRequest);
    } catch {
      setError("Failed to load demo. Try again.");
      setLoading(false);
    }
  }

  async function handleResetApp() {
    setResetting(true);
    setResetMsg("");
    setError("");
    try {
      await usersApi.post("/demo/reset-app");
      setResetMsg("App reset. You can now log in as admin.");
    } catch {
      setError("Reset failed. Try again.");
    } finally {
      setResetting(false);
    }
  }

  if (pageMode === "checking") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "20px",
            height: "20px",
            border: "2px solid var(--zinc-200)",
            borderTopColor: "var(--accent)",
            borderRadius: "50%",
            animation: "spin 0.7s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        background: "var(--bg-canvas)",
      }}
    >
      <div style={{ width: "100%", maxWidth: "460px" }}>
        {pageMode === "setup" ? (
          <SetupFlow
            onSetupDone={() => setPageMode("login")}
            onLogin={handleQuickLogin}
          />
        ) : (
          <>
            <div style={{ marginBottom: "34px", textAlign: "center" }}>
              {logo_url && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    marginBottom: "24px",
                  }}
                >
                  <img
                    src={logo_url}
                    alt={name}
                    style={{
                      display: "block",
                      width: "min(92vw, 420px)",
                      height: "auto",
                      maxWidth: "100%",
                      maxHeight: "200px",
                      objectFit: "contain",
                    }}
                  />
                </div>
              )}
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "34px",
                  fontWeight: 500,
                  color: "var(--zinc-900)",
                  marginBottom: "4px",
                  lineHeight: 1.05,
                }}
              >
                Sign in
              </div>
              <div style={{ fontSize: "14px", color: "var(--zinc-500)" }}>
                Enter your credentials to continue
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
              <button
                type="button"
                onClick={handleTryDemo}
                disabled={loading}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "13px",
                  fontSize: "14px",
                  fontWeight: 600,
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  background: "var(--zinc-900)",
                  color: "white",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1,
                }}
              >
                <Sparkles size={16} />
                Try the Demo
              </button>
              <button
                type="button"
                onClick={handleResetApp}
                disabled={resetting}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "13px",
                  fontSize: "14px",
                  fontWeight: 500,
                  borderRadius: "var(--radius-sm)",
                  border: "1.5px solid var(--zinc-300)",
                  background: "transparent",
                  color: "var(--zinc-600)",
                  cursor: resetting ? "not-allowed" : "pointer",
                  opacity: resetting ? 0.6 : 1,
                }}
              >
                <RotateCcw size={16} />
                {resetting ? "Resetting..." : "Reset App"}
              </button>
            </div>

            {resetMsg && (
              <div
                style={{
                  fontSize: "13px",
                  color: "var(--zinc-600)",
                  background: "var(--zinc-50)",
                  border: "1px solid var(--zinc-200)",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  marginBottom: "16px",
                }}
              >
                {resetMsg}
              </div>
            )}

            <form
              onSubmit={handleLogin}
              style={{ display: "flex", flexDirection: "column", gap: "15px" }}
            >
              <div className="form-stack">
                <label>
                  <span>Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                </label>
              </div>
              <div className="form-stack">
                <label>
                  <span>Password</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                  />
                </label>
              </div>
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
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{ width: "100%", padding: "13px", fontSize: "14px" }}
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
