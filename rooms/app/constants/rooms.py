# rooms/app/constants/rooms.py
# Default demo rooms seeded for every new tenant.
# Client renames/adjusts these in Admin after onboarding.

ROOMS = [
    {
        "name": "Main Dining Room",
        "capacity": 50,
        "one_booking_max": False,
        "dines_only": True,
    },
    {
        "name": "Private Dining Room",
        "capacity": 20,
        "one_booking_max": True,
        "dines_only": True,
    },
    {
        "name": "Patio",
        "capacity": 30,
        "one_booking_max": False,
        "dines_only": False,
    },
    {
        "name": "Bar Area",
        "capacity": 15,
        "one_booking_max": False,
        "dines_only": False,
    },
]


def seed_rooms(cur) -> dict:
    """
    Insert default rooms. Safe to run once — raises if rooms already exist.
    Returns summary: {"rooms_created": N}
    """
    cur.execute("SELECT COUNT(*) as count FROM rooms")
    count = cur.fetchone()["count"]
    if count > 0:
        raise ValueError(f"Rooms table already has {count} rows. Clear first.")

    for room in ROOMS:
        cur.execute("""
            INSERT INTO rooms (name, capacity, one_booking_max, dines_only)
            VALUES (%s, %s, %s, %s)
        """, (
            room["name"],
            room["capacity"],
            room["one_booking_max"],
            room["dines_only"],
        ))

    return {"rooms_created": len(ROOMS)}