import { useEffect, useState } from "react";
import { Flame, CheckCircle, PackageCheck } from "lucide-react";
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

export function StaffServiceBoard() {
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
    } catch {
      console.error("Failed to load orders");
    }
  };

  useEffect(() => {
    Promise.all([getMenuItems(), roomsApi.get<Room[]>("/rooms")])
      .then(([menuItems, roomsRes]) => {
        const mmap: Record<number, string> = {};
        menuItems.forEach((m) => (mmap[m.id] = m.name));
        setMenuMap(mmap);

        const rmap: Record<number, string> = {};
        roomsRes.data.forEach((r) => (rmap[r.id] = r.name));
        setRoomMap(rmap);
      })
      .catch((err) => console.error("Failed to load menu/rooms", err));
  }, []);

  useEffect(() => {
    loadOrders();
    const timer = setInterval(loadOrders, 5000);
    return () => clearInterval(timer);
  }, []);

  async function handleFire(orderId: number) {
    await fireOrder(orderId);
    loadOrders();
  }

  async function handleReady(orderId: number) {
    await updateKitchenStatus(orderId, "READY");
    loadOrders();
  }

  async function handleServed(orderId: number) {
    await updateKitchenStatus(orderId, "SERVED");
    loadOrders();
  }

  return (
    <div className="service-board fade-in">
      <div className="service-grid">
        <section className="service-column">
          <h3 className="column-title">
            <Flame size={16} /> INCOMING
            <span
              style={{
                marginLeft: "8px",
                fontSize: "11px",
                fontWeight: 400,
                opacity: 0.8,
              }}
            >
              ({incoming.length})
            </span>
          </h3>
          <div className="column-content">
            {incoming.map((order) => (
              <KitchenCard
                key={order.id}
                order={order}
                menuMap={menuMap}
                roomMap={roomMap}
                nextLabel="FIRE TO KITCHEN"
                onNext={() => handleFire(order.id)}
              />
            ))}
            {incoming.length === 0 && <EmptyColumn />}
          </div>
        </section>

        <section className="service-column">
          <h3 className="column-title" style={{ background: "var(--accent)" }}>
            <CheckCircle size={16} /> IN KITCHEN
            <span
              style={{
                marginLeft: "8px",
                fontSize: "11px",
                fontWeight: 400,
                opacity: 0.8,
              }}
            >
              ({inKitchen.length})
            </span>
          </h3>
          <div className="column-content">
            {inKitchen.map((order) => (
              <KitchenCard
                key={order.id}
                order={order}
                menuMap={menuMap}
                roomMap={roomMap}
                nextLabel="MARK READY"
                onNext={() => handleReady(order.id)}
              />
            ))}
            {inKitchen.length === 0 && <EmptyColumn />}
          </div>
        </section>

        <section className="service-column">
          <h3 className="column-title" style={{ background: "var(--success)" }}>
            <PackageCheck size={16} /> READY
            <span
              style={{
                marginLeft: "8px",
                fontSize: "11px",
                fontWeight: 400,
                opacity: 0.8,
              }}
            >
              ({ready.length})
            </span>
          </h3>
          <div className="column-content">
            {ready.map((order) => (
              <KitchenCard
                key={order.id}
                order={order}
                menuMap={menuMap}
                roomMap={roomMap}
                nextLabel="MARK SERVED"
                onNext={() => handleServed(order.id)}
              />
            ))}
            {ready.length === 0 && <EmptyColumn />}
          </div>
        </section>
      </div>
    </div>
  );
}

function EmptyColumn() {
  return (
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
  );
}
