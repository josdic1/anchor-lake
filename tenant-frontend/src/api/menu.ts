import { menuApi } from "./client";

export type MenuCategory =
  | "STARTER"
  | "MAIN"
  | "SIDE"
  | "KIDS"
  | "DESSERT"
  | "DRINK"
  | "SPECIAL";

export interface MenuItem {
  id: number;
  name: string;
  description: string | null;
  price: number;
  category: MenuCategory;
  is_starter: boolean;
  is_active: boolean;
  is_special: boolean;
  is_modifier: boolean;
  parent_item_id: number | null;
  dietary_flags: string[];
  sort_order: number;
}

export async function getMenuItems(): Promise<MenuItem[]> {
  const response = await menuApi.get<MenuItem[]>("/menu");
  return response.data;
}

export async function getActiveMenuItems(): Promise<MenuItem[]> {
  const response = await menuApi.get<MenuItem[]>("/menu/active");
  return response.data;
}

export async function getItemModifiers(itemId: number): Promise<MenuItem[]> {
  const response = await menuApi.get<MenuItem[]>(`/menu/${itemId}/modifiers`);
  return response.data;
}

export async function createMenuItem(
  item: Partial<MenuItem>,
): Promise<MenuItem> {
  const response = await menuApi.post<MenuItem>("/menu", item);
  return response.data;
}

export async function updateMenuItem(
  id: number,
  item: Partial<MenuItem>,
): Promise<MenuItem> {
  const response = await menuApi.patch<MenuItem>(`/menu/${id}`, item);
  return response.data;
}

export async function deactivateMenuItem(id: number): Promise<void> {
  await menuApi.delete(`/menu/${id}`);
}

// alias — some components import deleteMenuItem
export const deleteMenuItem = deactivateMenuItem;
