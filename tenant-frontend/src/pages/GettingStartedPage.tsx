import { useNavigate } from "react-router-dom";
import { useTenant } from "../hooks/useTenant";

// ─── Install Steps ────────────────────────────────────────────────────────────

const INSTALL_STEPS = [
  {
    n: 1,
    text: "Open Safari on your iPhone",
    sub: "Must be Safari — Chrome and other browsers don't support Add to Home Screen.",
  },
  {
    n: 2,
    text: "Go to abeyton-lodge.netlify.app",
    sub: "Bookmark it or type it directly into the address bar.",
  },
  {
    n: 3,
    text: "Tap the Share icon at the bottom of the screen",
    sub: "It looks like a box with an arrow pointing up.",
  },
  {
    n: 4,
    text: '"Add to Home Screen"',
    sub: 'Scroll down in the Share sheet until you see "Add to Home Screen" and tap it.',
  },
  {
    n: 5,
    text: 'Tap "Add" in the top right',
    sub: "The Abeyton icon will appear on your home screen like a native app.",
  },
];

const BOOKING_STEPS = [
  {
    n: 1,
    text: "Tap New Booking in the nav",
    sub: "Or press N on a keyboard anywhere in the app.",
  },
  {
    n: 2,
    text: "Pick a date and arrival time",
    sub: "The system will automatically detect Lunch or Dinner based on the time you choose.",
  },
  {
    n: 3,
    text: "Select a room",
    sub: "Only rooms available for that date and meal will appear.",
  },
  {
    n: 4,
    text: "Add your household members as attendees",
    sub: "Check the names of who's coming. At least one person is required.",
  },
  {
    n: 5,
    text: "Tap Confirm Booking",
    sub: "Or save as Draft if you're not ready to commit yet.",
    last: true,
  },
];

const HOUSEHOLD_STEPS = [
  {
    n: 1,
    text: "Click My Household in the nav",
  },
  {
    n: 2,
    text: "Click Add Member",
    sub: "Add your spouse, children, or any regular guests.",
  },
  {
    n: 3,
    text: "Set their relation and dietary flags",
    sub: "Gluten Free, Vegan, Nut Allergy, Shellfish Allergy, and more. These show up automatically on the kitchen board.",
    last: true,
  },
];

// ─── Components ───────────────────────────────────────────────────────────────

