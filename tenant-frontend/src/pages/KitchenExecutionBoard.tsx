import { useEffect, useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";
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
  isAdmin?: boolean;
  onRefresh?: () => void;
}

type AudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

export function KitchenExecutionBoard() {
  const [incoming, setIncoming] = useState<Order[]>([]);
  const [inKitchen, setInKitchen] = useState<Order[]>([]);
  const [ready, setReady] = useState<Order[]>([]);
  const [menuMap, setMenuMap] = useState<Record<number, string>>({});
  const [roomMap, setRoomMap] = useState<Record<number, string>>({});
  const [soundEnabled, setSoundEnabled] = useState(false);

  const { user } = useAuth();
  const isKitchenOnly = user?.sub_role === "kitchen";
  const isAdmin = user?.role === "admin";

  const audioContextRef = useRef<AudioContext | null>(null);
  const soundEnabledRef = useRef(false);
  const hasLoadedKitchenOnceRef = useRef(false);
  const knownInKitchenIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  async function getAudioContext() {
    const AudioContextConstructor =
      window.AudioContext || (window as AudioWindow).webkitAudioContext;

    if (!AudioContextConstructor) {
      return null;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextConstructor();
    }

    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }

    return audioContextRef.current;
  }

  async function playKitchenSound() {
    try {
      const ctx = await getAudioContext();

      if (!ctx) {
        return;
      }

      const now = ctx.currentTime;

      const makeBeep = (start: number, frequency: number) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, start);

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.exponentialRampToValueAtTime(0.32, start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.32);

        oscillator.connect(gain);
        gain.connect(ctx.destination);

        oscillator.start(start);
        oscillator.stop(start + 0.35);
      };

      makeBeep(now, 880);
      makeBeep(now + 0.18, 1175);
    } catch (err) {
      console.error("Failed to play kitchen sound", err);
    }
  }

  async function enableKitchenSound() {
    await getAudioContext();
    setSoundEnabled(true);

    // Confirmation ding so staff know browser audio is enabled.
    await playKitchenSound();
  }

  const loadOrders = async () => {
    try {
      const [inc, ink, rdy] = await Promise.all([
        getKitchenIncoming(),
        getKitchenInKitchen(),
        getKitchenReady(),
      ]);

      const nextInKitchenIds = new Set(ink.map((order) => order.id));

      const hasNewOrderInKitchen =
        hasLoadedKitchenOnceRef.current &&
        soundEnabledRef.current &&
        ink.some((order) => !knownInKitchenIdsRef.current.has(order.id));

      knownInKitchenIdsRef.current = nextInKitchenIds;
      hasLoadedKitchenOnceRef.current = true;

      setIncoming(inc);
      setInKitchen(ink);
      setReady(rdy);

      if (hasNewOrderInKitchen) {
        void playKitchenSound();
      }
    } catch (err) {
      console.error("Failed to load kitchen orders", err);
    }
  };

  useEffect(() => {
    Promise.all([getMenuItems(), roomsApi.get<Room[]>("/rooms")])
      .then(([menuItems, roomsRes]) => {
        const mmap: Record<number, string> = {};

        menuItems.forEach((menuItem) => {
          mmap[menuItem.id] = menuItem.name;
        });

        setMenuMap(mmap);

        const rmap: Record<number, string> = {};

        roomsRes.data.forEach((room) => {
          rmap[room.id] = room.name;
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
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "12px",
        }}
      >
        <button
          type="button"
          className={soundEnabled ? "btn-primary" : "btn-ghost"}
          onClick={enableKitchenSound}
        >
          {soundEnabled ? "Kitchen sound enabled" : "Enable kitchen sound"}
        </button>
      </div>

      <div className="service-grid">
        <KitchenColumn
          title="INCOMING"
          orders={incoming}
          menuMap={menuMap}
          roomMap={roomMap}
          actionLabel={isKitchenOnly ? undefined : "FIRE TO KITCHEN"}
          onAction={isKitchenOnly ? undefined : handleFire}
          isAdmin={isAdmin}
          onRefresh={loadOrders}
        />

        <KitchenColumn
          title="IN KITCHEN"
          orders={inKitchen}
          menuMap={menuMap}
          roomMap={roomMap}
          actionLabel="MARK READY"
          onAction={(id) => handleStatusUpdate(id, "READY")}
          highlight="var(--accent)"
          isAdmin={isAdmin}
          onRefresh={loadOrders}
        />

        <KitchenColumn
          title="READY"
          orders={ready}
          menuMap={menuMap}
          roomMap={roomMap}
          actionLabel="MARK SERVED"
          onAction={(id) => handleStatusUpdate(id, "SERVED")}
          highlight="var(--success)"
          isAdmin={isAdmin}
          onRefresh={loadOrders}
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
  isAdmin = false,
  onRefresh,
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
            isAdmin={isAdmin}
            onAction={onRefresh}
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
