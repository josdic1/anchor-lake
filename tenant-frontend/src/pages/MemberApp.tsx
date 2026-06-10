import { useEffect, useState, useCallback } from "react";
import {
  Calendar,
  Plus,
  Users,
  Menu,
  Clock,
  Sun,
  AlertTriangle,
  Check,
  Pencil,
  Wine,
  Leaf,
  UserPlus,
  X,
  ChevronRight,
  ArrowLeft,
  Search,
  Minus,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useTenant } from "../hooks/useTenant";
import {
  getMyBookings,
  getAttendees,
  createFullBooking,
  executeBookingAction,
  updateBookingDetails,
  addMemberAttendee,
  addGuestAttendee,
  removeAttendee,
} from "../api/bookings";
import {
  getHouseholdMembers,
  getDietaryOptions,
  createMember,
  updateMember,
  deleteMember,
  getAllMembers,
  type HouseholdMember,
} from "../api/users";
import { getActiveMenuItems, type MenuItem } from "../api/menu";
import {
  addOrderItem,
  cancelOrder,
  getOrCreateOpenOrder,
  getOrdersByBooking,
  getOrderItems,
  type Order,
  type OrderItem,
} from "../api/orders";
import { roomsApi } from "../api/client";
import { getAvailableRooms } from "../api/rooms";
import type { Booking, Attendee, Room } from "../types/booking";

// ─── Constants ────────────────────────────────────────────────────────────────

const MEAL_LABELS: Record<string, string> = {
  LUNCH: "Lunch",
  DINNER: "Dinner",
  AFTERHOURS: "After Hours",
  SPECIAL_EVENT: "Special Event",
};

const STATUS_CFG: Record<
  string,
  { bg: string; fg: string; dot: string; label: string }
> = {
  DRAFT: { bg: "#f5f4f0", fg: "#6b6560", dot: "#c4bfb8", label: "Draft" },
  CONFIRMED: {
    bg: "#e8f5ed",
    fg: "#1a5c35",
    dot: "#2d9050",
    label: "Confirmed",
  },
  SEATED: { bg: "#e8f0fb", fg: "#1a3a8c", dot: "#2d5fd4", label: "Seated" },
  SERVICE: {
    bg: "#fef3e8",
    fg: "#7c3010",
    dot: "#d4601a",
    label: "In Service",
  },
  COMPLETED: { bg: "#f0f0f0", fg: "#555", dot: "#999", label: "Completed" },
  CANCELLED: {
    bg: "#fde8e8",
    fg: "#8c1a1a",
    dot: "#d42d2d",
    label: "Cancelled",
  },
};

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  bg: "#f7f5f2",
  surface: "#ffffff",
  border: "#e8e4de",
  borderStrong: "#d0cab8",
  text: "#1a1714",
  textMid: "#6b6357",
  textSoft: "#a09890",
  accent: "#2c5f2e",
  accentLight: "#e8f2e8",
  danger: "#b91c1c",
  dangerLight: "#fef2f2",
  tabBar: "#ffffff",
  tabActive: "#1a1714",
  tabInactive: "#b0a898",
};

const F = {
  display: "'Palatino Linotype', 'Palatino', 'Book Antiqua', Georgia, serif",
  body: "'Helvetica Neue', 'Segoe UI', system-ui, sans-serif",
};

const BTN_BASE: React.CSSProperties = {
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
};

// ─── Tab types ────────────────────────────────────────────────────────────────

type Tab = "bookings" | "new" | "household" | "account";
type BookingScreen = "list" | "detail" | "form";

// ─── Scroll helper ────────────────────────────────────────────────────────────

function scrollToTop() {
  requestAnimationFrame(() => {
    const el = document.getElementById("member-scroll");
    if (el) el.scrollTop = 0;
  });
}

// ─── Shared components ────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? {
    bg: "#f0f0f0",
    fg: "#555",
    dot: "#999",
    label: status,
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "3px 10px",
        borderRadius: "100px",
        fontSize: "11px",
        fontWeight: 600,
        letterSpacing: "0.04em",
        background: cfg.bg,
        color: cfg.fg,
        fontFamily: F.body,
      }}
    >
      <span
        style={{
          width: "5px",
          height: "5px",
          borderRadius: "50%",
          background: cfg.dot,
          display: "inline-block",
        }}
      />
      {cfg.label}
    </span>
  );
}

function Spinner() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "4rem",
      }}
    >
      <div
        style={{
          width: "28px",
          height: "28px",
          borderRadius: "50%",
          border: `2px solid ${C.border}`,
          borderTopColor: C.text,
          animation: "spin 0.8s linear infinite",
        }}
      />
    </div>
  );
}

function Btn({
  label,
  onClick,
  variant = "primary",
  disabled = false,
  small = false,
}: {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
  small?: boolean;
}) {
  const base: React.CSSProperties = {
    width: "100%",
    border: "none",
    borderRadius: "12px",
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: F.body,
    fontWeight: 500,
    letterSpacing: "0.03em",
    transition: "opacity 0.15s",
    opacity: disabled ? 0.45 : 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: small ? "10px 16px" : "16px",
    fontSize: small ? "13px" : "15px",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
  };
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: C.text, color: C.bg },
    secondary: {
      background: "transparent",
      color: C.textMid,
      border: `1.5px solid ${C.border}`,
    },
    danger: {
      background: C.dangerLight,
      color: C.danger,
      border: `1.5px solid #fecaca`,
    },
    ghost: { background: "transparent", color: C.textSoft, border: "none" },
  };
  return (
    <button
      style={{ ...base, ...variants[variant] }}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: C.textSoft,
        fontFamily: F.body,
        marginBottom: "6px",
      }}
    >
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  type = "text",
  placeholder,
  min,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  min?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      min={min}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        padding: "14px 16px",
        fontSize: "16px",
        border: `1.5px solid ${C.border}`,
        borderRadius: "12px",
        background: C.surface,
        color: C.text,
        fontFamily: F.body,
        outline: "none",
        boxSizing: "border-box",
        appearance: "none",
        touchAction: "manipulation",
      }}
    />
  );
}

function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: C.surface,
        borderRadius: "16px",
        border: `1px solid ${C.border}`,
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div
      style={{
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: C.textSoft,
        fontFamily: F.body,
        marginBottom: "12px",
        marginTop: "8px",
      }}
    >
      {title}
    </div>
  );
}

function BackHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        marginBottom: "24px",
      }}
    >
      <button
        onClick={onBack}
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: "10px",
          width: "40px",
          height: "40px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: C.textMid,
          flexShrink: 0,
          touchAction: "manipulation",
        }}
      >
        <ArrowLeft size={18} />
      </button>
      <h2
        style={{
          fontFamily: F.display,
          fontSize: "22px",
          fontWeight: 400,
          margin: 0,
          color: C.text,
        }}
      >
        {title}
      </h2>
    </div>
  );
}

// ─── Hours Sheet ──────────────────────────────────────────────────────────────