function StepRow({
  n,
  text,
  sub,
  last = false,
}: {
  n: number;
  text: string;
  sub?: string;
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: "16px",
        paddingBottom: last ? "0" : "22px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: "30px",
            height: "30px",
            borderRadius: "50%",
            background: "var(--accent)",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "12px",
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {n}
        </div>
        {!last && (
          <div
            style={{
              width: "1px",
              flex: 1,
              background: "var(--zinc-200)",
              marginTop: "6px",
              minHeight: "16px",
            }}
          />
        )}
      </div>
      <div style={{ paddingTop: "4px", flex: 1 }}>
        <div
          style={{
            fontSize: "15px",
            fontWeight: 500,
            color: "var(--zinc-800)",
            lineHeight: 1.5,
          }}
        >
          {text}
        </div>
        {sub && (
          <div
            style={{
              fontSize: "13px",
              color: "var(--zinc-500)",
              marginTop: "4px",
              lineHeight: 1.55,
            }}
          >
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

function Card({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--zinc-200)",
        borderRadius: "16px",
        padding: "28px 28px 32px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "24px",
          paddingBottom: "20px",
          borderBottom: "1px solid var(--zinc-100)",
        }}
      >
        <span style={{ fontSize: "24px" }}>{icon}</span>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "22px",
            fontWeight: 500,
            color: "var(--zinc-900)",
            margin: 0,
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function GettingStartedPage() {
  const navigate = useNavigate();
  const { name } = useTenant();

  return (
    <div
      style={{
        maxWidth: "680px",
        margin: "0 auto",
        padding: "0 0 6rem",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "3rem" }}>
        <div
          style={{
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--accent)",
            marginBottom: "8px",
          }}
        >
          Member Guide
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "40px",
            fontWeight: 500,
            color: "var(--zinc-900)",
            margin: "0 0 12px",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
          }}
        >
          Welcome to {name}
        </h1>
        <p
          style={{
            fontSize: "15px",
            color: "var(--zinc-500)",
            lineHeight: 1.7,
            margin: 0,
            maxWidth: "480px",
          }}
        >
          Everything you need to make reservations, manage your household, and
          get the most out of your membership.
        </p>
      </div>

      {/* Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Logging in */}
        <Card icon="🔑" title="Logging in">
          <div
            style={{ display: "flex", flexDirection: "column", gap: "14px" }}
          >
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
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--zinc-400)",
                  marginBottom: "10px",
                }}
              >
                Your login
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: "var(--zinc-700)",
                  lineHeight: 1.7,
                }}
              >
                <strong>Email:</strong> firstname.lastname@abeyton.member
                <br />
                <strong>Password:</strong> AbeytonMember1! (you'll be asked to
                change this on first login)
              </div>
            </div>
            <div
              style={{
                fontSize: "14px",
                color: "var(--zinc-600)",
                lineHeight: 1.6,
              }}
            >
              Your email is your first and last name in the format above — for
              example, <em>rustin.cohle@abeyton.member</em>. These aren't real
              email addresses, just your login identifier. If you need help
              finding yours, contact the club.
            </div>
          </div>
        </Card>

        {/* Making a booking */}
        <Card icon="📅" title="Making a reservation">
          {BOOKING_STEPS.map((s) => (
            <StepRow key={s.n} {...s} />
          ))}
        </Card>

        {/* Household */}
        <Card icon="👨‍👩‍👧" title="Managing your household">
          <p
            style={{
              fontSize: "14px",
              color: "var(--zinc-600)",
              lineHeight: 1.6,
              margin: "0 0 20px",
            }}
          >
            Add your family members once and they'll appear as attendee options
            every time you make a booking. Dietary flags carry through to the
            kitchen automatically.
          </p>
          {HOUSEHOLD_STEPS.map((s) => (
            <StepRow key={s.n} {...s} />
          ))}
        </Card>

        {/* Install on iPhone */}
        <Card icon="📱" title="Add to your iPhone home screen">
          <p
            style={{
              fontSize: "14px",
              color: "var(--zinc-600)",
              lineHeight: 1.6,
              margin: "0 0 20px",
            }}
          >
            Install Abeyton Lodge on your iPhone for instant one-tap access — no
            App Store required.
          </p>
          {INSTALL_STEPS.map((s, i) => (
            <StepRow key={s.n} {...s} last={i === INSTALL_STEPS.length - 1} />
          ))}
        </Card>

        {/* Getting help */}
        <Card icon="❓" title="Getting help">
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            <div
              style={{
                display: "flex",
                gap: "14px",
                padding: "14px 16px",
                background: "var(--zinc-50)",
                borderRadius: "10px",
                border: "1px solid var(--zinc-200)",
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "50%",
                  border: "1.5px solid var(--zinc-300)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "var(--zinc-500)",
                  flexShrink: 0,
                }}
              >
                ?
              </div>
              <div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "var(--zinc-800)",
                    marginBottom: "3px",
                  }}
                >
                  Guided tour
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: "var(--zinc-500)",
                    lineHeight: 1.55,
                  }}
                >
                  Tap the ? button in the top right of any page to launch an
                  interactive walkthrough of the platform.
                </div>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: "14px",
                padding: "14px 16px",
                background: "var(--zinc-50)",
                borderRadius: "10px",
                border: "1px solid var(--zinc-200)",
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "50%",
                  border: "1.5px solid var(--zinc-300)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  flexShrink: 0,
                }}
              >
                📖
              </div>
              <div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "var(--zinc-800)",
                    marginBottom: "3px",
                  }}
                >
                  Help page
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: "var(--zinc-500)",
                    lineHeight: 1.55,
                  }}
                >
                  Click Help in the nav for searchable step-by-step instructions
                  on every topic.
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* CTA */}
        <div
          style={{
            marginTop: "8px",
            padding: "28px 32px",
            borderRadius: "16px",
            background: "var(--zinc-900)",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "24px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "20px",
                fontWeight: 500,
                marginBottom: "4px",
              }}
            >
              Ready to make a reservation?
            </div>
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>
              Takes about 30 seconds.
            </div>
          </div>
          <button
            onClick={() => navigate("/booking")}
            style={{
              padding: "11px 22px",
              borderRadius: "100px",
              border: "none",
              background: "white",
              color: "var(--zinc-900)",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            New Booking →
          </button>
        </div>
      </div>
    </div>
  );
}
