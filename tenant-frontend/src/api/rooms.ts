import { roomsApi } from "./client";
import type { Room } from "../types/booking";

export async function getAvailableRooms(
  bookingDate: string,
  mealType?: string,
): Promise<Room[]> {
  const response = await roomsApi.get<Room[]>("/rooms/available", {
    params: {
      booking_date: bookingDate,
      ...(mealType ? { meal_type: mealType } : {}),
    },
  });

  return response.data;
}
