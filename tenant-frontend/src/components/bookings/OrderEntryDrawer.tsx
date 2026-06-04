import { useEffect, useState } from "react";
import { X, Send, Plus, Minus, Check, ChevronRight } from "lucide-react";
import {
  getActiveMenuItems,
  type MenuItem,
  type MenuCategory,
} from "../../api/menu";
import { createOrder, addOrderItem, fireOrder } from "../../api/orders";
import { useRole } from "../../hooks/useRole";

type Props = {
  bookingId: number;
  bookingStatus: string;
  memberName?: string;
  roomName?: string;
  partySize?: number;
  onClose: () => void;
  onOrderUpdated: () => void;
};

interface CartItem {
  id: string;
  menuItem: MenuItem;
  quantity: number;
  selectedModifiers: MenuItem[];
  specialInstructions: string;
}

const ALL_CATEGORIES: MenuCategory[] = [
  "STARTER",
  "MAIN",
  "SIDE",
  "DESSERT",
  "DRINK",
  "SPECIAL",
];
const PREORDER_CATEGORIES: MenuCategory[] = ["STARTER", "DRINK"];

const CATEGORY_LABELS: Record<string, string> = {
  STARTER: "Snacks",
  MAIN: "Mains",
  SIDE: "Sides",
  DESSERT: "Desserts",
  DRINK: "Drinks",
  SPECIAL: "Specials",
};

const DIETARY_COLORS: Record<string, string> = {
  GLUTEN_FREE: "#15803d",
  VEGAN: "#15803d",
  VEGETARIAN: "#15803d",
  DAIRY_FREE: "#0369a1",
  NUT_ALLERGY: "#b45309",
  SHELLFISH_ALLERGY: "#b45309",
  FISH_ALLERGY: "#b45309",
};

function dietaryBadge(flag: string) {
  const color = DIETARY_COLORS[flag] ?? "#666";
  const short =
    flag === "GLUTEN_FREE"
      ? "GF"
      : flag === "VEGETARIAN"
        ? "V"
        : flag === "VEGAN"
          ? "VG"
          : flag === "DAIRY_FREE"
            ? "DF"
            : flag === "NUT_ALLERGY"
              ? "NUTS"
              : flag === "SHELLFISH_ALLERGY"
                ? "SHELL"
                : flag === "FISH_ALLERGY"
                  ? "FISH"
                  : flag.replace(/_/g, " ").slice(0, 4);
  return (
    <span
      key={flag}
      style={{
        fontSize: "9px",
        fontWeight: 700,
        padding: "1px 5px",
        borderRadius: "3px",
        background: `${color}18`,
        color,
        letterSpacing: "0.03em",
      }}
    >
      {short}
    </span>
  );
}

function cartItemId(item: MenuItem, mods: MenuItem[]) {
  return `${item.id}-${mods
    .map((m) => m.id)
    .sort()
    .join("-")}`;
}

