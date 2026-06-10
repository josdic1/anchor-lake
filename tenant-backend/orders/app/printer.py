import socket
import os
from datetime import datetime

PRINTER_HOST = os.getenv("PRINTER_HOST", "")
PRINTER_PORT = int(os.getenv("PRINTER_PORT", 9100))

# ESC/POS commands
ESC = b'\x1b'
GS = b'\x1d'
INIT = ESC + b'@'
BOLD_ON = ESC + b'E\x01'
BOLD_OFF = ESC + b'E\x00'
ALIGN_CENTER = ESC + b'a\x01'
ALIGN_LEFT = ESC + b'a\x00'
DOUBLE_HEIGHT = GS + b'!\x10'
NORMAL_SIZE = GS + b'!\x00'
CUT = GS + b'V\x41\x03'
FEED = ESC + b'd\x03'

def _encode(text: str) -> bytes:
    return text.encode('ascii', errors='replace')

def print_kitchen_chit(order: dict, items: list, booking: dict, attendees: list, room_name: str):
    if not PRINTER_HOST:
        print("[printer] PRINTER_HOST not set, skipping print")
        return

    dietary_parts = []
    for a in attendees:
        for flag in (a.get("dietary_flags") or []):
            if flag == "OTHER":
                note = a.get("dietary_other_note")
                dietary_parts.append(note if note else "OTHER")
            else:
                dietary_parts.append(flag.replace("_", " "))
    dietary_str = " | ".join(dict.fromkeys(dietary_parts))

    buf = bytearray()
    buf += INIT
    buf += ALIGN_CENTER
    buf += DOUBLE_HEIGHT + BOLD_ON
    buf += _encode(f"ORDER #{order['id']}\n")
    buf += NORMAL_SIZE + BOLD_OFF
    buf += _encode(f"{room_name}  |  Party: {booking.get('party_size', '?')}\n")
    buf += _encode(f"Booking #{booking['id']}  |  {booking.get('booking_date', '')}\n")
    buf += _encode(f"Arrival: {str(booking.get('estimated_arrival', ''))[:5]}\n")
    buf += ALIGN_LEFT
    buf += _encode("-" * 32 + "\n")

    if dietary_str:
        buf += BOLD_ON
        buf += _encode(f"!! DIETARY: {dietary_str}\n")
        buf += BOLD_OFF
        buf += _encode("-" * 32 + "\n")

    buf += BOLD_ON
    for item in items:
        name = item.get("menu_item_name") or f"Item #{item['menu_item_id']}"
        buf += _encode(f"{item['quantity']}x {name}\n")
        if item.get("special_instructions"):
            buf += BOLD_OFF
            buf += _encode(f"   * {item['special_instructions']}\n")
            buf += BOLD_ON
    buf += BOLD_OFF

    if order.get("notes"):
        buf += _encode(f"\nNotes: {order['notes']}\n")

    buf += _encode(f"\nFired: {datetime.now().strftime('%H:%M')}\n")
    buf += FEED
    buf += CUT

    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(5)
            s.connect((PRINTER_HOST, PRINTER_PORT))
            s.sendall(bytes(buf))
        print(f"[printer] Chit printed for order #{order['id']}")
    except Exception as e:
        print(f"[printer] Print failed: {e}")