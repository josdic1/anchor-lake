export type MealType = "LUNCH" | "DINNER" | "AFTERHOURS" | "SPECIAL_EVENT";

export type BookingStatus =
  | "DRAFT"
  | "CONFIRMED"
  | "SEATED"
  | "SERVICE"
  | "COMPLETED"
  | "CANCELLED";

export type KitchenStatus = "INCOMING" | "IN_KITCHEN" | "READY" | "SERVED";

export type Room = {
  id: number;
  name: string;
  capacity: number;
  one_booking_max: boolean;
  dines_only: boolean;
  is_active: boolean;
};

export type MealWindow = {
  meal_type: MealType;
  start_time: string;
  end_time: string;
  last_order_time: string;
  available_days: number[];
};

export type BookingDraftForm = {
  bookingDate: string;
  roomId: string;
  mealType: MealType | "";
  estimatedArrival: string;
  notes: string;
};

export type Attendee = {
  id: number;
  booking_id: number;
  linked_member_id: number | null;
  guest_first_name: string | null;
  guest_last_name: string | null;
  is_member_guest: boolean;
  dietary_flags: string[];
  notes: string | null;
};

export type Booking = {
  id: number;
  booking_member_id: number;
  room_id: number;
  booking_date: string;
  meal_type: MealType;
  estimated_arrival: string;
  status: BookingStatus;
  party_size: number;
  is_special_event: boolean;
  notify_email_sent: boolean;
  notes: string | null;
  additional_charges: number | null;
  additional_charge_notes: string | null;
  confirmed_at: string | null;
  seated_at: string | null;
  service_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  force_completed: boolean;
};

export type MenuCategory =
  | "STARTER"
  | "MAIN"
  | "SIDE"
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
}
// ─── New types for atomic booking flow ─────────────────────────────────────

export type AllowedAction = {
  action: string;
  label: string;
  confirm: boolean;
  variant: "primary" | "ghost" | "danger";
};

export type GuestAttendeeInput = {
  first_name: string;
  last_name: string;
  linked_member_id?: number | null;
  is_member_guest?: boolean;
  dietary_flags?: string[];
  notes?: string | null;
};

export type CreateBookingCommand = {
  room_id: number;
  booking_date: string;
  meal_type: MealType;
  estimated_arrival: string;
  notes?: string | null;
  is_special_event?: boolean;
  confirm_immediately: boolean;
  on_behalf_of_user_id?: number | null; // add this
  attendees: {
    member_ids: number[];
    guests: GuestAttendeeInput[];
  };
};

export type BookingCommandResult = {
  booking: Booking;
  attendees: Attendee[];
  allowed_actions: AllowedAction[];
};

export type BookingFull = {
  booking: Booking;
  attendees: Attendee[];
  allowed_actions: AllowedAction[];
};
