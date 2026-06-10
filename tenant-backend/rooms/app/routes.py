from fastapi import APIRouter, HTTPException, Depends
from .database import get_connection
from .auth import get_current_user, require_role
from .models import RoomResponse, RoomUpdate, RoomBlockCreate, RoomBlockResponse
from .constants.rooms import seed_rooms
from datetime import date
from typing import Optional

router = APIRouter()


# =============================================================================
# ROOMS
# =============================================================================

@router.get("/rooms", response_model=list[RoomResponse])
def get_rooms(current_user: dict = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT id, name, capacity, one_booking_max, dines_only, is_active, notes
            FROM rooms
            ORDER BY name
        """)
        return cur.fetchall()
    finally:
        cur.close()
        conn.close()


@router.get("/rooms/available")
def get_available_rooms(
    booking_date: date,
    meal_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    conn = get_connection()
    cur = conn.cursor()
    try:
        if meal_type == "AFTERHOURS":
            dines_clause = ""
        else:
            dines_clause = ""

        cur.execute(f"""
            SELECT
                r.id,
                r.name,
                r.capacity,
                r.one_booking_max,
                r.dines_only,
                r.is_active,
                r.notes,
                COALESCE(SUM(b.party_size), 0) AS confirmed_party_size
            FROM rooms r
            LEFT JOIN bookings b ON b.room_id = r.id
                AND b.booking_date = %s
                AND b.status IN ('CONFIRMED', 'SEATED', 'SERVICE')
                AND (%s IS NULL OR b.meal_type = %s)
            WHERE r.is_active = TRUE
            AND r.id NOT IN (
                SELECT room_id FROM room_blocks WHERE blocked_date = %s
            )
            AND r.id NOT IN (
                SELECT b2.room_id FROM bookings b2
                JOIN rooms r2 ON r2.id = b2.room_id
                WHERE r2.one_booking_max = TRUE
                AND b2.booking_date = %s
                AND b2.status IN ('CONFIRMED', 'SEATED', 'SERVICE')
            )
            {dines_clause}
            GROUP BY r.id, r.name, r.capacity, r.one_booking_max, r.dines_only, r.is_active, r.notes
            ORDER BY r.name
        """, (booking_date, meal_type, meal_type, booking_date, booking_date))

        rows = cur.fetchall()
        result = []
        for row in rows:
            d = dict(row)
            confirmed = int(d.pop("confirmed_party_size", 0))
            remaining = d["capacity"] - confirmed
            d["spots_remaining"] = max(remaining, 0)
            d["confirmed_party_size"] = confirmed
            result.append(d)
        return result
    finally:
        cur.close()
        conn.close()


@router.get("/rooms/{room_id}", response_model=RoomResponse)
def get_room(room_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT id, name, capacity, one_booking_max, dines_only, is_active, notes
            FROM rooms WHERE id = %s
        """, (room_id,))
        room = cur.fetchone()
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        return room
    finally:
        cur.close()
        conn.close()


@router.post("/rooms", response_model=RoomResponse)
def create_room(body: RoomUpdate, current_user: dict = Depends(require_role("admin"))):
    conn = get_connection()
    cur = conn.cursor()
    try:
        fields = body.model_dump(exclude_none=True)
        if not fields:
            raise HTTPException(status_code=400, detail="No fields provided")

        cols = ", ".join(fields.keys())
        placeholders = ", ".join("%s" for _ in fields)
        values = list(fields.values())

        cur.execute(f"""
            INSERT INTO rooms ({cols})
            VALUES ({placeholders})
            RETURNING id, name, capacity, one_booking_max, dines_only, is_active, notes
        """, values)
        conn.commit()
        return cur.fetchone()
    finally:
        cur.close()
        conn.close()


@router.patch("/rooms/{room_id}", response_model=RoomResponse)
def update_room(room_id: int, body: RoomUpdate, current_user: dict = Depends(require_role("admin"))):
    conn = get_connection()
    cur = conn.cursor()
    try:
        fields = body.model_dump(exclude_none=True)
        if not fields:
            raise HTTPException(status_code=400, detail="No fields provided to update")

        set_clause = ", ".join(f"{k} = %s" for k in fields)
        values = list(fields.values()) + [room_id]

        cur.execute(f"""
            UPDATE rooms SET {set_clause}, updated_at = NOW()
            WHERE id = %s
            RETURNING id, name, capacity, one_booking_max, dines_only, is_active, notes
        """, values)
        conn.commit()

        room = cur.fetchone()
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        return room
    finally:
        cur.close()
        conn.close()


# =============================================================================
# SEED
# =============================================================================

@router.post("/rooms/seed")
def seed_default_rooms(current_user: dict = Depends(require_role("admin"))):
    conn = get_connection()
    cur = conn.cursor()
    try:
        result = seed_rooms(cur)
        conn.commit()
        return {"message": "Rooms seeded successfully", **result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Seed failed: {str(e)}")
    finally:
        cur.close()
        conn.close()


# =============================================================================
# ROOM BLOCKS — ADMIN ONLY
# =============================================================================

@router.get("/rooms/{room_id}/blocks", response_model=list[RoomBlockResponse])
def get_room_blocks(room_id: int, current_user: dict = Depends(require_role("admin", "staff"))):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT id, room_id, blocked_date, reason, created_by
            FROM room_blocks
            WHERE room_id = %s
            ORDER BY blocked_date
        """, (room_id,))
        return cur.fetchall()
    finally:
        cur.close()
        conn.close()


@router.post("/blocks", response_model=RoomBlockResponse)
def create_room_block(body: RoomBlockCreate, current_user: dict = Depends(require_role("admin"))):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO room_blocks (room_id, blocked_date, reason, created_by)
            VALUES (%s, %s, %s, %s)
            RETURNING id, room_id, blocked_date, reason, created_by
        """, (body.room_id, body.blocked_date, body.reason, int(current_user["sub"])))
        conn.commit()
        return cur.fetchone()
    except Exception as e:
        conn.rollback()
        if "unique" in str(e).lower():
            raise HTTPException(status_code=400, detail="Room already blocked on that date")
        raise
    finally:
        cur.close()
        conn.close()


@router.delete("/blocks/{block_id}")
def delete_room_block(block_id: int, current_user: dict = Depends(require_role("admin"))):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "DELETE FROM room_blocks WHERE id = %s RETURNING id",
            (block_id,)
        )
        conn.commit()
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Block not found")
        return {"message": "Block removed"}
    finally:
        cur.close()
        conn.close()