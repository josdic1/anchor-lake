import { useEffect, useState } from "react";
import {
  Edit2,
  Plus,
  X,
  Check,
  RotateCcw,
  Power,
  Trash2,
  UserPlus,
  AlertTriangle,
  Key,
  ChevronUp,
  ChevronDown,
  Search,
} from "lucide-react";
import { usersApi, roomsApi, bookingsApi } from "../api/client";
import { getAttendees } from "../api/bookings";
import { useLoading } from "../hooks/useLoading";
import type { Attendee } from "../types/booking";
import {
  getMenuItems,
  updateMenuItem,
  deactivateMenuItem,
  createMenuItem,
} from "../api/menu";
import type { MenuItem, MenuCategory } from "../api/menu";
import { getMealWindows } from "../api/mealWindows";
import type { MealWindow, MealType } from "../types/booking";

type Tab = "users" | "members" | "menu" | "rooms" | "meal-windows" | "bookings";

const TABS: { key: Tab; label: string }[] = [
  { key: "users", label: "Users" },
  { key: "members", label: "Members" },
  { key: "menu", label: "Menu" },
  { key: "rooms", label: "Rooms" },
  { key: "meal-windows", label: "Hours" },
  { key: "bookings", label: "Bookings" },
];

const TAB_DESCRIPTIONS: Record<Tab, string> = {
  users: "Manage user accounts, roles, and access",
  members: "Manage household members across all accounts",
  menu: "Add, edit, activate and deactivate menu items",
  rooms: "Manage dining rooms and capacity",
  "meal-windows": "Set service hours and available days for each meal period",
  bookings: "View and force-update any booking status",
};

const TAB_LABELS: Record<Tab, string> = {
  users: "Loading users...",
  members: "Loading members...",
  menu: "Loading menu...",
  rooms: "Loading rooms...",
  "meal-windows": "Loading hours...",
  bookings: "Loading bookings...",
};

function SearchBar({
  value,
  onChange,
  placeholder = "Search...",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        width: "260px",
      }}
    >
      <Search
        size={13}
        style={{
          position: "absolute",
          left: "10px",
          color: "var(--zinc-400)",
          pointerEvents: "none",
          flexShrink: 0,
        }}
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "6px 30px 6px 30px",
          border: "1px solid var(--zinc-200)",
          borderRadius: "6px",
          fontSize: "13px",
          color: "var(--zinc-800)",
          background: "var(--bg-surface)",
          outline: "none",
          transition: "border-color 0.15s ease",
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "var(--zinc-400)")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--zinc-200)")}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          style={{
            position: "absolute",
            right: "8px",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "2px",
            display: "inline-flex",
            alignItems: "center",
            color: "var(--zinc-400)",
            borderRadius: "3px",
          }}
          title="Clear search"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}

type SortDir = "asc" | "desc";

function useSortable<T>(
  data: T[],
  defaultKey: keyof T,
  defaultDir: SortDir = "asc",
) {
  const [sortKey, setSortKey] = useState<keyof T>(defaultKey);
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir);

  function handleSort(key: keyof T) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = [...data].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (av === null || av === undefined) return 1;
    if (bv === null || bv === undefined) return -1;
    let cmp = 0;
    if (typeof av === "string" && typeof bv === "string")
      cmp = av.toLowerCase().localeCompare(bv.toLowerCase());
    else if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
    else if (typeof av === "boolean" && typeof bv === "boolean")
      cmp = av === bv ? 0 : av ? -1 : 1;
    else cmp = String(av).localeCompare(String(bv));
    return sortDir === "asc" ? cmp : -cmp;
  });

  return { sorted, sortKey, sortDir, handleSort };
}

