from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from io import BytesIO

def generate_daily_schedule_pdf(target_date, bookings):
    """
    Generates a PDF daily schedule using ReportLab.
    """
    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    # Header
    p.setFont("Helvetica-Bold", 18)
    p.drawString(50, height - 50, f"Daily Schedule: {target_date}")
    
    # Column Headers
    p.setFont("Helvetica-Bold", 11)
    p.drawString(50, height - 80, "Time")
    p.drawString(100, height - 80, "Member")
    p.drawString(180, height - 80, "Room")
    p.drawString(280, height - 80, "Meal")
    p.drawString(350, height - 80, "Size")
    p.drawString(420, height - 80, "Status")
    p.line(50, height - 85, width - 50, height - 85)

    # Table Body
    p.setFont("Helvetica", 10)
    y = height - 105
    for b in bookings:
        # Each 'b' is a dictionary from your fetchall()
        p.drawString(50, y, str(b['estimated_arrival']))
        p.drawString(100, y, f"#{b['booking_member_id']}")
        p.drawString(180, y, f"Room {b['room_id']}")
        p.drawString(280, y, b['meal_type'])
        p.drawString(350, y, str(b['party_size']))
        p.drawString(420, y, b['status'])
        
        y -= 20
        # Page break if we reach the bottom
        if y < 50:
            p.showPage()
            y = height - 50

    p.showPage()
    p.save()
    buffer.seek(0)
    return buffer