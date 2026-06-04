import { useEffect, useState, useCallback } from "react";
import { Trash2, Plus, Minus } from "lucide-react";
import type { Order, OrderItem } from "../../api/orders";
import { getOrderItems, removeOrderItem, addOrderItem } from "../../api/orders";
import { getMenuItems } from "../../api/menu";

interface Props {
  orders: Order[];
  editable?: boolean; // pass true when booking is DRAFT or CONFIRMED
  onChanged?: () => void; // called after any mutation so parent can reload
}

interface EnrichedItem extends OrderItem {
  menuItemName: string;
  modifierNames: string[];
}

export function OrderSummary({ orders, editable = false, onChanged }: Props) {
  const [menuMap, setMenuMap] = useState<Record<number, string>>({});
  const [itemsMap, setItemsMap] = useState<Record<number, OrderItem[]>>({});
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const orderIds = orders.map((o) => o.id).join(",");

  const load = useCallback(async () => {
    if (orders.length === 0) return;
    setLoading(true);
    try {
      const [menuItems, ...orderItemArrays] = await Promise.all([
        getMenuItems(),
        ...orders.map((o) => getOrderItems(o.id)),
      ]);

      const map: Record<number, string> = {};
      menuItems.forEach((i) => (map[i.id] = i.name));
      setMenuMap(map);

      const imap: Record<number, OrderItem[]> = {};
      orders.forEach((o, idx) => {
        imap[o.id] = orderItemArrays[idx];
      });
      setItemsMap(imap);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }, [orderIds]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(orderId: number, itemId: number) {
    setDeletingId(itemId);
    try {
      await removeOrderItem(orderId, itemId);
      setItemsMap((prev) => ({
        ...prev,
        [orderId]: (prev[orderId] || []).filter((i) => i.id !== itemId),
      }));
      onChanged?.();
    } catch {
      alert("Failed to remove item.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleQuantityChange(
    orderId: number,
    item: OrderItem,
    delta: number,
  ) {
    const newQty = item.quantity + delta;
    if (newQty < 1) {
      // decrement to 0 = delete
      await handleDelete(orderId, item.id);
      return;
    }
    try {
      // remove and re-add with new quantity (simplest approach given no PATCH qty endpoint)
      await removeOrderItem(orderId, item.id);
      const added = await addOrderItem(orderId, {
        menu_item_id: item.menu_item_id,
        quantity: newQty,
        unit_price: item.unit_price,
        special_instructions: item.special_instructions ?? undefined,
        modifier_ids: item.modifier_ids,
      });
      setItemsMap((prev) => ({
        ...prev,
        [orderId]: [
          ...(prev[orderId] || []).filter((i) => i.id !== item.id),
          added,
        ],
      }));
      onChanged?.();
    } catch {
      alert("Failed to update quantity.");
    }
  }

  if (orders.length === 0) {
    return (
      <div style={{ fontSize: "13px", color: "var(--zinc-500)" }}>
        No orders yet.
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ fontSize: "13px", color: "var(--zinc-500)" }}>
        Loading bill...
      </div>
    );
  }

  const allItems: (EnrichedItem & { orderId: number })[] = orders.flatMap((o) =>
    (itemsMap[o.id] || []).map((item) => ({
      ...item,
      orderId: o.id,
      menuItemName: menuMap[item.menu_item_id] ?? `Item #${item.menu_item_id}`,
      modifierNames: (item.modifier_ids || []).map(
        (mid) => menuMap[mid] ?? `Mod #${mid}`,
      ),
    })),
  );

  const subtotal = allItems.reduce(
    (acc, item) => acc + item.unit_price * item.quantity,
    0,
  );

  return (
    <div
      style={{
        border: "1px solid var(--zinc-200)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
      }}
    >
      {allItems.length === 0 ? (
        <div
          style={{
            padding: "1rem",
            fontSize: "13px",
            color: "var(--zinc-500)",
          }}
        >
          No items ordered yet.
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {allItems.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: "0.75rem 1rem",
                  borderBottom: "1px solid var(--zinc-100)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "0.75rem",
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
                    {item.menuItemName}
                  </div>
                  {item.modifierNames.map((name, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: "11px",
                        color: "var(--zinc-500)",
                        paddingLeft: "0.75rem",
                      }}
                    >
                      ↳ {name}
                    </div>
                  ))}
                  {item.special_instructions && (
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--zinc-400)",
                        fontStyle: "italic",
                        marginTop: "2px",
                      }}
                    >
                      {item.special_instructions}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    flexShrink: 0,
                  }}
                >
                  {/* Quantity controls — only when editable */}
                  {editable ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          handleQuantityChange(item.orderId, item, -1)
                        }
                        style={{
                          width: "22px",
                          height: "22px",
                          border: "1px solid var(--zinc-200)",
                          borderRadius: "4px",
                          background: "var(--bg-surface)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 0,
                        }}
                      >
                        <Minus size={11} />
                      </button>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          minWidth: "16px",
                          textAlign: "center",
                        }}
                      >
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleQuantityChange(item.orderId, item, 1)
                        }
                        style={{
                          width: "22px",
                          height: "22px",
                          border: "1px solid var(--zinc-200)",
                          borderRadius: "4px",
                          background: "var(--bg-surface)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 0,
                        }}
                      >
                        <Plus size={11} />
                      </button>
                    </div>
                  ) : (
                    <span
                      style={{ fontSize: "12px", color: "var(--zinc-500)" }}
                    >
                      ×{item.quantity}
                    </span>
                  )}

                  {/* Price */}
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 500,
                      minWidth: "48px",
                      textAlign: "right",
                    }}
                  >
                    ${(item.unit_price * item.quantity).toFixed(2)}
                  </span>

                  {/* Delete button — only when editable */}
                  {editable && (
                    <button
                      type="button"
                      onClick={() => handleDelete(item.orderId, item.id)}
                      disabled={deletingId === item.id}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--error)",
                        opacity: deletingId === item.id ? 0.4 : 0.6,
                        padding: "2px",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Subtotal */}
          <div
            style={{
              padding: "0.75rem 1rem",
              display: "flex",
              justifyContent: "space-between",
              fontSize: "13px",
              fontWeight: 700,
              borderTop: "1px solid var(--zinc-200)",
              background: "var(--zinc-50)",
            }}
          >
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div
            style={{
              padding: "0.5rem 1rem",
              fontSize: "11px",
              color: "var(--zinc-400)",
              background: "var(--zinc-50)",
            }}
          >
            * Charges applied to monthly member statement.
          </div>
        </>
      )}
    </div>
  );
}
