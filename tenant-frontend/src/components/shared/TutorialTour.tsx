import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type TourStep = {
  target: string;
  content: string;
  title?: string;
  placement?: "top" | "bottom" | "left" | "right" | "center";
  roles?: ("member" | "staff" | "admin")[];
  actionHint?: string;
};

type Props = {
  runTour: boolean;
  setRunTour: (run: boolean) => void;
  role: "member" | "staff" | "admin";
  isMobile?: boolean;
};

// ─── Step Definitions ─────────────────────────────────────────────────────────

const DESKTOP_STEPS: TourStep[] = [
  {
    target: "body",
    title: "Welcome",
    content:
      "Welcome to your club management portal. This quick tour will show you how everything works in about a minute.",
    placement: "center",
  },
  {
    target: "#nav-bookings",
    title: "Bookings",
    content:
      "This is your command center. View reservations, filter by date or status, and open any booking to manage it in detail.",
    placement: "bottom",
    actionHint:
      "Use the top filters like Today, Active, Drafts, and Past to jump straight to what matters.",
  },
  {
    target: "#nav-new-booking",
    title: "New Booking",
    content:
      "Create a reservation here. Pick a date, time, room, and party. You can confirm immediately or save as a draft and finish later.",
    placement: "bottom",
    actionHint: `"Confirm Booking" secures the reservation now. "Save Draft" lets you come back to it.`,
  },
  {
    target: "#nav-household",
    title: "My Household",
    content:
      "Manage family members and dietary preferences here. These details carry through into bookings and kitchen visibility.",
    placement: "bottom",
    roles: ["member", "admin"],
  },
  {
    target: "#nav-hours",
    title: "Hours",
    content:
      "Check service windows and operating times for Lunch, Dinner, and After Hours before creating a booking.",
    placement: "bottom",
  },
  {
    target: "#nav-dashboard",
    title: "Dashboard",
    content:
      "A quick operational view of the day — confirmed bookings, seated parties, active service, and anything needing attention.",
    placement: "bottom",
    roles: ["staff", "admin"],
  },
  {
    target: "#nav-seating",
    title: "Seating Floor",
    content:
      "This is the live floor view. Each table reflects its current status and party size. Open a table to see booking details or take an order.",
    placement: "bottom",
    roles: ["staff", "admin"],
    actionHint:
      "Once a party is seated, open the table and use Add to Order to begin service.",
  },
  {
    target: "#nav-service",
    title: "Service Board",
    content:
      "Move bookings through the service lifecycle: Confirmed, Seated, In Service, and Complete.",
    placement: "bottom",
    roles: ["staff", "admin"],
  },
  {
    target: "#nav-kitchen",
    title: "Kitchen Board",
    content:
      "This is the kitchen workflow. Orders progress from Incoming to In Kitchen, then Ready, then Served.",
    placement: "bottom",
    roles: ["staff", "admin"],
    actionHint:
      "Orders must contain items before they can be fired to the kitchen.",
  },
  {
    target: "#nav-reports",
    title: "Reports",
    content:
      "Generate daily schedules, booking summaries, and kitchen-facing reports for operations and planning.",
    placement: "bottom",
    roles: ["staff", "admin"],
  },
  {
    target: "#nav-menu",
    title: "Menu Management",
    content:
      "Manage the full menu here — items, prices, categories, dietary flags, and modifiers.",
    placement: "bottom",
    roles: ["admin"],
  },
  {
    target: "#nav-admin",
    title: "Admin Panel",
    content:
      "Manage users, rooms, capacities, room blocks, and other core settings from here.",
    placement: "bottom",
    roles: ["admin"],
    actionHint:
      "Watch for badges or alerts that indicate bookings still stuck in service states.",
  },
  {
    target: "body",
    title: "Booking Lifecycle",
    content:
      "Every booking follows a simple path:\n\nDraft → Confirmed → Seated → In Service → Completed\n\nAt each stage, the system only shows actions that are valid for that booking.",
    placement: "center",
  },
  {
    target: "body",
    title: "After Hours",
    content:
      "After Hours bookings are for social or outdoor spaces that don't require kitchen service — a patio, bar area, or event space.",
    placement: "center",
  },
  {
    target: "#tour-help-btn",
    title: "Need Help Later?",
    content:
      "You can reopen this tour anytime using the help button. It’s always available if you need a quick refresher.",
    placement: "left",
  },
];

