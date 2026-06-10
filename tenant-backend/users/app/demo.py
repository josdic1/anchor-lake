from fastapi import APIRouter, HTTPException, Depends
from .database import get_connection
from .auth import hash_password, require_role
from datetime import date, datetime, timedelta
import random

router = APIRouter()

# =============================================================================
# DEMO DATA CONSTANTS
# =============================================================================

DEMO_ADMIN = {
    "first_name": "Admin",
    "last_name": "User",
    "email": "admin@demo.com",
    "password": "111111",
    "role": "admin",
}

DEMO_STAFF = [
    {"first_name": "Sarah", "last_name": "Chen", "email": "sarah@demo.com", "role": "staff"},
    {"first_name": "Marcus", "last_name": "Webb", "email": "marcus@demo.com", "role": "staff"},
]

DEMO_HOUSEHOLDS = [
    [
        {"first_name": "James", "last_name": "Hartwell", "relation": "PRIMARY", "dietary_flags": []},
        {"first_name": "Claire", "last_name": "Hartwell", "relation": "SPOUSE", "dietary_flags": ["GLUTEN_FREE"]},
        {"first_name": "Oliver", "last_name": "Hartwell", "relation": "CHILD", "dietary_flags": ["PEANUT_ALLERGY"]},
    ],
    [
        {"first_name": "Diana", "last_name": "Ashford", "relation": "PRIMARY", "dietary_flags": ["VEGETARIAN"]},
        {"first_name": "Tom", "last_name": "Ashford", "relation": "SPOUSE", "dietary_flags": []},
        {"first_name": "Lily", "last_name": "Ashford", "relation": "CHILD", "dietary_flags": ["DAIRY_FREE"]},
        {"first_name": "Jack", "last_name": "Ashford", "relation": "CHILD", "dietary_flags": []},
    ],
    [
        {"first_name": "Robert", "last_name": "Finley", "relation": "PRIMARY", "dietary_flags": []},
        {"first_name": "Susan", "last_name": "Finley", "relation": "SPOUSE", "dietary_flags": ["SHELLFISH_ALLERGY"]},
    ],
    [
        {"first_name": "Patricia", "last_name": "Monroe", "relation": "PRIMARY", "dietary_flags": ["KOSHER"]},
        {"first_name": "Gerald", "last_name": "Monroe", "relation": "SPOUSE", "dietary_flags": ["KOSHER"]},
        {"first_name": "Emma", "last_name": "Monroe", "relation": "CHILD", "dietary_flags": []},
    ],
    [
        {"first_name": "Victor", "last_name": "Reyes", "relation": "PRIMARY", "dietary_flags": []},
        {"first_name": "Lucia", "last_name": "Reyes", "relation": "SPOUSE", "dietary_flags": ["VEGAN"]},
        {"first_name": "Marco", "last_name": "Reyes", "relation": "CHILD", "dietary_flags": ["NUT_ALLERGY"]},
    ],
    [
        {"first_name": "Catherine", "last_name": "Blake", "relation": "PRIMARY", "dietary_flags": ["HALAL"]},
        {"first_name": "William", "last_name": "Blake", "relation": "SPOUSE", "dietary_flags": ["HALAL"]},
    ],
    [
        {"first_name": "Henry", "last_name": "Drummond", "relation": "PRIMARY", "dietary_flags": []},
        {"first_name": "Anne", "last_name": "Drummond", "relation": "SPOUSE", "dietary_flags": ["VEGETARIAN"]},
        {"first_name": "George", "last_name": "Drummond", "relation": "CHILD", "dietary_flags": []},
        {"first_name": "Rose", "last_name": "Drummond", "relation": "CHILD", "dietary_flags": ["EGG_FREE"]},
    ],
    [
        {"first_name": "Margaret", "last_name": "Sinclair", "relation": "PRIMARY", "dietary_flags": ["GLUTEN_FREE"]},
        {"first_name": "Edward", "last_name": "Sinclair", "relation": "SPOUSE", "dietary_flags": []},
    ],
]

DEMO_ROOMS = [
    {"name": "Main Dining Room", "capacity": 50, "one_booking_max": False, "dines_only": True},
    {"name": "Private Dining Room", "capacity": 20, "one_booking_max": True, "dines_only": True},
    {"name": "Patio", "capacity": 30, "one_booking_max": False, "dines_only": False},
    {"name": "Bar Area", "capacity": 15, "one_booking_max": False, "dines_only": False},
]