function SortableTh({
  children,
  sortKey,
  activeSortKey,
  sortDir,
  onSort,
}: {
  children: React.ReactNode;
  sortKey: string;
  activeSortKey: string;
  sortDir: SortDir;
  onSort: (key: any) => void;
}) {
  const isActive = sortKey === activeSortKey;
  return (
    <th
      onClick={() => onSort(sortKey)}
      style={{
        padding: "0.625rem 1rem",
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase" as const,
        color: isActive ? "var(--zinc-800)" : "var(--zinc-500)",
        background: "var(--zinc-50)",
        borderBottom: "1px solid var(--zinc-200)",
        textAlign: "left" as const,
        cursor: "pointer",
        userSelect: "none",
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
      >
        {children}
        <span
          style={{
            display: "inline-flex",
            flexDirection: "column",
            gap: "1px",
            opacity: isActive ? 1 : 0.3,
          }}
        >
          <ChevronUp
            size={9}
            style={{
              marginBottom: "-2px",
              color:
                isActive && sortDir === "asc"
                  ? "var(--zinc-900)"
                  : "var(--zinc-400)",
            }}
          />
          <ChevronDown
            size={9}
            style={{
              color:
                isActive && sortDir === "desc"
                  ? "var(--zinc-900)"
                  : "var(--zinc-400)",
            }}
          />
        </span>
      </span>
    </th>
  );
}

function PasswordResetModal({
  userId,
  userEmail,
  onClose,
}: {
  userId: number;
  userEmail: string;
  onClose: () => void;
}) {
  const [newPass, setNewPass] = useState("111111");
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    setLoading(true);
    try {
      await usersApi.patch(`/users/${userId}`, { password: newPass });
      alert(`Password for ${userEmail} reset to: ${newPass}`);
      onClose();
    } catch {
      alert("Failed to reset password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div className="panel" style={{ width: "320px", background: "white" }}>
        <h3>Reset Password</h3>
        <p style={{ fontSize: "12px", color: "var(--zinc-500)" }}>
          Target: {userEmail}
        </p>
        <div className="form-stack" style={{ marginTop: "1rem" }}>
          <label>
            <span>New Password</span>
            <input
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
            />
          </label>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className="btn-primary"
              onClick={handleReset}
              disabled={loading}
            >
              {loading ? "Saving..." : "Reset"}
            </button>
            <button className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NeedsAttention({ refreshKey }: { refreshKey: number }) {
  const [stuck, setStuck] = useState<any[]>([]);
  const [attendeeMap, setAttendeeMap] = useState<Record<number, Attendee[]>>(
    {},
  );
  const [completing, setCompleting] = useState<number | null>(null);
  const [completingAll, setCompletingAll] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  async function load() {
    try {
      const res = await bookingsApi.get("/bookings");
      const stuckBookings = res.data.filter(
        (b: any) =>
          ["SEATED", "SERVICE"].includes(b.status) && b.booking_date < today,
      );
      setStuck(stuckBookings);
      const entries = await Promise.all(
        stuckBookings.map(async (b: any) => {
          try {
            const attendees = await getAttendees(b.id);
            return [b.id, attendees] as [number, Attendee[]];
          } catch {
            return [b.id, []] as [number, Attendee[]];
          }
        }),
      );
      setAttendeeMap(Object.fromEntries(entries));
    } catch {}
  }

  useEffect(() => {
    load();
  }, [refreshKey]);

  async function complete(id: number) {
    setCompleting(id);
    try {
      await bookingsApi.post(`/bookings/${id}/actions/complete`);
      setStuck((prev) => prev.filter((b) => b.id !== id));
      window.dispatchEvent(new Event("stuck-bookings-changed"));
    } finally {
      setCompleting(null);
    }
  }

  async function completeAll() {
    setCompletingAll(true);
    try {
      await Promise.all(
        stuck.map((b) =>
          bookingsApi.post(`/bookings/${b.id}/actions/complete`),
        ),
      );
      setStuck([]);
      window.dispatchEvent(new Event("stuck-bookings-changed"));
    } finally {
      setCompletingAll(false);
    }
  }

  if (stuck.length === 0) return null;

  return (
    <div
      style={{
        background: "#fef3c7",
        border: "1px solid #fde68a",
        borderRadius: "var(--radius-md)",
        padding: "1.25rem",
        marginBottom: "1.5rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <AlertTriangle size={16} color="#92400e" />
          <span style={{ fontSize: "14px", fontWeight: 700, color: "#92400e" }}>
            {stuck.length} booking{stuck.length !== 1 ? "s" : ""} from past days
            still open
          </span>
        </div>
        <button
          onClick={completeAll}
          disabled={completingAll}
          style={{
            padding: "6px 14px",
            borderRadius: "var(--radius-sm)",
            border: "none",
            background: "#92400e",
            color: "white",
            fontSize: "12px",
            fontWeight: 600,
            cursor: completingAll ? "not-allowed" : "pointer",
            opacity: completingAll ? 0.6 : 1,
          }}
        >
          {completingAll ? "Completing..." : "Complete All"}
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {stuck.map((b) => {
          const attendees = attendeeMap[b.id] ?? [];
          const primary =
            attendees.find((a) => a.linked_member_id && !a.is_member_guest) ??
            attendees[0];
          const accountName = primary
            ? `${primary.guest_first_name ?? ""} ${primary.guest_last_name ?? ""}`.trim()
            : null;
          return (
            <div
              key={b.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 14px",
                background: "white",
                borderRadius: "var(--radius-sm)",
                border: "1px solid #fde68a",
              }}
            >
              <div style={{ fontSize: "13px", color: "#78350f" }}>
                <strong>{accountName ?? `#${b.id}`}</strong>
                {accountName && (
                  <span style={{ color: "#a16207", fontWeight: 400 }}>
                    {" "}
                    · #{b.id}
                  </span>
                )}
                {" · "}
                {b.booking_date} · {b.meal_type}{" "}
                <span
                  style={{
                    display: "inline-block",
                    padding: "1px 7px",
                    borderRadius: "3px",
                    fontSize: "10px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    background: b.status === "SERVICE" ? "#fef3c7" : "#dbeafe",
                    color: b.status === "SERVICE" ? "#92400e" : "#1e40af",
                  }}
                >
                  {b.status}
                </span>
              </div>
              <button
                onClick={() => complete(b.id)}
                disabled={completing === b.id}
                style={{
                  padding: "4px 12px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid #d97706",
                  background: "transparent",
                  color: "#92400e",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: completing === b.id ? "not-allowed" : "pointer",
                  opacity: completing === b.id ? 0.5 : 1,
                }}
              >
                {completing === b.id ? "..." : "Complete"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Badge({
  label,
  variant = "default",
}: {
  label: string;
  variant?: "default" | "green" | "red" | "blue";
}) {
  const colors = {
    default: { bg: "var(--zinc-100)", color: "var(--zinc-600)" },
    green: { bg: "#dcfce7", color: "#166534" },
    red: { bg: "#fee2e2", color: "#991b1b" },
    blue: { bg: "#dbeafe", color: "#1e40af" },
  };
  const c = colors[variant];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "1px 8px",
        borderRadius: "20px",
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase" as const,
        background: c.bg,
        color: c.color,
      }}
    >
      {label}
    </span>
  );
}

function Td({
  children,
  mono = false,
}: {
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <td
      style={{
        padding: "0.875rem 1rem",
        fontSize: "13px",
        color: "var(--zinc-800)",
        borderBottom: "1px solid var(--zinc-100)",
        verticalAlign: "middle",
        fontFamily: mono ? "ui-monospace, monospace" : undefined,
      }}
    >
      {children}
    </td>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        padding: "0.625rem 1rem",
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase" as const,
        color: "var(--zinc-500)",
        background: "var(--zinc-50)",
        borderBottom: "1px solid var(--zinc-200)",
        textAlign: "left" as const,
      }}
    >
      {children}
    </th>
  );
}

function TableShell({
  children,
  loading,
  error,
}: {
  children: React.ReactNode;
  loading: boolean;
  error: string;
}) {
  if (loading) return null;
  if (error)
    return (
      <div className="table-state" style={{ color: "var(--error)" }}>
        {error}
      </div>
    );
  return (
    <div
      style={{
        overflowX: "auto",
        border: "1px solid var(--zinc-200)",
        borderRadius: "var(--radius-md)",
        background: "var(--bg-surface)",
      }}
    >
      <table
        style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}
      >
        {children}
      </table>
    </div>
  );
}

function ActionBtn({
  onClick,
  icon,
  danger = false,
  title,
  disabled = false,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  danger?: boolean;
  title?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={{
        background: "none",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        padding: "4px 6px",
        color: danger ? "var(--error)" : "var(--zinc-500)",
        borderRadius: "4px",
        display: "inline-flex",
        alignItems: "center",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {icon}
    </button>
  );
}

function InlineEdit({
  value,
  onSave,
  onCancel,
}: {
  value: string;
  onSave: (v: string) => void;
  onCancel: () => void;
}) {
  const [val, setVal] = useState(value);
  return (
    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
      <input
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        style={{
          padding: "4px 8px",
          border: "1px solid var(--zinc-300)",
          borderRadius: "4px",
          fontSize: "13px",
          width: "160px",
        }}
      />
      <button
        type="button"
        onClick={() => onSave(val)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--success)",
        }}
      >
        <Check size={14} />
      </button>
      <button
        type="button"
        onClick={onCancel}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--zinc-400)",
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

const SUB_ROLE_OPTIONS = [
  { value: "", label: "None" },
  { value: "wait", label: "Wait Staff" },
  { value: "kitchen", label: "Kitchen" },
  { value: "manager", label: "Manager" },
];

function UsersTab({ onDone }: { onDone: () => void }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editField, setEditField] = useState("");
  const [editVal, setEditVal] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [resettingUser, setResettingUser] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [newForm, setNewForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    role: "member",
    member_number: "",
    sub_role: "",
  });
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");

  const { sorted, sortKey, sortDir, handleSort } = useSortable(users, "id");
  const q = search.trim().toLowerCase();
  const filtered = q
    ? sorted.filter(
        (u) =>
          `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) ||
          (u.email ?? "").toLowerCase().includes(q) ||
          (u.role ?? "").toLowerCase().includes(q) ||
          (u.sub_role ?? "").toLowerCase().includes(q) ||
          String(u.member_number ?? "")
            .toLowerCase()
            .includes(q) ||
          String(u.id).includes(q),
      )
    : sorted;

  const refreshUsers = () => {
    setLoading(true);
    usersApi
      .get("/users")
      .then((r) => setUsers(r.data))
      .catch(() => setError("Failed to load users"))
      .finally(() => {
        setLoading(false);
        onDone();
      });
  };

  useEffect(() => {
    refreshUsers();
  }, []);

  async function toggleActive(user: any) {
    await usersApi.patch(`/users/${user.id}`, { is_active: !user.is_active });
    setUsers((prev) =>
      prev.map((u) =>
        u.id === user.id ? { ...u, is_active: !u.is_active } : u,
      ),
    );
  }

  async function saveField(userId: number, field: string, value: string) {
    const updated = await usersApi.patch(`/users/${userId}`, {
      [field]: value,
    });
    setUsers((prev) => prev.map((u) => (u.id === userId ? updated.data : u)));
    setEditingId(null);
  }

  async function saveSubRole(userId: number, sub_role: string) {
    const updated = await usersApi.patch(`/users/${userId}`, {
      sub_role: sub_role || null,
    });
    setUsers((prev) => prev.map((u) => (u.id === userId ? updated.data : u)));
  }

  async function deleteUser(userId: number) {
    if (!window.confirm("Deactivate this user? (Users are never hard-deleted)"))
      return;
    await usersApi.patch(`/users/${userId}`, { is_active: false });
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, is_active: false } : u)),
    );
  }

  async function handleAdd() {
    if (
      !newForm.first_name ||
      !newForm.last_name ||
      !newForm.email ||
      !newForm.password
    ) {
      setFormErr("All fields required.");
      return;
    }
    setSaving(true);
    setFormErr("");
    try {
      const created = await usersApi.post("/users", {
        first_name: newForm.first_name,
        last_name: newForm.last_name,
        email: newForm.email,
        password: newForm.password,
        role: newForm.role,
        member_number: newForm.member_number || null,
        sub_role: newForm.sub_role || null,
      });
      setUsers((prev) => [...prev, created.data]);
      setShowAdd(false);
      setNewForm({
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        role: "member",
        member_number: "",
        sub_role: "",
      });
    } catch (e: any) {
      setFormErr(e?.response?.data?.detail ?? "Failed to create user.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(id: number, field: string, val: string) {
    setEditingId(id);
    setEditField(field);
    setEditVal(val);
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "8px",
          marginBottom: "1rem",
        }}
      >
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by name, email, role..."
        />
        <button className="btn-primary" onClick={() => setShowAdd(!showAdd)}>
          <Plus size={14} /> Add User
        </button>
      </div>
      {q && (
        <p
          style={{
            fontSize: "12px",
            color: "var(--zinc-400)",
            marginBottom: "0.75rem",
          }}
        >
          {filtered.length} result{filtered.length !== 1 ? "s" : ""} for &ldquo;
          {search}&rdquo;
        </p>
      )}
      {resettingUser && (
        <PasswordResetModal
          userId={resettingUser.id}
          userEmail={resettingUser.email}
          onClose={() => setResettingUser(null)}
        />
      )}
      {showAdd && (
        <div className="panel" style={{ marginBottom: "1.5rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "1rem",
            }}
          >
            <strong>New User</strong>
            <button
              className="btn-ghost btn-ghost--small"
              onClick={() => setShowAdd(false)}
            >
              <X size={14} />
            </button>
          </div>
          <div className="form-stack">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.75rem",
              }}
            >
              <label>
                <span>First Name</span>
                <input
                  value={newForm.first_name}
                  onChange={(e) =>
                    setNewForm({ ...newForm, first_name: e.target.value })
                  }
                />
              </label>
              <label>
                <span>Last Name</span>
                <input
                  value={newForm.last_name}
                  onChange={(e) =>
                    setNewForm({ ...newForm, last_name: e.target.value })
                  }
                />
              </label>
              <label>
                <span>Email</span>
                <input
                  type="email"
                  value={newForm.email}
                  onChange={(e) =>
                    setNewForm({ ...newForm, email: e.target.value })
                  }
                />
              </label>
              <label>
                <span>Password</span>
                <input
                  type="password"
                  value={newForm.password}
                  onChange={(e) =>
                    setNewForm({ ...newForm, password: e.target.value })
                  }
                />
              </label>
              <label>
                <span>Role</span>
                <select
                  value={newForm.role}
                  onChange={(e) =>
                    setNewForm({ ...newForm, role: e.target.value })
                  }
                >
                  <option value="member">Member</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <label>
                <span>Member #</span>
                <input
                  value={newForm.member_number}
                  onChange={(e) =>
                    setNewForm({ ...newForm, member_number: e.target.value })
                  }
                  placeholder="Optional"
                />
              </label>
              <label>
                <span>Sub Role</span>
                <select
                  value={newForm.sub_role}
                  onChange={(e) =>
                    setNewForm({ ...newForm, sub_role: e.target.value })
                  }
                >
                  {SUB_ROLE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {formErr && <p className="error-text">{formErr}</p>}
            <button
              className="btn-primary"
              onClick={handleAdd}
              disabled={saving}
            >
              {saving ? "Creating..." : "Create User"}
            </button>
          </div>
        </div>
      )}
      <TableShell loading={loading} error={error}>
        <thead>
          <tr>
            <SortableTh
              sortKey="id"
              activeSortKey={String(sortKey)}
              sortDir={sortDir}
              onSort={handleSort}
            >
              ID
            </SortableTh>
            <SortableTh
              sortKey="first_name"
              activeSortKey={String(sortKey)}
              sortDir={sortDir}
              onSort={handleSort}
            >
              Name
            </SortableTh>
            <SortableTh
              sortKey="email"
              activeSortKey={String(sortKey)}
              sortDir={sortDir}
              onSort={handleSort}
            >
              Email
            </SortableTh>
            <SortableTh
              sortKey="role"
              activeSortKey={String(sortKey)}
              sortDir={sortDir}
              onSort={handleSort}
            >
              Role
            </SortableTh>
            <SortableTh
              sortKey="sub_role"
              activeSortKey={String(sortKey)}
              sortDir={sortDir}
              onSort={handleSort}
            >
              Sub Role
            </SortableTh>
            <SortableTh
              sortKey="member_number"
              activeSortKey={String(sortKey)}
              sortDir={sortDir}
              onSort={handleSort}
            >
              Member #
            </SortableTh>
            <SortableTh
              sortKey="is_active"
              activeSortKey={String(sortKey)}
              sortDir={sortDir}
              onSort={handleSort}
            >
              Active
            </SortableTh>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((u) => (
            <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.5 }}>
              <Td mono>{u.id}</Td>
              <Td>
                {editingId === u.id && editField === "first_name" ? (
                  <InlineEdit
                    value={editVal}
                    onSave={(v) => saveField(u.id, "first_name", v)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <span
                    onClick={() => startEdit(u.id, "first_name", u.first_name)}
                    style={{ cursor: "pointer" }}
                  >
                    {u.first_name} {u.last_name}
                  </span>
                )}
              </Td>
              <Td>
                {editingId === u.id && editField === "email" ? (
                  <InlineEdit
                    value={editVal}
                    onSave={(v) => saveField(u.id, "email", v)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <span
                    onClick={() => startEdit(u.id, "email", u.email)}
                    style={{ cursor: "pointer", color: "var(--zinc-600)" }}
                  >
                    {u.email}
                  </span>
                )}
              </Td>
              <Td>
                <Badge
                  label={u.role}
                  variant={
                    u.role === "admin"
                      ? "red"
                      : u.role === "staff"
                        ? "blue"
                        : "default"
                  }
                />
              </Td>
              <Td>
                <select
                  value={u.sub_role ?? ""}
                  onChange={(e) => saveSubRole(u.id, e.target.value)}
                  style={{
                    padding: "3px 8px",
                    border: "1px solid var(--zinc-200)",
                    borderRadius: "4px",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  {SUB_ROLE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Td>
              <Td mono>{u.member_number ?? "—"}</Td>
              <Td>
                <Badge
                  label={u.is_active ? "Active" : "Inactive"}
                  variant={u.is_active ? "green" : "red"}
                />
              </Td>
              <Td>
                <div style={{ display: "flex", gap: "2px" }}>
                  <ActionBtn
                    onClick={() => setResettingUser(u)}
                    icon={<Key size={14} />}
                    title="Reset Password"
                  />
                  <ActionBtn
                    onClick={() => toggleActive(u)}
                    icon={<Power size={14} />}
                    title={u.is_active ? "Deactivate" : "Activate"}
                  />
                  <ActionBtn
                    onClick={() => deleteUser(u.id)}
                    icon={<Trash2 size={14} />}
                    danger
                    title="Deactivate user"
                  />
                </div>
              </Td>
            </tr>
          ))}
          {filtered.length === 0 && !loading && (
            <tr>
              <td
                colSpan={8}
                style={{
                  padding: "2rem",
                  textAlign: "center",
                  fontSize: "13px",
                  color: "var(--zinc-400)",
                }}
              >
                No users match &ldquo;{search}&rdquo;
              </td>
            </tr>
          )}
        </tbody>
      </TableShell>
    </div>
  );
}

const RELATION_OPTIONS = ["PRIMARY", "SPOUSE", "CHILD", "OTHER"];
const DIETARY_FLAGS = [
  "DAIRY_FREE",
  "EGG_FREE",
  "FISH_ALLERGY",
  "GLUTEN_FREE",
  "HALAL",
  "KOSHER",
  "NUT_ALLERGY",
  "OTHER",
  "PEANUT_ALLERGY",
  "SESAME_ALLERGY",
  "SHELLFISH_ALLERGY",
  "SOY_FREE",
  "VEGAN",
  "VEGETARIAN",
];

function MembersTab({ onDone }: { onDone: () => void }) {
  const [members, setMembers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [newForm, setNewForm] = useState({
    user_id: "",
    first_name: "",
    last_name: "",
    relation: "PRIMARY",
    dietary_flags: [] as string[],
    dietary_other_note: "",
  });
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");

  const { sorted, sortKey, sortDir, handleSort } = useSortable(members, "id");
  const q = search.trim().toLowerCase();
  const filtered = q
    ? sorted.filter((m) => {
        const accountUser = users.find((u) => u.id === m.user_id);
        const accountName = accountUser
          ? `${accountUser.first_name} ${accountUser.last_name}`
          : "";
        return (
          `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
          accountName.toLowerCase().includes(q) ||
          (m.relation ?? "").toLowerCase().includes(q) ||
          (m.dietary_flags ?? []).join(" ").toLowerCase().includes(q) ||
          (m.dietary_other_note ?? "").toLowerCase().includes(q) ||
          String(m.id).includes(q)
        );
      })
    : sorted;

  useEffect(() => {
    Promise.all([usersApi.get("/users/members/all"), usersApi.get("/users")])
      .then(([mRes, uRes]) => {
        setMembers(mRes.data);
        setUsers(uRes.data);
      })
      .catch(() => setError("Failed to load members"))
      .finally(() => {
        setLoading(false);
        onDone();
      });
  }, []);

  async function toggleActive(m: any) {
    await usersApi.patch(`/users/${m.user_id}/members/${m.id}`, {
      is_active: !m.is_active,
    });
    setMembers((prev) =>
      prev.map((x) => (x.id === m.id ? { ...x, is_active: !x.is_active } : x)),
    );
  }

  async function saveEdit(id: number, userId: number) {
    const updated = await usersApi.patch(`/users/${userId}/members/${id}`, {
      ...editForm,
      dietary_other_note: (editForm.dietary_flags ?? []).includes("OTHER")
        ? editForm.dietary_other_note?.trim() || null
        : null,
    });
    setMembers((prev) => prev.map((m) => (m.id === id ? updated.data : m)));
    setEditingId(null);
  }

  async function deleteMember(m: any) {
    if (
      !window.confirm(
        "Deactivate this member? (Members are never hard-deleted)",
      )
    )
      return;
    await usersApi.patch(`/users/${m.user_id}/members/${m.id}`, {
      is_active: false,
    });
    setMembers((prev) =>
      prev.map((x) => (x.id === m.id ? { ...x, is_active: false } : x)),
    );
  }

  async function handleAdd() {
    if (!newForm.user_id || !newForm.first_name || !newForm.last_name) {
      setFormErr("User, first name and last name required.");
      return;
    }
    setSaving(true);
    setFormErr("");
    try {
      const created = await usersApi.post(`/users/${newForm.user_id}/members`, {
        first_name: newForm.first_name,
        last_name: newForm.last_name,
        relation: newForm.relation,
        dietary_flags: newForm.dietary_flags,
        dietary_other_note: newForm.dietary_flags.includes("OTHER")
          ? newForm.dietary_other_note.trim() || null
          : null,
        notes: null,
      });
      setMembers((prev) => [...prev, created.data]);
      setShowAdd(false);
      setNewForm({
        user_id: "",
        first_name: "",
        last_name: "",
        relation: "PRIMARY",
        dietary_flags: [],
        dietary_other_note: "",
      });
    } catch (e: any) {
      setFormErr(e?.response?.data?.detail ?? "Failed to create member.");
    } finally {
      setSaving(false);
    }
  }

  function toggleNewFlag(flag: string) {
    setNewForm((f) => {
      const nextFlags = f.dietary_flags.includes(flag)
        ? f.dietary_flags.filter((x) => x !== flag)
        : [...f.dietary_flags, flag];
      return {
        ...f,
        dietary_flags: nextFlags,
        dietary_other_note: nextFlags.includes("OTHER")
          ? f.dietary_other_note
          : "",
      };
    });
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by name, account, relation..."
        />
        <button className="btn-primary" onClick={() => setShowAdd(!showAdd)}>
          <UserPlus size={14} /> Add Member
        </button>
      </div>
      {q && (
        <p
          style={{
            fontSize: "12px",
            color: "var(--zinc-400)",
            marginBottom: "0.75rem",
          }}
        >
          {filtered.length} result{filtered.length !== 1 ? "s" : ""} for &ldquo;
          {search}&rdquo;
        </p>
      )}
      {showAdd && (
        <div className="panel" style={{ marginBottom: "1.5rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "1rem",
            }}
          >
            <strong>New Household Member</strong>
            <button
              className="btn-ghost btn-ghost--small"
              onClick={() => setShowAdd(false)}
            >
              <X size={14} />
            </button>
          </div>
          <div className="form-stack">
            <label>
              <span>Account (User)</span>
              <select
                value={newForm.user_id}
                onChange={(e) =>
                  setNewForm({ ...newForm, user_id: e.target.value })
                }
              >
                <option value="">Select user...</option>
                {users
                  .filter((u) => u.is_active)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.first_name} {u.last_name} ({u.email})
                    </option>
                  ))}
              </select>
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.75rem",
              }}
            >
              <label>
                <span>First Name</span>
                <input
                  value={newForm.first_name}
                  onChange={(e) =>
                    setNewForm({ ...newForm, first_name: e.target.value })
                  }
                />
              </label>
              <label>
                <span>Last Name</span>
                <input
                  value={newForm.last_name}
                  onChange={(e) =>
                    setNewForm({ ...newForm, last_name: e.target.value })
                  }
                />
              </label>
            </div>
            <label>
              <span>Relation</span>
              <select
                value={newForm.relation}
                onChange={(e) =>
                  setNewForm({ ...newForm, relation: e.target.value })
                }
              >
                {RELATION_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <span
                className="field-label"
                style={{ marginBottom: "6px", display: "block" }}
              >
                Dietary Flags
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {DIETARY_FLAGS.map((flag) => {
                  const active = newForm.dietary_flags.includes(flag);
                  return (
                    <button
                      key={flag}
                      type="button"
                      onClick={() => toggleNewFlag(flag)}
                      style={{
                        padding: "2px 10px",
                        borderRadius: "20px",
                        fontSize: "11px",
                        cursor: "pointer",
                        border: `1px solid ${active ? "var(--zinc-900)" : "var(--zinc-200)"}`,
                        background: active
                          ? "var(--zinc-900)"
                          : "var(--bg-surface)",
                        color: active ? "white" : "var(--zinc-600)",
                      }}
                    >
                      {flag.replace(/_/g, " ")}
                    </button>
                  );
                })}
              </div>
              {newForm.dietary_flags.includes("OTHER") && (
                <label
                  style={{ marginTop: "10px", display: "grid", gap: "6px" }}
                >
                  <span className="field-label">Other dietary note</span>
                  <input
                    type="text"
                    value={newForm.dietary_other_note}
                    placeholder="Describe the dietary restriction..."
                    onChange={(e) =>
                      setNewForm({
                        ...newForm,
                        dietary_other_note: e.target.value,
                      })
                    }
                  />
                </label>
              )}
            </div>
            {formErr && <p className="error-text">{formErr}</p>}
            <button
              className="btn-primary"
              onClick={handleAdd}
              disabled={saving}
            >
              {saving ? "Adding..." : "Add Member"}
            </button>
          </div>
        </div>
      )}
      <TableShell loading={loading} error={error}>
        <thead>
          <tr>
            <SortableTh
              sortKey="id"
              activeSortKey={String(sortKey)}
              sortDir={sortDir}
              onSort={handleSort}
            >
              ID
            </SortableTh>
            <SortableTh
              sortKey="first_name"
              activeSortKey={String(sortKey)}
              sortDir={sortDir}
              onSort={handleSort}
            >
              Name
            </SortableTh>
            <SortableTh
              sortKey="user_id"
              activeSortKey={String(sortKey)}
              sortDir={sortDir}
              onSort={handleSort}
            >
              Account
            </SortableTh>
            <SortableTh
              sortKey="relation"
              activeSortKey={String(sortKey)}
              sortDir={sortDir}
              onSort={handleSort}
            >
              Relation
            </SortableTh>
            <Th>Dietary</Th>
            <SortableTh
              sortKey="is_active"
              activeSortKey={String(sortKey)}
              sortDir={sortDir}
              onSort={handleSort}
            >
              Active
            </SortableTh>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((m) => {
            const accountUser = users.find((u) => u.id === m.user_id);
            return (
              <tr key={m.id} style={{ opacity: m.is_active ? 1 : 0.5 }}>
                <Td mono>{m.id}</Td>
                <Td>
                  {editingId === m.id ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      }}
                    >
                      <div style={{ display: "flex", gap: "4px" }}>
                        <input
                          value={editForm.first_name ?? ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              first_name: e.target.value,
                            })
                          }
                          placeholder="First"
                          style={{
                            padding: "3px 8px",
                            border: "1px solid var(--zinc-300)",
                            borderRadius: "4px",
                            fontSize: "13px",
                            width: "90px",
                          }}
                        />
                        <input
                          value={editForm.last_name ?? ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              last_name: e.target.value,
                            })
                          }
                          placeholder="Last"
                          style={{
                            padding: "3px 8px",
                            border: "1px solid var(--zinc-300)",
                            borderRadius: "4px",
                            fontSize: "13px",
                            width: "90px",
                          }}
                        />
                      </div>
                      <select
                        value={editForm.relation ?? m.relation}
                        onChange={(e) =>
                          setEditForm({ ...editForm, relation: e.target.value })
                        }
                        style={{
                          padding: "3px 8px",
                          border: "1px solid var(--zinc-300)",
                          borderRadius: "4px",
                          fontSize: "12px",
                        }}
                      >
                        {RELATION_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "4px",
                          marginTop: "4px",
                        }}
                      >
                        {DIETARY_FLAGS.map((flag) => {
                          const active = (
                            editForm.dietary_flags ?? []
                          ).includes(flag);
                          return (
                            <button
                              key={flag}
                              type="button"
                              onClick={() =>
                                setEditForm((f: any) => {
                                  const nextFlags = active
                                    ? (f.dietary_flags ?? []).filter(
                                        (x: string) => x !== flag,
                                      )
                                    : [...(f.dietary_flags ?? []), flag];
                                  return {
                                    ...f,
                                    dietary_flags: nextFlags,
                                    dietary_other_note: nextFlags.includes(
                                      "OTHER",
                                    )
                                      ? (f.dietary_other_note ?? "")
                                      : "",
                                  };
                                })
                              }
                              style={{
                                padding: "1px 7px",
                                borderRadius: "20px",
                                fontSize: "10px",
                                cursor: "pointer",
                                border: `1px solid ${active ? "var(--zinc-900)" : "var(--zinc-200)"}`,
                                background: active
                                  ? "var(--zinc-900)"
                                  : "var(--bg-surface)",
                                color: active ? "white" : "var(--zinc-600)",
                              }}
                            >
                              {flag.replace(/_/g, " ")}
                            </button>
                          );
                        })}
                      </div>
                      {(editForm.dietary_flags ?? []).includes("OTHER") && (
                        <textarea
                          rows={2}
                          placeholder="Other dietary notes..."
                          value={editForm.dietary_other_note ?? ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              dietary_other_note: e.target.value,
                            })
                          }
                          style={{
                            marginTop: "4px",
                            padding: "4px 8px",
                            border: "1px solid var(--zinc-300)",
                            borderRadius: "4px",
                            fontSize: "12px",
                            width: "100%",
                            resize: "vertical",
                          }}
                        />
                      )}
                    </div>
                  ) : (
                    <span>
                      {m.first_name} {m.last_name}
                    </span>
                  )}
                </Td>
                <Td>
                  <span style={{ fontSize: "12px", color: "var(--zinc-600)" }}>
                    {accountUser
                      ? `${accountUser.first_name} ${accountUser.last_name}`
                      : `User #${m.user_id}`}
                  </span>
                </Td>
                <Td>
                  {editingId === m.id ? null : <Badge label={m.relation} />}
                </Td>
                <Td>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                    }}
                  >
                    <span
                      style={{ fontSize: "11px", color: "var(--zinc-500)" }}
                    >
                      {m.dietary_flags?.length > 0
                        ? m.dietary_flags.join(", ").replace(/_/g, " ")
                        : "—"}
                    </span>
                    {m.dietary_flags?.includes("OTHER") &&
                      m.dietary_other_note && (
                        <span
                          style={{
                            fontSize: "11px",
                            color: "var(--zinc-400)",
                            fontStyle: "italic",
                          }}
                        >
                          {m.dietary_other_note}
                        </span>
                      )}
                  </div>
                </Td>
                <Td>
                  <Badge
                    label={m.is_active ? "Active" : "Inactive"}
                    variant={m.is_active ? "green" : "red"}
                  />
                </Td>
                <Td>
                  <div style={{ display: "flex", gap: "2px" }}>
                    {editingId === m.id ? (
                      <>
                        <ActionBtn
                          onClick={() => saveEdit(m.id, m.user_id)}
                          icon={<Check size={14} />}
                        />
                        <ActionBtn
                          onClick={() => setEditingId(null)}
                          icon={<RotateCcw size={14} />}
                        />
                      </>
                    ) : (
                      <ActionBtn
                        onClick={() => {
                          setEditingId(m.id);
                          setEditForm({
                            first_name: m.first_name,
                            last_name: m.last_name,
                            relation: m.relation,
                            dietary_flags: m.dietary_flags ?? [],
                            dietary_other_note: m.dietary_other_note ?? "",
                          });
                        }}
                        icon={<Edit2 size={14} />}
                      />
                    )}
                    <ActionBtn
                      onClick={() => toggleActive(m)}
                      icon={<Power size={14} />}
                      title={m.is_active ? "Deactivate" : "Activate"}
                    />
                    <ActionBtn
                      onClick={() => deleteMember(m)}
                      icon={<Trash2 size={14} />}
                      danger
                      title="Deactivate member"
                    />
                  </div>
                </Td>
              </tr>
            );
          })}
          {filtered.length === 0 && !loading && (
            <tr>
              <td
                colSpan={7}
                style={{
                  padding: "2rem",
                  textAlign: "center",
                  fontSize: "13px",
                  color: "var(--zinc-400)",
                }}
              >
                No members match &ldquo;{search}&rdquo;
              </td>
            </tr>
          )}
        </tbody>
      </TableShell>
    </div>
  );
}

