from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from io import BytesIO

def generate_order_receipt_pdf(order, items):
    """
    Draws the PDF for a specific order.
    """
    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)
    w, h = A4

    p.setFont("Helvetica-Bold", 16)
    p.drawString(50, h - 50, f"ORDER RECEIPT #{order['id']}")
    
    p.setFont("Helvetica", 11)
    p.drawString(50, h - 70, f"Booking ID: {order['booking_id']}")
    p.drawString(50, h - 85, f"Kitchen Status: {order['kitchen_status']}")
    
    p.line(50, h - 100, w - 50, h - 100)
    p.drawString(50, h - 115, "Item ID")
    p.drawString(150, h - 115, "Qty")
    p.drawString(200, h - 115, "Price")
    p.line(50, h - 120, w - 50, h - 120)

    y = h - 140
    for item in items:
        p.drawString(50, y, str(item['menu_item_id']))
        p.drawString(150, y, str(item['quantity']))
        p.drawString(200, y, f"${item['unit_price']}")
        y -= 20
        if y < 50:
            p.showPage()
            y = h - 50

    p.showPage()
    p.save()
    buffer.seek(0)
    return buffer