DEMO_MEAL_WINDOWS = [
    {"meal_type": "LUNCH", "start_time": "11:30", "end_time": "14:30", "last_order_time": "14:00", "available_days": [1,2,3,4,5,6,7]},
    {"meal_type": "DINNER", "start_time": "17:30", "end_time": "22:00", "last_order_time": "21:30", "available_days": [1,2,3,4,5,6,7]},
    {"meal_type": "AFTERHOURS", "start_time": "09:00", "end_time": "22:00", "last_order_time": "22:00", "available_days": [1,2,3,4,5,6,7]},
    {"meal_type": "SPECIAL_EVENT", "start_time": "09:00", "end_time": "22:00", "last_order_time": "22:00", "available_days": [1,2,3,4,5,6,7]},
]

DEMO_MENU = [
    {"name": "Cheese Board", "description": "Artisan selection with accompaniments", "price": 24.00, "category": "STARTER", "is_starter": True, "dietary_flags": ["VEGETARIAN"], "sort_order": 1},
    {"name": "Burrata", "description": "Tomato confit, olive oil, crostini", "price": 19.00, "category": "STARTER", "is_starter": True, "dietary_flags": ["VEGETARIAN", "GLUTEN_FREE"], "sort_order": 2},
    {"name": "Caesar Salad", "description": "Romaine, parmesan, house dressing", "price": 16.00, "category": "STARTER", "is_starter": True, "dietary_flags": [], "sort_order": 3},
    {"name": "Grilled Salmon", "description": "Fresh Atlantic salmon, choice of side", "price": 32.00, "category": "MAIN", "is_starter": False, "dietary_flags": ["GLUTEN_FREE", "FISH_ALLERGY"], "sort_order": 1},
    {"name": "Grilled Chicken", "description": "Free range breast, choice of side", "price": 26.00, "category": "MAIN", "is_starter": False, "dietary_flags": ["GLUTEN_FREE"], "sort_order": 2},
    {"name": "Angus Burger", "description": "8oz patty, Martin's roll, fries", "price": 21.00, "category": "MAIN", "is_starter": False, "dietary_flags": [], "sort_order": 3},
    {"name": "Veggie Bowl", "description": "Seasonal vegetables, grains, tahini", "price": 20.00, "category": "MAIN", "is_starter": False, "dietary_flags": ["VEGAN", "GLUTEN_FREE"], "sort_order": 4},
    {"name": "NY Strip Steak", "description": "12oz, mushroom haricot verts, baked potato", "price": 52.00, "category": "SPECIAL", "is_special": True, "is_starter": False, "dietary_flags": ["GLUTEN_FREE"], "sort_order": 1},
    {"name": "Garden Salad", "description": "Mixed greens, choice of dressing", "price": 10.00, "category": "SIDE", "dietary_flags": ["VEGAN", "GLUTEN_FREE"], "sort_order": 1},
    {"name": "Fries", "description": "Crispy, sea salt", "price": 7.00, "category": "SIDE", "dietary_flags": ["VEGAN", "GLUTEN_FREE"], "sort_order": 2},
    {"name": "Baked Potato", "description": "Sour cream, chives", "price": 6.00, "category": "SIDE", "dietary_flags": ["VEGETARIAN", "GLUTEN_FREE"], "sort_order": 3},
    {"name": "Chocolate Lava Cake", "description": "Warm, vanilla ice cream", "price": 11.00, "category": "DESSERT", "dietary_flags": ["VEGETARIAN"], "sort_order": 1},
    {"name": "Cheesecake", "description": "New York style, berry compote", "price": 9.00, "category": "DESSERT", "dietary_flags": ["VEGETARIAN"], "sort_order": 2},
    {"name": "Soft Drink", "description": "Coke, Diet Coke, Sprite, Lemonade", "price": 4.00, "category": "DRINK", "dietary_flags": ["VEGAN", "GLUTEN_FREE"], "sort_order": 1},
    {"name": "Sparkling Water", "description": "", "price": 4.00, "category": "DRINK", "dietary_flags": ["VEGAN", "GLUTEN_FREE"], "sort_order": 2},
    {"name": "Iced Tea", "description": "Sweet or unsweet", "price": 4.00, "category": "DRINK", "dietary_flags": ["VEGAN", "GLUTEN_FREE"], "sort_order": 3},
]


# =============================================================================
# HELPERS
# =============================================================================

