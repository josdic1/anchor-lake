from datetime import date
from fastapi import HTTPException
from .audit import write_audit
from .availability import (
    check_meal_window,
    check_room_availability,
    check_organizer_conflict,
    check_member_conflict,
    update_party_size,
)
from .status_service import get_allowed_actions


def create_full_booking(cur, user_id: int, role: str, payload) -> dict:
    # Use on_behalf_of_user_id if provided (admin/staff booking for a member)
    booking_owner_id = payload.on_behalf_of_user_id if payload.on_behalf_of_user_id else user_id
 
    booking_date = payload.booking_date
    meal_type = payload.meal_type
    estimated_arrival = payload.estimated_arrival
    room_id = payload.room_id
 
    # ── Validation ──────────────────────────────────────────────────────
    if role not in ("admin", "staff"):
        if booking_date < date.today():
            raise HTTPException(status_code=400, detail="Cannot create bookings for past dates")
 
    if role != "admin":
        check_meal_window(cur, meal_type, estimated_arrival, booking_date)
 
    # ── Insert booking — use booking_owner_id not user_id ───────────────
    cur.execute("""
        INSERT INTO bookings (
            booking_member_id, room_id, booking_date, meal_type,
            estimated_arrival, notes, is_special_event, party_size
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, 0)
        RETURNING *
    """, (
        booking_owner_id, room_id, booking_date,     # <-- booking_owner_id here
        meal_type, estimated_arrival,
        payload.notes, payload.is_special_event
    ))
    booking = cur.fetchone()
    booking_id = booking["id"]

    # ── Insert member attendees ─────────────────────────────────────────
    attendees = []
    for member_id in payload.attendees.member_ids:
        # Validate member exists and belongs to this user's household (or admin)
        if role not in ("admin", "staff"):
            cur.execute(
                "SELECT id FROM members WHERE id = %s AND user_id = %s AND is_active = TRUE",
                (member_id, user_id)
            )
            if not cur.fetchone():
                raise HTTPException(
                    status_code=400,
                    detail=f"Member {member_id} not found in your household"
                )
        else:
            cur.execute(
                "SELECT id FROM members WHERE id = %s AND is_active = TRUE",
                (member_id,)
            )
            if not cur.fetchone():
                raise HTTPException(
                    status_code=400,
                    detail=f"Member {member_id} not found"
                )

        # Get member dietary flags for the attendee record
        cur.execute(
            "SELECT dietary_flags FROM members WHERE id = %s",
            (member_id,)
        )
        member_row = cur.fetchone()
        member_flags = member_row["dietary_flags"] if member_row else []

        cur.execute("""
            INSERT INTO booking_attendees (
                booking_id, linked_member_id, guest_first_name, guest_last_name,
                is_member_guest, dietary_flags, notes
            )
            VALUES (%s, %s, NULL, NULL, FALSE, %s::dietary_flag[], NULL)
            RETURNING id, booking_id, linked_member_id, guest_first_name,
                      guest_last_name, is_member_guest, dietary_flags, notes
        """, (booking_id, member_id, member_flags if isinstance(member_flags, list) else []))
        attendees.append(cur.fetchone())

    # ── Insert guest attendees ──────────────────────────────────────────
    for guest in payload.attendees.guests:
        cur.execute("""
            INSERT INTO booking_attendees (
                booking_id, linked_member_id, guest_first_name, guest_last_name,
                is_member_guest, dietary_flags, notes
            )
            VALUES (%s, %s, %s, %s, %s, %s::dietary_flag[], %s)
            RETURNING id, booking_id, linked_member_id, guest_first_name,
                      guest_last_name, is_member_guest, dietary_flags, notes
        """, (
            booking_id,
            guest.linked_member_id if hasattr(guest, 'linked_member_id') else None,
            guest.first_name, guest.last_name,
            guest.is_member_guest if hasattr(guest, 'is_member_guest') else False,
            guest.dietary_flags if hasattr(guest, 'dietary_flags') else [],
            guest.notes if hasattr(guest, 'notes') else None,
        ))
        attendees.append(cur.fetchone())

    # ── Update party size ───────────────────────────────────────────────
    update_party_size(cur, booking_id)

    # Re-fetch booking to get updated party_size
    cur.execute("SELECT * FROM bookings WHERE id = %s", (booking_id,))
    booking = cur.fetchone()

    # ── Optionally confirm ──────────────────────────────────────────────
    if payload.confirm_immediately:
        if len(attendees) < 1:
            raise HTTPException(
                status_code=400,
                detail="Cannot confirm a booking with no attendees"
            )
        if role != "admin":
            check_room_availability(cur, room_id, booking_date)
            check_organizer_conflict(cur, user_id, booking_date, meal_type)
            for att in attendees:
                if att["linked_member_id"]:
                    check_member_conflict(cur, att["linked_member_id"], booking_date, meal_type, exclude_booking_id=booking_id)

        cur.execute("""
            UPDATE bookings
            SET status = 'CONFIRMED', confirmed_at = NOW(), updated_at = NOW()
            WHERE id = %s RETURNING *
        """, (booking_id,))
        booking = cur.fetchone()

        write_audit(cur, 'booking', booking_id, 'BOOKING_CONFIRMED', user_id,
                    old_value={"status": "DRAFT"},
                    new_value={"status": "CONFIRMED"})
    else:
        write_audit(cur, 'booking', booking_id, 'BOOKING_CREATED', user_id,
                    new_value={"status": "DRAFT", "party_size": len(attendees)})

    # ── Build response ──────────────────────────────────────────────────
    allowed = get_allowed_actions(booking["status"], role)

    return {
        "booking": dict(booking),
        "attendees": [dict(a) for a in attendees],
        "allowed_actions": allowed,
    }