function HoursSheet({ onClose }: { onClose: () => void }) {
  const now = new Date();
  const day = now.getDay(); // 0 is Sunday, 4 is Thursday, etc.
  const h = now.getHours() + now.getMinutes() / 60;

  // Seasonal check: June 5th to August 9th, 2026
  const seasonStart = new Date("2026-06-05");
  const seasonEnd = new Date("2026-08-09");
  const isSeason = now >= seasonStart && now <= seasonEnd;

  const services = [
    {
      name: "Playhouse",
      hours: "9:00 AM – 10:00 PM",
      days: "Sunday–Saturday",
      active: isSeason && h >= 9 && h < 22,
    },
    {
      name: "Food Service",
      hours: "11:00 AM – 3:00 PM",
      days: "Sunday–Wednesday",
      active: isSeason && day <= 3 && h >= 11 && h < 15,
    },
    {
      name: "Food Service",
      hours: "11:00 AM – 7:00 PM",
      days: "Thursday–Saturday",
      active: isSeason && day >= 4 && h >= 11 && h < 19,
    },
    {
      name: "Pool with Lifeguard",
      hours: "12:00 PM – 8:00 PM",
      days: "Sunday–Saturday",
      active: isSeason && h >= 12 && h < 20,
    },
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 200,
        display: "flex",
        alignItems: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: C.surface,
          borderRadius: "24px 24px 0 0",
          padding: "0 0 40px",
          width: "100%",
          maxWidth: "480px",
          margin: "0 auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "16px 0 8px",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "4px",
              borderRadius: "2px",
              background: C.border,
            }}
          />
        </div>
        <div style={{ padding: "8px 24px 24px" }}>
          {/* Out of Season Alert (matches top of screenshot) */}
          {!isSeason && (
            <div
              style={{
                background: C.bg,
                border: `1px solid ${C.border}`,
                padding: "12px",
                borderRadius: "8px",
                fontSize: "13px",
                color: C.textSoft,
                fontStyle: "italic",
                marginBottom: "20px",
                textAlign: "center",
              }}
            >
              Outside of season — no services currently available.
            </div>
          )}

          <h2
            style={{
              fontFamily: F.display,
              fontSize: "24px",
              fontWeight: 400,
              margin: "0 0 24px",
              color: C.text,
            }}
          >
            Hours of Operation
          </h2>

          {services.map((s, idx) => (
            <div
              key={`${s.name}-${idx}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 0",
                borderBottom: `1px solid ${C.border}`,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "16px",
                    fontFamily: F.display,
                    color: C.text,
                    marginBottom: "3px",
                  }}
                >
                  {s.name}
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: C.textSoft,
                    fontFamily: F.body,
                  }}
                >
                  {s.hours} · {s.days}
                </div>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: s.active ? "#16a34a" : C.border,
                  }}
                />
                <span
                  style={{
                    fontSize: "11px",
                    color: s.active ? "#16a34a" : C.textSoft,
                    fontFamily: F.body,
                    fontWeight: 600,
                  }}
                >
                  {s.active ? "Open" : "Closed"}
                </span>
              </div>
            </div>
          ))}

          <div
            style={{
              marginTop: "20px",
              padding: "14px 16px",
              background: C.bg,
              borderRadius: "12px",
              fontSize: "13px",
              color: C.textMid,
              fontFamily: F.body,
              lineHeight: 1.6,
            }}
          >
            <strong>Season:</strong> June 5th to August 9th, 2026
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Starter Order ────────────────────────────────────────────────────────────

function StarterOrder({
  booking,
  onDone,
}: {
  booking: Booking;
  onDone: () => void;
}) {
  const [starters, setStarters] = useState<MenuItem[]>([]);
  const [drinks, setDrinks] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    getActiveMenuItems().then((items) => {
      setStarters(
        items.filter(
          (i) => i.category === "STARTER" && !i.is_modifier && i.is_active,
        ),
      );
      setDrinks(
        items.filter(
          (i) => i.category === "DRINK" && !i.is_modifier && i.is_active,
        ),
      );
    });
  }, []);

  function adjust(id: number, d: number) {
    setCart((prev) => {
      const next = { ...prev, [id]: (prev[id] ?? 0) + d };
      if (next[id] <= 0) delete next[id];
      return next;
    });
  }

  async function submit() {
    const items = Object.entries(cart).filter(([, q]) => q > 0);
    if (!items.length) return;
    setSubmitting(true);
    try {
      const order = await getOrCreateOpenOrder(booking.id);
      for (const [idStr, qty] of items) {
        const item = [...starters, ...drinks].find(
          (s) => s.id === Number(idStr),
        );
        if (!item) continue;
        await addOrderItem(order.id, {
          menu_item_id: item.id,
          quantity: qty,
          unit_price: item.price,
          modifier_ids: [],
        });
      }
      setCart({});
      setDone(true);
      setTimeout(() => {
        setDone(false);
        onDone();
      }, 1500);
    } finally {
      setSubmitting(false);
    }
  }

  const total = Object.values(cart).reduce((a, b) => a + b, 0);
  const allItems = [...starters, ...drinks];

  if (done)
    return (
      <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
        <Check size={48} color={C.accent} style={{ marginBottom: "12px" }} />
        <div style={{ fontFamily: F.display, fontSize: "22px", color: C.text }}>
          Order placed
        </div>
      </div>
    );

  return (
    <div>
      <SectionHeader title="Pre-order Starters & Drinks" />
      <p
        style={{
          fontSize: "13px",
          color: C.textSoft,
          fontFamily: F.body,
          marginBottom: "16px",
          lineHeight: 1.5,
        }}
      >
        Available until seated. Full menu served upon arrival.
      </p>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          marginBottom: "20px",
        }}
      >
        {allItems.map((item) => {
          const qty = cart[item.id] ?? 0;
          const inCart = qty > 0;
          return (
            <div
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                minHeight: "64px",
                padding: "12px 16px",
                borderRadius: "14px",
                background: inCart ? C.accentLight : C.surface,
                border: `1.5px solid ${inCart ? C.accent : C.border}`,
                transition: "all 0.15s",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: F.display,
                    fontSize: "16px",
                    color: C.text,
                    marginBottom: "2px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  {item.name}
                  {inCart && (
                    <span
                      style={{
                        background: C.accent,
                        color: "white",
                        borderRadius: "100px",
                        fontSize: "10px",
                        fontWeight: 700,
                        padding: "1px 7px",
                        fontFamily: F.body,
                      }}
                    >
                      {qty}
                    </span>
                  )}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginLeft: "12px",
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    adjust(item.id, -1);
                  }}
                  style={{
                    ...BTN_BASE,
                    width: "44px",
                    height: "44px",
                    borderRadius: "50%",
                    border: `1.5px solid ${C.border}`,
                    background: C.surface,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: C.text,
                    opacity: inCart ? 1 : 0,
                    pointerEvents: inCart ? "auto" : "none",
                  }}
                >
                  <Minus size={18} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    adjust(item.id, 1);
                  }}
                  style={{
                    ...BTN_BASE,
                    width: "44px",
                    height: "44px",
                    borderRadius: "50%",
                    border: `1.5px solid ${inCart ? C.accent : C.borderStrong}`,
                    background: inCart ? C.accent : C.surface,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: inCart ? "white" : C.text,
                  }}
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {total > 0 && (
        <Btn
          label={
            submitting
              ? "Placing order…"
              : `Place Pre-order · ${total} item${total !== 1 ? "s" : ""}`
          }
          onClick={submit}
          disabled={submitting}
        />
      )}
    </div>
  );
}

// ─── Attendee Editor ──────────────────────────────────────────────────────────

function AttendeeEditor({
  booking,
  attendees,
  onChanged,
}: {
  booking: Booking;
  attendees: Attendee[];
  onChanged: () => void;
}) {
  const { user } = useAuth();
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [dietary, setDietary] = useState<string[]>([]);
  const [showGuest, setShowGuest] = useState(false);
  const [gFirst, setGFirst] = useState("");
  const [gLast, setGLast] = useState("");
  const [gDiet, setGDiet] = useState<string[]>([]);
  const [gDietOther, setGDietOther] = useState("");
  const [saving, setSaving] = useState(false);
  const canEdit = ["DRAFT", "CONFIRMED"].includes(booking.status);

  const [allMembers, setAllMembers] = useState<HouseholdMember[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (!user?.userId) return;
    Promise.all([
      getHouseholdMembers(user.userId),
      getDietaryOptions(),
      getAllMembers(),
    ]).then(([m, d, all]) => {
      setMembers(m);
      setDietary(d);
      setAllMembers(all);
    });
  }, [user?.userId]);

  const linkedIds = attendees.map((a) => a.linked_member_id).filter(Boolean);
  const available = members.filter((m) => !linkedIds.includes(m.id));

  const searchResults = searchQuery.trim()
    ? allMembers.filter((m) => {
        const name = `${m.first_name} ${m.last_name}`.toLowerCase();
        const alreadyAdded = attendees.some((a) => a.linked_member_id === m.id);
        return name.includes(searchQuery.toLowerCase()) && !alreadyAdded;
      })
    : [];

  const [addErr, setAddErr] = useState("");
  const [addSuccess, setAddSuccess] = useState("");

  function flashAdd(msg: string) {
    setAddSuccess(msg);
    setTimeout(() => setAddSuccess(""), 2000);
  }

  async function addMember(m: HouseholdMember) {
    setSaving(true);
    setAddErr("");
    try {
      await addMemberAttendee(booking.id, {
        linked_member_id: m.id,
        dietary_flags: m.dietary_flags,
        dietary_other_note: m.dietary_other_note ?? null,
      });
      onChanged();
      flashAdd(`${m.first_name} added`);
    } catch (e) {
      setAddErr(e instanceof Error ? e.message : "Failed to add member.");
    } finally {
      setSaving(false);
    }
  }

  async function addGuest() {
    if (!gFirst.trim() || !gLast.trim()) return;
    setSaving(true);
    setAddErr("");
    try {
      await addGuestAttendee(booking.id, {
        id: crypto.randomUUID(),
        first_name: gFirst.trim(),
        last_name: gLast.trim(),
        dietary_flags: gDiet,
        dietary_other_note: gDietOther.trim(),
        is_member_guest: false,
        linked_member_id: null,
      });
      setGFirst("");
      setGLast("");
      setGDiet([]);
      setGDietOther("");
      setShowGuest(false);
      onChanged();
      flashAdd("Guest added");
    } catch (e) {
      setAddErr(e instanceof Error ? e.message : "Failed to add guest.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    setSaving(true);
    setAddErr("");
    try {
      await removeAttendee(booking.id, id);
      onChanged();
    } catch (e) {
      setAddErr(e instanceof Error ? e.message : "Failed to remove attendee.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <SectionHeader title="Who's coming" />
      {addSuccess && (
        <div
          style={{
            padding: "10px 14px",
            background: C.accentLight,
            borderRadius: "10px",
            marginBottom: "10px",
            fontSize: "13px",
            color: C.accent,
            fontFamily: F.body,
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <Check size={14} /> {addSuccess}
        </div>
      )}
      {addErr && (
        <div
          style={{
            padding: "10px 14px",
            background: C.dangerLight,
            borderRadius: "10px",
            marginBottom: "10px",
            fontSize: "13px",
            color: C.danger,
            fontFamily: F.body,
          }}
        >
          {addErr}
        </div>
      )}
      {attendees.length === 0 && (
        <div
          style={{
            padding: "20px",
            background: C.bg,
            borderRadius: "12px",
            marginBottom: "12px",
            fontSize: "14px",
            color: C.textSoft,
            fontFamily: F.body,
            textAlign: "center",
          }}
        >
          Add at least one household member to confirm
        </div>
      )}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          marginBottom: "16px",
        }}
      >
        {attendees.map((a) => (
          <div
            key={a.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px",
              background: C.surface,
              borderRadius: "12px",
              border: `1px solid ${C.border}`,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "16px",
                  fontFamily: F.display,
                  color: C.text,
                }}
              >
                {`${a.guest_first_name ?? ""} ${a.guest_last_name ?? ""}`.trim() ||
                  `Member #${a.linked_member_id}`}
              </div>
              {a.dietary_flags.length > 0 && (
                <div
                  style={{
                    fontSize: "12px",
                    color: C.textSoft,
                    fontFamily: F.body,
                    marginTop: "2px",
                  }}
                >
                  {a.dietary_flags.map((f) => f.replace(/_/g, " ")).join(" · ")}
                </div>
              )}
            </div>
            {canEdit && (
              <button
                onClick={() => remove(a.id)}
                disabled={saving}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: C.textSoft,
                  padding: "4px 8px",
                  lineHeight: 1,
                  touchAction: "manipulation",
                }}
              >
                <X size={18} />
              </button>
            )}
          </div>
        ))}
      </div>

      {canEdit && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {available.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: "12px",
                  color: C.textSoft,
                  fontFamily: F.body,
                  marginBottom: "8px",
                }}
              >
                Add household member
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {available.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => addMember(m)}
                    disabled={saving}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "100px",
                      border: `1.5px solid ${C.border}`,
                      background: C.surface,
                      cursor: "pointer",
                      fontSize: "14px",
                      fontFamily: F.body,
                      color: C.text,
                      touchAction: "manipulation",
                    }}
                  >
                    + {m.first_name} {m.last_name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ position: "relative" }}>
            <div
              style={{
                fontSize: "12px",
                color: C.textSoft,
                fontFamily: F.body,
                marginBottom: "8px",
              }}
            >
              Search club members
            </div>
            <div style={{ position: "relative" }}>
              <Search
                size={16}
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: C.textSoft,
                }}
              />
              <input
                type="text"
                placeholder="Type a name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                disabled={saving}
                style={{
                  width: "100%",
                  padding: "12px 12px 12px 36px",
                  border: `1.5px solid ${C.border}`,
                  borderRadius: "10px",
                  fontSize: "15px",
                  fontFamily: F.body,
                  background: C.surface,
                  color: C.text,
                  outline: "none",
                  touchAction: "manipulation",
                }}
              />
            </div>
            {searchOpen && searchQuery.trim() && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: "12px",
                  maxHeight: "200px",
                  overflowY: "auto",
                  zIndex: 20,
                  marginTop: "4px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                }}
              >
                {searchResults.length === 0 ? (
                  <div
                    style={{
                      padding: "14px 16px",
                      fontSize: "14px",
                      color: C.textSoft,
                      fontFamily: F.body,
                    }}
                  >
                    No members found
                  </div>
                ) : (
                  searchResults.slice(0, 8).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setSaving(true);
                        setAddErr("");
                        addMemberAttendee(booking.id, {
                          linked_member_id: m.id,
                          dietary_flags: m.dietary_flags,
                          dietary_other_note: m.dietary_other_note ?? null,
                        })
                          .then(() => {
                            onChanged();
                            flashAdd(`${m.first_name} added`);
                            setSearchQuery("");
                            setSearchOpen(false);
                          })
                          .catch((e) =>
                            setAddErr(
                              e instanceof Error
                                ? e.message
                                : "Failed to add member.",
                            ),
                          )
                          .finally(() => setSaving(false));
                      }}
                      disabled={saving}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        width: "100%",
                        padding: "12px 16px",
                        background: "transparent",
                        border: "none",
                        borderBottom: `1px solid ${C.border}`,
                        cursor: "pointer",
                        textAlign: "left",
                        touchAction: "manipulation",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "15px",
                          fontFamily: F.display,
                          color: C.text,
                        }}
                      >
                        {m.first_name} {m.last_name}
                      </span>
                      <span
                        style={{
                          fontSize: "12px",
                          color: C.textSoft,
                          fontFamily: F.body,
                        }}
                      >
                        Member Guest
                        {m.dietary_flags.length > 0 &&
                          ` · ${m.dietary_flags.join(", ")}`}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {!showGuest ? (
            <button
              onClick={() => setShowGuest(true)}
              style={{
                padding: "12px",
                borderRadius: "12px",
                border: `1.5px dashed ${C.border}`,
                background: "transparent",
                cursor: "pointer",
                fontSize: "14px",
                fontFamily: F.body,
                color: C.textMid,
                width: "100%",
                touchAction: "manipulation",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <UserPlus size={16} /> Add Guest
            </button>
          ) : (
            <div
              style={{
                padding: "16px",
                background: C.bg,
                borderRadius: "14px",
                border: `1px solid ${C.border}`,
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: C.textMid,
                  fontFamily: F.body,
                  marginBottom: "12px",
                }}
              >
                Guest details
              </div>
              <div
                style={{ display: "flex", gap: "8px", marginBottom: "10px" }}
              >
                <input
                  placeholder="First name"
                  value={gFirst}
                  onChange={(e) => setGFirst(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "12px",
                    border: `1.5px solid ${C.border}`,
                    borderRadius: "10px",
                    fontSize: "15px",
                    fontFamily: F.body,
                    background: C.surface,
                    color: C.text,
                    outline: "none",
                  }}
                />
                <input
                  placeholder="Last name"
                  value={gLast}
                  onChange={(e) => setGLast(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "12px",
                    border: `1.5px solid ${C.border}`,
                    borderRadius: "10px",
                    fontSize: "15px",
                    fontFamily: F.body,
                    background: C.surface,
                    color: C.text,
                    outline: "none",
                  }}
                />
              </div>
              {dietary.length > 0 && (
                <div style={{ marginBottom: "12px" }}>
                  <div
                    style={{
                      fontSize: "11px",
                      color: C.textSoft,
                      fontFamily: F.body,
                      marginBottom: "6px",
                    }}
                  >
                    Dietary needs
                  </div>
                  <div
                    style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}
                  >
                    {dietary.map((flag) => {
                      const on = gDiet.includes(flag);
                      return (
                        <button
                          key={flag}
                          onClick={() =>
                            setGDiet((p) =>
                              on ? p.filter((f) => f !== flag) : [...p, flag],
                            )
                          }
                          style={{
                            padding: "5px 12px",
                            borderRadius: "100px",
                            border: `1.5px solid ${on ? C.text : C.border}`,
                            background: on ? C.text : C.surface,
                            color: on ? C.bg : C.textMid,
                            cursor: "pointer",
                            fontSize: "11px",
                            fontFamily: F.body,
                            touchAction: "manipulation",
                          }}
                        >
                          {flag.replace(/_/g, " ")}
                        </button>
                      );
                    })}
                  </div>
                  {gDiet.includes("OTHER") && (
                    <input
                      placeholder="Please describe…"
                      value={gDietOther}
                      onChange={(e) => setGDietOther(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        marginTop: "8px",
                        border: `1.5px solid ${C.border}`,
                        borderRadius: "10px",
                        fontSize: "15px",
                        fontFamily: F.body,
                        background: C.surface,
                        color: C.text,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  )}
                </div>
              )}
              <div style={{ display: "flex", gap: "8px" }}>
                <Btn
                  label="Add Guest"
                  onClick={addGuest}
                  disabled={saving || !gFirst.trim() || !gLast.trim()}
                  small
                />
                <Btn
                  label="Cancel"
                  onClick={() => setShowGuest(false)}
                  variant="ghost"
                  small
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Existing Orders ─────────────────────────────────────────────────────────

// Change 2: updated signature to accept refreshKey
function ExistingOrders({
  bookingId,
  refreshKey,
}: {
  bookingId: number;
  refreshKey: number;
}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<Record<number, OrderItem[]>>({});
  const [menuNames, setMenuNames] = useState<Record<number, string>>({});
  const [cancelling, setCancelling] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [ords, menuData] = await Promise.all([
        getOrdersByBooking(bookingId),
        getActiveMenuItems(),
      ]);

      const unfired = ords.filter((o) => !o.fired_at);

      const names: Record<number, string> = {};
      menuData.forEach((m) => (names[m.id] = m.name));
      setMenuNames(names);

      const itemMap: Record<number, OrderItem[]> = {};
      await Promise.all(
        unfired.map(async (o) => {
          itemMap[o.id] = await getOrderItems(o.id);
        }),
      );

      // Change 4: filter out orders with no items so cancelled orders disappear
      const visibleOrders = unfired.filter(
        (o) => (itemMap[o.id] ?? []).length > 0,
      );

      setItems(itemMap);
      setOrders(visibleOrders);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  // Change 3: reload when refreshKey changes
  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function cancel(orderId: number) {
    setCancelling(orderId);
    try {
      await cancelOrder(orderId);
      setConfirmId(null);
      load();
    } finally {
      setCancelling(null);
    }
  }

  if (loading || orders.length === 0) return null;

  return (
    <Card style={{ marginBottom: "16px" }}>
      <div style={{ padding: "20px" }}>
        <SectionHeader title="Your Pre-orders" />
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {orders.map((order) => {
            const orderItems = items[order.id] ?? [];

            return (
              <div
                key={order.id}
                style={{
                  padding: "14px 16px",
                  background: C.bg,
                  borderRadius: "12px",
                  border: `1px solid ${C.border}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "10px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: C.textMid,
                      fontFamily: F.body,
                    }}
                  >
                    Order #{order.id}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    marginBottom: "12px",
                  }}
                >
                  {orderItems.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "14px",
                        fontFamily: F.body,
                        color: C.textMid,
                      }}
                    >
                      <span>
                        {menuNames[item.menu_item_id] ??
                          `Item #${item.menu_item_id}`}{" "}
                        x {item.quantity}
                      </span>
                    </div>
                  ))}
                </div>
                {confirmId === order.id ? (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <Btn
                      label={
                        cancelling === order.id
                          ? "Cancelling…"
                          : "Yes, cancel order"
                      }
                      onClick={() => cancel(order.id)}
                      variant="danger"
                      disabled={cancelling === order.id}
                      small
                    />
                    <Btn
                      label="Nevermind"
                      onClick={() => setConfirmId(null)}
                      variant="ghost"
                      small
                    />
                  </div>
                ) : (
                  <Btn
                    label="Cancel Order"
                    onClick={() => setConfirmId(order.id)}
                    variant="danger"
                    small
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

// ─── Booking Detail Screen ────────────────────────────────────────────────────

function BookingDetailScreen({
  booking,
  rooms,
  onBack,
  onRefresh,
}: {
  booking: Booking;
  rooms: Room[];
  onBack: () => void;
  onRefresh: (b: Booking) => void;
}) {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  // Change 1: refresh key to trigger ExistingOrders reload
  const [ordersRefreshKey, setOrdersRefreshKey] = useState(0);
  const [editingDate, setEditingDate] = useState(false);
  const [newDate, setNewDate] = useState(booking.booking_date);
  const [newArrival, setNewArrival] = useState(
    booking.estimated_arrival.slice(0, 5),
  );
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [err, setErr] = useState("");
  const room = rooms.find((r) => r.id === booking.room_id);

  useEffect(() => {
    scrollToTop();
  }, [booking.id]);

  const loadAttendees = useCallback(async () => {
    try {
      setAttendees(await getAttendees(booking.id));
    } finally {
      setLoading(false);
    }
  }, [booking.id]);

  useEffect(() => {
    loadAttendees();
  }, [loadAttendees]);

  async function act(fn: () => Promise<void>) {
    setActing(true);
    setErr("");
    try {
      await fn();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setActing(false);
    }
  }

  const isDraft = booking.status === "DRAFT";
  const isConfirmed = booking.status === "CONFIRMED";
  const isLive = ["SEATED", "SERVICE"].includes(booking.status);
  const canEdit = isDraft || isConfirmed;
  const hasMembers = attendees.some((a) => a.linked_member_id !== null);

  return (
    <div style={{ paddingBottom: "100px" }}>
      <BackHeader
        title={room?.name ?? `Room ${booking.room_id}`}
        onBack={onBack}
      />

      {isDraft && (
        <div
          style={{
            padding: "14px 16px",
            background: "#fefce8",
            border: "1px solid #fde68a",
            borderRadius: "14px",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#854d0e",
              fontFamily: F.body,
              marginBottom: "4px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <AlertTriangle size={16} /> This is a draft booking
          </div>
          <div
            style={{
              fontSize: "13px",
              color: "#92400e",
              fontFamily: F.body,
              lineHeight: 1.5,
            }}
          >
            Drafts don't hold your room or appear on the calendar. Add at least
            one household member, then tap Confirm Booking to secure your spot.
          </div>
        </div>
      )}

      <Card style={{ marginBottom: "16px" }}>
        <div style={{ padding: "20px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                fontFamily: F.display,
                fontSize: "13px",
                color: C.textSoft,
              }}
            >
              Booking #{booking.id}
            </div>
            <StatusPill status={booking.status} />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
            }}
          >
            {[
              ["Date", booking.booking_date],
              ["Arrival", booking.estimated_arrival.slice(0, 5)],
              ["Meal", MEAL_LABELS[booking.meal_type] ?? booking.meal_type],
              ["Party", String(booking.party_size)],
            ].map(([label, val]) => (
              <div key={label}>
                <div
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: C.textSoft,
                    fontFamily: F.body,
                    marginBottom: "4px",
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontSize: "17px",
                    fontFamily: F.display,
                    color: C.text,
                  }}
                >
                  {val}
                </div>
              </div>
            ))}
          </div>
          {booking.notes && (
            <div
              style={{
                marginTop: "16px",
                padding: "12px",
                background: C.bg,
                borderRadius: "10px",
                fontSize: "14px",
                color: C.textMid,
                fontFamily: F.body,
                lineHeight: 1.5,
                fontStyle: "italic",
              }}
            >
              "{booking.notes}"
            </div>
          )}
        </div>

        {canEdit && !editingDate && (
          <>
            <div style={{ height: "1px", background: C.border }} />
            <button
              onClick={() => setEditingDate(true)}
              style={{
                width: "100%",
                padding: "14px 20px",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "14px",
                color: C.textMid,
                fontFamily: F.body,
                textAlign: "left",
                touchAction: "manipulation",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Pencil size={14} /> Edit date & time
            </button>
          </>
        )}

        {editingDate && (
          <>
            <div style={{ height: "1px", background: C.border }} />
            <div
              style={{
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div>
                <FieldLabel>Date</FieldLabel>
                <Input type="date" value={newDate} onChange={setNewDate} />
              </div>
              <div>
                <FieldLabel>Arrival Time</FieldLabel>
                <Input
                  type="time"
                  value={newArrival}
                  onChange={setNewArrival}
                />
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <Btn
                  label="Save"
                  onClick={() =>
                    act(async () => {
                      await updateBookingDetails(booking.id, {
                        booking_date: newDate,
                        estimated_arrival: newArrival,
                      });
                      setEditingDate(false);
                      onRefresh({
                        ...booking,
                        booking_date: newDate,
                        estimated_arrival: newArrival,
                      } as Booking);
                    })
                  }
                  disabled={acting}
                  small
                />
                <Btn
                  label="Cancel"
                  onClick={() => setEditingDate(false)}
                  variant="secondary"
                  small
                />
              </div>
            </div>
          </>
        )}
      </Card>

      {!isLive && (
        <Card style={{ marginBottom: "16px" }}>
          <div style={{ padding: "20px" }}>
            {loading ? (
              <Spinner />
            ) : (
              <AttendeeEditor
                booking={booking}
                attendees={attendees}
                onChanged={loadAttendees}
              />
            )}
          </div>
        </Card>
      )}

      {canEdit && booking.meal_type !== "AFTERHOURS" && (
        // Change 5: pass refreshKey into ExistingOrders
        <ExistingOrders bookingId={booking.id} refreshKey={ordersRefreshKey} />
      )}
      {canEdit && booking.meal_type !== "AFTERHOURS" && (
        <Card style={{ marginBottom: "16px" }}>
          <div style={{ padding: "20px" }}>
            {/* Change 6: increment refreshKey after a successful pre-order */}
            <StarterOrder
              booking={booking}
              onDone={() => setOrdersRefreshKey((k) => k + 1)}
            />
          </div>
        </Card>
      )}
      {canEdit && booking.meal_type === "AFTERHOURS" && (
        <div
          style={{
            padding: "16px 20px",
            background: C.bg,
            borderRadius: "14px",
            marginBottom: "16px",
            fontSize: "14px",
            color: C.textSoft,
            fontFamily: F.body,
            textAlign: "center",
            lineHeight: 1.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <Wine size={18} /> After Hours bookings are drinks and socializing
          only — no food service
        </div>
      )}

      {isLive && (
        <div
          style={{
            padding: "20px",
            background: C.accentLight,
            borderRadius: "16px",
            marginBottom: "16px",
            textAlign: "center",
          }}
        >
          <Leaf size={32} color={C.accent} style={{ marginBottom: "8px" }} />
          <div
            style={{ fontFamily: F.display, fontSize: "18px", color: C.accent }}
          >
            You're all set — enjoy your visit
          </div>
        </div>
      )}

      {err && (
        <div
          style={{
            padding: "12px 16px",
            background: C.dangerLight,
            borderRadius: "12px",
            fontSize: "14px",
            color: C.danger,
            fontFamily: F.body,
            marginBottom: "12px",
          }}
        >
          {err}
        </div>
      )}

      {confirmCancel && (
        <div
          style={{
            padding: "20px",
            background: C.dangerLight,
            border: `1px solid #fecaca`,
            borderRadius: "16px",
            marginBottom: "12px",
          }}
        >
          <div
            style={{
              fontFamily: F.display,
              fontSize: "18px",
              color: C.danger,
              marginBottom: "8px",
            }}
          >
            Cancel this booking?
          </div>
          <div
            style={{
              fontSize: "14px",
              color: C.textMid,
              fontFamily: F.body,
              marginBottom: "16px",
            }}
          >
            This cannot be undone.
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <Btn
              label={acting ? "Cancelling…" : "Yes, cancel"}
              onClick={() =>
                act(async () => {
                  await executeBookingAction(booking.id, "cancel");
                  onBack();
                })
              }
              variant="danger"
              disabled={acting}
              small
            />
            <Btn
              label="Nevermind"
              onClick={() => setConfirmCancel(false)}
              variant="ghost"
              small
            />
          </div>
        </div>
      )}

      {!confirmCancel && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {!hasMembers && isDraft && (
            <div
              style={{
                padding: "14px 16px",
                background: "#fefce8",
                border: "1px solid #fde68a",
                borderRadius: "12px",
                fontSize: "14px",
                color: "#854d0e",
                fontFamily: F.body,
                lineHeight: 1.5,
                textAlign: "center",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <UserPlus size={16} /> Add a household member above before
              confirming
            </div>
          )}
          {isDraft && (
            <Btn
              label={acting ? "Confirming…" : "Confirm Booking"}
              onClick={() =>
                act(async () => {
                  const result = await executeBookingAction(
                    booking.id,
                    "confirm",
                  );
                  const { allowed_actions, ...bookingData } = result;
                  onRefresh(bookingData as any);
                  scrollToTop();
                })
              }
              disabled={acting || !hasMembers}
            />
          )}
          {isConfirmed && (
            <Btn
              label={acting ? "Reverting…" : "Revert to Draft"}
              onClick={() =>
                act(async () => {
                  const result = await executeBookingAction(
                    booking.id,
                    "revert-to-draft",
                  );
                  const { allowed_actions, ...bookingData } = result;
                  onRefresh(bookingData as any);
                  scrollToTop();
                })
              }
              variant="secondary"
              disabled={acting}
            />
          )}
          {canEdit && !confirmCancel && (
            <Btn
              label="Cancel Booking"
              onClick={() => setConfirmCancel(true)}
              variant="danger"
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── New Booking Form ────────────────────────────────────────────────────────

const MEAL_WINDOWS: Record<
  string,
  { start: number; end: number; days?: number[] }
> = {
  LUNCH: { start: 11, end: 15 },
  DINNER: { start: 15, end: 19, days: [4, 5, 6] },
  AFTERHOURS: { start: 9, end: 22 },
};

function validateArrival(meal: string, arrival: string, date: string): string {
  if (!meal || !arrival || !date) return "";
  const [h, m] = arrival.split(":").map(Number);
  const t = h + m / 60;
  const w = MEAL_WINDOWS[meal];
  if (!w) return "";
  if (w.days) {
    const dow = new Date(date + "T12:00:00").getDay();
    if (!w.days.includes(dow === 0 ? 7 : dow) && !w.days.includes(dow))
      return `${MEAL_LABELS[meal]} is only available Thursday, Friday, and Saturday.`;
  }
  if (t < w.start || t >= w.end) {
    const fmt = (n: number) => `${n % 12 || 12}:00 ${n < 12 ? "AM" : "PM"}`;
    return `${MEAL_LABELS[meal]} arrival must be between ${fmt(w.start)} and ${fmt(w.end)}.`;
  }
  return "";
}

function NewBookingScreen({
  rooms: _rooms,
  onCreated,
  onCancel,
}: {
  rooms: Room[];
  onCreated: (b: Booking) => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState("");
  const [roomId, setRoomId] = useState("");
  const [meal, setMeal] = useState("");
  const [arrival, setArrival] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [arrivalErr, setArrivalErr] = useState("");

  useEffect(() => {
    scrollToTop();
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const meals = [
    { key: "LUNCH", label: "Lunch", hint: "11am–3pm · Daily" },
    { key: "DINNER", label: "Dinner", hint: "5–7pm · Thu–Sat" },
    { key: "AFTERHOURS", label: "After Hours", hint: "7–10pm · Evenings" },
  ];

  useEffect(() => {
    if (!date || !meal) {
      setAvailableRooms([]);
      setRoomId("");
      return;
    }
    setRoomsLoading(true);
    setRoomId("");
    getAvailableRooms(date, meal)
      .then((r) => setAvailableRooms(r))
      .catch(() => setAvailableRooms([]))
      .finally(() => setRoomsLoading(false));
  }, [date, meal]);

  useEffect(() => {
    setArrivalErr(validateArrival(meal, arrival, date));
  }, [meal, arrival, date]);

  async function submit() {
    if (!date || !roomId || !meal || !arrival) {
      setErr("Please fill in all required fields.");
      return;
    }
    if (arrivalErr) {
      setErr(arrivalErr);
      return;
    }
    setSaving(true);
    setErr("");
    try {
      const result = await createFullBooking({
        room_id: Number(roomId),
        booking_date: date,
        meal_type: meal as "LUNCH" | "DINNER" | "AFTERHOURS" | "SPECIAL_EVENT",
        estimated_arrival: arrival,
        notes: notes || null,
        is_special_event: false,
        confirm_immediately: false,
        attendees: { member_ids: [], guests: [] },
      });
      onCreated(result.booking);
    } catch (e: any) {
      setErr(
        e?.response?.data?.detail ?? "Something went wrong. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ paddingBottom: "100px" }}>
      <BackHeader title="New Booking" onBack={onCancel} />
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div>
          <FieldLabel>Date</FieldLabel>
          <Input type="date" value={date} onChange={setDate} min={today} />
        </div>
        <div>
          <FieldLabel>Meal Type</FieldLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {meals.map((m) => {
              const on = meal === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => setMeal(m.key)}
                  style={{
                    padding: "16px 20px",
                    borderRadius: "14px",
                    border: `1.5px solid ${on ? C.text : C.border}`,
                    background: on ? C.text : C.surface,
                    cursor: "pointer",
                    textAlign: "left",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    touchAction: "manipulation",
                  }}
                >
                  <div
                    style={{
                      fontFamily: F.display,
                      fontSize: "17px",
                      color: on ? C.bg : C.text,
                    }}
                  >
                    {m.label}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: on ? "rgba(255,255,255,0.6)" : C.textSoft,
                      fontFamily: F.body,
                    }}
                  >
                    {m.hint}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <FieldLabel>Arrival Time</FieldLabel>
          <Input type="time" value={arrival} onChange={setArrival} />
          {arrivalErr && (
            <div
              style={{
                marginTop: "8px",
                padding: "10px 14px",
                background: C.dangerLight,
                borderRadius: "10px",
                fontSize: "13px",
                color: C.danger,
                fontFamily: F.body,
                lineHeight: 1.4,
              }}
            >
              {arrivalErr}
            </div>
          )}
        </div>
        <div>
          <FieldLabel>Room</FieldLabel>
          {!date || !meal ? (
            <div
              style={{
                padding: "16px",
                background: C.bg,
                borderRadius: "12px",
                fontSize: "14px",
                color: C.textSoft,
                fontFamily: F.body,
                textAlign: "center",
              }}
            >
              Select a date and meal type first
            </div>
          ) : roomsLoading ? (
            <Spinner />
          ) : availableRooms.length === 0 ? (
            <div
              style={{
                padding: "16px",
                background: "#fefce8",
                border: "1px solid #fde68a",
                borderRadius: "12px",
                fontSize: "14px",
                color: "#854d0e",
                fontFamily: F.body,
                textAlign: "center",
              }}
            >
              No rooms available for this date and meal type
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {availableRooms.map((r: any) => {
                const on = roomId === String(r.id);
                const spotsRemaining = r.spots_remaining ?? r.capacity;
                const almostFull = spotsRemaining <= 3;
                return (
                  <button
                    key={r.id}
                    onClick={() => setRoomId(String(r.id))}
                    style={{
                      padding: "16px 20px",
                      borderRadius: "14px",
                      border: `1.5px solid ${on ? C.text : C.border}`,
                      background: on ? C.text : C.surface,
                      cursor: "pointer",
                      textAlign: "left",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      touchAction: "manipulation",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: F.display,
                        fontSize: "17px",
                        color: on ? C.bg : C.text,
                      }}
                    >
                      {r.name}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: "12px",
                          color: on ? "rgba(255,255,255,0.6)" : C.textSoft,
                          fontFamily: F.body,
                        }}
                      >
                        cap. {r.capacity}
                      </div>
                      {spotsRemaining < r.capacity && (
                        <div
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            fontFamily: F.body,
                            color: on
                              ? "rgba(255,255,255,0.8)"
                              : almostFull
                                ? "#b91c1c"
                                : "#16a34a",
                            marginTop: "2px",
                          }}
                        >
                          {spotsRemaining} spot{spotsRemaining !== 1 ? "s" : ""}{" "}
                          left
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div>
          <FieldLabel>Notes (optional)</FieldLabel>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anniversary, dietary needs, special requests…"
            rows={3}
            style={{
              width: "100%",
              padding: "14px 16px",
              fontSize: "15px",
              border: `1.5px solid ${C.border}`,
              borderRadius: "12px",
              background: C.surface,
              color: C.text,
              fontFamily: F.body,
              outline: "none",
              resize: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
        {err && (
          <div
            style={{
              padding: "12px 16px",
              background: C.dangerLight,
              borderRadius: "12px",
              fontSize: "14px",
              color: C.danger,
              fontFamily: F.body,
            }}
          >
            {err}
          </div>
        )}
        <Btn
          label={saving ? "Creating…" : "Create Booking"}
          onClick={submit}
          disabled={saving || !!arrivalErr}
        />
      </div>
    </div>
  );
}

// ─── Bookings Tab ─────────────────────────────────────────────────────────────

function BookingsTab({ rooms }: { rooms: Room[] }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState<BookingScreen>("list");
  const [selected, setSelected] = useState<Booking | null>(null);
  const [filter, setFilter] = useState<"all" | "upcoming" | "drafts" | "past">(
    "all",
  );

  const load = useCallback(async () => {
    try {
      setBookings(await getMyBookings());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (screen === "form")
    return (
      <NewBookingScreen
        rooms={rooms}
        onCreated={(b) => {
          setBookings((p) => [b, ...p]);
          setSelected(b);
          setScreen("detail");
          scrollToTop();
        }}
        onCancel={() => {
          setScreen("list");
          scrollToTop();
        }}
      />
    );
  if (screen === "detail" && selected)
    return (
      <BookingDetailScreen
        booking={selected}
        rooms={rooms}
        onBack={() => {
          setScreen("list");
          load();
          scrollToTop();
        }}
        onRefresh={(u) => {
          setSelected(u);
          setBookings((p) => p.map((b) => (b.id === u.id ? u : b)));
        }}
      />
    );

  const active = bookings.filter((b) =>
    ["CONFIRMED", "SEATED", "SERVICE"].includes(b.status),
  );
  const drafts = bookings.filter((b) => b.status === "DRAFT");
  const past = bookings.filter((b) =>
    ["COMPLETED", "CANCELLED"].includes(b.status),
  );
  const roomName = (id: number) =>
    rooms.find((r) => r.id === id)?.name ?? `Room ${id}`;

  const displayBookings = (() => {
    switch (filter) {
      case "upcoming":
        return active;
      case "drafts":
        return drafts;
      case "past":
        return past;
      default:
        return bookings;
    }
  })();

  const sorted = [...displayBookings].sort((a, b) => {
    const aActive = ["DRAFT", "CONFIRMED", "SEATED", "SERVICE"].includes(
      a.status,
    )
      ? 0
      : 1;
    const bActive = ["DRAFT", "CONFIRMED", "SEATED", "SERVICE"].includes(
      b.status,
    )
      ? 0
      : 1;
    if (aActive !== bActive) return aActive - bActive;
    return a.booking_date > b.booking_date ? -1 : 1;
  });

  return (
    <div style={{ paddingBottom: "100px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h1
          style={{
            fontFamily: F.display,
            fontSize: "28px",
            fontWeight: 400,
            margin: 0,
            color: C.text,
          }}
        >
          My Bookings
        </h1>
        <button
          onClick={() => {
            setScreen("form");
            scrollToTop();
          }}
          style={{
            background: C.text,
            color: C.bg,
            border: "none",
            borderRadius: "100px",
            padding: "10px 18px",
            fontSize: "14px",
            fontFamily: F.body,
            cursor: "pointer",
            fontWeight: 500,
            touchAction: "manipulation",
          }}
        >
          + New
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: "6px",
          marginBottom: "20px",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          paddingBottom: "4px",
        }}
      >
        {[
          { key: "all" as const, label: "All", count: bookings.length },
          { key: "upcoming" as const, label: "Active", count: active.length },
          { key: "drafts" as const, label: "Drafts", count: drafts.length },
          { key: "past" as const, label: "Past", count: past.length },
        ].map((tab) => {
          const on = filter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              style={{
                padding: "8px 16px",
                borderRadius: "100px",
                border: `1.5px solid ${on ? C.text : C.border}`,
                background: on ? C.text : C.surface,
                color: on ? C.bg : C.textMid,
                cursor: "pointer",
                fontSize: "13px",
                fontFamily: F.body,
                fontWeight: 500,
                whiteSpace: "nowrap",
                flexShrink: 0,
                touchAction: "manipulation",
              }}
            >
              {tab.label} ({tab.count})
            </button>
          );
        })}
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <>
          {sorted.length === 0 && (
            <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
              <Sun
                size={48}
                color={C.textSoft}
                style={{ marginBottom: "16px" }}
              />
              <div
                style={{
                  fontFamily: F.display,
                  fontSize: "20px",
                  color: C.text,
                  marginBottom: "8px",
                }}
              >
                {filter === "all"
                  ? "No bookings yet"
                  : `No ${filter === "upcoming" ? "active" : filter} bookings`}
              </div>
              {filter === "all" && (
                <>
                  <div
                    style={{
                      fontSize: "15px",
                      color: C.textSoft,
                      fontFamily: F.body,
                      marginBottom: "24px",
                    }}
                  >
                    Tap New to get started
                  </div>
                  <Btn
                    label="Book a Table"
                    onClick={() => {
                      setScreen("form");
                      scrollToTop();
                    }}
                  />
                </>
              )}
            </div>
          )}

          {sorted.length > 0 && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              {sorted.map((b) => {
                const isPast = ["COMPLETED", "CANCELLED"].includes(b.status);
                return (
                  <button
                    key={b.id}
                    onClick={() => {
                      setSelected(b);
                      setScreen("detail");
                      scrollToTop();
                    }}
                    style={{
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: "16px",
                      padding: "20px",
                      cursor: "pointer",
                      textAlign: "left",
                      width: "100%",
                      opacity: isPast ? 0.6 : 1,
                      touchAction: "manipulation",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "12px",
                      }}
                    >
                      <div
                        style={{
                          fontFamily: F.display,
                          fontSize: "20px",
                          color: C.text,
                        }}
                      >
                        {roomName(b.room_id)}
                      </div>
                      <StatusPill status={b.status} />
                    </div>
                    <div
                      style={{
                        fontSize: "14px",
                        color: C.textMid,
                        fontFamily: F.body,
                        lineHeight: 1.7,
                      }}
                    >
                      <div>{b.booking_date}</div>
                      <div>
                        {b.estimated_arrival.slice(0, 5)} ·{" "}
                        {MEAL_LABELS[b.meal_type] ?? b.meal_type} ·{" "}
                        {b.party_size} guest{b.party_size !== 1 ? "s" : ""}
                      </div>
                    </div>
                    {b.status === "DRAFT" && (
                      <div
                        style={{
                          marginTop: "10px",
                          padding: "8px 12px",
                          background: "#fefce8",
                          border: "1px solid #fde68a",
                          borderRadius: "8px",
                          fontSize: "12px",
                          color: "#854d0e",
                          fontFamily: F.body,
                          lineHeight: 1.5,
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <AlertTriangle size={14} /> Draft — not confirmed yet
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Household Tab ────────────────────────────────────────────────────────────

function HouseholdTab() {
  const { user } = useAuth();
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [allDietary, setAllDietary] = useState<string[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState<number | null>(
    null,
  );
  const [fName, setFName] = useState("");
  const [lName, setLName] = useState("");
  const [relation, setRelation] = useState("OTHER");
  const [dietary, setDietary] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");
  const [eFName, setEFName] = useState("");
  const [eLName, setELName] = useState("");
  const [eRelation, setERelation] = useState("OTHER");
  const [eDietary, setEDietary] = useState<string[]>([]);
  const RELATIONS = ["PRIMARY", "SPOUSE", "CHILD", "OTHER"];

  useEffect(() => {
    scrollToTop();
  }, []);

  const load = useCallback(async () => {
    if (!user?.userId) return;
    try {
      setMembers(await getHouseholdMembers(user.userId));
    } finally {
      setLoading(false);
    }
  }, [user?.userId]);
  useEffect(() => {
    load();
    getDietaryOptions().then(setAllDietary);
  }, [load]);

  function flash(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 2500);
  }

  async function addMemberFn() {
    if (!fName.trim() || !lName.trim() || !user?.userId) return;
    setSaving(true);
    setErr("");
    try {
      await createMember(user.userId, {
        first_name: fName.trim(),
        last_name: lName.trim(),
        relation: relation as any,
        dietary_flags: dietary,
        notes: null,
      });
      setFName("");
      setLName("");
      setRelation("OTHER");
      setDietary([]);
      setShowAddForm(false);
      load();
      flash("Member added");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to add member.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(m: HouseholdMember) {
    setEditingId(m.id);
    setEFName(m.first_name);
    setELName(m.last_name);
    setERelation(m.relation);
    setEDietary(m.dietary_flags);
    setErr("");
  }

  async function saveEdit() {
    if (!user?.userId || !editingId) return;
    setSaving(true);
    setErr("");
    try {
      await updateMember(user.userId, editingId, {
        first_name: eFName.trim(),
        last_name: eLName.trim(),
        relation: eRelation as any,
        dietary_flags: eDietary,
      });
      setEditingId(null);
      load();
      flash("Member updated");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to update member.");
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(memberId: number) {
    if (!user?.userId) return;
    setSaving(true);
    setErr("");
    try {
      await deleteMember(user.userId, memberId);
      setConfirmDeactivate(null);
      load();
      flash("Member removed");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to remove member.");
    } finally {
      setSaving(false);
    }
  }

  function DietaryPills({
    selected,
    onToggle,
  }: {
    selected: string[];
    onToggle: (f: string) => void;
  }) {
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {allDietary.map((flag) => {
          const on = selected.includes(flag);
          return (
            <button
              key={flag}
              onClick={() => onToggle(flag)}
              style={{
                padding: "5px 12px",
                borderRadius: "100px",
                border: `1.5px solid ${on ? C.accent : C.border}`,
                background: on ? C.accentLight : C.surface,
                color: on ? C.accent : C.textMid,
                cursor: "pointer",
                fontSize: "11px",
                fontFamily: F.body,
                touchAction: "manipulation",
              }}
            >
              {flag.replace(/_/g, " ")}
            </button>
          );
        })}
      </div>
    );
  }

  function RelationPills({
    selected,
    onSelect,
  }: {
    selected: string;
    onSelect: (r: string) => void;
  }) {
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {RELATIONS.map((r) => {
          const on = selected === r;
          return (
            <button
              key={r}
              onClick={() => onSelect(r)}
              style={{
                padding: "7px 14px",
                borderRadius: "100px",
                border: `1.5px solid ${on ? C.text : C.border}`,
                background: on ? C.text : C.surface,
                color: on ? C.bg : C.textMid,
                cursor: "pointer",
                fontSize: "12px",
                fontFamily: F.body,
                touchAction: "manipulation",
              }}
            >
              {r}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: "100px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <h1
          style={{
            fontFamily: F.display,
            fontSize: "28px",
            fontWeight: 400,
            margin: 0,
            color: C.text,
          }}
        >
          Household
        </h1>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setErr("");
          }}
          style={{
            background: showAddForm ? C.bg : C.text,
            color: showAddForm ? C.text : C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: "100px",
            padding: "10px 18px",
            fontSize: "14px",
            fontFamily: F.body,
            cursor: "pointer",
            fontWeight: 500,
            touchAction: "manipulation",
          }}
        >
          {showAddForm ? "Cancel" : "+ Add"}
        </button>
      </div>

      {success && (
        <div
          style={{
            padding: "12px 16px",
            background: C.accentLight,
            borderRadius: "12px",
            marginBottom: "12px",
            fontSize: "14px",
            color: C.accent,
            fontFamily: F.body,
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <Check size={14} /> {success}
        </div>
      )}
      {err && (
        <div
          style={{
            padding: "12px 16px",
            background: C.dangerLight,
            borderRadius: "12px",
            marginBottom: "12px",
            fontSize: "14px",
            color: C.danger,
            fontFamily: F.body,
          }}
        >
          {err}
        </div>
      )}

      {showAddForm && (
        <Card style={{ marginBottom: "16px" }}>
          <div
            style={{
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div
              style={{ fontFamily: F.display, fontSize: "17px", color: C.text }}
            >
              New Member
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <div style={{ flex: 1 }}>
                <FieldLabel>First Name</FieldLabel>
                <Input value={fName} onChange={setFName} placeholder="First" />
              </div>
              <div style={{ flex: 1 }}>
                <FieldLabel>Last Name</FieldLabel>
                <Input value={lName} onChange={setLName} placeholder="Last" />
              </div>
            </div>
            <div>
              <FieldLabel>Relation</FieldLabel>
              <RelationPills selected={relation} onSelect={setRelation} />
            </div>
            {allDietary.length > 0 && (
              <div>
                <FieldLabel>Dietary Restrictions</FieldLabel>
                <DietaryPills
                  selected={dietary}
                  onToggle={(f) =>
                    setDietary((p) =>
                      p.includes(f) ? p.filter((x) => x !== f) : [...p, f],
                    )
                  }
                />
              </div>
            )}
            <Btn
              label={saving ? "Adding…" : "Add Member"}
              onClick={addMemberFn}
              disabled={saving || !fName.trim() || !lName.trim()}
            />
          </div>
        </Card>
      )}

      {loading ? (
        <Spinner />
      ) : members.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
          <Users
            size={48}
            color={C.textSoft}
            style={{ marginBottom: "16px" }}
          />
          <div
            style={{
              fontFamily: F.display,
              fontSize: "20px",
              color: C.text,
              marginBottom: "8px",
            }}
          >
            No household members
          </div>
          <div
            style={{ fontSize: "15px", color: C.textSoft, fontFamily: F.body }}
          >
            Add family members to include them in bookings
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {members.map((m) => (
            <Card key={m.id}>
              {editingId === m.id ? (
                <div
                  style={{
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: F.display,
                      fontSize: "17px",
                      color: C.text,
                    }}
                  >
                    Edit Member
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <div style={{ flex: 1 }}>
                      <FieldLabel>First Name</FieldLabel>
                      <Input value={eFName} onChange={setEFName} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <FieldLabel>Last Name</FieldLabel>
                      <Input value={eLName} onChange={setELName} />
                    </div>
                  </div>
                  <div>
                    <FieldLabel>Relation</FieldLabel>
                    <RelationPills
                      selected={eRelation}
                      onSelect={setERelation}
                    />
                  </div>
                  {allDietary.length > 0 && (
                    <div>
                      <FieldLabel>Dietary Restrictions</FieldLabel>
                      <DietaryPills
                        selected={eDietary}
                        onToggle={(f) =>
                          setEDietary((p) =>
                            p.includes(f)
                              ? p.filter((x) => x !== f)
                              : [...p, f],
                          )
                        }
                      />
                    </div>
                  )}
                  <div style={{ display: "flex", gap: "8px" }}>
                    <Btn
                      label={saving ? "Saving…" : "Save"}
                      onClick={saveEdit}
                      disabled={saving}
                      small
                    />
                    <Btn
                      label="Cancel"
                      onClick={() => {
                        setEditingId(null);
                        setErr("");
                      }}
                      variant="ghost"
                      small
                    />
                  </div>
                </div>
              ) : confirmDeactivate === m.id ? (
                <div style={{ padding: "20px" }}>
                  <div
                    style={{
                      fontFamily: F.display,
                      fontSize: "17px",
                      color: C.danger,
                      marginBottom: "8px",
                    }}
                  >
                    Remove {m.first_name}?
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      color: C.textMid,
                      fontFamily: F.body,
                      marginBottom: "16px",
                    }}
                  >
                    They will be removed from your household.
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <Btn
                      label={saving ? "Removing…" : "Yes, remove"}
                      onClick={() => deactivate(m.id)}
                      variant="danger"
                      disabled={saving}
                      small
                    />
                    <Btn
                      label="Nevermind"
                      onClick={() => setConfirmDeactivate(null)}
                      variant="ghost"
                      small
                    />
                  </div>
                </div>
              ) : (
                <div style={{ padding: "18px 20px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontFamily: F.display,
                          fontSize: "18px",
                          color: C.text,
                        }}
                      >
                        {m.first_name} {m.last_name}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: C.textSoft,
                          fontFamily: F.body,
                          marginTop: "3px",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {m.relation}
                      </div>
                      {m.dietary_flags.length > 0 && (
                        <div
                          style={{
                            marginTop: "8px",
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "4px",
                          }}
                        >
                          {m.dietary_flags.map((f) => (
                            <span
                              key={f}
                              style={{
                                padding: "2px 8px",
                                borderRadius: "100px",
                                fontSize: "10px",
                                background: C.accentLight,
                                color: C.accent,
                                fontFamily: F.body,
                                fontWeight: 600,
                              }}
                            >
                              {f.replace(/_/g, " ")}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        marginLeft: "12px",
                      }}
                    >
                      <button
                        onClick={() => startEdit(m)}
                        style={{
                          padding: "8px 14px",
                          borderRadius: "10px",
                          border: `1px solid ${C.border}`,
                          background: C.surface,
                          cursor: "pointer",
                          fontSize: "13px",
                          fontFamily: F.body,
                          color: C.textMid,
                          touchAction: "manipulation",
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setConfirmDeactivate(m.id)}
                        style={{
                          padding: "8px 14px",
                          borderRadius: "10px",
                          border: `1px solid #fecaca`,
                          background: C.dangerLight,
                          cursor: "pointer",
                          fontSize: "13px",
                          fontFamily: F.body,
                          color: C.danger,
                          touchAction: "manipulation",
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Account Tab ──────────────────────────────────────────────────────────────

function AccountTab({ onShowHours }: { onShowHours: () => void }) {
  const { user, logoutUser } = useAuth();
  const { name } = useTenant();

  return (
    <div style={{ paddingBottom: "100px" }}>
      <h1
        style={{
          fontFamily: F.display,
          fontSize: "28px",
          fontWeight: 400,
          margin: "0 0 24px",
          color: C.text,
        }}
      >
        Account
      </h1>
      <Card style={{ marginBottom: "16px" }}>
        <div style={{ padding: "24px 20px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: C.bg,
              border: `1px solid ${C.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "14px",
            }}
          >
            <span
              style={{
                fontFamily: F.display,
                fontSize: "22px",
                color: C.textMid,
              }}
            >
              {user?.role?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div
            style={{
              fontFamily: F.display,
              fontSize: "20px",
              color: C.text,
              marginBottom: "4px",
            }}
          >
            {name} Member
          </div>
          <div
            style={{
              fontSize: "13px",
              color: C.textSoft,
              fontFamily: F.body,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {user?.role}
          </div>
        </div>
      </Card>
      <Card style={{ marginBottom: "16px" }}>
        <button
          onClick={onShowHours}
          style={{
            width: "100%",
            padding: "18px 20px",
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            touchAction: "manipulation",
          }}
        >
          <Clock size={20} color={C.textMid} />
          <span style={{ fontFamily: F.body, fontSize: "16px", color: C.text }}>
            Hours of Operation
          </span>
          <ChevronRight
            size={18}
            color={C.textSoft}
            style={{ marginLeft: "auto" }}
          />
        </button>
      </Card>
      <Btn label="Log Out" onClick={logoutUser} variant="secondary" />
    </div>
  );
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

function TabBar({
  active,
  onChange,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
}) {
  const tabs: { key: Tab; Icon: typeof Calendar; label: string }[] = [
    { key: "bookings", Icon: Calendar, label: "Bookings" },
    { key: "new", Icon: Plus, label: "New" },
    { key: "household", Icon: Users, label: "Household" },
    { key: "account", Icon: Menu, label: "Account" },
  ];

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: "480px",
        background: C.tabBar,
        borderTop: `1px solid ${C.border}`,
        display: "flex",
        zIndex: 100,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {tabs.map((t) => {
        const on = active === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            style={{
              flex: 1,
              padding: "10px 4px 12px",
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "3px",
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <t.Icon
              size={20}
              color={on ? C.tabActive : C.tabInactive}
              strokeWidth={on ? 2.5 : 1.5}
            />
            <span
              style={{
                fontSize: "10px",
                fontFamily: F.body,
                fontWeight: on ? 700 : 400,
                color: on ? C.tabActive : C.tabInactive,
                letterSpacing: "0.03em",
              }}
            >
              {t.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export function MemberApp() {
  const { name } = useTenant();
  const [tab, setTab] = useState<Tab>("bookings");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [showHours, setShowHours] = useState(false);

  useEffect(() => {
    roomsApi
      .get<Room[]>("/rooms")
      .then((r) => setRooms(r.data))
      .catch(() => {})
      .finally(() => setRoomsLoading(false));
  }, []);

  function handleTab(t: Tab) {
    if (t === "new") {
      setTab("bookings");
      setTimeout(() => setTab("new" as Tab), 10);
    } else {
      setTab(t);
    }
    scrollToTop();
  }

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        *, *::before, *::after { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        html { height: 100%; overflow: hidden; overscroll-behavior: none; }
        body { height: 100%; margin: 0; overflow: hidden; overscroll-behavior: none; background: ${C.bg}; }
        #root { height: 100%; overflow: hidden; }
        input, select, textarea, button { font-family: inherit; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
        input[type="date"]::-webkit-calendar-picker-indicator, input[type="time"]::-webkit-calendar-picker-indicator { opacity: 0.4; }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      <div
        id="member-scroll"
        style={{
          height: "100dvh",
          overflowY: "auto",
          overflowX: "hidden",
          overscrollBehaviorY: "none",
          WebkitOverflowScrolling: "touch",
          background: C.bg,
          maxWidth: "480px",
          margin: "0 auto",
          position: "relative",
        }}
      >
        <div
          style={{
            padding: "16px 20px 8px",
            background: C.bg,
            position: "sticky",
            top: 0,
            zIndex: 50,
          }}
        >
          <div
            style={{
              fontFamily: F.display,
              fontSize: "13px",
              color: C.textSoft,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {name}
          </div>
        </div>

        <div style={{ padding: "8px 20px" }}>
          {roomsLoading ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "70dvh",
                gap: "16px",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  border: "2px solid #e8e4de",
                  borderTopColor: "#1a1714",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              <div
                style={{
                  fontFamily: F.display,
                  fontSize: "15px",
                  color: C.textSoft,
                  letterSpacing: "0.04em",
                }}
              >
                Loading
              </div>
            </div>
          ) : (
            <>
              {tab === "bookings" && <BookingsTab rooms={rooms} />}
              {tab === "new" && (
                <NewBookingScreen
                  rooms={rooms}
                  onCreated={() => setTab("bookings")}
                  onCancel={() => setTab("bookings")}
                />
              )}
              {tab === "household" && <HouseholdTab />}
              {tab === "account" && (
                <AccountTab onShowHours={() => setShowHours(true)} />
              )}
            </>
          )}
        </div>

        <TabBar active={tab} onChange={handleTab} />
        {showHours && <HoursSheet onClose={() => setShowHours(false)} />}
      </div>
    </>
  );
}