function MenuTab({ onDone }: { onDone: () => void }) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<MenuItem>>({});
  const [newForm, setNewForm] = useState<Partial<MenuItem>>({
    category: "MAIN",
    is_modifier: false,
    is_starter: false,
    is_special: false,
    dietary_flags: [],
    sort_order: 0,
  });
  const { sorted, sortKey, sortDir, handleSort } = useSortable(items, "id");

  useEffect(() => {
    getMenuItems()
      .then(setItems)
      .catch(() => setError("Failed to load menu"))
      .finally(() => {
        setLoading(false);
        onDone();
      });
  }, []);

  async function saveEdit(id: number) {
    const updated = await updateMenuItem(id, editForm);
    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    setEditingId(null);
  }
  async function handleToggle(item: MenuItem) {
    if (item.is_active) {
      await deactivateMenuItem(item.id);
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_active: false } : i)),
      );
    } else {
      const updated = await updateMenuItem(item.id, { is_active: true });
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    }
  }
  async function handleAdd() {
    const created = await createMenuItem(newForm);
    setItems((prev) => [...prev, created]);
    setShowAdd(false);
    setNewForm({
      category: "MAIN",
      is_modifier: false,
      is_starter: false,
      is_special: false,
      dietary_flags: [],
      sort_order: 0,
    });
  }

  const CATS: MenuCategory[] = [
    "STARTER",
    "MAIN",
    "SIDE",
    "DESSERT",
    "DRINK",
    "SPECIAL",
  ];
  const parents = items.filter((i) => !i.is_modifier);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "1rem",
        }}
      >
        <button className="btn-primary" onClick={() => setShowAdd(!showAdd)}>
          <Plus size={14} /> Add Item
        </button>
      </div>
      {showAdd && (
        <div className="panel" style={{ marginBottom: "1.5rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "1rem",
            }}
          >
            <strong>New Menu Item</strong>
            <button
              className="btn-ghost btn-ghost--small"
              onClick={() => setShowAdd(false)}
            >
              <X size={14} />
            </button>
          </div>
          <div className="form-stack">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.75rem",
              }}
            >
              <label>
                <span>Name</span>
                <input
                  value={newForm.name ?? ""}
                  onChange={(e) =>
                    setNewForm({ ...newForm, name: e.target.value })
                  }
                />
              </label>
              <label>
                <span>Price</span>
                <input
                  type="number"
                  step="0.01"
                  value={newForm.price ?? ""}
                  onChange={(e) =>
                    setNewForm({
                      ...newForm,
                      price: parseFloat(e.target.value),
                    })
                  }
                />
              </label>
            </div>
            <label>
              <span>Description</span>
              <textarea
                rows={2}
                value={newForm.description ?? ""}
                onChange={(e) =>
                  setNewForm({ ...newForm, description: e.target.value })
                }
              />
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.75rem",
              }}
            >
              <label>
                <span>Category</span>
                <select
                  value={newForm.category}
                  onChange={(e) =>
                    setNewForm({
                      ...newForm,
                      category: e.target.value as MenuCategory,
                    })
                  }
                >
                  {CATS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Type</span>
                <select
                  value={newForm.is_modifier ? "MOD" : "BASE"}
                  onChange={(e) =>
                    setNewForm({
                      ...newForm,
                      is_modifier: e.target.value === "MOD",
                      parent_item_id: null,
                    })
                  }
                >
                  <option value="BASE">Base Item</option>
                  <option value="MOD">Modifier</option>
                </select>
              </label>
            </div>
            {newForm.is_modifier && (
              <label>
                <span>Parent Item</span>
                <select
                  value={newForm.parent_item_id ?? ""}
                  onChange={(e) =>
                    setNewForm({
                      ...newForm,
                      parent_item_id: Number(e.target.value) || null,
                    })
                  }
                >
                  <option value="">Select parent...</option>
                  {parents.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button className="btn-primary" onClick={handleAdd}>
              Save
            </button>
          </div>
        </div>
      )}
      <TableShell loading={loading} error={error}>
        <thead>
          <tr>
            <SortableTh
              sortKey="id"
              activeSortKey={String(sortKey)}
              sortDir={sortDir}
              onSort={handleSort}
            >
              ID
            </SortableTh>
            <SortableTh
              sortKey="name"
              activeSortKey={String(sortKey)}
              sortDir={sortDir}
              onSort={handleSort}
            >
              Name
            </SortableTh>
            <SortableTh
              sortKey="category"
              activeSortKey={String(sortKey)}
              sortDir={sortDir}
              onSort={handleSort}
            >
              Category
            </SortableTh>
            <SortableTh
              sortKey="price"
              activeSortKey={String(sortKey)}
              sortDir={sortDir}
              onSort={handleSort}
            >
              Price
            </SortableTh>
            <Th>Type</Th>
            <SortableTh
              sortKey="is_active"
              activeSortKey={String(sortKey)}
              sortDir={sortDir}
              onSort={handleSort}
            >
              Active
            </SortableTh>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((item) => (
            <tr
              key={item.id}
              style={{
                opacity: item.is_active ? 1 : 0.45,
                background: item.is_modifier ? "var(--zinc-50)" : undefined,
              }}
            >
              <Td mono>{item.id}</Td>
              <Td>
                {editingId === item.id ? (
                  <input
                    autoFocus
                    value={editForm.name ?? ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    style={{
                      padding: "3px 8px",
                      border: "1px solid var(--zinc-300)",
                      borderRadius: "4px",
                      fontSize: "13px",
                    }}
                  />
                ) : (
                  <span
                    style={{ paddingLeft: item.is_modifier ? "1.25rem" : 0 }}
                  >
                    {item.is_modifier && (
                      <span
                        style={{ color: "var(--zinc-400)", marginRight: "4px" }}
                      >
                        ↳
                      </span>
                    )}
                    {item.name}
                  </span>
                )}
              </Td>
              <Td>
                <Badge label={item.category} />
              </Td>
              <Td>
                {editingId === item.id ? (
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.price ?? ""}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        price: parseFloat(e.target.value),
                      })
                    }
                    style={{
                      padding: "3px 8px",
                      border: "1px solid var(--zinc-300)",
                      borderRadius: "4px",
                      fontSize: "13px",
                      width: "80px",
                    }}
                  />
                ) : (
                  `$${item.price.toFixed(2)}`
                )}
              </Td>
              <Td>
                <span style={{ fontSize: "11px", color: "var(--zinc-500)" }}>
                  {item.is_modifier
                    ? "Modifier"
                    : item.is_special
                      ? "★ Special"
                      : "Base"}
                  {item.is_starter ? " · Pre-order" : ""}
                </span>
              </Td>
              <Td>
                <Badge
                  label={item.is_active ? "Active" : "Off"}
                  variant={item.is_active ? "green" : "red"}
                />
              </Td>
              <Td>
                <div style={{ display: "flex", gap: "2px" }}>
                  {editingId === item.id ? (
                    <>
                      <ActionBtn
                        onClick={() => saveEdit(item.id)}
                        icon={<Check size={14} />}
                      />
                      <ActionBtn
                        onClick={() => setEditingId(null)}
                        icon={<RotateCcw size={14} />}
                      />
                    </>
                  ) : (
                    <ActionBtn
                      onClick={() => {
                        setEditingId(item.id);
                        setEditForm({ name: item.name, price: item.price });
                      }}
                      icon={<Edit2 size={14} />}
                    />
                  )}
                  <ActionBtn
                    onClick={() => handleToggle(item)}
                    icon={<Power size={14} />}
                    title={item.is_active ? "Deactivate" : "Activate"}
                  />
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </TableShell>
    </div>
  );
}

