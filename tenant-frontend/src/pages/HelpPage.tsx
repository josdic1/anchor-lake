import { useState, useMemo } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = {
  text: string;
  note?: string;
};

type HelpTopic = {
  id: string;
  title: string;
  category: string;
  summary: string;
  steps: Step[];
  tags: string[];
};

// ─── Help Content ─────────────────────────────────────────────────────────────

const TOPICS: HelpTopic[] = [
  {
    id: "first-login",
    title: "Logging in for the first time",
    category: "Getting Started",
    summary: "How to access the system and what to expect on first login.",
    tags: ["login", "password", "first time", "access", "start"],
    steps: [
      { text: "Go to your club's portal URL in any browser." },
      {
        text: "If the database is empty, you'll see a Welcome screen with two options: Start Fresh or Explore with Sample Data.",
      },
      {
        text: "Choose Start Fresh if you're ready to set up your real data. Choose Explore with Sample Data to see a fully loaded demo first.",
      },
      {
        text: "After setup, log in with admin@demo.com and password 111111.",
        note: "Change these credentials immediately after your first login via Admin → Users.",
      },
      {
        text: "Once logged in you'll land on the Bookings page. The tour will start automatically on your first visit.",
      },
    ],
  },
  {
    id: "sample-data",
    title: "Loading and resetting sample data",
    category: "Getting Started",
    summary:
      "Load 2 months of realistic data to explore the platform, or wipe everything and start clean.",
    tags: ["sample", "demo", "reset", "wipe", "seed", "data", "start fresh"],
    steps: [
      {
        text: "Click Reset or reload sample data at the bottom of the login page, or go to Setup in the nav after logging in.",
      },
      {
        text: "Choose Explore with Sample Data to seed members, bookings, orders, rooms, menu, and meal windows.",
      },
      {
        text: "Once loaded, use the Quick login panel on the login page to switch between admin, staff, and member accounts.",
        note: "All demo accounts use password 111111.",
      },
      {
        text: "To wipe everything and start fresh, choose Start Fresh. This creates one clean admin account and nothing else.",
      },
      {
        text: "You can reset as many times as you want. Nothing is permanent during a trial.",
      },
    ],
  },
  {
    id: "switch-users",
    title: "Switching between accounts",
    category: "Getting Started",
    summary:
      "Quickly log in as different users to see different views of the platform.",
    tags: ["switch", "login", "accounts", "demo", "member", "staff", "admin"],
    steps: [
      {
        text: "On the login page, scroll down and click Quick switch account.",
      },
      {
        text: "A panel appears showing all users grouped by role: Admin, Staff, and Members.",
      },
      {
        text: "Tap any user tile to log in instantly. No typing required.",
        note: "All accounts use password 111111.",
      },
      {
        text: "Members see a simplified mobile-friendly view with their own bookings and household.",
      },
      { text: "Staff see the full operational view without admin settings." },
      {
        text: "Admin sees everything including menu management, user management, and reports.",
      },
    ],
  },
  {
    id: "create-booking",
    title: "Creating a booking",
    category: "Bookings",
    summary: "How to create a new reservation for a member or household.",
    tags: ["booking", "reservation", "new booking", "create", "schedule"],
    steps: [
      { text: "Click New Booking in the nav, or press N anywhere in the app." },
      {
        text: "If you're an admin or staff, select who the booking is for using the Booking For dropdown at the top.",
        note: "Members always book for themselves. Staff and admin book on behalf of any member.",
      },
      {
        text: "Pick a date using the calendar. The arrival time picker will appear once a date is selected.",
      },
      {
        text: "Select an arrival time. The system will automatically detect the meal type (Lunch, Dinner, After Hours) based on the time.",
      },
      {
        text: "If no service is available at the selected time, you'll see an error. Check Hours of Operation to see available windows.",
      },
      {
        text: "Select a room from the available rooms list. Rooms that are blocked or at capacity won't appear.",
      },
      {
        text: "Add household members as attendees by checking their names. At least one member is required to confirm.",
      },
      { text: "Optionally add outside guests using the guest section below." },
      {
        text: "Click Save Draft to save without confirming, or Confirm Booking to lock it in.",
      },
    ],
  },
  {
    id: "booking-lifecycle",
    title: "Understanding the booking lifecycle",
    category: "Bookings",
    summary: "How bookings move from Draft through to Completed.",
    tags: [
      "lifecycle",
      "status",
      "draft",
      "confirmed",
      "seated",
      "service",
      "completed",
      "cancelled",
    ],
    steps: [
      {
        text: "Draft — booking is saved but not confirmed. Does not hold a spot.",
      },
      {
        text: "Confirmed — booking is locked in. The member and room are reserved for that date and meal.",
      },
      {
        text: "Seated — the party has arrived and been seated. Start the clock on service.",
      },
      { text: "In Service — orders are being taken and food is being served." },
      { text: "Completed — service is done, booking is closed." },
      {
        text: "Cancelled — booking was cancelled at any point before completion.",
      },
      {
        text: "To move a booking forward, open it from the Bookings page and use the action buttons on the right panel.",
        note: "The system only shows valid next actions based on the current status.",
      },
      {
        text: "Admins can force-complete or revert bookings that get stuck. Use Admin → Bookings for this.",
      },
    ],
  },
  {
    id: "household-members",
    title: "Managing household members",
    category: "Members",
    summary: "Add family members and dietary preferences to a member account.",
    tags: ["household", "members", "family", "dietary", "flags", "allergies"],
    steps: [
      {
        text: "Members can manage their own household by clicking My Household in the nav.",
      },
      {
        text: "Click Add Member to add a spouse, child, or other household member.",
      },
      {
        text: "Set their relation (Primary, Spouse, Child, Other) and any dietary flags.",
      },
      {
        text: "Dietary flags include common allergies and preferences: Gluten Free, Vegan, Kosher, Peanut Allergy, Shellfish Allergy, and more.",
      },
      {
        text: "Household members appear as attendee options when creating a booking.",
      },
      {
        text: "Their dietary flags flow through to the kitchen board automatically when they're added to a booking.",
        note: "Staff can see all dietary flags on the seating floor and kitchen cards.",
      },
      { text: "Admins can manage any household via Admin → Members." },
    ],
  },
  {
    id: "seating-floor",
    title: "Using the seating floor",
    category: "Operations",
    summary: "See the live floor view, seat parties, and start taking orders.",
    tags: ["seating", "floor", "table", "seat", "arrive", "check in"],
    steps: [
      {
        text: "Go to Floor in the nav. Each room appears as a card showing its current status and party size.",
      },
      {
        text: "Rooms with confirmed bookings show as available to seat. Tap a room to open the booking detail.",
      },
      {
        text: "Click Seat Party to mark the party as arrived and seated. This moves the booking from Confirmed to Seated.",
      },
      {
        text: "Once seated, click Start Service to begin the service clock and unlock ordering.",
      },
      {
        text: "Click Add to Order to open the order entry drawer and start taking food and drink orders.",
      },
      {
        text: "Orders are saved per booking and sent to the kitchen board when fired.",
        note: "Orders must have at least one item before they can be fired to the kitchen.",
      },
      {
        text: "When service is complete, click Complete to close the booking.",
      },
    ],
  },
  {
    id: "kitchen-board",
    title: "Working the kitchen board",
    category: "Operations",
    summary: "Track orders from incoming through to served.",
    tags: ["kitchen", "orders", "fire", "incoming", "ready", "served", "board"],
    steps: [
      {
        text: "Go to Kitchen in the nav. Orders are displayed in three columns: Incoming, In Kitchen, and Ready.",
      },
      {
        text: "Incoming — orders that have been placed but not yet fired to the kitchen.",
      },
      {
        text: "Click Fire to Kitchen on any incoming order to move it to In Kitchen and notify the kitchen.",
      },
      {
        text: "In Kitchen — orders being actively prepared. Click Mark Ready when food is plated.",
      },
      {
        text: "Ready — food is up and waiting to be served. Click Mark Served when delivered to the table.",
      },
      {
        text: "Each kitchen card shows the room, arrival time, party members, dietary flags, and all ordered items.",
        note: "Dietary flags are highlighted in amber so kitchen staff can't miss them.",
      },
      {
        text: "The board refreshes automatically every 5 seconds. No manual refresh needed.",
      },
    ],
  },
  {
    id: "service-board",
    title: "Using the service board",
    category: "Operations",
    summary: "Manage the full service flow from a staff perspective.",
    tags: ["service", "board", "staff", "orders", "floor"],
    steps: [
      {
        text: "Go to Service in the nav. This shows all active orders across all rooms in the same three-column kitchen layout.",
      },
      {
        text: "Use this view at the floor level to track what's incoming, what's cooking, and what's ready to run.",
      },
      {
        text: "Fire orders, mark ready, and mark served — all from one screen without switching to the kitchen view.",
      },
      {
        text: "This is most useful for a single staff member managing both floor and kitchen in a smaller operation.",
      },
    ],
  },
  {
    id: "reports",
    title: "Running reports",
    category: "Reports",
    summary:
      "Generate daily schedules, booking summaries, and kitchen prep reports.",
    tags: ["reports", "export", "print", "schedule", "summary", "pdf"],
    steps: [
      {
        text: "Go to Reports in the nav. Reports are available to staff and admin.",
      },
      {
        text: "Select a date and report type. Available reports include daily booking schedules, covers by meal type, and kitchen prep summaries.",
      },
      { text: "Click Generate to load the report in the preview pane." },
      {
        text: "Use the Print or Export button to save or print the report.",
        note: "Reports pull live data so they're always current at the time you generate them.",
      },
      {
        text: "Use the daily schedule report for pre-service briefings — it shows all confirmed bookings, party sizes, room assignments, and dietary flags.",
      },
    ],
  },
  {
    id: "hours-of-operation",
    title: "Setting hours of operation",
    category: "Admin",
    summary:
      "Configure service windows for Lunch, Dinner, After Hours, and Special Events.",
    tags: [
      "hours",
      "service windows",
      "meal windows",
      "lunch",
      "dinner",
      "after hours",
      "schedule",
    ],
    steps: [
      { text: "Go to Admin → Hours in the nav." },
      {
        text: "Four service periods are available: Lunch, Dinner, After Hours, and Special Event.",
      },
      {
        text: "For each period, set the opening time, closing time, last order time, and available days of the week.",
      },
      {
        text: "Click the edit icon on any period to modify it. Click Save when done.",
      },
      {
        text: "Members and staff can check current hours by clicking Hours in the nav at any time.",
        note: "The Hours panel also shows which service periods are currently open based on the current time.",
      },
      {
        text: "Booking arrival times are validated against these windows. Members can't book outside active service hours.",
      },
    ],
  },
  {
    id: "manage-menu",
    title: "Managing the menu",
    category: "Admin",
    summary: "Add, edit, and deactivate menu items and modifiers.",
    tags: ["menu", "items", "food", "price", "category", "modifier", "add-on"],
    steps: [
      { text: "Go to Menu in the nav. Only admins can access this page." },
      {
        text: "Items are grouped by category: Starter, Main, Side, Dessert, Drink, Special.",
      },
      {
        text: "Click Add Item to create a new menu item. Set the name, description, price, category, and dietary flags.",
      },
      {
        text: "Mark items as Pre-order to make them available for advance ordering when creating a booking.",
      },
      {
        text: "Mark items as Special to feature them as specials on the menu.",
      },
      {
        text: "Click the edit icon on any item to update it. Click the power icon to activate or deactivate it.",
        note: "Deactivated items don't appear when taking orders but are preserved in historical order data.",
      },
      {
        text: "Modifiers (add-ons) are nested under their parent item. Select Modifier / Add-on when creating an item and choose the parent.",
      },
    ],
  },
  {
    id: "manage-rooms",
    title: "Managing rooms",
    category: "Admin",
    summary: "Add dining rooms, set capacity, and configure room rules.",
    tags: ["rooms", "capacity", "tables", "block", "dining room"],
    steps: [
      { text: "Go to Admin → Rooms." },
      {
        text: "Click Add Room to create a new room. Set the name, capacity, and room type.",
      },
      {
        text: "One Booking Max — when checked, only one confirmed booking is allowed in this room per meal period. Use for private dining rooms.",
      },
      {
        text: "Dines Only — when checked, this room only appears for Lunch and Dinner bookings, not After Hours.",
      },
      {
        text: "To block a room on a specific date, open the room and add a block with a reason. Blocked rooms don't appear in the booking flow for that date.",
      },
      { text: "Edit room names and capacity at any time using the edit icon." },
    ],
  },
  {
    id: "manage-users",
    title: "Managing users and roles",
    category: "Admin",
    summary:
      "Create staff accounts, manage member access, and reset passwords.",
    tags: ["users", "staff", "admin", "roles", "password", "reset", "access"],
    steps: [
      { text: "Go to Admin → Users." },
      {
        text: "Click Add User to create a new account. Set their name, email, password, and role.",
      },
      {
        text: "Three roles are available: Member (booking access only), Staff (full operational access), Admin (everything including settings).",
      },
      { text: "Click the key icon next to any user to reset their password." },
      {
        text: "Click the power icon to deactivate a user. Deactivated users can't log in but their data is preserved.",
        note: "Users are never hard-deleted. Deactivating is always reversible.",
      },
      {
        text: "Member Number is optional — use it if your club uses membership numbers for identification.",
      },
    ],
  },
  {
    id: "stuck-bookings",
    title: "Handling stuck bookings",
    category: "Admin",
    summary:
      "Fix bookings that are stuck in Seated or In Service from previous days.",
    tags: ["stuck", "admin", "force complete", "needs attention", "overdue"],
    steps: [
      {
        text: "Bookings from past dates that are still in Seated or In Service status show as stuck.",
      },
      {
        text: "A red badge on the Admin nav link shows the count of stuck bookings.",
      },
      {
        text: "Go to Admin. The Needs Attention panel at the top shows all stuck bookings.",
      },
      {
        text: "Click Complete on any individual booking to force-complete it.",
      },
      {
        text: "Click Complete All to close all stuck bookings at once.",
        note: "Force-completing a booking marks it as completed regardless of current status. Use this to clean up at the end of each day.",
      },
    ],
  },
  {
    id: "dashboard",
    title: "Reading the dashboard",
    category: "Operations",
    summary: "Understand the operations snapshot and what each section means.",
    tags: ["dashboard", "snapshot", "overview", "today", "operations"],
    steps: [
      {
        text: "Go to Dashboard. This is the live operational view for the current day.",
      },
      {
        text: "The top row shows Guests in Scope, Confirmed bookings, Seated/In Service count, and Live orders.",
      },
      {
        text: "Needs Attention flags issues that need immediate action: unordered seated tables, stuck bookings, and arrivals due soon.",
      },
      {
        text: "Next Up shows upcoming arrivals in chronological order with arrival time, room, and meal type.",
      },
      {
        text: "Kitchen Snapshot shows a live count of incoming, in-kitchen, and ready orders.",
      },
      {
        text: "Floor Snapshot shows each room's current booking status broken down by Confirmed, Seated, and In Service.",
        note: "The dashboard doesn't auto-refresh. Click Refresh in the top right to get the latest data.",
      },
    ],
  },
];

