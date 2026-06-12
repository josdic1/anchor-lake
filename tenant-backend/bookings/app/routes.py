from fastapi import APIRouter, HTTPException, Depends
from .domain.audit import write_audit
from .domain.availability import (
    check_meal_window,
    check_room_availability,
    check_organizer_conflict,
    check_member_conflict,
    check_all_attendee_conflicts,
    check_household_conflicts,
    update_party_size,
)
from .domain.status_service import (
    VALID_TRANSITIONS,
    STATUS_AUDIT_MAP,
    STATUS_TIMESTAMP_MAP,
    get_allowed_actions,
    execute_transition,
)
from .domain.booking_service import create_full_booking
from .database import get_connection
from .auth import get_current_user, require_role
from .models import (
    BookingCreate, BookingUpdate, BookingResponse,
    BookingStatusUpdate, AttendeeCreate, AttendeeResponse,
    BookingCreateFull, BookingCommandResponse, AllowedAction
)
from datetime import date
from typing import Optional

router = APIRouter()


# =============================================================================
# HELPERS
# =============================================================================

def get_booking_or_404(cur, booking_id: int):
    cur.execute("SELECT * FROM bookings WHERE id = %s", (booking_id,))
    booking = cur.fetchone()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


def ensure_booking_access(booking: dict, current_user: dict):
    if current_user["role"] in ("admin", "staff"):
        return
    if booking["booking_member_id"] != int(current_user["sub"]):
        raise HTTPException(status_code=403, detail="Access denied")


def parse_pg_array(value) -> list:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    stripped = value.strip("{}")
    if not stripped:
        return []
    return [item.strip() for item in stripped.split(",")]


# =============================================================================
# BOOKINGS — CRUD
# =============================================================================