function RoomsTab({ onDone }: { onDone: () => void }) {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newForm, setNewForm] = useState({
    name: "",
    capacity: 10,
    one_booking_max: false,
    dines_only: true,
  });
  const { sorted, sortKey, sortDir, handleSort } = useSortable(rooms, "id");

  useEffect(() => {
    roomsApi
      .get("/rooms")
      .then((r) => setRooms(r.data))
      .catch(() => setError("Failed to load rooms"))
      .finally(() => {
        setLoading(false);
        onDone();
      });
  }, []);

  async function saveEdit(id: number) {
    const updated = await roomsApi.patch(`/rooms/${id}`, editForm);
    setRooms((prev) => prev.map((r) => (r.id === id ? updated.data : r)));
    setEditingId(null);
  }
  async function addRoom() {
    const created = await roomsApi.post("/rooms", newForm);
    setRooms((prev) => [...prev, created.data]);
    setShowAdd(false);
    setNewForm({
      name: "",
      capacity: 10,
      one_booking_max: false,
      dines_only: true,
    });
  }
  async function toggleActive(room: any) {
    const updated = await roomsApi.patch(`/rooms/${room.id}`, {
      is_active: !room.is_active,
    });
    setRooms((prev) => prev.map((r) => (r.id === room.id ? updated.data : r)));
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "1rem",
        }}
      >
        <button className="btn-primary" onClick={() => setShowAdd(!showAdd)}>
          <Plus size={14} /> Add Room
        </button>
      </div>
      {showAdd && (
        <div className="panel" style={{ marginBottom: "1.5rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "1rem",
            }}
          >
            <strong>New Room</strong>
            <button
              className="btn-ghost btn-ghost--small"
              onClick={() => setShowAdd(false)}
            >
              <X size={14} />
            </button>
          </div>
          <div className="form-stack">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.75rem",
              }}
            >
              <label>
                <span>Name</span>
                <input
                  value={newForm.name}
                  onChange={(e) =>
                    setNewForm({ ...newForm, name: e.target.value })
                  }
                />
              </label>
              <label>
                <span>Capacity</span>
                <input
                  type="number"
                  value={newForm.capacity}
                  onChange={(e) =>
                    setNewForm({
                      ...newForm,
                      capacity: parseInt(e.target.value),
                    })
                  }
                />
              </label>
            </div>
            <div style={{ display: "flex", gap: "1.5rem" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={newForm.one_booking_max}
                  onChange={(e) =>
                    setNewForm({
                      ...newForm,
                      one_booking_max: e.target.checked,
                    })
                  }
                />
                <span>One booking max</span>
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={newForm.dines_only}
                  onChange={(e) =>
                    setNewForm({ ...newForm, dines_only: e.target.checked })
                  }
                />
                <span>Dines only</span>
              </label>
            </div>
            <button className="btn-primary" onClick={addRoom}>
              Save Room
            </button>
          </div>
        </div>
      )}
      <TableShell loading={loading} error={error}>
        <thead>
          <tr>
            <SortableTh
              sortKey="id"
              activeSortKey={String(sortKey)}
              sortDir={sortDir}
              onSort={handleSort}
            >
              ID
            </SortableTh>
            <SortableTh
              sortKey="name"
              activeSortKey={String(sortKey)}
              sortDir={sortDir}
              onSort={handleSort}
            >
              Name
            </SortableTh>
            <SortableTh
              sortKey="capacity"
              activeSortKey={String(sortKey)}
              sortDir={sortDir}
              onSort={handleSort}
            >
              Capacity
            </SortableTh>
            <SortableTh
              sortKey="one_booking_max"
              activeSortKey={String(sortKey)}
              sortDir={sortDir}
              onSort={handleSort}
            >
              One Booking Max
            </SortableTh>
            <SortableTh
              sortKey="dines_only"
              activeSortKey={String(sortKey)}
              sortDir={sortDir}
              onSort={handleSort}
            >
              Dines Only
            </SortableTh>
            <SortableTh
              sortKey="is_active"
              activeSortKey={String(sortKey)}
              sortDir={sortDir}
              onSort={handleSort}
            >
              Active
            </SortableTh>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((room) => (
            <tr key={room.id} style={{ opacity: room.is_active ? 1 : 0.5 }}>
              <Td mono>{room.id}</Td>
              <Td>
                {editingId === room.id ? (
                  <input
                    autoFocus
                    value={editForm.name ?? ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    style={{
                      padding: "3px 8px",
                      border: "1px solid var(--zinc-300)",
                      borderRadius: "4px",
                      fontSize: "13px",
                    }}
                  />
                ) : (
                  room.name
                )}
              </Td>
              <Td>
                {editingId === room.id ? (
                  <input
                    type="number"
                    value={editForm.capacity ?? ""}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        capacity: parseInt(e.target.value),
                      })
                    }
                    style={{
                      padding: "3px 8px",
                      border: "1px solid var(--zinc-300)",
                      borderRadius: "4px",
                      fontSize: "13px",
                      width: "70px",
                    }}
                  />
                ) : (
                  room.capacity
                )}
              </Td>
              <Td>
                <Badge
                  label={room.one_booking_max ? "Yes" : "No"}
                  variant={room.one_booking_max ? "blue" : "default"}
                />
              </Td>
              <Td>
                <Badge label={room.dines_only ? "Yes" : "No"} />
              </Td>
              <Td>
                <Badge
                  label={room.is_active ? "Active" : "Inactive"}
                  variant={room.is_active ? "green" : "red"}
                />
              </Td>
              <Td>
                <div style={{ display: "flex", gap: "2px" }}>
                  {editingId === room.id ? (
                    <>
                      <ActionBtn
                        onClick={() => saveEdit(room.id)}
                        icon={<Check size={14} />}
                      />
                      <ActionBtn
                        onClick={() => setEditingId(null)}
                        icon={<RotateCcw size={14} />}
                      />
                    </>
                  ) : (
                    <ActionBtn
                      onClick={() => {
                        setEditingId(room.id);
                        setEditForm({
                          name: room.name,
                          capacity: room.capacity,
                        });
                      }}
                      icon={<Edit2 size={14} />}
                    />
                  )}
                  <ActionBtn
                    onClick={() => toggleActive(room)}
                    icon={<Power size={14} />}
                  />
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </TableShell>
    </div>
  );
}

