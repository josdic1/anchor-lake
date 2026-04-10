from fastapi import HTTPException
from .audit import write_audit
from .availability import (
    check_room_availability,
    check_organizer_conflict,
    check_all_attendee_conflicts,
    check_household_conflicts,
)


VALID_TRANSITIONS = {
    'DRAFT':     ['CONFIRMED', 'CANCELLED'],
    'CONFIRMED': ['DRAFT', 'SEATED', 'CANCELLED'],
    'SEATED':    ['SERVICE', 'CANCELLED'],
    'SERVICE':   ['COMPLETED'],
    'COMPLETED': [],
    'CANCELLED': [],
}

STATUS_AUDIT_MAP = {
    'CONFIRMED': 'BOOKING_CONFIRMED',
    'DRAFT':     'BOOKING_REVERTED_TO_DRAFT',
    'SEATED':    'BOOKING_SEATED',
    'SERVICE':   'BOOKING_SERVICE_STARTED',
    'COMPLETED': 'BOOKING_COMPLETED',
    'CANCELLED': 'BOOKING_CANCELLED',
}

STATUS_TIMESTAMP_MAP = {
    'CONFIRMED': 'confirmed_at',
    'SEATED':    'seated_at',
    'SERVICE':   'service_at',
    'COMPLETED': 'completed_at',
    'CANCELLED': 'cancelled_at',
}

# Action definitions: what the frontend can render
ACTION_DEFS = {
    'CONFIRMED': {'label': 'Confirm Booking', 'confirm': False, 'variant': 'primary'},
    'DRAFT':     {'label': 'Revert to Draft', 'confirm': False, 'variant': 'ghost'},
    'SEATED':    {'label': 'Seat Party',      'confirm': False, 'variant': 'primary'},
    'SERVICE':   {'label': 'Start Service',   'confirm': False, 'variant': 'primary'},
    'COMPLETED': {'label': 'Complete',         'confirm': False, 'variant': 'primary'},
    'CANCELLED': {'label': 'Cancel Booking',   'confirm': True,  'variant': 'danger'},
}


def get_allowed_actions(status: str, role: str) -> list:
    """
    Returns the actions the current user can take on a booking in this status.
    This is THE source of truth for what buttons the frontend renders.
    """
    valid_next = VALID_TRANSITIONS.get(status, [])
    actions = []

    for next_status in valid_next:
        # Role-based filtering
        if next_status == 'COMPLETED' and role != 'admin':
            continue
        if next_status == 'SEATED' and role == 'member':
            continue
        if next_status == 'SERVICE' and role == 'member':
            continue

        defn = ACTION_DEFS.get(next_status, {})
        actions.append({
            'action': next_status,
            'label': defn.get('label', next_status),
            'confirm': defn.get('confirm', False),
            'variant': defn.get('variant', 'ghost'),
        })

    return actions


def execute_transition(cur, booking: dict, new_status: str, user_id: int, role: str):
    """
    Validates and executes a status transition. Returns updated booking dict.
    All validation, timestamp, audit in one place.
    """
    current_status = booking["status"]
    booking_id = booking["id"]

    if new_status not in VALID_TRANSITIONS.get(current_status, []):
        raise HTTPException(
            status_code=422,
            detail=f"Cannot transition from {current_status} to {new_status}"
        )

    if new_status == "COMPLETED" and role != "admin":
        raise HTTPException(status_code=403, detail="Only admin can mark a booking completed")

    if new_status == "CONFIRMED":
        cur.execute(
            "SELECT COUNT(*) as count FROM booking_attendees WHERE booking_id = %s",
            (booking_id,)
        )
        if cur.fetchone()["count"] < 1:
            raise HTTPException(
                status_code=400,
                detail="A booking must have at least one attendee before it can be confirmed"
            )

        if role != "admin":
            check_room_availability(
                cur, booking["room_id"], booking["booking_date"],
                exclude_booking_id=booking_id
            )
            check_organizer_conflict(
                cur, booking["booking_member_id"], booking["booking_date"],
                booking["meal_type"], exclude_booking_id=booking_id
            )
            check_all_attendee_conflicts(
                cur, booking_id, booking["booking_date"], booking["meal_type"]
            )
            check_household_conflicts(
                cur, booking["booking_member_id"], booking_id,
                booking["booking_date"], booking["meal_type"]
            )

    # Execute the status change
    timestamp_col = STATUS_TIMESTAMP_MAP.get(new_status)
    if timestamp_col:
        cur.execute(f"""
            UPDATE bookings
            SET status = %s, {timestamp_col} = NOW(), updated_at = NOW()
            WHERE id = %s RETURNING *
        """, (new_status, booking_id))
    else:
        cur.execute("""
            UPDATE bookings SET status = %s, updated_at = NOW()
            WHERE id = %s RETURNING *
        """, (new_status, booking_id))

    updated = cur.fetchone()

    # Audit
    audit_action = STATUS_AUDIT_MAP.get(new_status, 'BOOKING_UPDATED')
    write_audit(cur, 'booking', booking_id, audit_action, user_id,
                old_value={"status": current_status},
                new_value={"status": new_status})

    return updated