// ─── Category colors ──────────────────────────────────────────────────────────

const CATEGORY_STYLE: Record<string, { bg: string; color: string }> = {
  "Getting Started": { bg: "#dbeafe", color: "#1e40af" },
  Bookings: { bg: "#dcfce7", color: "#166534" },
  Members: { bg: "#fef3c7", color: "#92400e" },
  Operations: { bg: "#f3e8ff", color: "#6b21a8" },
  Reports: { bg: "#ffedd5", color: "#9a3412" },
  Admin: { bg: "#fee2e2", color: "#991b1b" },
};

// ─── Video Card ───────────────────────────────────────────────────────────────

function VideoCard({
  title,
  subtitle,
  src,
}: {
  title: string;
  subtitle: string;
  src: string;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--zinc-150, #f0ede8)",
        borderRadius: "16px",
        overflow: "hidden",
        background: "var(--bg-surface)",
      }}
    >
      <video
        src={src}
        controls
        playsInline
        style={{
          width: "100%",
          display: "block",
          maxHeight: "400px",
          background: "#000",
        }}
      />
      <div
        style={{
          padding: "12px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--zinc-800)",
              fontFamily: "var(--font-body)",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: "12px",
              color: "var(--zinc-400)",
              fontFamily: "var(--font-body)",
              marginTop: "2px",
            }}
          >
            {subtitle}
          </div>
        </div>
        <span
          style={{
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--accent)",
            background: "var(--accent-light)",
            padding: "3px 10px",
            borderRadius: "100px",
          }}
        >
          Video
        </span>
      </div>
    </div>
  );
}