const MOBILE_STEPS: TourStep[] = [
  {
    target: "body",
    title: "Welcome",
    content:
      "Welcome to your club’s mobile portal. This short walkthrough shows you how to book, manage your household, and keep track of reservations.",
    placement: "center",
  },
  {
    target: "body",
    title: "A Few Quick Tips",
    content:
      "• Add at least one household member before confirming\n• Lunch and Dinner bookings can include pre-orders\n• Draft bookings do not hold your spot\n• You can search club members by name and add them as guests",
    placement: "center",
  },
  {
    target: "body",
    title: "You’re Ready",
    content:
      "That’s everything. You can reopen this walkthrough anytime from the help button.",
    placement: "center",
  },
];

// ─── Geometry Helpers ─────────────────────────────────────────────────────────

type Rect = { top: number; left: number; width: number; height: number };

function getElementRect(selector: string): Rect | null {
  if (selector === "body") return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    top: r.top + window.scrollY,
    left: r.left + window.scrollX,
    width: r.width,
    height: r.height,
  };
}

function getTooltipPosition(
  rect: Rect | null,
  placement: TourStep["placement"],
  tooltipW: number,
  isMobile: boolean,
): { top: number; left: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const gap = isMobile ? 12 : 16;
  const approxH = isMobile ? 320 : 300;

  if (!rect || placement === "center") {
    return {
      top: Math.max(24, (vh - approxH) / 2 + window.scrollY),
      left: Math.max(16, (vw - tooltipW) / 2),
    };
  }

  let top = 0;
  let left = 0;

  switch (placement) {
    case "top":
      top = rect.top - approxH - gap;
      left = rect.left + rect.width / 2 - tooltipW / 2;
      break;
    case "left":
      top = rect.top + rect.height / 2 - approxH / 2;
      left = rect.left - tooltipW - gap;
      break;
    case "right":
      top = rect.top + rect.height / 2 - approxH / 2;
      left = rect.left + rect.width + gap;
      break;
    case "bottom":
    default:
      top = rect.top + rect.height + gap;
      left = rect.left + rect.width / 2 - tooltipW / 2;
      break;
  }

  left = Math.max(12, Math.min(left, vw - tooltipW - 12));
  top = Math.max(12 + window.scrollY, top);

  return { top, left };
}

// ─── Spotlight Overlay ────────────────────────────────────────────────────────