function BookingsTab({
  onStatusChange,
  onDone,
}: {
  onStatusChange: () => void;
  onDone: () => void;
}) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [attendeeMap, setAttendeeMap] = useState<Record<number, Attendee[]>>(
    {},
  );
  const [roomMap, setRoomMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { sorted, sortKey, sortDir, handleSort } = useSortable(
    bookings,
    "id",
    "desc",
  );

  useEffect(() => {
    Promise.all([bookingsApi.get("/bookings"), roomsApi.get("/rooms")])
      .then(async ([bRes, rRes]) => {
        const data = bRes.data;
        setBookings(data);
        const rMap: Record<number, string> = {};
        for (const r of rRes.data) rMap[r.id] = r.name;
        setRoomMap(rMap);
        const entries = await Promise.all(
          data.map(async (b: any) => {
            try {
              const attendees = await getAttendees(b.id);
              return [b.id, attendees] as [number, Attendee[]];
            } catch {
              return [b.id, []] as [number, Attendee[]];
            }
          }),
        );
        setAttendeeMap(Object.fromEntries(entries));
      })
      .catch(() => setError("Failed to load bookings"))
      .finally(() => {
        setLoading(false);
        onDone();
      });
  }, []);

  async function forceStatus(id: number, status: string) {
    const actionMap: Record<string, string> = {
      CONFIRMED: "confirm",
      DRAFT: "revert-to-draft",
      SEATED: "seat",
      SERVICE: "start-service",
      COMPLETED: "complete",
      CANCELLED: "cancel",
    };
    const action = actionMap[status];
    if (!action) return;
    const updated = await bookingsApi.post(`/bookings/${id}/actions/${action}`);
    setBookings((prev) => prev.map((b) => (b.id === id ? updated.data : b)));
    onStatusChange();
  }

  const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
    DRAFT: { bg: "#f0f0f0", color: "#666" },
    CONFIRMED: { bg: "#dcfce7", color: "#166534" },
    SEATED: { bg: "#dbeafe", color: "#1e40af" },
    SERVICE: { bg: "#fef3c7", color: "#92400e" },
    COMPLETED: { bg: "#f5f5f5", color: "#444" },
    CANCELLED: { bg: "#fee2e2", color: "#991b1b" },
  };

  return (
    <TableShell loading={loading} error={error}>
      <thead>
        <tr>
          <SortableTh
            sortKey="id"
            activeSortKey={String(sortKey)}
            sortDir={sortDir}
            onSort={handleSort}
          >
            ID
          </SortableTh>
          <Th>Account</Th>
          <SortableTh
            sortKey="booking_date"
            activeSortKey={String(sortKey)}
            sortDir={sortDir}
            onSort={handleSort}
          >
            Date
          </SortableTh>
          <SortableTh
            sortKey="meal_type"
            activeSortKey={String(sortKey)}
            sortDir={sortDir}
            onSort={handleSort}
          >
            Meal
          </SortableTh>
          <SortableTh
            sortKey="room_id"
            activeSortKey={String(sortKey)}
            sortDir={sortDir}
            onSort={handleSort}
          >
            Room
          </SortableTh>
          <SortableTh
            sortKey="party_size"
            activeSortKey={String(sortKey)}
            sortDir={sortDir}
            onSort={handleSort}
          >
            Party
          </SortableTh>
          <Th>Members</Th>
          <Th>Guests</Th>
          <SortableTh
            sortKey="status"
            activeSortKey={String(sortKey)}
            sortDir={sortDir}
            onSort={handleSort}
          >
            Status
          </SortableTh>
          <Th>Force Status</Th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((b) => {
          const sc = STATUS_COLORS[b.status] ?? { bg: "#eee", color: "#333" };
          const attendees = attendeeMap[b.id] ?? [];
          const memberCount = attendees.filter(
            (a) => a.linked_member_id !== null && !a.is_member_guest,
          ).length;
          const guestCount = attendees.filter(
            (a) => a.is_member_guest || a.linked_member_id === null,
          ).length;
          const primary =
            attendees.find((a) => a.linked_member_id && !a.is_member_guest) ??
            attendees[0];
          const accountName = primary
            ? `${primary.guest_first_name ?? ""} ${primary.guest_last_name ?? ""}`.trim() ||
              "—"
            : "—";
          return (
            <tr key={b.id}>
              <Td mono>#{b.id}</Td>
              <Td>
                <span style={{ fontSize: "12px", color: "var(--zinc-700)" }}>
                  {accountName}
                </span>
              </Td>
              <Td>{b.booking_date}</Td>
              <Td>{b.meal_type}</Td>
              <Td>
                <span style={{ fontSize: "12px" }}>
                  {roomMap[b.room_id] ?? `Room ${b.room_id}`}
                </span>
              </Td>
              <Td>
                <span style={{ fontWeight: 600 }}>{b.party_size}</span>
              </Td>
              <Td>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "12px",
                    color: "#1a4fa0",
                    background: "#dbeafe",
                    padding: "1px 8px",
                    borderRadius: "20px",
                    fontWeight: 600,
                  }}
                >
                  {memberCount} member{memberCount !== 1 ? "s" : ""}
                </span>
              </Td>
              <Td>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "12px",
                    color: "#166534",
                    background: "#dcfce7",
                    padding: "1px 8px",
                    borderRadius: "20px",
                    fontWeight: 600,
                  }}
                >
                  {guestCount} guest{guestCount !== 1 ? "s" : ""}
                </span>
              </Td>
              <Td>
                <span
                  style={{
                    display: "inline-block",
                    padding: "2px 8px",
                    borderRadius: "3px",
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase" as const,
                    background: sc.bg,
                    color: sc.color,
                  }}
                >
                  {b.status}
                </span>
              </Td>
              <Td>
                <select
                  value={b.status}
                  onChange={(e) => forceStatus(b.id, e.target.value)}
                  style={{
                    padding: "3px 8px",
                    border: "1px solid var(--zinc-200)",
                    borderRadius: "4px",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  {[
                    "DRAFT",
                    "CONFIRMED",
                    "SEATED",
                    "SERVICE",
                    "COMPLETED",
                    "CANCELLED",
                  ].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Td>
            </tr>
          );
        })}
      </tbody>
    </TableShell>
  );
}

