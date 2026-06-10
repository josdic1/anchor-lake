import { useEffect, useState, useRef } from "react";
import { X, Send, Plus, Check, ChevronRight, Loader2 } from "lucide-react";
import {
  getActiveMenuItems,
  type MenuItem,
  type MenuCategory,
} from "../../api/menu";
import {
  createOrder,
  addOrderItem,
  removeOrderItem,
  fireOrder,
  cancelOrder,
  getOrdersByBooking,
  getOrderItems,
} from "../../api/orders";
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
  savedItemId: number | null;
  menuItem: MenuItem;
  quantity: number;
  selectedModifiers: MenuItem[];
  specialInstructions: string;
  saving: boolean;
  saveError: boolean;
}

const ALL_CATEGORIES: MenuCategory[] = [
  "STARTER",
  "MAIN",
  "SIDE",
  "KIDS",
  "DESSERT",
  "DRINK",
  "SPECIAL",
];

const PREORDER_CATEGORIES: MenuCategory[] = ["STARTER", "DRINK"];

const CATEGORY_LABELS: Record<string, string> = {
  STARTER: "Snacks",
  MAIN: "Mains",
  SIDE: "Sides",
  KIDS: "Kids",
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

const MODIFIER_GROUPS: {
  label: string | null;
  min: number;
  max: number;
  single?: boolean;
}[] = [
  { label: "Greens", min: 1, max: 9, single: true },
  { label: "Protein", min: 10, max: 19, single: true },
  { label: "Grains", min: 20, max: 29, single: false },
  { label: "Dressings", min: 30, max: 39, single: false },
  { label: "Vegetables", min: 40, max: 49, single: false },
  { label: "Fruits", min: 50, max: 59, single: false },
  { label: "Cheese", min: 60, max: 69, single: false },
  { label: null, min: 70, max: 999, single: false },
];

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
  const [firing, setFiring] = useState(false);
  const [fireError, setFireError] = useState("");

  const orderIdRef = useRef<number | null>(null);
  const creatingOrderRef = useRef(false);
  const cartLengthRef = useRef(0);
  const newOrderCreatedRef = useRef(false);

  const isLiveService = ["SEATED", "SERVICE"].includes(bookingStatus);
  const isPreorder = ["DRAFT", "CONFIRMED"].includes(bookingStatus);
  const categories =
    isStaffOrAdmin || isLiveService ? ALL_CATEGORIES : PREORDER_CATEGORIES;

  useEffect(() => {
    async function init() {
      const [menuData, existingOrders] = await Promise.all([
        getActiveMenuItems(),
        getOrdersByBooking(bookingId),
      ]);
      setMenu(menuData);

      // Find an existing unfired order and restore it
      const openOrder =
        existingOrders.find(
          (o) => o.fired_at === null && o.kitchen_status === "INCOMING",
        ) ?? existingOrders[0];
      if (openOrder) {
        orderIdRef.current = openOrder.id;
        const existingItems = await getOrderItems(openOrder.id);
        const menuItems = menuData;
        setCart(
          existingItems.map((item) => ({
            id: `${item.id}-restored`,
            savedItemId: item.id,
            menuItem: menuItems.find((m) => m.id === item.menu_item_id) ?? {
              id: item.menu_item_id,
              name: `Item #${item.menu_item_id}`,
              price: item.unit_price,
              category: "MAIN" as MenuCategory,
              description: null,
              is_active: true,
              is_modifier: false,
              is_starter: false,
              is_special: false,
              parent_item_id: null,
              dietary_flags: [],
              sort_order: 0,
            },
            quantity: item.quantity,
            selectedModifiers: [],
            specialInstructions: item.special_instructions ?? "",
            saving: false,
            saveError: false,
          })),
        );
      }

      setLoading(false);
    }
    init();
  }, [bookingId]);

  useEffect(() => {
    cartLengthRef.current = cart.filter(
      (ci) => ci.savedItemId !== null || ci.saving,
    ).length;
  }, [cart]);

  useEffect(() => {
    return () => {
      const orderId = orderIdRef.current;
      if (
        orderId !== null &&
        newOrderCreatedRef.current &&
        cartLengthRef.current === 0
      ) {
        cancelOrder(orderId).catch(() => {});
      }
    };
  }, []);

  async function ensureOrder(): Promise<number | null> {
    if (orderIdRef.current !== null) return orderIdRef.current;
    if (creatingOrderRef.current) {
      while (creatingOrderRef.current) {
        await new Promise((r) => setTimeout(r, 50));
      }
      return orderIdRef.current;
    }
    creatingOrderRef.current = true;
    try {
      const order = await createOrder({ booking_id: bookingId });
      orderIdRef.current = order.id;
      newOrderCreatedRef.current = true;
      return order.id;
    } catch {
      setFireError("Failed to initialize order. Please try again.");
      return null;
    } finally {
      creatingOrderRef.current = false;
    }
  }

  async function handleAddItem(
    item: MenuItem,
    mods: MenuItem[],
    instructions: string,
  ) {
    const localId = `${item.id}-${Date.now()}`;
    setCart((prev) => [
      ...prev,
      {
        id: localId,
        menuItem: item,
        quantity: 1,
        selectedModifiers: mods,
        specialInstructions: instructions,
        savedItemId: null,
        saving: true,
        saveError: false,
      },
    ]);

    const orderId = await ensureOrder();
    if (!orderId) {
      setCart((prev) => prev.filter((ci) => ci.id !== localId));
      return;
    }

    try {
      const saved = await addOrderItem(orderId, {
        menu_item_id: item.id,
        quantity: 1,
        unit_price: item.price,
        modifier_ids: mods.map((m) => m.id),
        special_instructions: instructions || null,
      });
      setCart((prev) =>
        prev.map((ci) =>
          ci.id === localId
            ? { ...ci, saving: false, savedItemId: saved.id }
            : ci,
        ),
      );
      onOrderUpdated();
    } catch {
      setCart((prev) =>
        prev.map((ci) =>
          ci.id === localId ? { ...ci, saving: false, saveError: true } : ci,
        ),
      );
    }
  }

  async function handleRemoveItem(cartId: string) {
    const ci = cart.find((c) => c.id === cartId);
    if (!ci) return;
    setCart((prev) => prev.filter((c) => c.id !== cartId));
    if (ci.savedItemId && orderIdRef.current) {
      try {
        await removeOrderItem(orderIdRef.current, ci.savedItemId);
        onOrderUpdated();
      } catch {
        setCart((prev) => [...prev, { ...ci, saveError: true }]);
      }
    }
  }

  function handleCardClick(item: MenuItem) {
    if (selectedItem?.id === item.id) {
      setSelectedItem(null);
    } else {
      setSelectedItem(item);
      setSelectedMods([]);
      setSpecialInstructions("");
    }
  }

  // IF YOU ARE SEEING THIS AFTER JUNE 9TH 2026, DELETE THIS FUCKING THING
  // function handleCardClick(item: MenuItem) {
  //   const hasMods = menu.some(
  //     (m) => m.parent_item_id === item.id && m.is_active,
  //   );
  //   if (hasMods) {
  //     if (selectedItem?.id === item.id) {
  //       setSelectedItem(null);
  //     } else {
  //       setSelectedItem(item);
  //       setSelectedMods([]);
  //       setSpecialInstructions("");
  //     }
  //     return;
  //   }
  //   handleAddItem(item, [], "");
  // }

  function handleAddToCartFromCustomizer() {
    if (!selectedItem) return;
    handleAddItem(selectedItem, selectedMods, specialInstructions);
    setSelectedItem(null);
    setSelectedMods([]);
    setSpecialInstructions("");
  }

  function toggleMod(mod: MenuItem) {
    const group = MODIFIER_GROUPS.find(
      (g) => mod.sort_order >= g.min && mod.sort_order <= g.max,
    );
    setSelectedMods((prev) =>
      prev.some((m) => m.id === mod.id)
        ? prev.filter((m) => m.id !== mod.id)
        : group?.single
          ? [
              ...prev.filter(
                (m) => m.sort_order < group.min || m.sort_order > group.max,
              ),
              mod,
            ]
          : [...prev, mod],
    );
  }

  function itemCartQty(itemId: number): number {
    return cart
      .filter((ci) => ci.menuItem.id === itemId)
      .reduce((acc, ci) => acc + ci.quantity, 0);
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

  async function handleFireToKitchen() {
    if (!orderIdRef.current) return;
    if (cart.some((ci) => ci.saving)) return;
    setFiring(true);
    setFireError("");
    try {
      if (isLiveService) await fireOrder(orderIdRef.current);
      onOrderUpdated();
      onClose();
    } catch {
      setFireError("Failed to fire order. Please try again.");
    } finally {
      setFiring(false);
    }
  }

  const savingCount = cart.filter((ci) => ci.saving).length;
  const errorCount = cart.filter((ci) => ci.saveError).length;
  const savedCount = cart.filter((ci) => ci.savedItemId !== null).length;
  const canFire =
    cart.length > 0 && savingCount === 0 && errorCount === 0 && !fireError;

  const visibleItems = menu.filter(
    (i) => i.category === activeCategory && !i.is_modifier && i.is_active,
  );
  const availableMods = selectedItem
    ? menu.filter((m) => m.parent_item_id === selectedItem.id && m.is_active)
    : [];

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
      {firing && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              border: "4px solid rgba(255,255,255,0.2)",
              borderTopColor: "white",
              borderRadius: "50%",
              animation: "spin 0.7s linear infinite",
            }}
          />
          <div
            style={{
              color: "white",
              fontSize: "15px",
              fontWeight: 600,
              fontFamily: "var(--font-display)",
              letterSpacing: "-0.01em",
            }}
          >
            Sending to kitchen...
          </div>
        </div>
      )}
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
          position: "relative",
        }}
      >
        {/* LEFT: Menu */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            background: "var(--bg-surface)",
          }}
        >
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
                {memberName ?? roomName ?? `Booking #${bookingId}`}
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
                      {isStaffOrAdmin && (
                        <span
                          style={{
                            fontSize: "14px",
                            fontWeight: 700,
                            color: isSelected ? "white" : "var(--zinc-800)",
                          }}
                        >
                          ${item.price.toFixed(2)}
                        </span>
                      )}
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
                    {isStaffOrAdmin && (
                      <div style={{ fontSize: "11px", opacity: 0.7 }}>
                        ${selectedItem.price.toFixed(2)}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleAddToCartFromCustomizer}
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
                    {/* FIXME: sort_order-based grouping is a hack — replace with modifier_group column on menu_items */}
                    {MODIFIER_GROUPS.map(({ label, min, max, single }) => {
                      const mods = availableMods.filter(
                        (m) => m.sort_order >= min && m.sort_order <= max,
                      );
                      if (mods.length === 0) return null;
                      return (
                        <div
                          key={label ?? "misc"}
                          style={{ marginBottom: "12px" }}
                        >
                          <div
                            style={{
                              fontSize: "10px",
                              fontWeight: 700,
                              color: "var(--zinc-400)",
                              textTransform: "uppercase" as const,
                              letterSpacing: "0.06em",
                              marginBottom: "6px",
                            }}
                          >
                            {label}
                            <span
                              style={{
                                color: "var(--zinc-300)",
                                fontWeight: 600,
                                marginLeft: "6px",
                              }}
                            >
                              {single ? "Choose one" : "Choose any"}
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "6px",
                            }}
                          >
                            {mods.map((mod) => {
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
                                    minWidth: "fit-content",
                                    whiteSpace: "nowrap" as const,
                                  }}
                                >
                                  <Check
                                    size={11}
                                    style={{
                                      opacity: active ? 1 : 0,
                                      flexShrink: 0,
                                    }}
                                  />
                                  {mod.name}
                                  {isStaffOrAdmin && mod.price > 0 && (
                                    <span
                                      style={{
                                        fontSize: "11px",
                                        opacity: 0.75,
                                      }}
                                    >
                                      +${mod.price.toFixed(2)}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
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

        {/* RIGHT: Cart */}
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
            {savingCount > 0 && (
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--zinc-400)",
                  marginLeft: "8px",
                  fontFamily: "var(--font-body)",
                }}
              >
                saving...
              </span>
            )}
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
                        background: ci.saveError ? "#fff5f5" : "var(--zinc-50)",
                        borderRadius: "var(--radius-sm)",
                        padding: "0.75rem",
                        border: `1px solid ${ci.saveError ? "#fecaca" : "var(--zinc-100)"}`,
                        opacity: ci.saving ? 0.7 : 1,
                        transition: "opacity 0.15s ease",
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
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            {ci.menuItem.name}
                            {ci.saving && (
                              <Loader2
                                size={11}
                                style={{
                                  color: "var(--zinc-400)",
                                  animation: "spin 1s linear infinite",
                                }}
                              />
                            )}
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
                          {ci.saveError && (
                            <div
                              style={{
                                fontSize: "11px",
                                color: "#dc2626",
                                marginTop: "4px",
                                fontWeight: 600,
                              }}
                            >
                              Failed to save — tap × to remove
                            </div>
                          )}
                        </div>
                        {isStaffOrAdmin && (
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
                        )}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          marginTop: "8px",
                        }}
                      >
                        <span
                          style={{ fontSize: "12px", color: "var(--zinc-500)" }}
                        >
                          ×{ci.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(ci.id)}
                          disabled={ci.saving}
                          style={{
                            marginLeft: "auto",
                            background: "none",
                            border: "none",
                            cursor: ci.saving ? "not-allowed" : "pointer",
                            color: "var(--zinc-400)",
                            padding: "2px",
                            opacity: ci.saving ? 0.4 : 1,
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
              {isStaffOrAdmin && <span>${cartTotal().toFixed(2)}</span>}
            </div>
            {fireError && (
              <div
                style={{
                  fontSize: "12px",
                  color: "#dc2626",
                  marginBottom: "8px",
                }}
              >
                {fireError}
              </div>
            )}
            {savingCount > 0 && (
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--zinc-400)",
                  marginBottom: "8px",
                  textAlign: "center",
                }}
              >
                Saving {savingCount} item{savingCount !== 1 ? "s" : ""}...
              </div>
            )}
            {isLiveService ? (
              <button
                type="button"
                className="btn-primary btn-block"
                disabled={!canFire || firing}
                onClick={handleFireToKitchen}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  position: "relative",
                  overflow: "hidden",
                  transition: "all 0.2s ease",
                  background: firing ? "#166534" : undefined,
                }}
              >
                {firing ? (
                  <>
                    <span
                      style={{
                        display: "inline-block",
                        width: "14px",
                        height: "14px",
                        border: "2px solid rgba(255,255,255,0.3)",
                        borderTopColor: "white",
                        borderRadius: "50%",
                        animation: "spin 0.7s linear infinite",
                        flexShrink: 0,
                      }}
                    />
                    Sending to kitchen...
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    Fire to Kitchen
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary btn-block"
                disabled={!canFire}
                onClick={() => {
                  onOrderUpdated();
                  onClose();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                <Check size={14} />
                {savedCount > 0 ? "Save & Close" : "Done"}
              </button>
            )}
            <button
              type="button"
              className="btn-ghost btn-block"
              onClick={onClose}
              style={{ marginTop: "8px", fontSize: "13px" }}
            >
              {cart.length === 0 ? "Close" : "Close without firing"}
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