def wipe_all(cur):
    cur.execute("DELETE FROM audit_log")
    cur.execute("DELETE FROM order_items")
    cur.execute("DELETE FROM orders")
    cur.execute("DELETE FROM booking_attendees")
    cur.execute("DELETE FROM bookings")
    cur.execute("DELETE FROM meal_windows")
    cur.execute("DELETE FROM room_blocks")
    cur.execute("DELETE FROM rooms")
    cur.execute("DELETE FROM menu_items")
    cur.execute("DELETE FROM members")
    cur.execute("DELETE FROM users")
    for table in ["users", "members", "rooms", "meal_windows", "menu_items",
                  "bookings", "booking_attendees", "orders", "order_items", "audit_log"]:
        cur.execute(f"ALTER SEQUENCE {table}_id_seq RESTART WITH 1")


def seed_admin_user(cur, hashed_pw):
    cur.execute("""
        INSERT INTO users (first_name, last_name, email, hashed_password, role, force_password_change)
        VALUES (%s, %s, %s, %s, 'admin', FALSE)
        RETURNING id
    """, (DEMO_ADMIN["first_name"], DEMO_ADMIN["last_name"],
          DEMO_ADMIN["email"], hashed_pw))
    return cur.fetchone()["id"]


def seed_base_data(cur, hashed_pw):
    admin_id = seed_admin_user(cur, hashed_pw)

    for room in DEMO_ROOMS:
        cur.execute("""
            INSERT INTO rooms (name, capacity, one_booking_max, dines_only)
            VALUES (%s, %s, %s, %s)
        """, (room["name"], room["capacity"], room["one_booking_max"], room["dines_only"]))

    for w in DEMO_MEAL_WINDOWS:
        cur.execute("""
            INSERT INTO meal_windows (meal_type, start_time, end_time, last_order_time, available_days)
            VALUES (%s, %s, %s, %s, %s)
        """, (w["meal_type"], w["start_time"], w["end_time"], w["last_order_time"], w["available_days"]))

    for item in DEMO_MENU:
        cur.execute("""
            INSERT INTO menu_items (name, description, price, category, is_starter,
                is_special, is_modifier, is_active, dietary_flags, sort_order)
            VALUES (%s, %s, %s, %s, %s, %s, FALSE, TRUE, %s::dietary_flag[], %s)
        """, (
            item["name"], item.get("description", ""), item["price"], item["category"],
            item.get("is_starter", False), item.get("is_special", False),
            item.get("dietary_flags", []), item.get("sort_order", 0),
        ))

    return admin_id


