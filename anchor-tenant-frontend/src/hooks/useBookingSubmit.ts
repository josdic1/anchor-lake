import { useState } from "react";
import { createFullBooking } from "../api/bookings";
import type { HouseholdMember } from "../api/users";
import type { BookingCommandResult, BookingDraftForm } from "../types/booking";
import type { GuestForm } from "../components/bookings/AttendeeSection";

export type SubmitMode = "draft" | "confirmed";

export type BookingSubmitResult = {
  booking: BookingCommandResult["booking"];
  mode: SubmitMode;
  attendedMembers: HouseholdMember[];
  attendedGuests: GuestForm[];
};

export function useBookingSubmit() {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [result, setResult] = useState<BookingSubmitResult | null>(null);

  async function submit(
    mode: SubmitMode,
    form: BookingDraftForm,
    selectedMembers: HouseholdMember[],
    guests: GuestForm[],
    onBehalfOfUserId?: number,
  ) {
    setSaving(true);
    setSaveError("");

    try {
      const commandResult = await createFullBooking({
        room_id: Number(form.roomId),
        booking_date: form.bookingDate,
        meal_type: form.mealType as
          | "LUNCH"
          | "DINNER"
          | "AFTERHOURS"
          | "SPECIAL_EVENT",
        estimated_arrival: form.estimatedArrival,
        notes: form.notes || null,
        is_special_event: false,
        confirm_immediately: mode === "confirmed",
        on_behalf_of_user_id: onBehalfOfUserId ?? null,
        attendees: {
          member_ids: selectedMembers.map((m) => m.id),
          guests: guests
            .filter((g) => g.first_name.trim() && g.last_name.trim())
            .map((g) => ({
              first_name: g.first_name.trim(),
              last_name: g.last_name.trim(),
              linked_member_id: g.linked_member_id ?? null,
              is_member_guest: g.is_member_guest,
              dietary_flags: g.dietary_flags,
            })),
        },
      });

      setResult({
        booking: commandResult.booking,
        mode,
        attendedMembers: selectedMembers,
        attendedGuests: guests,
      });
    } catch (error) {
      if (typeof error === "object" && error !== null && "response" in error) {
        const axiosErr = error as { response?: { data?: { detail?: string } } };
        setSaveError(
          axiosErr.response?.data?.detail ?? "Booking request failed.",
        );
      } else {
        setSaveError(
          error instanceof Error ? error.message : "Booking request failed.",
        );
      }
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setResult(null);
    setSaveError("");
  }

  return { submit, saving, saveError, result, reset };
}