// ─── Topic Card ───────────────────────────────────────────────────────────────

function TopicCard({
  topic,
  isOpen,
  onToggle,
}: {
  topic: HelpTopic;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const cat = CATEGORY_STYLE[topic.category] ?? {
    bg: "var(--zinc-100)",
    color: "var(--zinc-600)",
  };

  return (
    <div
      style={{
        border: `1.5px solid ${isOpen ? "var(--accent)" : "var(--zinc-150, #f0ede8)"}`,
        borderRadius: "14px",
        background: isOpen ? "var(--accent-light)" : "var(--bg-surface)",
        overflow: "hidden",
        transition: "all 0.2s ease",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%",
          padding: "18px 20px",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "16px",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "4px",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                padding: "2px 8px",
                borderRadius: "20px",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                background: cat.bg,
                color: cat.color,
                flexShrink: 0,
              }}
            >
              {topic.category}
            </span>
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "18px",
              fontWeight: 500,
              color: "var(--zinc-900)",
              marginBottom: "4px",
              lineHeight: 1.2,
            }}
          >
            {topic.title}
          </div>
          <div
            style={{
              fontSize: "13px",
              color: "var(--zinc-500)",
              lineHeight: 1.5,
            }}
          >
            {topic.summary}
          </div>
        </div>
        <div
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            background: isOpen ? "var(--accent)" : "var(--zinc-100)",
            color: isOpen ? "white" : "var(--zinc-500)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px",
            flexShrink: 0,
            marginTop: "2px",
            transition: "all 0.2s ease",
          }}
        >
          {isOpen ? "−" : "+"}
        </div>
      </button>

      {isOpen && (
        <div
          style={{
            padding: "0 20px 20px",
            borderTop: "1px solid var(--zinc-150, #f0ede8)",
            marginTop: "0",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0",
              marginTop: "16px",
            }}
          >
            {topic.steps.map((step, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: "14px",
                  paddingBottom: i < topic.steps.length - 1 ? "14px" : "0",
                  position: "relative",
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
                      width: "26px",
                      height: "26px",
                      borderRadius: "50%",
                      background: "var(--accent)",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "11px",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </div>
                  {i < topic.steps.length - 1 && (
                    <div
                      style={{
                        width: "1.5px",
                        flex: 1,
                        background: "var(--zinc-150, #f0ede8)",
                        marginTop: "4px",
                        minHeight: "14px",
                      }}
                    />
                  )}
                </div>

                <div style={{ paddingTop: "3px", flex: 1 }}>
                  <div
                    style={{
                      fontSize: "14px",
                      color: "var(--zinc-800)",
                      lineHeight: 1.6,
                    }}
                  >
                    {step.text}
                  </div>
                  {step.note && (
                    <div
                      style={{
                        marginTop: "6px",
                        padding: "8px 12px",
                        background: "rgba(255,255,255,0.7)",
                        borderLeft: "3px solid var(--accent)",
                        borderRadius: "0 6px 6px 0",
                        fontSize: "12px",
                        color: "var(--zinc-600)",
                        lineHeight: 1.5,
                      }}
                    >
                      {step.note}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function HelpPage() {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = Array.from(new Set(TOPICS.map((t) => t.category)));

  const filtered = useMemo(() => {
    let results = TOPICS;
    if (activeCategory) {
      results = results.filter((t) => t.category === activeCategory);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      results = results.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.summary.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.includes(q)) ||
          t.steps.some((s) => s.text.toLowerCase().includes(q)),
      );
    }
    return results;
  }, [query, activeCategory]);

  const autoOpen = filtered.length === 1 ? filtered[0].id : null;

  function toggleTopic(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  return (
    <div
      className="fade-in"
      style={{ maxWidth: "760px", margin: "0 auto", padding: "0 0 4rem" }}
    >
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <div
          style={{
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--accent)",
            marginBottom: "6px",
          }}
        >
          Documentation
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "36px",
            fontWeight: 500,
            color: "var(--zinc-900)",
            marginBottom: "8px",
            lineHeight: 1.1,
          }}
        >
          Help & Guide
        </h1>
        <p
          style={{
            fontSize: "15px",
            color: "var(--zinc-500)",
            lineHeight: 1.6,
          }}
        >
          Step-by-step instructions for every part of the platform. Search for
          anything or browse by category.
        </p>
      </div>

      {/* ── Training Videos ── */}
      <div style={{ marginBottom: "2.5rem" }}>
        <div
          style={{
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--zinc-400)",
            marginBottom: "12px",
          }}
        >
          Training Videos
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <VideoCard
            title="Wait Staff Walkthrough"
            subtitle="Login · Today · Floor · Orders · Full service cycle · 90 seconds"
            src="https://res.cloudinary.com/dtgtpye2w/video/upload/v1778598308/video_walkthrough_WAITSTAFF_e5ccyk.mov"
          />
        </div>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: "1.25rem" }}>
        <div
          style={{
            position: "absolute",
            left: "14px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--zinc-400)",
            fontSize: "16px",
            pointerEvents: "none",
          }}
        >
          ⌕
        </div>
        <input
          type="text"
          placeholder="Search — try 'booking', 'kitchen', 'reset'..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpenId(null);
          }}
          style={{
            width: "100%",
            padding: "12px 14px 12px 38px",
            borderRadius: "10px",
            border: "1.5px solid var(--zinc-200)",
            background: "var(--bg-surface)",
            fontSize: "14px",
            color: "var(--zinc-900)",
            fontFamily: "var(--font-body)",
            outline: "none",
            boxSizing: "border-box",
            transition: "border-color 0.15s ease",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
          onBlur={(e) =>
            (e.currentTarget.style.borderColor = "var(--zinc-200)")
          }
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setOpenId(null);
            }}
            style={{
              position: "absolute",
              right: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--zinc-400)",
              fontSize: "16px",
              padding: "4px",
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Category filters */}
      {!query && (
        <div
          style={{
            display: "flex",
            gap: "6px",
            flexWrap: "wrap",
            marginBottom: "1.5rem",
          }}
        >
          <button
            onClick={() => setActiveCategory(null)}
            style={{
              padding: "5px 12px",
              borderRadius: "100px",
              border: `1.5px solid ${!activeCategory ? "var(--zinc-900)" : "var(--zinc-200)"}`,
              background: !activeCategory ? "var(--zinc-900)" : "transparent",
              color: !activeCategory ? "white" : "var(--zinc-500)",
              fontSize: "12px",
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "var(--font-body)",
            }}
          >
            All
          </button>
          {categories.map((cat) => {
            const cs = CATEGORY_STYLE[cat] ?? {
              bg: "var(--zinc-100)",
              color: "var(--zinc-600)",
            };
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(isActive ? null : cat)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "100px",
                  border: `1.5px solid ${isActive ? cs.color : "var(--zinc-200)"}`,
                  background: isActive ? cs.bg : "transparent",
                  color: isActive ? cs.color : "var(--zinc-500)",
                  fontSize: "12px",
                  fontWeight: isActive ? 700 : 500,
                  cursor: "pointer",
                  fontFamily: "var(--font-body)",
                  transition: "all 0.15s ease",
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      )}

      {/* Results count when searching */}
      {query && (
        <div
          style={{
            fontSize: "13px",
            color: "var(--zinc-400)",
            marginBottom: "1rem",
          }}
        >
          {filtered.length === 0
            ? "No results found."
            : `${filtered.length} result${filtered.length !== 1 ? "s" : ""} for "${query}"`}
        </div>
      )}

      {/* Topic list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {filtered.map((topic) => (
          <TopicCard
            key={topic.id}
            topic={topic}
            isOpen={openId === topic.id || autoOpen === topic.id}
            onToggle={() => toggleTopic(topic.id)}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "48px 24px",
            color: "var(--zinc-400)",
            fontSize: "14px",
          }}
        >
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>?</div>
          Nothing found for that search. Try a different term or browse by
          category.
        </div>
      )}

      {/* Footer tip */}
      <div
        style={{
          marginTop: "3rem",
          padding: "16px 20px",
          background: "var(--zinc-50)",
          borderRadius: "10px",
          border: "1px solid var(--zinc-150, #f0ede8)",
          fontSize: "13px",
          color: "var(--zinc-500)",
          lineHeight: 1.6,
        }}
      >
        <strong style={{ color: "var(--zinc-700)" }}>Need more help?</strong>{" "}
        Click the <strong style={{ color: "var(--zinc-700)" }}>?</strong> button
        in the top right of any page to restart the guided tour. The tour walks
        through every section role by role.
      </div>
    </div>
  );
}
