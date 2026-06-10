import { ordersApi } from "./client";

// ============================================================
// TYPES — matching backend response shapes exactly
// ============================================================

export type KitchenStatus = "INCOMING" | "IN_KITCHEN" | "READY" | "SERVED";

export interface Order {
  id: number;
  booking_id: number;
  created_by: number | null;
  kitchen_status: KitchenStatus;
  fired_at: string | null;
  print_triggered: boolean;
  notes: string | null;
}

export interface OrderItem {
  id: number;
  order_id: number;
  menu_item_id: number;
  quantity: number;
  unit_price: number;
  special_instructions: string | null;
  modifier_ids: number[];
  voided: boolean;
}

export interface CreateOrderPayload {
  booking_id: number;
  notes?: string | null;
}

export interface AddOrderItemPayload {
  menu_item_id: number;
  quantity: number;
  unit_price: number;
  special_instructions?: string | null;
  modifier_ids?: number[];
}

// ============================================================
// ORDERS
// ============================================================

export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  const response = await ordersApi.post<Order>("/orders", payload);
  return response.data;
}

export async function getOrdersByBooking(bookingId: number): Promise<Order[]> {
  const response = await ordersApi.get<Order[]>(`/orders/booking/${bookingId}`);
  return response.data;
}

export async function getOrder(orderId: number): Promise<Order> {
  const response = await ordersApi.get<Order>(`/orders/${orderId}`);
  return response.data;
}

export async function cancelOrder(orderId: number): Promise<void> {
  await ordersApi.delete(`/orders/${orderId}`);
}

export async function getOrCreateOpenOrder(
  bookingId: number,
  notes?: string | null,
): Promise<Order> {
  const orders = await getOrdersByBooking(bookingId);
  const openOrder = orders.find((order) => !order.fired_at);

  if (openOrder) return openOrder;

  return createOrder({
    booking_id: bookingId,
    notes: notes ?? null,
  });
}

export async function fireOrder(orderId: number): Promise<Order> {
  const response = await ordersApi.patch<Order>(`/orders/${orderId}/fire`);
  return response.data;
}

export async function updateKitchenStatus(
  orderId: number,
  kitchen_status: KitchenStatus,
): Promise<Order> {
  const response = await ordersApi.patch<Order>(
    `/orders/${orderId}/kitchen-status`,
    { kitchen_status },
  );
  return response.data;
}

// ============================================================
// ORDER ITEMS
// ============================================================

export async function getOrderItems(orderId: number): Promise<OrderItem[]> {
  const response = await ordersApi.get<OrderItem[]>(`/orders/${orderId}/items`);
  return response.data;
}

export async function addOrderItem(
  orderId: number,
  payload: AddOrderItemPayload,
): Promise<OrderItem> {
  const response = await ordersApi.post<OrderItem>(
    `/orders/${orderId}/items`,
    payload,
  );
  return response.data;
}

export async function removeOrderItem(
  orderId: number,
  itemId: number,
): Promise<void> {
  await ordersApi.delete(`/orders/${orderId}/items/${itemId}`);
}

// ============================================================
// KITCHEN BOARD
// ============================================================

export async function getKitchenIncoming(): Promise<Order[]> {
  const response = await ordersApi.get<Order[]>("/kitchen/incoming");
  return response.data;
}

export async function getKitchenInKitchen(): Promise<Order[]> {
  const response = await ordersApi.get<Order[]>("/kitchen/in-kitchen");
  return response.data;
}

export async function getKitchenReady(): Promise<Order[]> {
  const response = await ordersApi.get<Order[]>("/kitchen/ready");
  return response.data;
}

export async function voidOrderItem(
  orderId: number,
  itemId: number,
): Promise<void> {
  await ordersApi.patch(`/orders/${orderId}/items/${itemId}/void`);
}