def seed_sample_data(cur, hashed_pw, admin_id):
    staff_ids = []
    for s in DEMO_STAFF:
        cur.execute("""
            INSERT INTO users (first_name, last_name, email, hashed_password, role, force_password_change)
            VALUES (%s, %s, %s, %s, %s, FALSE)
            RETURNING id
        """, (s["first_name"], s["last_name"], s["email"], hashed_pw, s["role"]))
        staff_ids.append(cur.fetchone()["id"])

    member_user_ids = []
    all_member_ids = []

    for idx, household in enumerate(DEMO_HOUSEHOLDS):
        primary = next(m for m in household if m["relation"] == "PRIMARY")
        email = f"{primary['first_name'].lower()}.{primary['last_name'].lower()}@demo.com"
        member_number = f"M{str(idx + 1).zfill(4)}"

        cur.execute("""
            INSERT INTO users (first_name, last_name, email, hashed_password, role, member_number, force_password_change)
            VALUES (%s, %s, %s, %s, 'member', %s, FALSE)
            RETURNING id
        """, (primary["first_name"], primary["last_name"], email, hashed_pw, member_number))
        user_id = cur.fetchone()["id"]
        member_user_ids.append(user_id)

        household_member_ids = []
        for member in household:
            flags = [f.upper() for f in member["dietary_flags"]]
            cur.execute("""
                INSERT INTO members (user_id, first_name, last_name, relation, dietary_flags)
                VALUES (%s, %s, %s, %s, %s::dietary_flag[])
                RETURNING id
            """, (user_id, member["first_name"], member["last_name"], member["relation"], flags))
            household_member_ids.append(cur.fetchone()["id"])
        all_member_ids.append((user_id, household_member_ids))

    cur.execute("SELECT id, capacity FROM rooms WHERE is_active = TRUE")
    rooms = cur.fetchall()

    cur.execute("SELECT id, price FROM menu_items WHERE is_active = TRUE AND is_modifier = FALSE")
    menu_items = cur.fetchall()

    if not rooms or not menu_items:
        return {"staff_created": len(staff_ids), "households_created": len(member_user_ids), "bookings_created": 0}

    today = date.today()
    start_date = today - timedelta(days=60)
    booking_count = 0
    current_date = start_date

    # Guarantee today has a full spread of statuses across all rooms
    TODAY_SCENARIOS = [
        {"meal_type": "LUNCH", "status": "CONFIRMED", "arrival": "12:00"},
        {"meal_type": "LUNCH", "status": "SEATED", "arrival": "12:00", "kitchen_status": "INCOMING"},
        {"meal_type": "LUNCH", "status": "SERVICE", "arrival": "12:00", "kitchen_status": "IN_KITCHEN"},
        {"meal_type": "LUNCH", "status": "SERVICE", "arrival": "12:30", "kitchen_status": "READY"},
        {"meal_type": "DINNER", "status": "CONFIRMED", "arrival": "18:30"},
        {"meal_type": "DINNER", "status": "CONFIRMED", "arrival": "19:00"},
        {"meal_type": "DINNER", "status": "SEATED", "arrival": "18:30", "kitchen_status": "IN_KITCHEN"},
        {"meal_type": "DINNER", "status": "SERVICE", "arrival": "18:00", "kitchen_status": "READY"},
    ]

    end_date = today + timedelta(days=7)
    while current_date <= end_date:
        used_rooms_lunch: set = set()
        used_rooms_dinner: set = set()
        used_members: set = set()

        if current_date == today:
            scenarios = TODAY_SCENARIOS[:]
            random.shuffle(scenarios)
            available_rooms_lunch = [r for r in rooms]
            available_rooms_dinner = [r for r in rooms]

            for scenario in scenarios:
                meal_type = scenario["meal_type"]
                used_rooms = used_rooms_lunch if meal_type == "LUNCH" else used_rooms_dinner
                available_rooms = [r for r in (available_rooms_lunch if meal_type == "LUNCH" else available_rooms_dinner) if r["id"] not in used_rooms]
                if not available_rooms:
                    continue

                available_users = [(uid, mids) for uid, mids in all_member_ids if uid not in used_members]
                if not available_users:
                    continue

                room = random.choice(available_rooms)
                used_rooms.add(room["id"])
                user_id, household_member_ids = random.choice(available_users)
                used_members.add(user_id)

                status = scenario["status"]
                arrival = scenario["arrival"]
                now = datetime.combine(today, datetime.strptime(arrival, "%H:%M").time())

                cur.execute("""
                    INSERT INTO bookings (
                        booking_member_id, room_id, booking_date, meal_type,
                        estimated_arrival, status, party_size, is_special_event,
                        confirmed_at, seated_at, service_at, completed_at
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, FALSE, %s, %s, %s, %s)
                    RETURNING id
                """, (
                    user_id, room["id"], current_date, meal_type,
                    arrival, status, len(household_member_ids),
                    now,
                    now if status in ("SEATED", "SERVICE") else None,
                    now if status == "SERVICE" else None,
                    None,
                ))
                booking_id = cur.fetchone()["id"]
                booking_count += 1

                for member_id in household_member_ids:
                    cur.execute("""
                        INSERT INTO booking_attendees (booking_id, linked_member_id, is_member_guest, dietary_flags)
                        VALUES (%s, %s, FALSE, '{}')
                    """, (booking_id, member_id))

                if status in ("SEATED", "SERVICE") and "kitchen_status" in scenario:
                    created_by = random.choice(staff_ids) if staff_ids else admin_id
                    kitchen_status = scenario["kitchen_status"]
                    fired_at = now if status == "SERVICE" else None

                    cur.execute("""
                        INSERT INTO orders (booking_id, created_by, kitchen_status, fired_at, print_triggered)
                        VALUES (%s, %s, %s, %s, %s)
                        RETURNING id
                    """, (booking_id, created_by, kitchen_status, fired_at, fired_at is not None))
                    order_id = cur.fetchone()["id"]

                    selected_items = random.sample(menu_items, min(random.randint(2, 4), len(menu_items)))
                    for item in selected_items:
                        cur.execute("""
                            INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, modifier_ids)
                            VALUES (%s, %s, %s, %s, '{}')
                        """, (order_id, item["id"], random.randint(1, 2), item["price"]))

        else:
            daily_count = random.randint(2, 5)
            for _ in range(daily_count):
                meal_type = random.choice(["LUNCH", "DINNER"])
                used_rooms = used_rooms_lunch if meal_type == "LUNCH" else used_rooms_dinner

                available_rooms = [r for r in rooms if r["id"] not in used_rooms]
                if not available_rooms:
                    continue

                room = random.choice(available_rooms)
                used_rooms.add(room["id"])

                available_users = [(uid, mids) for uid, mids in all_member_ids if uid not in used_members]
                if not available_users:
                    continue

                user_id, household_member_ids = random.choice(available_users)
                used_members.add(user_id)

                arrival = "12:00" if meal_type == "LUNCH" else "18:30"
                status = "COMPLETED" if current_date < today else "CONFIRMED"

                cur.execute("""
                    INSERT INTO bookings (
                        booking_member_id, room_id, booking_date, meal_type,
                        estimated_arrival, status, party_size, is_special_event,
                        confirmed_at, seated_at, service_at, completed_at
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, FALSE, %s, %s, %s, %s)
                    RETURNING id
                """, (
                    user_id, room["id"], current_date, meal_type,
                    arrival, status, len(household_member_ids),
                    datetime.combine(current_date, datetime.strptime("10:00", "%H:%M").time()),
                    datetime.combine(current_date, datetime.strptime(arrival, "%H:%M").time()) if status == "COMPLETED" else None,
                    datetime.combine(current_date, datetime.strptime(arrival, "%H:%M").time()) if status == "COMPLETED" else None,
                    datetime.combine(current_date, datetime.strptime("21:00", "%H:%M").time()) if status == "COMPLETED" else None,
                ))
                booking_id = cur.fetchone()["id"]
                booking_count += 1

                for member_id in household_member_ids:
                    cur.execute("""
                        INSERT INTO booking_attendees (booking_id, linked_member_id, is_member_guest, dietary_flags)
                        VALUES (%s, %s, FALSE, '{}')
                    """, (booking_id, member_id))

                if status == "COMPLETED":
                    created_by = random.choice(staff_ids) if staff_ids else admin_id
                    fired_at = datetime.combine(current_date, datetime.strptime(arrival, "%H:%M").time())

                    cur.execute("""
                        INSERT INTO orders (booking_id, created_by, kitchen_status, fired_at, print_triggered)
                        VALUES (%s, %s, 'SERVED', %s, TRUE)
                        RETURNING id
                    """, (booking_id, created_by, fired_at))
                    order_id = cur.fetchone()["id"]

                    selected_items = random.sample(menu_items, min(random.randint(2, 4), len(menu_items)))
                    for item in selected_items:
                        cur.execute("""
                            INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, modifier_ids)
                            VALUES (%s, %s, %s, %s, '{}')
                        """, (order_id, item["id"], random.randint(1, 2), item["price"]))

        current_date += timedelta(days=1)

    return {
        "staff_created": len(staff_ids),
        "households_created": len(member_user_ids),
        "bookings_created": booking_count,
    }


