from datetime import date
from typing import Optional
from fastapi import HTTPException


def check_meal_window(cur, meal_type: str, estimated_arrival, booking_date: date):
    cur.execute("SELECT * FROM meal_windows WHERE meal_type = %s", (meal_type,))
    window = cur.fetchone()
    if not window:
        raise HTTPException(status_code=400, detail="Invalid meal type")

    dow = booking_date.isoweekday()
    if dow not in window["available_days"]:
        raise HTTPException(
            status_code=400,
            detail=f"{meal_type} is not available on that day"
        )

    if not (window["start_time"] <= estimated_arrival <= window["end_time"]):
        raise HTTPException(
            status_code=400,
            detail=f"Arrival time must be between {window['start_time']} and {window['end_time']} for {meal_type}"
        )


def check_room_availability(cur, room_id: int, booking_date: date, exclude_booking_id: Optional[int] = None):
    cur.execute(
        "SELECT id FROM room_blocks WHERE room_id = %s AND blocked_date = %s",
        (room_id, booking_date)
    )
    if cur.fetchone():
        raise HTTPException(status_code=400, detail="Room is blocked on this date")

    cur.execute("SELECT capacity, one_booking_max FROM rooms WHERE id = %s AND is_active = TRUE", (room_id,))
    room = cur.fetchone()
    if not room:
        raise HTTPException(status_code=400, detail="Room not found or inactive")

    if room["one_booking_max"]:
        query = """
            SELECT id FROM bookings
            WHERE room_id = %s AND booking_date = %s
            AND status IN ('CONFIRMED', 'SEATED', 'SERVICE')
        """
        params = [room_id, booking_date]
        if exclude_booking_id:
            query += " AND id != %s"
            params.append(exclude_booking_id)
        cur.execute(query, params)
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Room is already booked on this date")


def check_organizer_conflict(cur, user_id: int, booking_date: date, meal_type: str, exclude_booking_id: Optional[int] = None):
    query = """
        SELECT id FROM bookings
        WHERE booking_member_id = %s
        AND booking_date = %s
        AND meal_type = %s
        AND status IN ('CONFIRMED', 'SEATED', 'SERVICE')
    """
    params = [user_id, booking_date, meal_type]
    if exclude_booking_id:
        query += " AND id != %s"
        params.append(exclude_booking_id)
    cur.execute(query, params)
    if cur.fetchone():
        raise HTTPException(
            status_code=400,
            detail="You already have a confirmed booking for this meal type on this date"
        )


def check_member_conflict(cur, member_id: int, booking_date: date, meal_type: str, exclude_booking_id: Optional[int] = None):
    query = """
        SELECT b.id FROM bookings b
        JOIN booking_attendees ba ON ba.booking_id = b.id
        WHERE ba.linked_member_id = %s
        AND b.booking_date = %s
        AND b.meal_type = %s
        AND b.status IN ('CONFIRMED', 'SEATED', 'SERVICE')
    """
    params = [member_id, booking_date, meal_type]
    if exclude_booking_id:
        query += " AND b.id != %s"
        params.append(exclude_booking_id)
    cur.execute(query, params)
    if cur.fetchone():
        raise HTTPException(
            status_code=400,
            detail="This member is already attending another booking for this meal type on this date"
        )


def check_all_attendee_conflicts(cur, booking_id: int, booking_date: date, meal_type: str):
    cur.execute(
        "SELECT linked_member_id FROM booking_attendees WHERE booking_id = %s AND linked_member_id IS NOT NULL",
        (booking_id,)
    )
    member_ids = [row["linked_member_id"] for row in cur.fetchall()]
    for member_id in member_ids:
        check_member_conflict(cur, member_id, booking_date, meal_type, exclude_booking_id=booking_id)


def check_household_conflicts(cur, organizer_user_id: int, booking_id: int, booking_date: date, meal_type: str):
    cur.execute(
        "SELECT id FROM members WHERE user_id = %s AND is_active = TRUE",
        (organizer_user_id,)
    )
    member_ids = [row["id"] for row in cur.fetchall()]
    for member_id in member_ids:
        check_member_conflict(cur, member_id, booking_date, meal_type, exclude_booking_id=booking_id)


def update_party_size(cur, booking_id: int):
    cur.execute(
        "SELECT COUNT(*) as count FROM booking_attendees WHERE booking_id = %s",
        (booking_id,)
    )
    count = cur.fetchone()["count"]
    cur.execute("UPDATE bookings SET party_size = %s WHERE id = %s", (count, booking_id))