@router.post("/bookings", response_model=BookingResponse)
def create_booking(body: BookingCreate, current_user: dict = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        user_id = int(current_user["sub"])
        booking_member_id = user_id

        if current_user["role"] not in ("admin", "staff"):
            if body.booking_date < date.today():
                raise HTTPException(status_code=400, detail="Cannot create bookings for past dates")

        if current_user["role"] != "admin":
            check_meal_window(cur, body.meal_type, body.estimated_arrival, body.booking_date)

        cur.execute("""
            INSERT INTO bookings (
                booking_member_id, room_id, booking_date, meal_type,
                estimated_arrival, notes, is_special_event, party_size
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, 0)
            RETURNING *
        """, (
            booking_member_id, body.room_id, body.booking_date,
            body.meal_type, body.estimated_arrival,
            body.notes, body.is_special_event
        ))
        conn.commit()
        booking = cur.fetchone()

        write_audit(cur, 'booking', booking["id"], 'BOOKING_CREATED', user_id,
                    new_value={"status": "DRAFT", "party_size": 0})
        conn.commit()

        return booking
    finally:
        cur.close()
        conn.close()


@router.get("/bookings", response_model=list[BookingResponse])
def get_bookings(current_user: dict = Depends(require_role("admin", "staff"))):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM bookings ORDER BY booking_date DESC, estimated_arrival")
        return cur.fetchall()
    finally:
        cur.close()
        conn.close()


@router.get("/bookings/calendar")
def get_calendar(start: date, end: date, current_user: dict = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT b.*,
                   a.guest_first_name AS primary_first_name,
                   a.guest_last_name  AS primary_last_name
            FROM bookings b
            LEFT JOIN LATERAL (
                SELECT COALESCE(ba.guest_first_name, m.first_name) AS guest_first_name,
                       COALESCE(ba.guest_last_name,  m.last_name)  AS guest_last_name
                FROM booking_attendees ba
                LEFT JOIN members m ON m.id = ba.linked_member_id
                WHERE ba.booking_id = b.id
                ORDER BY ba.id
                LIMIT 1
            ) a ON true
            WHERE b.booking_date BETWEEN %s AND %s
            AND b.status IN ('CONFIRMED', 'SEATED', 'SERVICE', 'COMPLETED')
            ORDER BY b.booking_date, b.estimated_arrival
        """, (start, end))
        return [dict(row) for row in cur.fetchall()]
    finally:
        cur.close()
        conn.close()


@router.get("/bookings/drafts", response_model=list[BookingResponse])
def get_drafts(current_user: dict = Depends(require_role("admin", "staff"))):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT * FROM bookings WHERE status = 'DRAFT'
            ORDER BY booking_date, estimated_arrival
        """)
        return cur.fetchall()
    finally:
        cur.close()
        conn.close()


@router.get("/bookings/my", response_model=list[BookingResponse])
def get_my_bookings(current_user: dict = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT * FROM bookings
            WHERE booking_member_id = %s
            ORDER BY booking_date DESC
        """, (int(current_user["sub"]),))
        return cur.fetchall()
    finally:
        cur.close()
        conn.close()


@router.get("/bookings/{booking_id}", response_model=BookingResponse)
def get_booking(booking_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        booking = get_booking_or_404(cur, booking_id)
        ensure_booking_access(booking, current_user)
        return booking
    finally:
        cur.close()
        conn.close()


@router.patch("/bookings/{booking_id}", response_model=BookingResponse)
def update_booking(booking_id: int, body: BookingUpdate, current_user: dict = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        booking = get_booking_or_404(cur, booking_id)
        ensure_booking_access(booking, current_user)

        if current_user["role"] not in ("admin", "staff"):
            if booking["status"] != "DRAFT":
                raise HTTPException(status_code=400, detail="Members can only edit DRAFT bookings")

        fields = body.model_dump(exclude_none=True)
        if not fields:
            raise HTTPException(status_code=400, detail="No fields provided to update")

        check_date = fields.get("booking_date", booking["booking_date"])
        check_meal = fields.get("meal_type", booking["meal_type"])
        check_arrival = fields.get("estimated_arrival", booking["estimated_arrival"])
        if current_user["role"] != "admin":
            check_meal_window(cur, check_meal, check_arrival, check_date)

        set_clause = ", ".join(f"{k} = %s" for k in fields)
        values = list(fields.values()) + [booking_id]

        cur.execute(f"""
            UPDATE bookings SET {set_clause}, updated_at = NOW()
            WHERE id = %s RETURNING *
        """, values)
        conn.commit()

        updated = cur.fetchone()
        write_audit(cur, 'booking', booking_id, 'BOOKING_UPDATED',
                    int(current_user["sub"]),
                    old_value=dict(booking),
                    new_value=dict(updated))
        conn.commit()
        return updated
    finally:
        cur.close()
        conn.close()


# =============================================================================
# STATUS TRANSITIONS
# =============================================================================

@router.patch("/bookings/{booking_id}/status", response_model=BookingResponse)
def update_booking_status(booking_id: int, body: BookingStatusUpdate, current_user: dict = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        booking = get_booking_or_404(cur, booking_id)
        ensure_booking_access(booking, current_user)

        updated = execute_transition(
            cur, booking, body.status.value,
            int(current_user["sub"]), current_user["role"]
        )
        conn.commit()
        return updated
    finally:
        cur.close()
        conn.close()


@router.get("/meal-windows")
def get_meal_windows():
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT meal_type, start_time, end_time, last_order_time, available_days
            FROM meal_windows ORDER BY start_time
        """)
        rows = cur.fetchall()
        return [
            {
                "meal_type": row["meal_type"],
                "start_time": str(row["start_time"]),
                "end_time": str(row["end_time"]),
                "last_order_time": str(row["last_order_time"]),
                "available_days": row["available_days"],
            }
            for row in rows
        ]
    finally:
        cur.close()
        conn.close()


@router.patch("/meal-windows/{meal_type}")
def update_meal_window(meal_type: str, body: dict, current_user: dict = Depends(require_role("admin"))):
    conn = get_connection()
    cur = conn.cursor()
    try:
        allowed_fields = {"start_time", "end_time", "last_order_time", "available_days"}
        fields = {k: v for k, v in body.items() if k in allowed_fields}
        if not fields:
            raise HTTPException(status_code=400, detail="No valid fields provided")

        set_parts = []
        values = []
        for k, v in fields.items():
            if k == "available_days":
                set_parts.append("available_days = %s::int[]")
            else:
                set_parts.append(f"{k} = %s")
            values.append(v)

        set_clause = ", ".join(set_parts)
        values.append(meal_type.upper())

        cur.execute(f"""
            UPDATE meal_windows SET {set_clause}
            WHERE meal_type = %s RETURNING *
        """, values)
        conn.commit()

        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Meal window '{meal_type}' not found")

        return {
            "meal_type": row["meal_type"],
            "start_time": str(row["start_time"]),
            "end_time": str(row["end_time"]),
            "last_order_time": str(row["last_order_time"]),
            "available_days": row["available_days"],
        }
    finally:
        cur.close()
        conn.close()


# =============================================================================
# ATTENDEES
# =============================================================================

@router.get("/bookings/{booking_id}/attendees", response_model=list[AttendeeResponse])
def get_attendees(booking_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        booking = get_booking_or_404(cur, booking_id)
        ensure_booking_access(booking, current_user)

        cur.execute("""
            SELECT a.id, a.booking_id, a.linked_member_id,
                   COALESCE(a.guest_first_name, m.first_name) AS guest_first_name,
                   COALESCE(a.guest_last_name, m.last_name) AS guest_last_name,
                   a.is_member_guest, a.dietary_flags, a.dietary_other_note, a.notes
            FROM booking_attendees a
            LEFT JOIN members m ON m.id = a.linked_member_id
            WHERE a.booking_id = %s
            ORDER BY a.id
        """, (booking_id,))
        rows = cur.fetchall()
        return [
            {**dict(r), "dietary_flags": parse_pg_array(r["dietary_flags"])}
            for r in rows
        ]
    finally:
        cur.close()
        conn.close()


@router.post("/bookings/{booking_id}/attendees", response_model=AttendeeResponse)
def add_attendee(booking_id: int, body: AttendeeCreate, current_user: dict = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        booking = get_booking_or_404(cur, booking_id)
        ensure_booking_access(booking, current_user)

        if current_user["role"] not in ("admin", "staff"):
            if booking["status"] not in ("DRAFT",):
                raise HTTPException(status_code=400, detail="Can only add attendees to DRAFT bookings")

        if not body.linked_member_id and not (body.guest_first_name and body.guest_last_name):
            raise HTTPException(
                status_code=400,
                detail="Must provide either linked_member_id or guest first and last name"
            )

        if body.linked_member_id and current_user["role"] != "admin" and booking["status"] != "DRAFT":
            check_member_conflict(
                cur, body.linked_member_id, booking["booking_date"],
                booking["meal_type"], exclude_booking_id=booking_id
            )

        # If adding a linked member with no dietary flags, pull from members table
        dietary_flags = body.dietary_flags
        if body.linked_member_id and not dietary_flags:
            cur.execute(
                "SELECT dietary_flags FROM members WHERE id = %s",
                (body.linked_member_id,)
            )
            member = cur.fetchone()
            if member:
                dietary_flags = parse_pg_array(member["dietary_flags"])

        cur.execute("""
            INSERT INTO booking_attendees (
                booking_id, linked_member_id, guest_first_name, guest_last_name,
                is_member_guest, dietary_flags, dietary_other_note, notes
            )
            VALUES (%s, %s, %s, %s, %s, %s::dietary_flag[], %s, %s)
            RETURNING id, booking_id, linked_member_id, guest_first_name,
                      guest_last_name, is_member_guest, dietary_flags, dietary_other_note, notes
        """, (
            booking_id,
            body.linked_member_id,
            body.guest_first_name,
            body.guest_last_name,
            body.is_member_guest,
            dietary_flags,
            body.dietary_other_note,
            body.notes
        ))
        conn.commit()
        attendee = cur.fetchone()

        update_party_size(cur, booking_id)
        write_audit(cur, 'booking', booking_id, 'ATTENDEE_ADDED',
                    int(current_user["sub"]),
                    new_value={"attendee_id": attendee["id"]})
        conn.commit()

        return {**dict(attendee), "dietary_flags": parse_pg_array(attendee["dietary_flags"])}
    finally:
        cur.close()
        conn.close()


@router.delete("/bookings/{booking_id}/attendees/{attendee_id}")
def remove_attendee(booking_id: int, attendee_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        booking = get_booking_or_404(cur, booking_id)
        ensure_booking_access(booking, current_user)

        if current_user["role"] not in ("admin", "staff"):
            if booking["status"] != "DRAFT":
                raise HTTPException(status_code=400, detail="Can only remove attendees from DRAFT bookings")

        cur.execute(
            "DELETE FROM booking_attendees WHERE id = %s AND booking_id = %s RETURNING id",
            (attendee_id, booking_id)
        )
        conn.commit()
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Attendee not found")

        update_party_size(cur, booking_id)
        write_audit(cur, 'booking', booking_id, 'ATTENDEE_REMOVED',
                    int(current_user["sub"]),
                    new_value={"attendee_id": attendee_id})
        conn.commit()

        return {"message": "Attendee removed"}
    finally:
        cur.close()
        conn.close()


# =============================================================================
# NEW — ATOMIC BOOKING CREATION
# =============================================================================

@router.post("/bookings/commands/create")
def create_full_booking_route(body: BookingCreateFull, current_user: dict = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        result = create_full_booking(
            cur,
            int(current_user["sub"]),
            current_user["role"],
            body
        )
        conn.commit()
        return result
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


# =============================================================================
# NEW — EXPLICIT ACTION ENDPOINTS
# =============================================================================

@router.post("/bookings/{booking_id}/actions/{action}")
def execute_booking_action(booking_id: int, action: str, current_user: dict = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        booking = get_booking_or_404(cur, booking_id)
        ensure_booking_access(booking, current_user)

        action_to_status = {
            "confirm": "CONFIRMED",
            "revert-to-draft": "DRAFT",
            "seat": "SEATED",
            "start-service": "SERVICE",
            "complete": "COMPLETED",
            "cancel": "CANCELLED",
        }

        new_status = action_to_status.get(action)
        if not new_status:
            raise HTTPException(status_code=400, detail=f"Unknown action: {action}")

        updated = execute_transition(
            cur, booking, new_status,
            int(current_user["sub"]), current_user["role"]
        )
        conn.commit()

        allowed = get_allowed_actions(updated["status"], current_user["role"])

        return {
            **dict(updated),
            "allowed_actions": allowed,
        }
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


# =============================================================================
# NEW — GET BOOKING WITH ACTIONS
# =============================================================================

@router.get("/bookings/{booking_id}/full")
def get_booking_full(booking_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        booking = get_booking_or_404(cur, booking_id)
        ensure_booking_access(booking, current_user)

        cur.execute("""
            SELECT a.id, a.booking_id, a.linked_member_id,
                   COALESCE(a.guest_first_name, m.first_name) AS guest_first_name,
                   COALESCE(a.guest_last_name, m.last_name) AS guest_last_name,
                   a.is_member_guest, a.dietary_flags, a.dietary_other_note, a.notes
            FROM booking_attendees a
            LEFT JOIN members m ON m.id = a.linked_member_id
            WHERE a.booking_id = %s
            ORDER BY a.id
        """, (booking_id,))
        attendees = cur.fetchall()

        allowed = get_allowed_actions(booking["status"], current_user["role"])

        return {
            "booking": dict(booking),
            "attendees": [dict(a) for a in attendees],
            "allowed_actions": allowed,
        }
    finally:
        cur.close()
        conn.close()

# =============================================================================
# AUDIT LOG
# =============================================================================

@router.get("/audit-log")
def get_audit_log(current_user: dict = Depends(require_role("admin"))):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT id, entity_type, entity_id, action, old_value, new_value,
                   performed_by, performed_at, notes
            FROM audit_log
            ORDER BY performed_at DESC
            LIMIT 500
        """)
        return [dict(row) for row in cur.fetchall()]
    finally:
        cur.close()
        conn.close()