# =============================================================================
# ROUTES
# =============================================================================

@router.get("/demo/needs-setup")
def needs_setup():
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT COUNT(*) as count FROM users")
        count = cur.fetchone()["count"]
        return {"needs_setup": count == 0}
    finally:
        cur.close()
        conn.close()


@router.post("/demo/reset-fresh")
def reset_fresh():
    conn = get_connection()
    cur = conn.cursor()
    try:
        wipe_all(cur)
        hashed_pw = hash_password("111111")
        seed_base_data(cur, hashed_pw)
        conn.commit()
        return {"message": "Reset complete.", "admin_email": "admin@demo.com"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


@router.post("/demo/reset-sample")
def reset_sample():
    conn = get_connection()
    cur = conn.cursor()
    try:
        wipe_all(cur)
        hashed_pw = hash_password("111111")
        admin_id = seed_base_data(cur, hashed_pw)
        result = seed_sample_data(cur, hashed_pw, admin_id)
        conn.commit()
        return {
            "message": "Sample data loaded.",
            "admin_email": "admin@demo.com",
            **(result or {}),
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


@router.get("/demo/users")
def get_demo_users():
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT id, first_name, last_name, email, role
            FROM users
            WHERE is_active = TRUE
            ORDER BY role DESC, last_name
        """)
        return cur.fetchall()
    finally:
        cur.close()
        conn.close()


@router.post("/demo/reset-app")
def reset_app():
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM audit_log")
        cur.execute("DELETE FROM order_items")
        cur.execute("DELETE FROM orders")
        cur.execute("DELETE FROM booking_attendees")
        cur.execute("DELETE FROM bookings")
        cur.execute("DELETE FROM members")
        cur.execute("DELETE FROM users WHERE role != 'admin'")
        for table in ["members", "bookings", "booking_attendees", "orders", "order_items", "audit_log"]:
            cur.execute(f"ALTER SEQUENCE {table}_id_seq RESTART WITH 1")
        conn.commit()
        return {"message": "App reset. Admin user and base config preserved."}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()