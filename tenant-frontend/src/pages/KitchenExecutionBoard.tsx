import { useEffect, useState } from "react";
import {
  getKitchenIncoming,
  getKitchenInKitchen,
  getKitchenReady,
  updateKitchenStatus,
  fireOrder,
  type Order,
} from "../api/orders";
import { getMenuItems } from "../api/menu";
import { roomsApi } from "../api/client";
import { KitchenCard } from "./KitchenCard";
import type { Room } from "../types/booking";

interface KitchenColumnProps {
  title: string;
  orders: Order[];
  menuMap: Record<number, string>;
  roomMap: Record<number, string>;
  actionLabel?: string;
  onAction?: (id: number) => void;
  highlight?: string;
}

export function KitchenExecutionBoard() {
  const [incoming, setIncoming] = useState<Order[]>([]);
  const [inKitchen, setInKitchen] = useState<Order[]>([]);
  const [ready, setReady] = useState<Order[]>([]);
  const [menuMap, setMenuMap] = useState<Record<number, string>>({});
  const [roomMap, setRoomMap] = useState<Record<number, string>>({});

  const loadOrders = async () => {
    try {
      const [inc, ink, rdy] = await Promise.all([
        getKitchenIncoming(),
        getKitchenInKitchen(),
        getKitchenReady(),
      ]);
      setIncoming(inc);
      setInKitchen(ink);
      setReady(rdy);
    } catch (err) {
      console.error("Failed to load kitchen orders", err);
    }
  };

  useEffect(() => {
    Promise.all([getMenuItems(), roomsApi.get<Room[]>("/rooms")])
      .then(([menuItems, roomsRes]) => {
        const mmap: Record<number, string> = {};
        menuItems.forEach((m) => {
          mmap[m.id] = m.name;
        });
        setMenuMap(mmap);

        const rmap: Record<number, string> = {};
        roomsRes.data.forEach((r) => {
          rmap[r.id] = r.name;
        });
        setRoomMap(rmap);
      })
      .catch((err) => console.error("Failed to load menu/rooms", err));
  }, []);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  async function handleFire(orderId: number) {
    try {
      await fireOrder(orderId);
      await loadOrders();
    } catch (err) {
      console.error("Failed to fire order", err);
    }
  }

  async function handleStatusUpdate(
    orderId: number,
    status: "READY" | "SERVED",
  ) {
    try {
      await updateKitchenStatus(orderId, status);
      await loadOrders();
    } catch (err) {
      console.error("Failed to update kitchen status", err);
    }
  }

  return (
    <div className="service-board fade-in">
      <div className="service-grid">
        <KitchenColumn
          title="INCOMING"
          orders={incoming}
          menuMap={menuMap}
          roomMap={roomMap}
          actionLabel="FIRE TO KITCHEN"
          onAction={handleFire}
        />

        <KitchenColumn
          title="IN KITCHEN"
          orders={inKitchen}
          menuMap={menuMap}
          roomMap={roomMap}
          actionLabel="MARK READY"
          onAction={(id) => handleStatusUpdate(id, "READY")}
          highlight="var(--accent)"
        />

        <KitchenColumn
          title="READY"
          orders={ready}
          menuMap={menuMap}
          roomMap={roomMap}
          actionLabel="MARK SERVED"
          onAction={(id) => handleStatusUpdate(id, "SERVED")}
          highlight="var(--success)"
        />
      </div>
    </div>
  );
}

function KitchenColumn({
  title,
  orders,
  menuMap,
  roomMap,
  actionLabel,
  onAction,
  highlight,
}: KitchenColumnProps) {
  return (
    <section className="service-column">
      <h3
        className="column-title"
        style={highlight ? { background: highlight } : undefined}
      >
        {title}
        <span
          style={{
            marginLeft: "8px",
            fontSize: "11px",
            fontWeight: 400,
            opacity: 0.8,
          }}
        >
          ({orders.length})
        </span>
      </h3>

      <div className="column-content">
        {orders.map((order) => (
          <KitchenCard
            key={order.id}
            order={order}
            menuMap={menuMap}
            roomMap={roomMap}
            nextLabel={actionLabel}
            onNext={onAction ? () => onAction(order.id) : undefined}
          />
        ))}

        {orders.length === 0 && (
          <div
            style={{
              fontSize: "13px",
              color: "var(--zinc-500)",
              padding: "1rem",
              textAlign: "center",
            }}
          >
            No orders
          </div>
        )}
      </div>
    </section>
  );
}