const DAY_LABELS: Record<number, string> = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  7: "Sun",
};

function MealWindowsTab({ onDone }: { onDone: () => void }) {
  const [windows, setWindows] = useState<MealWindow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingType, setEditingType] = useState<MealType | null>(null);
  const [editForm, setEditForm] = useState<Partial<MealWindow>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getMealWindows()
      .then(setWindows)
      .catch(() => setError("Failed to load meal windows"))
      .finally(() => {
        setLoading(false);
        onDone();
      });
  }, []);

  function startEdit(w: MealWindow) {
    setEditingType(w.meal_type);
    setEditForm({
      start_time: w.start_time.slice(0, 5),
      end_time: w.end_time.slice(0, 5),
      last_order_time: w.last_order_time.slice(0, 5),
      available_days: [...w.available_days],
    });
  }
  function toggleDay(day: number) {
    const days = editForm.available_days ?? [];
    setEditForm({
      ...editForm,
      available_days: days.includes(day)
        ? days.filter((d) => d !== day)
        : [...days, day].sort(),
    });
  }

  async function saveEdit(meal_type: MealType) {
    setSaving(true);
    try {
      const res = await bookingsApi.patch(
        `/meal-windows/${meal_type}`,
        editForm,
      );
      setWindows((prev) =>
        prev.map((w) => (w.meal_type === meal_type ? res.data : w)),
      );
      setEditingType(null);
    } catch {
      alert("Failed to save. Check the times and try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return null;
  if (error)
    return (
      <div className="table-state" style={{ color: "var(--error)" }}>
        {error}
      </div>
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {windows.map((w) => {
        const isEditing = editingType === w.meal_type;
        return (
          <div
            key={w.meal_type}
            style={{
              border: "1px solid var(--zinc-200)",
              borderRadius: "var(--radius-md)",
              background: "var(--bg-surface)",
              padding: "1.25rem 1.5rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <strong
                style={{
                  fontSize: "14px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--zinc-700)",
                }}
              >
                {w.meal_type.replace("_", " ")}
              </strong>
              {isEditing ? (
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    className="btn-primary"
                    onClick={() => saveEdit(w.meal_type)}
                    disabled={saving}
                    style={{ fontSize: "12px", padding: "4px 14px" }}
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    className="btn-ghost"
                    onClick={() => setEditingType(null)}
                    style={{ fontSize: "12px", padding: "4px 14px" }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <ActionBtn
                  onClick={() => startEdit(w)}
                  icon={<Edit2 size={14} />}
                  title="Edit"
                />
              )}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "1rem",
                marginBottom: "1rem",
              }}
            >
              {(["start_time", "end_time", "last_order_time"] as const).map(
                (field) => (
                  <label key={field}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "var(--zinc-500)",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        display: "block",
                        marginBottom: "4px",
                      }}
                    >
                      {field === "start_time"
                        ? "Opens"
                        : field === "end_time"
                          ? "Closes"
                          : "Last Order"}
                    </span>
                    {isEditing ? (
                      <input
                        type="time"
                        value={editForm[field] ?? ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, [field]: e.target.value })
                        }
                        style={{
                          padding: "4px 8px",
                          border: "1px solid var(--zinc-300)",
                          borderRadius: "4px",
                          fontSize: "13px",
                          width: "100%",
                        }}
                      />
                    ) : (
                      <span
                        style={{ fontSize: "13px", color: "var(--zinc-800)" }}
                      >
                        {w[field].slice(0, 5)}
                      </span>
                    )}
                  </label>
                ),
              )}
            </div>
            <div>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "var(--zinc-500)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  display: "block",
                  marginBottom: "6px",
                }}
              >
                Available Days
              </span>
              <div style={{ display: "flex", gap: "6px" }}>
                {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                  const active = isEditing
                    ? (editForm.available_days ?? []).includes(day)
                    : w.available_days.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => isEditing && toggleDay(day)}
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        border: `1px solid ${active ? "var(--accent)" : "var(--zinc-200)"}`,
                        background: active
                          ? "var(--accent)"
                          : "var(--bg-surface)",
                        color: active ? "white" : "var(--zinc-400)",
                        fontSize: "11px",
                        fontWeight: 600,
                        cursor: isEditing ? "pointer" : "default",
                      }}
                    >
                      {DAY_LABELS[day]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>("users");
  const [refreshKey, setRefreshKey] = useState(0);
  const { setLoading } = useLoading();

  function triggerRefresh() {
    setRefreshKey((k) => k + 1);
  }

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    setLoading(true, TAB_LABELS[tab]);
  }

  function handleTabDone() {
    setLoading(false);
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2 className="page-title">Admin</h2>
      </div>
      <NeedsAttention refreshKey={refreshKey} />
      <div
        style={{
          display: "flex",
          gap: "4px",
          marginBottom: "1.5rem",
          borderBottom: "1px solid var(--zinc-200)",
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleTabChange(tab.key)}
            style={{
              padding: "0.5rem 1.25rem",
              fontSize: "13px",
              fontWeight: activeTab === tab.key ? 600 : 400,
              color:
                activeTab === tab.key ? "var(--zinc-900)" : "var(--zinc-500)",
              background: "none",
              border: "none",
              borderBottom:
                activeTab === tab.key
                  ? "2px solid var(--zinc-900)"
                  : "2px solid transparent",
              cursor: "pointer",
              marginBottom: "-1px",
              borderRadius: 0,
              transition: "all 0.15s ease",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <p
        style={{
          fontSize: "13px",
          color: "var(--zinc-500)",
          marginBottom: "1.25rem",
        }}
      >
        {TAB_DESCRIPTIONS[activeTab]}
      </p>
      {activeTab === "users" && <UsersTab onDone={handleTabDone} />}
      {activeTab === "members" && <MembersTab onDone={handleTabDone} />}
      {activeTab === "menu" && <MenuTab onDone={handleTabDone} />}
      {activeTab === "rooms" && <RoomsTab onDone={handleTabDone} />}
      {activeTab === "meal-windows" && (
        <MealWindowsTab onDone={handleTabDone} />
      )}
      {activeTab === "bookings" && (
        <BookingsTab onStatusChange={triggerRefresh} onDone={handleTabDone} />
      )}
    </div>
  );
}
