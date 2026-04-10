from fastapi import APIRouter, HTTPException, Depends, Response
from .database import get_connection
from .auth import get_current_user, require_role
from .models import (
    OrderCreate, OrderResponse, OrderItemCreate,
    OrderItemUpdate, OrderItemResponse, KitchenStatusUpdate
)
from .reports import generate_order_receipt_pdf
from typing import Optional
import json

router = APIRouter()

# =============================================================================
# HELPERS
# =============================================================================

def get_order_or_404(cur, order_id: int):
    cur.execute("SELECT * FROM orders WHERE id = %s", (order_id,))
    order = cur.fetchone()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


def write_audit(cur, entity_type: str, entity_id: int, action: str, performed_by: int, old_value=None, new_value=None, notes=None):
    cur.execute("""
        INSERT INTO audit_log (entity_type, entity_id, action, old_value, new_value, performed_by, notes)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """, (
        entity_type, entity_id, action,
        json.dumps(old_value) if old_value else None,
        json.dumps(new_value) if new_value else None,
        performed_by, notes
    ))

# =============================================================================
# PRINTING
# =============================================================================

@router.get("/orders/{order_id}/print")
def print_order_pdf(order_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        order = get_order_or_404(cur, order_id)
        cur.execute("""
            SELECT menu_item_id, quantity, unit_price, special_instructions
            FROM order_items WHERE order_id = %s
        """, (order_id,))
        items = cur.fetchall()
        pdf_buffer = generate_order_receipt_pdf(order, items)
        return Response(
            content=pdf_buffer.getvalue(),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=order_{order_id}.pdf"}
        )
    finally:
        cur.close()
        conn.close()

# =============================================================================
# ORDERS
# =============================================================================

@router.post("/orders", response_model=OrderResponse)
def create_order(body: OrderCreate, current_user: dict = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id, status FROM bookings WHERE id = %s", (body.booking_id,))
        booking = cur.fetchone()
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")

        if booking["status"] not in ("DRAFT", "CONFIRMED", "SEATED", "SERVICE"):
            raise HTTPException(status_code=400, detail="Cannot add orders to a completed or cancelled booking")

        cur.execute("""
            INSERT INTO orders (booking_id, created_by, notes)
            VALUES (%s, %s, %s)
            RETURNING id, booking_id, created_by, kitchen_status, fired_at, print_triggered, notes
        """, (body.booking_id, int(current_user["sub"]), body.notes))
        order = cur.fetchone()

        write_audit(cur, 'order', order["id"], 'ORDER_CREATED', int(current_user["sub"]),
                    new_value={"booking_id": body.booking_id})
        conn.commit()
        return order
    finally:
        cur.close()
        conn.close()


@router.get("/orders/booking/{booking_id}", response_model=list[OrderResponse])
def get_orders_for_booking(booking_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT id, booking_id, created_by, kitchen_status, fired_at, print_triggered, notes
            FROM orders WHERE booking_id = %s
            ORDER BY created_at
        """, (booking_id,))
        return cur.fetchall()
    finally:
        cur.close()
        conn.close()


@router.get("/orders/{order_id}", response_model=OrderResponse)
def get_order(order_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        return get_order_or_404(cur, order_id)
    finally:
        cur.close()
        conn.close()


@router.patch("/orders/{order_id}/fire", response_model=OrderResponse)
def fire_order(order_id: int, current_user: dict = Depends(require_role("admin", "staff"))):
    conn = get_connection()
    cur = conn.cursor()
    try:
        order = get_order_or_404(cur, order_id)
        if order["fired_at"] is not None:
            raise HTTPException(status_code=400, detail="Order has already been fired")

        cur.execute("SELECT COUNT(*) as count FROM order_items WHERE order_id = %s", (order_id,))
        if cur.fetchone()["count"] == 0:
            raise HTTPException(status_code=400, detail="Cannot fire an empty order — add items first")

        cur.execute("""
            UPDATE orders
            SET kitchen_status = 'IN_KITCHEN', fired_at = NOW(),
                print_triggered = TRUE, updated_at = NOW()
            WHERE id = %s
            RETURNING id, booking_id, created_by, kitchen_status, fired_at, print_triggered, notes
        """, (order_id,))
        updated = cur.fetchone()

        write_audit(cur, 'order', order_id, 'ORDER_FIRED', int(current_user["sub"]),
                    old_value={"kitchen_status": "INCOMING"},
                    new_value={"kitchen_status": "IN_KITCHEN", "fired_at": str(updated["fired_at"])})
        conn.commit()
        return updated
    finally:
        cur.close()
        conn.close()


@router.patch("/orders/{order_id}/kitchen-status", response_model=OrderResponse)
def update_kitchen_status(order_id: int, body: KitchenStatusUpdate, current_user: dict = Depends(require_role("admin", "staff"))):
    conn = get_connection()
    cur = conn.cursor()
    try:
        order = get_order_or_404(cur, order_id)
        old_status = order["kitchen_status"]

        cur.execute("""
            UPDATE orders SET kitchen_status = %s, updated_at = NOW()
            WHERE id = %s
            RETURNING id, booking_id, created_by, kitchen_status, fired_at, print_triggered, notes
        """, (body.kitchen_status.value, order_id))
        updated = cur.fetchone()

        write_audit(cur, 'order', order_id, 'ORDER_KITCHEN_STATUS_CHANGE',
                    int(current_user["sub"]),
                    old_value={"kitchen_status": old_status},
                    new_value={"kitchen_status": body.kitchen_status.value})
        conn.commit()
        return updated
    finally:
        cur.close()
        conn.close()


# =============================================================================
# KITCHEN BOARD — filtered by booking_date = today
# =============================================================================

@router.get("/kitchen/incoming", response_model=list[OrderResponse])
def kitchen_incoming(current_user: dict = Depends(require_role("admin", "staff"))):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT o.id, o.booking_id, o.created_by, o.kitchen_status,
                   o.fired_at, o.print_triggered, o.notes
            FROM orders o
            JOIN bookings b ON b.id = o.booking_id
            WHERE o.kitchen_status = 'INCOMING'
              AND b.booking_date = CURRENT_DATE
            ORDER BY o.created_at
        """)
        return cur.fetchall()
    finally:
        cur.close()
        conn.close()


@router.get("/kitchen/in-kitchen", response_model=list[OrderResponse])
def kitchen_in_kitchen(current_user: dict = Depends(require_role("admin", "staff"))):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT o.id, o.booking_id, o.created_by, o.kitchen_status,
                   o.fired_at, o.print_triggered, o.notes
            FROM orders o
            JOIN bookings b ON b.id = o.booking_id
            WHERE o.kitchen_status = 'IN_KITCHEN'
              AND b.booking_date = CURRENT_DATE
            ORDER BY o.fired_at
        """)
        return cur.fetchall()
    finally:
        cur.close()
        conn.close()


@router.get("/kitchen/ready", response_model=list[OrderResponse])
def kitchen_ready(current_user: dict = Depends(require_role("admin", "staff"))):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT o.id, o.booking_id, o.created_by, o.kitchen_status,
                   o.fired_at, o.print_triggered, o.notes
            FROM orders o
            JOIN bookings b ON b.id = o.booking_id
            WHERE o.kitchen_status = 'READY'
              AND b.booking_date = CURRENT_DATE
            ORDER BY o.fired_at
        """)
        return cur.fetchall()
    finally:
        cur.close()
        conn.close()


# =============================================================================
# ORDER ITEMS
# =============================================================================

@router.get("/orders/{order_id}/items", response_model=list[OrderItemResponse])
def get_order_items(order_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        get_order_or_404(cur, order_id)
        cur.execute("""
            SELECT id, order_id, menu_item_id, quantity, unit_price, special_instructions, modifier_ids
            FROM order_items WHERE order_id = %s
            ORDER BY id
        """, (order_id,))
        return cur.fetchall()
    finally:
        cur.close()
        conn.close()


@router.post("/orders/{order_id}/items", response_model=OrderItemResponse)
def add_order_item(order_id: int, body: OrderItemCreate, current_user: dict = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        order = get_order_or_404(cur, order_id)
        if order["fired_at"] is not None and current_user["role"] not in ("admin", "staff"):
            raise HTTPException(status_code=403, detail="Order has been fired — only staff can add items")

        cur.execute("""
            INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, special_instructions, modifier_ids)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id, order_id, menu_item_id, quantity, unit_price, special_instructions, modifier_ids
        """, (order_id, body.menu_item_id, body.quantity, body.unit_price, body.special_instructions, body.modifier_ids))
        conn.commit()
        return cur.fetchone()
    finally:
        cur.close()
        conn.close()


@router.patch("/orders/{order_id}/items/{item_id}", response_model=OrderItemResponse)
def update_order_item(order_id: int, item_id: int, body: OrderItemUpdate, current_user: dict = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        order = get_order_or_404(cur, order_id)
        if order["fired_at"] is not None and current_user["role"] not in ("admin", "staff"):
            raise HTTPException(status_code=403, detail="Order has been fired — only staff can edit items")

        fields = body.model_dump(exclude_none=True)
        if not fields:
            raise HTTPException(status_code=400)

        set_clause = ", ".join(f"{k} = %s" for k in fields)
        values = list(fields.values()) + [item_id, order_id]

        cur.execute(f"UPDATE order_items SET {set_clause} WHERE id = %s AND order_id = %s RETURNING *", values)
        conn.commit()
        item = cur.fetchone()
        if not item:
            raise HTTPException(status_code=404)
        return item
    finally:
        cur.close()
        conn.close()


@router.delete("/orders/{order_id}/items/{item_id}")
def remove_order_item(order_id: int, item_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        order = get_order_or_404(cur, order_id)
        if order["fired_at"] is not None and current_user["role"] not in ("admin", "staff"):
            raise HTTPException(status_code=403)

        cur.execute("DELETE FROM order_items WHERE id = %s AND order_id = %s RETURNING id", (item_id, order_id))
        conn.commit()
        if not cur.fetchone():
            raise HTTPException(status_code=404)
        return {"message": "Item removed"}
    finally:
        cur.close()
        conn.close()