export function OrderEntryDrawer({
  bookingId,
  bookingStatus,
  memberName,
  roomName,
  partySize,
  onClose,
  onOrderUpdated,
}: Props) {
  const { isStaffOrAdmin } = useRole();
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<MenuCategory>("STARTER");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [selectedMods, setSelectedMods] = useState<MenuItem[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isLiveService = ["SEATED", "SERVICE"].includes(bookingStatus);
  const isPreorder = ["DRAFT", "CONFIRMED"].includes(bookingStatus);
  const categories =
    isStaffOrAdmin || isLiveService ? ALL_CATEGORIES : PREORDER_CATEGORIES;

  useEffect(() => {
    getActiveMenuItems().then((data) => {
      setMenu(data);
      setLoading(false);
    });
  }, []);

  const visibleItems = menu.filter(
    (i) => i.category === activeCategory && !i.is_modifier && i.is_active,
  );
  const availableMods = selectedItem
    ? menu.filter((m) => m.parent_item_id === selectedItem.id && m.is_active)
    : [];

  // Get total qty in cart for a given menu item (any mods combo)
  function itemCartQty(itemId: number): number {
    return cart
      .filter((ci) => ci.menuItem.id === itemId)
      .reduce((acc, ci) => acc + ci.quantity, 0);
  }

  function handleCardClick(item: MenuItem) {
    const hasMods = menu.some(
      (m) => m.parent_item_id === item.id && m.is_active,
    );

    if (hasMods) {
      // Toggle customizer open/close
      if (selectedItem?.id === item.id) {
        setSelectedItem(null);
      } else {
        setSelectedItem(item);
        setSelectedMods([]);
        setSpecialInstructions("");
      }
      return;
    }

    // No mods — directly toggle in cart
    const id = cartItemId(item, []);
    const existing = cart.find((ci) => ci.id === id);
    if (existing) {
      // Already in cart — increment
      setCart((prev) =>
        prev.map((ci) =>
          ci.id === id ? { ...ci, quantity: ci.quantity + 1 } : ci,
        ),
      );
    } else {
      setCart((prev) => [
        ...prev,
        {
          id,
          menuItem: item,
          quantity: 1,
          selectedModifiers: [],
          specialInstructions: "",
        },
      ]);
    }
  }

  function toggleMod(mod: MenuItem) {
    setSelectedMods((prev) =>
      prev.find((m) => m.id === mod.id)
        ? prev.filter((m) => m.id !== mod.id)
        : [...prev, mod],
    );
  }

  function addToCart() {
    if (!selectedItem) return;
    const id = cartItemId(selectedItem, selectedMods);
    setCart((prev) => {
      const existing = prev.find((ci) => ci.id === id);
      if (existing && !specialInstructions) {
        return prev.map((ci) =>
          ci.id === id ? { ...ci, quantity: ci.quantity + 1 } : ci,
        );
      }
      return [
        ...prev,
        {
          id: specialInstructions ? `${id}-${Date.now()}` : id,
          menuItem: selectedItem,
          quantity: 1,
          selectedModifiers: selectedMods,
          specialInstructions,
        },
      ];
    });
    setSelectedItem(null);
    setSelectedMods([]);
    setSpecialInstructions("");
  }

  function updateQty(cartId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((ci) =>
          ci.id === cartId ? { ...ci, quantity: ci.quantity + delta } : ci,
        )
        .filter((ci) => ci.quantity > 0),
    );
  }

  function cartTotal() {
    return cart.reduce((acc, ci) => {
      const modTotal = ci.selectedModifiers.reduce(
        (m, mod) => m + mod.price,
        0,
      );
      return acc + (ci.menuItem.price + modTotal) * ci.quantity;
    }, 0);
  }

  async function submitOrder() {
    if (cart.length === 0) return;
    setSubmitting(true);
    setError("");
    try {
      const order = await createOrder({ booking_id: bookingId });
      for (const ci of cart) {
        await addOrderItem(order.id, {
          menu_item_id: ci.menuItem.id,
          quantity: ci.quantity,
          unit_price: ci.menuItem.price,
          modifier_ids: ci.selectedModifiers.map((m) => m.id),
          special_instructions: ci.specialInstructions || null,
        });
      }
      if (isLiveService) await fireOrder(order.id);
      onOrderUpdated();
      onClose();
    } catch {
      setError("Order submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading)
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            background: "var(--bg-surface)",
            borderRadius: "var(--radius-lg)",
            padding: "2rem",
            color: "var(--zinc-600)",
          }}
        >
          Loading menu...
        </div>
      </div>
    );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "stretch",
      }}
    >
      <div
        style={{
          display: "flex",
          flex: 1,
          maxWidth: "1100px",
          margin: "auto",
          height: "92vh",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
          background: "var(--zinc-50)",
        }}
      >
        {/* ── LEFT: Menu ── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            background: "var(--bg-surface)",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "1rem 1.25rem",
              borderBottom: "1px solid var(--zinc-100)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "18px",
                  fontWeight: 500,
                }}
              >
                {isPreorder ? "Pre-order" : "Order"} —{" "}
                {memberName ?? `Booking #${bookingId}`}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--zinc-400)",
                  marginTop: "2px",
                }}
              >
                {roomName && <span>{roomName}</span>}
                {partySize && <span> · Party of {partySize}</span>}
                {" · "}
                <span
                  style={{
                    fontWeight: 600,
                    color: isLiveService ? "#166534" : "#1e40af",
                  }}
                >
                  {bookingStatus}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--zinc-400)",
                padding: "4px",
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Category tabs */}
          <div
            style={{
              display: "flex",
              gap: 0,
              borderBottom: "1px solid var(--zinc-100)",
              overflowX: "auto",
              flexShrink: 0,
            }}
          >
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setActiveCategory(cat);
                  setSelectedItem(null);
                }}
                style={{
                  padding: "0.75rem 1.25rem",
                  fontSize: "13px",
                  fontWeight: activeCategory === cat ? 700 : 400,
                  color:
                    activeCategory === cat
                      ? "var(--zinc-900)"
                      : "var(--zinc-500)",
                  background:
                    activeCategory === cat ? "var(--zinc-50)" : "none",
                  border: "none",
                  borderBottom:
                    activeCategory === cat
                      ? "2px solid var(--zinc-900)"
                      : "2px solid transparent",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  marginBottom: "-1px",
                }}
              >
                {CATEGORY_LABELS[cat] ?? cat}
              </button>
            ))}
          </div>

          {/* Menu grid */}
          <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: "0.75rem",
              }}
            >
              {visibleItems.map((item) => {
                const hasMods = menu.some(
                  (m) => m.parent_item_id === item.id && m.is_active,
                );
                const isSelected = selectedItem?.id === item.id;
                const qtyInCart = itemCartQty(item.id);
                const inCart = qtyInCart > 0;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleCardClick(item)}
                    style={{
                      background: isSelected
                        ? "var(--zinc-900)"
                        : inCart
                          ? "#f0fdf4"
                          : "var(--bg-surface)",
                      border: `2px solid ${isSelected ? "var(--zinc-900)" : inCart ? "#16a34a" : "var(--zinc-200)"}`,
                      borderRadius: "var(--radius-md)",
                      padding: "0.875rem",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.1s ease",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      position: "relative" as const,
                    }}
                  >
                    {/* Cart qty badge */}
                    {inCart && (
                      <span
                        style={{
                          position: "absolute",
                          top: "6px",
                          right: "6px",
                          background: "#16a34a",
                          color: "white",
                          borderRadius: "100px",
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "1px 6px",
                          lineHeight: 1.5,
                        }}
                      >
                        {qtyInCart}
                      </span>
                    )}

                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        lineHeight: 1.3,
                        color: isSelected ? "white" : "var(--zinc-900)",
                        paddingRight: inCart ? "24px" : "0",
                      }}
                    >
                      {item.name}
                    </div>
                    {item.description && (
                      <div
                        style={{
                          fontSize: "10px",
                          color: isSelected
                            ? "rgba(255,255,255,0.65)"
                            : "var(--zinc-400)",
                          lineHeight: 1.4,
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical" as const,
                        }}
                      >
                        {item.description}
                      </div>
                    )}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: "auto",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: 700,
                          color: isSelected ? "white" : "var(--zinc-800)",
                        }}
                      >
                        ${item.price.toFixed(2)}
                      </span>
                      <div
                        style={{
                          display: "flex",
                          gap: "3px",
                          flexWrap: "wrap",
                          justifyContent: "flex-end",
                        }}
                      >
                        {item.dietary_flags
                          .slice(0, 2)
                          .map((f) => dietaryBadge(f))}
                      </div>
                    </div>
                    {hasMods && (
                      <div
                        style={{
                          fontSize: "9px",
                          color: isSelected
                            ? "rgba(255,255,255,0.5)"
                            : "var(--zinc-400)",
                          display: "flex",
                          alignItems: "center",
                          gap: "2px",
                        }}
                      >
                        <ChevronRight size={9} /> customize
                      </div>
                    )}
                  </button>
                );
              })}
              {visibleItems.length === 0 && (
                <div
                  style={{
                    gridColumn: "1/-1",
                    textAlign: "center",
                    padding: "3rem",
                    color: "var(--zinc-400)",
                    fontSize: "13px",
                  }}
                >
                  No items in this category.
                </div>
              )}
            </div>

            {/* Modifier panel */}
            {selectedItem && (
              <div
                style={{
                  marginTop: "1rem",
                  border: "1px solid var(--zinc-200)",
                  borderRadius: "var(--radius-md)",
                  background: "var(--zinc-50)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "0.75rem 1rem",
                    background: "var(--zinc-900)",
                    color: "white",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "14px" }}>
                      {selectedItem.name}
                    </div>
                    <div style={{ fontSize: "11px", opacity: 0.7 }}>
                      ${selectedItem.price.toFixed(2)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={addToCart}
                    style={{
                      background: "#16a34a",
                      color: "white",
                      border: "none",
                      borderRadius: "var(--radius-sm)",
                      padding: "8px 16px",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Plus size={14} /> Add to Order
                  </button>
                </div>

                {availableMods.length > 0 && (
                  <div style={{ padding: "0.875rem 1rem" }}>
                    <div
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "var(--zinc-500)",
                        textTransform: "uppercase" as const,
                        letterSpacing: "0.06em",
                        marginBottom: "0.625rem",
                      }}
                    >
                      Customize
                    </div>
                    <div
                      style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}
                    >
                      {availableMods.map((mod) => {
                        const active = selectedMods.some(
                          (m) => m.id === mod.id,
                        );
                        return (
                          <button
                            key={mod.id}
                            type="button"
                            onClick={() => toggleMod(mod)}
                            style={{
                              padding: "6px 12px",
                              borderRadius: "var(--radius-sm)",
                              fontSize: "12px",
                              border: `1.5px solid ${active ? "var(--zinc-900)" : "var(--zinc-200)"}`,
                              background: active
                                ? "var(--zinc-900)"
                                : "var(--bg-surface)",
                              color: active ? "white" : "var(--zinc-700)",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              fontWeight: active ? 600 : 400,
                            }}
                          >
                            {active && <Check size={11} />}
                            {mod.name}
                            {mod.price > 0 && (
                              <span style={{ fontSize: "11px", opacity: 0.75 }}>
                                +${mod.price.toFixed(2)}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div style={{ padding: "0 1rem 0.875rem" }}>
                  <input
                    type="text"
                    placeholder="Special instructions (optional)..."
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "6px 10px",
                      fontSize: "12px",
                      border: "1px solid var(--zinc-200)",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--bg-surface)",
                      color: "var(--zinc-800)",
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Cart ── */}
        <div
          style={{
            width: "300px",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            background: "var(--bg-surface)",
            borderLeft: "1px solid var(--zinc-100)",
          }}
        >
          <div
            style={{
              padding: "1rem 1.25rem",
              borderBottom: "1px solid var(--zinc-100)",
              fontFamily: "var(--font-display)",
              fontSize: "16px",
              fontWeight: 500,
            }}
          >
            Order ({cart.reduce((a, ci) => a + ci.quantity, 0)} items)
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem" }}>
            {cart.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "3rem 1rem",
                  color: "var(--zinc-300)",
                  fontSize: "13px",
                }}
              >
                Tap items to add them
              </div>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                {cart.map((ci) => {
                  const lineTotal =
                    (ci.menuItem.price +
                      ci.selectedModifiers.reduce((a, m) => a + m.price, 0)) *
                    ci.quantity;
                  return (
                    <div
                      key={ci.id}
                      style={{
                        background: "var(--zinc-50)",
                        borderRadius: "var(--radius-sm)",
                        padding: "0.75rem",
                        border: "1px solid var(--zinc-100)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: "13px",
                              fontWeight: 600,
                              color: "var(--zinc-900)",
                            }}
                          >
                            {ci.menuItem.name}
                          </div>
                          {ci.selectedModifiers.map((m) => (
                            <div
                              key={m.id}
                              style={{
                                fontSize: "11px",
                                color: "var(--zinc-500)",
                                marginTop: "1px",
                              }}
                            >
                              + {m.name}
                            </div>
                          ))}
                          {ci.specialInstructions && (
                            <div
                              style={{
                                fontSize: "11px",
                                color: "var(--zinc-400)",
                                fontStyle: "italic",
                                marginTop: "2px",
                              }}
                            >
                              "{ci.specialInstructions}"
                            </div>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "var(--zinc-800)",
                            marginLeft: "8px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          ${lineTotal.toFixed(2)}
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          marginTop: "8px",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => updateQty(ci.id, -1)}
                          style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            border: "1px solid var(--zinc-200)",
                            background: "var(--bg-surface)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Minus size={11} />
                        </button>
                        <span
                          style={{
                            fontSize: "13px",
                            fontWeight: 600,
                            minWidth: "20px",
                            textAlign: "center",
                          }}
                        >
                          {ci.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQty(ci.id, 1)}
                          style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            border: "1px solid var(--zinc-200)",
                            background: "var(--bg-surface)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Plus size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={() => updateQty(ci.id, -ci.quantity)}
                          style={{
                            marginLeft: "auto",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--zinc-400)",
                            padding: "2px",
                          }}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div
            style={{
              padding: "1rem 1.25rem",
              borderTop: "1px solid var(--zinc-100)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "1rem",
                fontSize: "15px",
                fontWeight: 700,
              }}
            >
              <span>Total</span>
              <span>${cartTotal().toFixed(2)}</span>
            </div>
            {error && (
              <div
                style={{
                  fontSize: "12px",
                  color: "#dc2626",
                  marginBottom: "8px",
                }}
              >
                {error}
              </div>
            )}
            <button
              type="button"
              className="btn-primary btn-block"
              disabled={cart.length === 0 || submitting}
              onClick={submitOrder}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <Send size={14} />
              {submitting
                ? "Submitting..."
                : isLiveService
                  ? "Fire to Kitchen"
                  : "Confirm Pre-order"}
            </button>
            <button
              type="button"
              className="btn-ghost btn-block"
              onClick={onClose}
              style={{ marginTop: "8px", fontSize: "13px" }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
