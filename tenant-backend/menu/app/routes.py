from fastapi import APIRouter, HTTPException, Depends
from .database import get_connection
from .auth import get_current_user, require_role
from .models import MenuItemCreate, MenuItemUpdate, MenuItemResponse
from .constants.menu_items import seed_menu

router = APIRouter()

MENU_SELECT = """
    SELECT id, name, description, category, price, is_starter,
           is_active, is_special, is_modifier, parent_item_id,
           dietary_flags, sort_order
    FROM menu_items
"""


# =============================================================================
# HELPERS
# =============================================================================

def normalize_menu_item(row) -> dict:
    """
    dietary_flags comes back as a raw Postgres array string or list.
    Normalize to Python list so Pydantic doesn't choke.
    """
    d = dict(row)
    flags = d.get("dietary_flags")
    if isinstance(flags, str):
        stripped = flags.strip("{}")
        d["dietary_flags"] = [f.strip() for f in stripped.split(",")] if stripped else []
    elif flags is None:
        d["dietary_flags"] = []
    return d


# =============================================================================
# MENU ITEMS
# =============================================================================

@router.get("/menu", response_model=list[MenuItemResponse])
def get_menu(current_user: dict = Depends(get_current_user)):
    """
    All menu items — flat list, ordered by category / sort_order / name.
    Frontend groups modifiers under their parents.
    """
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(f"{MENU_SELECT} ORDER BY category, sort_order, name")
        return [normalize_menu_item(row) for row in cur.fetchall()]
    finally:
        cur.close()
        conn.close()


@router.get("/menu/active", response_model=list[MenuItemResponse])
def get_active_menu(current_user: dict = Depends(get_current_user)):
    """Active items only — used by booking/order forms."""
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            f"{MENU_SELECT} WHERE is_active = TRUE ORDER BY category, sort_order, name"
        )
        return [normalize_menu_item(row) for row in cur.fetchall()]
    finally:
        cur.close()
        conn.close()


@router.get("/menu/starters", response_model=list[MenuItemResponse])
def get_starters(current_user: dict = Depends(get_current_user)):
    """Starters and drinks — pre-order in DRAFT/CONFIRMED bookings."""
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            f"{MENU_SELECT} WHERE is_starter = TRUE AND is_active = TRUE ORDER BY category, sort_order, name"
        )
        return [normalize_menu_item(row) for row in cur.fetchall()]
    finally:
        cur.close()
        conn.close()


@router.get("/menu/{item_id}", response_model=MenuItemResponse)
def get_menu_item(item_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(f"{MENU_SELECT} WHERE id = %s", (item_id,))
        item = cur.fetchone()
        if not item:
            raise HTTPException(status_code=404, detail="Menu item not found")
        return normalize_menu_item(item)
    finally:
        cur.close()
        conn.close()


@router.get("/menu/{item_id}/modifiers", response_model=list[MenuItemResponse])
def get_modifiers(item_id: int, current_user: dict = Depends(get_current_user)):
    """
    All active modifiers for a given parent item.
    Use when building an order form for a specific item.
    """
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            f"{MENU_SELECT} WHERE parent_item_id = %s AND is_active = TRUE ORDER BY sort_order, name",
            (item_id,)
        )
        return [normalize_menu_item(row) for row in cur.fetchall()]
    finally:
        cur.close()
        conn.close()


@router.post("/menu", response_model=MenuItemResponse)
def create_menu_item(body: MenuItemCreate, current_user: dict = Depends(require_role("admin", "staff"))):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO menu_items (
                name, description, category, price,
                is_starter, is_special, is_modifier, parent_item_id,
                dietary_flags, sort_order
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::dietary_flag[], %s)
            RETURNING id, name, description, category, price, is_starter,
                      is_active, is_special, is_modifier, parent_item_id,
                      dietary_flags, sort_order
        """, (
            body.name, body.description, body.category.value,
            body.price, body.is_starter, body.is_special,
            body.is_modifier, body.parent_item_id,
            body.dietary_flags, body.sort_order
        ))
        conn.commit()
        return normalize_menu_item(cur.fetchone())
    finally:
        cur.close()
        conn.close()


@router.patch("/menu/{item_id}", response_model=MenuItemResponse)
def update_menu_item(item_id: int, body: MenuItemUpdate, current_user: dict = Depends(require_role("admin", "staff"))):
    conn = get_connection()
    cur = conn.cursor()
    try:
        fields = body.model_dump(exclude_none=True)
        if not fields:
            raise HTTPException(status_code=400, detail="No fields provided to update")

        set_parts = []
        values = []
        for k, v in fields.items():
            if k == "dietary_flags":
                set_parts.append("dietary_flags = %s::dietary_flag[]")
            elif k == "category":
                set_parts.append("category = %s")
                v = v.value if hasattr(v, "value") else v
            else:
                set_parts.append(f"{k} = %s")
            values.append(v)

        values.append(item_id)
        set_clause = ", ".join(set_parts)

        cur.execute(f"""
            UPDATE menu_items SET {set_clause}, updated_at = NOW()
            WHERE id = %s
            RETURNING id, name, description, category, price, is_starter,
                      is_active, is_special, is_modifier, parent_item_id,
                      dietary_flags, sort_order
        """, values)
        conn.commit()

        item = cur.fetchone()
        if not item:
            raise HTTPException(status_code=404, detail="Menu item not found")
        return normalize_menu_item(item)
    finally:
        cur.close()
        conn.close()


@router.delete("/menu/{item_id}")
def deactivate_menu_item(item_id: int, current_user: dict = Depends(require_role("admin", "staff"))):
    """Never hard delete menu items — deactivate only."""
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "UPDATE menu_items SET is_active = FALSE, updated_at = NOW() WHERE id = %s RETURNING id",
            (item_id,)
        )
        conn.commit()
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Menu item not found")
        return {"message": "Menu item deactivated"}
    finally:
        cur.close()
        conn.close()


@router.post("/menu/seed")
def seed_menu_items(current_user: dict = Depends(require_role("admin"))):
    """
    Seed the menu with default items. Admin only.
    Safe to call once on a clean DB — will error if items already exist.
    """
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT COUNT(*) as count FROM menu_items")
        count = cur.fetchone()["count"]
        if count > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Menu already has {count} items. Clear menu_items table first."
            )
 
        seed_menu(cur)
        conn.commit()
 
        cur.execute("SELECT COUNT(*) as count FROM menu_items")
        final_count = cur.fetchone()["count"]
        return {"message": f"Menu seeded successfully", "items_created": final_count}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Seed failed: {str(e)}")
    finally:
        cur.close()
        conn.close()