function SpotlightOverlay({
  rect,
  onClick,
}: {
  rect: Rect | null;
  onClick: () => void;
}) {
  const pad = 10;
  const r = 14;

  if (!rect) {
    return (
      <div
        onClick={onClick}
        style={{
          position: "fixed",
          inset: 0,
          background:
            "radial-gradient(circle at center, rgba(15,15,15,0.58) 0%, rgba(15,15,15,0.68) 100%)",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
          zIndex: 9998,
          transition: "opacity 0.25s ease",
        }}
      />
    );
  }

  const vx = rect.left - window.scrollX;
  const vy = rect.top - window.scrollY;

  return (
    <svg
      onClick={onClick}
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 9998,
      }}
    >
      <defs>
        <mask id="tour-mask">
          <rect width="100%" height="100%" fill="white" />
          <rect
            x={vx - pad}
            y={vy - pad}
            width={rect.width + pad * 2}
            height={rect.height + pad * 2}
            rx={r}
            ry={r}
            fill="black"
          />
        </mask>
        <filter id="tour-glow">
          <feGaussianBlur stdDeviation="8" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect
        width="100%"
        height="100%"
        fill="rgba(12,12,12,0.62)"
        mask="url(#tour-mask)"
      />

      <rect
        x={vx - pad}
        y={vy - pad}
        width={rect.width + pad * 2}
        height={rect.height + pad * 2}
        rx={r}
        ry={r}
        fill="none"
        stroke="rgba(255,255,255,0.92)"
        strokeWidth="1.5"
        filter="url(#tour-glow)"
      />
    </svg>
  );
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function TourTooltip({
  step,
  index,
  total,
  onNext,
  onPrev,
  onSkip,
  pos,
  isMobile,
}: {
  step: TourStep;
  index: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  pos: { top: number; left: number };
  isMobile: boolean;
}) {
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const lines = step.content.split("\n");

  return (
    <div
      key={index}
      role="dialog"
      aria-modal="true"
      aria-label={step.title ?? "Tutorial step"}
      style={{
        position: "absolute",
        top: `${pos.top}px`,
        left: `${pos.left}px`,
        width: isMobile
          ? "calc(100vw - 24px)"
          : "min(420px, calc(100vw - 32px))",
        maxWidth: "420px",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(252,251,249,0.98) 100%)",
        borderRadius: isMobile ? "18px" : "20px",
        border: "1px solid rgba(222,216,208,0.95)",
        boxShadow:
          "0 28px 90px rgba(0,0,0,0.22), 0 10px 30px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.85)",
        zIndex: 9999,
        overflow: "hidden",
        animation: "tour-fade-up 0.24s ease-out",
      }}
    >
      <div
        style={{
          position: "relative",
          height: "4px",
          background: "rgba(232,228,222,0.8)",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${((index + 1) / total) * 100}%`,
            background:
              "linear-gradient(90deg, var(--accent, #a38a64) 0%, #d5bf95 100%)",
            transition: "width 0.28s ease",
          }}
        />
      </div>

      <div style={{ padding: isMobile ? "18px 18px 12px" : "22px 24px 14px" }}>
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
              fontSize: "10px",
              fontWeight: 700,
              color: "var(--accent, #a38a64)",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
            }}
          >
            Step {index + 1} of {total}
          </div>

          <button
            onClick={onSkip}
            style={{
              background: "transparent",
              border: "none",
              color: "#9a948b",
              cursor: "pointer",
              fontSize: "18px",
              lineHeight: 1,
              padding: 0,
              width: "28px",
              height: "28px",
              borderRadius: "50%",
            }}
            aria-label="Close tutorial"
          >
            ×
          </button>
        </div>

        {step.title && (
          <div
            style={{
              fontFamily:
                'var(--font-display, "Cormorant Garamond", Georgia, serif)',
              fontSize: isMobile ? "24px" : "26px",
              fontWeight: 500,
              letterSpacing: "-0.01em",
              color: "#18181b",
              marginBottom: "10px",
              lineHeight: 1.15,
            }}
          >
            {step.title}
          </div>
        )}

        <div
          style={{
            fontSize: isMobile ? "14px" : "14.5px",
            lineHeight: 1.68,
            color: "#5a564f",
            fontFamily: 'var(--font-body, "Inter", sans-serif)',
          }}
        >
          {lines.map((line, i) =>
            line.trim() === "" ? (
              <br key={i} />
            ) : (
              <span key={i}>
                {line}
                {i < lines.length - 1 && <br />}
              </span>
            ),
          )}
        </div>

        {step.actionHint && (
          <div
            style={{
              marginTop: "14px",
              padding: "12px 13px",
              background:
                "linear-gradient(180deg, var(--accent-light, #fcfaf8) 0%, rgba(252,250,248,0.8) 100%)",
              borderRadius: "12px",
              fontSize: "12px",
              color: "#766f67",
              fontFamily: 'var(--font-body, "Inter", sans-serif)',
              lineHeight: 1.55,
              border: "1px solid rgba(225,217,206,0.95)",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--accent, #a38a64)",
                marginBottom: "4px",
              }}
            >
              Helpful tip
            </div>
            {step.actionHint}
          </div>
        )}
      </div>

      <div
        style={{
          padding: isMobile ? "0 18px 18px" : "0 24px 22px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <button
          onClick={onSkip}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "12px",
            color: "#9a948b",
            fontFamily: 'var(--font-body, "Inter", sans-serif)',
            padding: "6px 0",
            whiteSpace: "nowrap",
          }}
        >
          Skip
        </button>

        <div style={{ display: "flex", gap: "8px", marginLeft: "auto" }}>
          {!isFirst && (
            <button
              onClick={onPrev}
              style={{
                padding: "9px 16px",
                borderRadius: "999px",
                border: "1.5px solid #e4ded6",
                background: "rgba(255,255,255,0.92)",
                color: "#5f5a53",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 600,
                fontFamily: 'var(--font-body, "Inter", sans-serif)',
              }}
            >
              Back
            </button>
          )}
          <button
            onClick={onNext}
            style={{
              padding: "9px 18px",
              borderRadius: "999px",
              border: "none",
              background: "#18181b",
              color: "#fff",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 600,
              fontFamily: 'var(--font-body, "Inter", sans-serif)',
              boxShadow: "0 6px 16px rgba(0,0,0,0.18)",
            }}
          >
            {isLast ? "Finish" : "Next"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes tour-fade-up {
          from { opacity: 0; transform: translateY(10px) scale(0.985); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

// ─── Persistence ──────────────────────────────────────────────────────────────

const TOUR_KEY = "pt_tour_seen";
const TOUR_VER = "3";

export function hasTourCompleted(): boolean {
  return localStorage.getItem(TOUR_KEY) === TOUR_VER;
}

export function markTourCompleted(): void {
  localStorage.setItem(TOUR_KEY, TOUR_VER);
}

export function resetTourCompleted(): void {
  localStorage.removeItem(TOUR_KEY);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TutorialTour({
  runTour,
  setRunTour,
  role,
  isMobile = false,
}: Props) {
  const allSteps = isMobile ? MOBILE_STEPS : DESKTOP_STEPS;
  const steps = useMemo(
    () => allSteps.filter((s) => !s.roles || s.roles.includes(role)),
    [allSteps, role],
  );

  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (runTour) setIdx(0);
  }, [runTour]);

  const measure = useCallback(() => {
    if (!runTour || idx >= steps.length) return;

    const r = getElementRect(steps[idx].target);
    setRect(r);

    if (r) {
      const vy = r.top - window.scrollY;
      if (vy < 84 || vy > window.innerHeight - 220) {
        window.scrollTo({
          top: Math.max(0, r.top - 110),
          behavior: "smooth",
        });
      }
    }
  }, [runTour, idx, steps]);

  useEffect(() => {
    measure();
    const t = setTimeout(measure, 120);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure]);

  useEffect(() => {
    if (!runTour) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIdx(0);
        markTourCompleted();
        setRunTour(false);
      }

      if (e.key === "ArrowRight" || e.key === "Enter") {
        if (idx >= steps.length - 1) {
          setIdx(0);
          markTourCompleted();
          setRunTour(false);
        } else {
          setIdx((i) => i + 1);
        }
      }

      if (e.key === "ArrowLeft" && idx > 0) {
        setIdx((i) => i - 1);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [runTour, idx, steps.length, setRunTour]);

  function next() {
    if (idx >= steps.length - 1) {
      setIdx(0);
      markTourCompleted();
      setRunTour(false);
    } else {
      setIdx((i) => i + 1);
    }
  }

  function prev() {
    if (idx > 0) setIdx((i) => i - 1);
  }

  function finish() {
    setIdx(0);
    markTourCompleted();
    setRunTour(false);
  }

  if (!runTour || steps.length === 0) return null;

  const step = steps[idx];
  const tooltipW = isMobile
    ? window.innerWidth - 24
    : Math.min(420, window.innerWidth - 32);
  const pos = getTooltipPosition(
    rect,
    step.placement || "bottom",
    tooltipW,
    isMobile,
  );

  return (
    <>
      <SpotlightOverlay rect={rect} onClick={() => {}} />
      <div
        ref={wrapRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          pointerEvents: "none",
          zIndex: 9999,
        }}
      >
        <div style={{ pointerEvents: "auto" }}>
          <TourTooltip
            step={step}
            index={idx}
            total={steps.length}
            onNext={next}
            onPrev={prev}
            onSkip={finish}
            pos={pos}
            isMobile={isMobile}
          />
        </div>
      </div>
    </>
  );
}
