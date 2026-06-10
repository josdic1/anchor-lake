import type {
  Attendee,
  Booking,
  BookingDraftForm,
  BookingStatus,
  CreateBookingCommand,
  BookingCommandResult,
  BookingFull,
} from "../types/booking";
import { bookingsApi } from "./client";
import type { GuestForm } from "../components/bookings/AttendeeSection";

export type BookingSearchParams = {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  mealType?: string;
  roomId?: string;
  memberQuery?: string;
};

export type BookingWithRoom = Booking & {
  room_name?: string;
};

export type AddMemberAttendeePayload = {
  linked_member_id: number;
  dietary_flags: string[];
  dietary_other_note?: string | null;
  notes?: string | null;
};

export type UpdateBookingPayload = {
  booking_date?: string;
  estimated_arrival?: string;
  meal_type?: string;
  room_id?: number;
  notes?: string | null;
};

export async function getAllBookings(): Promise<Booking[]> {
  const response = await bookingsApi.get<Booking[]>("/bookings");
  return response.data;
}

export async function getMyBookings(): Promise<Booking[]> {
  const response = await bookingsApi.get<Booking[]>("/bookings/my");
  return response.data;
}

export async function getBooking(bookingId: number): Promise<Booking> {
  const response = await bookingsApi.get<Booking>(`/bookings/${bookingId}`);
  return response.data;
}

export async function getAttendees(bookingId: number): Promise<Attendee[]> {
  const response = await bookingsApi.get<Attendee[]>(
    `/bookings/${bookingId}/attendees`,
  );
  return response.data;
}

export async function createBooking(form: BookingDraftForm): Promise<Booking> {
  const response = await bookingsApi.post<Booking>("/bookings", {
    room_id: Number(form.roomId),
    booking_date: form.bookingDate,
    meal_type: form.mealType,
    estimated_arrival: form.estimatedArrival,
    notes: form.notes || null,
    is_special_event: false,
  });
  return response.data;
}

export async function updateBookingStatus(
  bookingId: number,
  status: BookingStatus,
): Promise<Booking> {
  const response = await bookingsApi.patch<Booking>(
    `/bookings/${bookingId}/status`,
    { status },
  );
  return response.data;
}

export async function updateBookingDetails(
  bookingId: number,
  payload: UpdateBookingPayload,
): Promise<Booking> {
  const response = await bookingsApi.patch<Booking>(
    `/bookings/${bookingId}`,
    payload,
  );
  return response.data;
}

export async function confirmBooking(bookingId: number): Promise<Booking> {
  return updateBookingStatus(bookingId, "CONFIRMED");
}

export async function cancelBooking(bookingId: number): Promise<void> {
  await bookingsApi.post(`/bookings/${bookingId}/actions/cancel`);
}

export async function addMemberAttendee(
  bookingId: number,
  payload: AddMemberAttendeePayload,
): Promise<Attendee> {
  const response = await bookingsApi.post<Attendee>(
    `/bookings/${bookingId}/attendees`,
    {
      linked_member_id: payload.linked_member_id,
      guest_first_name: null,
      guest_last_name: null,
      is_member_guest: false,
      dietary_flags: payload.dietary_flags,
      dietary_other_note: payload.dietary_other_note ?? null,
      notes: payload.notes ?? null,
    },
  );
  return response.data;
}

export async function addGuestAttendee(
  bookingId: number,
  guest: GuestForm,
): Promise<Attendee> {
  const response = await bookingsApi.post<Attendee>(
    `/bookings/${bookingId}/attendees`,
    {
      linked_member_id: guest.linked_member_id ?? null,
      guest_first_name: guest.first_name,
      guest_last_name: guest.last_name,
      is_member_guest: guest.is_member_guest,
      dietary_flags: guest.dietary_flags,
      dietary_other_note: guest.dietary_other_note ?? null,
      notes: null,
    },
  );
  return response.data;
}

export async function removeAttendee(
  bookingId: number,
  attendeeId: number,
): Promise<void> {
  await bookingsApi.delete(`/bookings/${bookingId}/attendees/${attendeeId}`);
}

// ─── New atomic booking API ────────────────────────────────────────────────

export async function createFullBooking(
  command: CreateBookingCommand,
): Promise<BookingCommandResult> {
  const response = await bookingsApi.post<BookingCommandResult>(
    "/bookings/commands/create",
    command,
  );
  return response.data;
}

export async function executeBookingAction(
  bookingId: number,
  action: string,
): Promise<
  Booking & { allowed_actions: import("../types/booking").AllowedAction[] }
> {
  const response = await bookingsApi.post(
    `/bookings/${bookingId}/actions/${action}`,
  );
  return response.data;
}

export async function getBookingFull(bookingId: number): Promise<BookingFull> {
  const response = await bookingsApi.get<BookingFull>(
    `/bookings/${bookingId}/full`,
  );
  return response.data;
}
