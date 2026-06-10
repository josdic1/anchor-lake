import { useEffect, useState } from "react";
import {
  FileText,
  Download,
  Printer,
  Calendar,
  ChefHat,
  BarChart3,
  Table,
} from "lucide-react";
import { getAllBookings, getAttendees } from "../api/bookings";
import { getOrdersByBooking, getOrderItems } from "../api/orders";
import { getMenuItems } from "../api/menu";
import { roomsApi } from "../api/client";
import { useRole } from "../hooks/useRole";
import { useTenant } from "../hooks/useTenant";
import type { Booking, Attendee, Room } from "../types/booking";
import type { MenuItem } from "../api/menu";
import type { Order, OrderItem } from "../api/orders";
import Papa from "papaparse";
import jsPDF from "jspdf";

// ─── Types ───────────────────────────────────────────────────────────────────

type ReportTab =
  | "daily"
  | "kitchen"
  | "eod"
  | "covers"
  | "attendance"
  | "dietary"
  | "custom";

interface EnrichedBooking {
  booking: Booking;
  attendees: Attendee[];
  orders: Order[];
  orderItems: Record<number, OrderItem[]>;
  room: Room | undefined;
}

const MEAL_LABELS: Record<string, string> = {
  LUNCH: "Lunch",
  DINNER: "Dinner",
  AFTERHOURS: "After Hours",
  SPECIAL_EVENT: "Special Event",
};

const today = new Date().toISOString().slice(0, 10);

// ─── PDF Helpers ──────────────────────────────────────────────────────────────

function pdfHeader(
  doc: jsPDF,
  tenantName: string,
  title: string,
  subtitle?: string,
) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(tenantName, 20, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(title, 20, 30);
  if (subtitle) {
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(subtitle, 20, 38);
    doc.setTextColor(0, 0, 0);
  }
  doc.setDrawColor(200, 200, 200);
  doc.line(20, subtitle ? 43 : 35, 190, subtitle ? 43 : 35);
  return subtitle ? 50 : 42;
}

function pdfRow(
  doc: jsPDF,
  y: number,
  cols: string[],
  widths: number[],
  x = 20,
) {
  let cx = x;
  cols.forEach((col, i) => {
    doc.text(col, cx, y);
    cx += widths[i];
  });
  return y + 7;
}

function checkPage(doc: jsPDF, y: number, margin = 270): number {
  if (y > margin) {
    doc.addPage();
    return 25;
  }
  return y;
}

// ─── CSV Helper ───────────────────────────────────────────────────────────────

function downloadCSV(filename: string, data: Record<string, unknown>[]) {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadPDF(doc: jsPDF, filename: string) {
  doc.save(filename);
}

function getMemberName(attendees: Attendee[]): string {
  if (!attendees.length) return "—";
  const first =
    attendees.find((a) => a.linked_member_id !== null) ?? attendees[0];
  return (
    `${first.guest_first_name ?? ""} ${first.guest_last_name ?? ""}`.trim() ||
    "—"
  );
}

function getAttendeeNames(attendees: Attendee[]): string {
  return attendees
    .map(
      (a) =>
        `${a.guest_first_name ?? ""} ${a.guest_last_name ?? ""}`.trim() ||
        `Member #${a.linked_member_id}`,
    )
    .filter(Boolean)
    .join("; ");
}

function getMemberNames(attendees: Attendee[]): string {
  return attendees
    .filter((a) => a.linked_member_id !== null && !a.is_member_guest)
    .map(
      (a) =>
        `${a.guest_first_name ?? ""} ${a.guest_last_name ?? ""}`.trim() ||
        `Member #${a.linked_member_id}`,
    )
    .filter(Boolean)
    .join("; ");
}

function getGuestNames(attendees: Attendee[]): string {
  return attendees
    .filter((a) => a.linked_member_id === null || a.is_member_guest)
    .map(
      (a) =>
        `${a.guest_first_name ?? ""} ${a.guest_last_name ?? ""}`.trim() ||
        "Guest",
    )
    .filter(Boolean)
    .join("; ");
}

function getDietaryStr(attendees: Attendee[]): string {
  const dietary = [...new Set(attendees.flatMap((a) => a.dietary_flags))];
  const otherNotes = attendees
    .filter((a) => a.dietary_flags.includes("OTHER") && a.dietary_other_note)
    .map((a) => a.dietary_other_note!)
    .join(", ");
  return dietary
    .map((f) =>
      f === "OTHER" && otherNotes ? otherNotes : f.replace(/_/g, " "),
    )
    .join("; ");
}

function getItemsOrdered(
  e: EnrichedBooking,
  menuMap: Record<number, string>,
): string {
  return e.orders
    .flatMap((o) => e.orderItems[o.id] ?? [])
    .map(
      (i) =>
        `${i.quantity}x ${menuMap[i.menu_item_id] ?? `Item #${i.menu_item_id}`}`,
    )
    .join("; ");
}

// ─── Report Generators ────────────────────────────────────────────────────────

function generateDailyRunSheet(
  enriched: EnrichedBooking[],
  date: string,
  tenantName: string,
) {
  const doc = new jsPDF();
  let y = pdfHeader(
    doc,
    tenantName,
    "Daily Run Sheet",
    `Service Date: ${date} · Generated ${new Date().toLocaleTimeString()}`,
  );

  const bookings = enriched
    .filter(
      (e) =>
        e.booking.booking_date === date && e.booking.status !== "CANCELLED",
    )
    .sort((a, b) =>
      a.booking.estimated_arrival.localeCompare(b.booking.estimated_arrival),
    );

  if (bookings.length === 0) {
    doc.setFontSize(10);
    doc.text("No bookings for this date.", 20, y);
    return downloadPDF(doc, `daily-run-sheet-${date}.pdf`);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setFillColor(245, 245, 245);
  doc.rect(20, y - 5, 170, 8, "F");
  y = pdfRow(
    doc,
    y,
    ["TIME", "MEMBER", "ROOM", "PARTY", "MEAL", "STATUS"],
    [22, 40, 35, 18, 30, 25],
  );
  doc.setFont("helvetica", "normal");
  doc.setDrawColor(220, 220, 220);
  doc.line(20, y - 2, 190, y - 2);

  bookings.forEach((e) => {
    y = checkPage(doc, y);
    const b = e.booking;
    const dietary = [...new Set(e.attendees.flatMap((a) => a.dietary_flags))];
    doc.setFontSize(9);
    y = pdfRow(
      doc,
      y,
      [
        b.estimated_arrival.slice(0, 5),
        getMemberName(e.attendees).slice(0, 18),
        (e.room?.name ?? `Room ${b.room_id}`).slice(0, 16),
        String(b.party_size),
        MEAL_LABELS[b.meal_type] ?? b.meal_type,
        b.status,
      ],
      [22, 40, 35, 18, 30, 25],
    );

    if (b.notes || dietary.length > 0) {
      doc.setFontSize(7.5);
      doc.setTextColor(100, 100, 100);
      if (b.notes) {
        doc.text(`  Notes: ${b.notes}`, 20, y);
        y += 5;
      }
      if (dietary.length) {
        const otherNotes = e.attendees
          .filter(
            (a) => a.dietary_flags.includes("OTHER") && a.dietary_other_note,
          )
          .map((a) => a.dietary_other_note!)
          .join(", ");
        const dietaryLabel = dietary
          .map((f) =>
            f === "OTHER" && otherNotes ? otherNotes : f.replace(/_/g, " "),
          )
          .join(", ");
        doc.text(`  Dietary: ${dietaryLabel}`, 20, y);
        y += 5;
      }
      doc.setTextColor(0, 0, 0);
    }
    doc.setDrawColor(235, 235, 235);
    doc.line(20, y - 2, 190, y - 2);
  });

  y = checkPage(doc, y + 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`Total Bookings: ${bookings.length}`, 20, y);
  y += 6;
  doc.text(
    `Total Covers: ${bookings.reduce((acc, e) => acc + e.booking.party_size, 0)}`,
    20,
    y,
  );
  downloadPDF(doc, `daily-run-sheet-${date}.pdf`);
}

function generateKitchenChits(
  enriched: EnrichedBooking[],
  menuMap: Record<number, string>,
  date: string,
  tenantName: string,
) {
  const doc = new jsPDF();
  let first = true;

  const bookingsWithOrders = enriched.filter(
    (e) =>
      e.booking.booking_date === date &&
      e.orders.length > 0 &&
      e.booking.status !== "CANCELLED",
  );

  if (bookingsWithOrders.length === 0) {
    pdfHeader(doc, tenantName, "Kitchen Chits", `No orders for ${date}`);
    return downloadPDF(doc, `kitchen-chits-${date}.pdf`);
  }

  bookingsWithOrders.forEach((e) => {
    e.orders.forEach((order) => {
      const items = e.orderItems[order.id] ?? [];
      if (!first) doc.addPage();
      first = false;

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1);
      doc.rect(10, 10, 190, 12);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(`ORDER #${order.id}`, 15, 19);
      doc.setFontSize(10);
      doc.text(e.room?.name ?? `Room ${e.booking.room_id}`, 100, 19);
      doc.text(`Party: ${e.booking.party_size}`, 155, 19);
      doc.setLineWidth(0.5);

      let y = 30;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Member: ${getMemberName(e.attendees)}`, 15, y);
      y += 6;
      doc.text(
        `Arrival: ${e.booking.estimated_arrival.slice(0, 5)}  ·  ${MEAL_LABELS[e.booking.meal_type] ?? e.booking.meal_type}`,
        15,
        y,
      );
      y += 6;
      doc.text(`Booking #${e.booking.id}  ·  ${e.booking.booking_date}`, 15, y);
      y += 8;

      const dietary = [...new Set(e.attendees.flatMap((a) => a.dietary_flags))];
      if (dietary.length > 0) {
        const otherNotes = e.attendees
          .filter(
            (a) => a.dietary_flags.includes("OTHER") && a.dietary_other_note,
          )
          .map((a) => a.dietary_other_note!)
          .join(", ");
        const dietaryLabel = dietary
          .map((f) =>
            f === "OTHER" && otherNotes ? otherNotes : f.replace(/_/g, " "),
          )
          .join(" · ");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(180, 60, 0);
        doc.text(`⚠ DIETARY: ${dietaryLabel}`, 15, y);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        y += 8;
      }

      doc.setDrawColor(0);
      doc.line(10, y, 200, y);
      y += 6;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      items.forEach((item) => {
        y = checkPage(doc, y, 260);
        doc.text(
          `${item.quantity}x  ${menuMap[item.menu_item_id] ?? `Item #${item.menu_item_id}`}`,
          15,
          y,
        );
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        y += 6;
        (item.modifier_ids ?? []).forEach((mid) => {
          doc.text(`      → ${menuMap[mid] ?? `Mod #${mid}`}`, 15, y);
          y += 5;
        });
        if (item.special_instructions) {
          doc.setTextColor(100, 100, 100);
          doc.text(`      * ${item.special_instructions}`, 15, y);
          doc.setTextColor(0, 0, 0);
          y += 5;
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
      });

      if (order.notes) {
        y += 3;
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`Order notes: ${order.notes}`, 15, y);
        doc.setTextColor(0, 0, 0);
      }
    });
  });

  downloadPDF(doc, `kitchen-chits-${date}.pdf`);
}

function generateEndOfDay(
  enriched: EnrichedBooking[],
  menuMap: Record<number, string>,
  date: string,
  tenantName: string,
) {
  const doc = new jsPDF();
  let y = pdfHeader(doc, tenantName, "End of Day Summary", `Date: ${date}`);

  const dayBookings = enriched.filter(
    (e) => e.booking.booking_date === date && e.booking.status !== "CANCELLED",
  );
  const completed = dayBookings.filter((e) => e.booking.status === "COMPLETED");
  const cancelled = enriched.filter(
    (e) => e.booking.booking_date === date && e.booking.status === "CANCELLED",
  );
  const totalCovers = dayBookings.reduce(
    (acc, e) => acc + e.booking.party_size,
    0,
  );

  const allItems: { name: string; qty: number; price: number }[] = [];
  let totalRevenue = 0;

  dayBookings.forEach((e) => {
    e.orders.forEach((order) => {
      (e.orderItems[order.id] ?? []).forEach((item) => {
        const itemName =
          menuMap[item.menu_item_id] ?? `Item #${item.menu_item_id}`;
        const subtotal = item.quantity * item.unit_price;
        totalRevenue += subtotal;
        const existing = allItems.find((i) => i.name === itemName);
        if (existing) existing.qty += item.quantity;
        else
          allItems.push({
            name: itemName,
            qty: item.quantity,
            price: item.unit_price,
          });
      });
    });
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setFillColor(245, 245, 245);
  doc.rect(20, y - 4, 170, 32, "F");

  const stats = [
    ["Total Bookings", String(dayBookings.length)],
    ["Total Covers", String(totalCovers)],
    ["Completed Sittings", String(completed.length)],
    ["Cancellations", String(cancelled.length)],
    [
      "Total Orders",
      String(dayBookings.reduce((acc, e) => acc + e.orders.length, 0)),
    ],
    ["Est. Revenue", `$${totalRevenue.toFixed(2)}`],
  ];

  stats.forEach(([label, val], i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(label, 25 + col * 57, y + row * 12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(val, 25 + col * 57, y + row * 12 + 6);
  });

  y += 38;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Items Sold", 20, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setFillColor(245, 245, 245);
  doc.rect(20, y - 5, 170, 7, "F");
  pdfRow(doc, y, ["ITEM", "QTY", "UNIT PRICE", "SUBTOTAL"], [100, 20, 30, 20]);
  y += 4;
  doc.setDrawColor(200, 200, 200);
  doc.line(20, y, 190, y);
  y += 4;

  allItems
    .sort((a, b) => b.qty - a.qty)
    .forEach((item) => {
      y = checkPage(doc, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      pdfRow(
        doc,
        y,
        [
          item.name.slice(0, 40),
          String(item.qty),
          `$${item.price.toFixed(2)}`,
          `$${(item.qty * item.price).toFixed(2)}`,
        ],
        [100, 20, 30, 20],
      );
      y += 6;
    });

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`Total Revenue: $${totalRevenue.toFixed(2)}`, 20, y);
  y += 12;
  y = checkPage(doc, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Dietary Summary", 20, y);
  y += 6;

  const dietaryCount: Record<string, number> = {};
  dayBookings.forEach((e) => {
    e.attendees.forEach((a) => {
      a.dietary_flags.forEach((f) => {
        dietaryCount[f] = (dietaryCount[f] ?? 0) + 1;
      });
    });
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  if (Object.keys(dietaryCount).length === 0) {
    doc.text("No dietary requirements recorded.", 20, y);
  } else {
    Object.entries(dietaryCount).forEach(([flag, count]) => {
      y = checkPage(doc, y);
      doc.text(
        `${flag.replace(/_/g, " ")}: ${count} guest${count !== 1 ? "s" : ""}`,
        20,
        y,
      );
      y += 6;
    });
  }

  downloadPDF(doc, `end-of-day-${date}.pdf`);
}

function generateAttendanceReport(
  enriched: EnrichedBooking[],
  from: string,
  to: string,
  tenantName: string,
) {
  const doc = new jsPDF({ orientation: "landscape" });
  let y = pdfHeader(
    doc,
    tenantName,
    "Attendance Report",
    `${from} to ${to} · Generated ${new Date().toLocaleTimeString()}`,
  );

  const rows = enriched
    .filter(
      (e) =>
        e.booking.booking_date >= from &&
        e.booking.booking_date <= to &&
        e.booking.status !== "CANCELLED",
    )
    .sort(
      (a, b) =>
        a.booking.booking_date.localeCompare(b.booking.booking_date) ||
        a.booking.estimated_arrival.localeCompare(b.booking.estimated_arrival),
    );

  if (rows.length === 0) {
    doc.setFontSize(10);
    doc.text("No bookings for this date range.", 20, y);
    return downloadPDF(doc, `attendance-${from}-to-${to}.pdf`);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setFillColor(245, 245, 245);
  doc.rect(20, y - 5, 257, 8, "F");
  const cols = [
    "DATE",
    "ARR",
    "MEMBER",
    "ROOM",
    "PARTY",
    "MEAL",
    "STATUS",
    "MEMBERS",
    "GUESTS",
    "DIETARY",
    "NOTES",
  ];
  const widths = [20, 14, 35, 25, 12, 20, 18, 45, 35, 35, 40];
  y = pdfRow(doc, y, cols, widths);
  doc.setFont("helvetica", "normal");
  doc.setDrawColor(200, 200, 200);
  doc.line(20, y - 2, 277, y - 2);

  rows.forEach((e) => {
    y = checkPage(doc, y, 185);
    const b = e.booking;
    doc.setFontSize(7.5);
    y = pdfRow(
      doc,
      y,
      [
        b.booking_date,
        b.estimated_arrival.slice(0, 5),
        getMemberName(e.attendees).slice(0, 20),
        (e.room?.name ?? `Room ${b.room_id}`).slice(0, 14),
        String(b.party_size),
        (MEAL_LABELS[b.meal_type] ?? b.meal_type).slice(0, 10),
        b.status,
        getMemberNames(e.attendees).slice(0, 28),
        getGuestNames(e.attendees).slice(0, 22),
        getDietaryStr(e.attendees).slice(0, 22),
        (b.notes ?? "").slice(0, 26),
      ],
      widths,
    );
    doc.setDrawColor(235, 235, 235);
    doc.line(20, y - 2, 277, y - 2);
  });

  y = checkPage(doc, y + 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`Total Bookings: ${rows.length}`, 20, y);
  y += 6;
  doc.text(
    `Total Covers: ${rows.reduce((acc, e) => acc + e.booking.party_size, 0)}`,
    20,
    y,
  );
  downloadPDF(doc, `attendance-${from}-to-${to}.pdf`);
}

// ─── CSV Exports ──────────────────────────────────────────────────────────────

function exportBookingsCSV(
  enriched: EnrichedBooking[],
  from: string,
  to: string,
) {
  const rows = enriched
    .filter(
      (e) => e.booking.booking_date >= from && e.booking.booking_date <= to,
    )
    .map((e) => ({
      booking_id: e.booking.id,
      member: getMemberName(e.attendees),
      date: e.booking.booking_date,
      arrival: e.booking.estimated_arrival.slice(0, 5),
      meal: MEAL_LABELS[e.booking.meal_type] ?? e.booking.meal_type,
      room: e.room?.name ?? `Room ${e.booking.room_id}`,
      party_size: e.booking.party_size,
      status: e.booking.status,
      notes: e.booking.notes ?? "",
      confirmed_at: e.booking.confirmed_at ?? "",
      seated_at: e.booking.seated_at ?? "",
    }));
  downloadCSV(`bookings-${from}-to-${to}.csv`, rows);
}

function exportCoversCSV(
  enriched: EnrichedBooking[],
  from: string,
  to: string,
) {
  const rows = enriched
    .filter(
      (e) =>
        e.booking.booking_date >= from &&
        e.booking.booking_date <= to &&
        e.booking.status !== "CANCELLED",
    )
    .map((e) => ({
      date: e.booking.booking_date,
      room: e.room?.name ?? `Room ${e.booking.room_id}`,
      meal: MEAL_LABELS[e.booking.meal_type] ?? e.booking.meal_type,
      party_size: e.booking.party_size,
      status: e.booking.status,
      arrival: e.booking.estimated_arrival.slice(0, 5),
    }));
  downloadCSV(`covers-${from}-to-${to}.csv`, rows);
}

function exportDietaryCSV(
  enriched: EnrichedBooking[],
  from: string,
  to: string,
) {
  const rows: Record<string, unknown>[] = [];
  enriched
    .filter(
      (e) => e.booking.booking_date >= from && e.booking.booking_date <= to,
    )
    .forEach((e) => {
      e.attendees
        .filter((a) => a.dietary_flags.length > 0)
        .forEach((a) => {
          rows.push({
            date: e.booking.booking_date,
            booking_id: e.booking.id,
            member: getMemberName(e.attendees),
            room: e.room?.name ?? `Room ${e.booking.room_id}`,
            attendee:
              `${a.guest_first_name ?? ""} ${a.guest_last_name ?? ""}`.trim() ||
              `Member #${a.linked_member_id}`,
            dietary_flags: a.dietary_flags
              .map((f) =>
                f === "OTHER" && a.dietary_other_note
                  ? a.dietary_other_note
                  : f.replace(/_/g, " "),
              )
              .join("; "),
          });
        });
    });
  downloadCSV(`dietary-${from}-to-${to}.csv`, rows);
}

// unit_price and subtotal removed at client request — add back end of season
function exportOrdersCSV(
  enriched: EnrichedBooking[],
  menuMap: Record<number, string>,
  from: string,
  to: string,
) {
  const rows: Record<string, unknown>[] = [];
  enriched
    .filter(
      (e) => e.booking.booking_date >= from && e.booking.booking_date <= to,
    )
    .forEach((e) => {
      e.orders.forEach((order) => {
        (e.orderItems[order.id] ?? []).forEach((item) => {
          rows.push({
            date: e.booking.booking_date,
            booking_id: e.booking.id,
            order_id: order.id,
            member: getMemberName(e.attendees),
            room: e.room?.name ?? `Room ${e.booking.room_id}`,
            item: menuMap[item.menu_item_id] ?? `Item #${item.menu_item_id}`,
            quantity: item.quantity,
            special_instructions: item.special_instructions ?? "",
            kitchen_status: order.kitchen_status,
            fired_at: order.fired_at ?? "",
          });
        });
      });
    });
  downloadCSV(`orders-${from}-to-${to}.csv`, rows);
}

function exportAttendanceCSV(
  enriched: EnrichedBooking[],
  menuMap: Record<number, string>,
  from: string,
  to: string,
) {
  const rows = enriched
    .filter(
      (e) =>
        e.booking.booking_date >= from &&
        e.booking.booking_date <= to &&
        e.booking.status !== "CANCELLED",
    )
    .sort(
      (a, b) =>
        a.booking.booking_date.localeCompare(b.booking.booking_date) ||
        a.booking.estimated_arrival.localeCompare(b.booking.estimated_arrival),
    )
    .map((e) => ({
      "Booking ID": e.booking.id,
      Date: e.booking.booking_date,
      Arrival: e.booking.estimated_arrival.slice(0, 5),
      Member: getMemberName(e.attendees),
      Room: e.room?.name ?? `Room ${e.booking.room_id}`,
      "Party Size": e.booking.party_size,
      Meal: MEAL_LABELS[e.booking.meal_type] ?? e.booking.meal_type,
      Status: e.booking.status,
      Members: getMemberNames(e.attendees),
      Guests: getGuestNames(e.attendees),
      "Attendee Count": e.attendees.length,
      "Member Count": e.attendees.filter(
        (a) => a.linked_member_id !== null && !a.is_member_guest,
      ).length,
      "Guest Count": e.attendees.filter(
        (a) => a.linked_member_id === null || a.is_member_guest,
      ).length,
      "Order Count": e.orders.length,
      "Items Ordered": getItemsOrdered(e, menuMap),
      "Dietary Flags": getDietaryStr(e.attendees),
      Notes: e.booking.notes ?? "",
    }));
  downloadCSV(`attendance-${from}-to-${to}.csv`, rows);
}

// ─── Custom CSV Builder ───────────────────────────────────────────────────────

const ALL_BOOKING_FIELDS: { key: string; label: string; group: string }[] = [
  // Booking Core
  { key: "id", label: "Booking ID", group: "Booking" },
  { key: "booking_date", label: "Date", group: "Booking" },
  { key: "estimated_arrival", label: "Arrival Time", group: "Booking" },
  { key: "meal_type", label: "Meal", group: "Booking" },
  { key: "room", label: "Room", group: "Booking" },
  { key: "party_size", label: "Party Size", group: "Booking" },
  { key: "status", label: "Status", group: "Booking" },
  { key: "notes", label: "Booking Notes", group: "Booking" },
  { key: "confirmed_at", label: "Confirmed At", group: "Booking" },
  { key: "seated_at", label: "Seated At", group: "Booking" },
  { key: "completed_at", label: "Completed At", group: "Booking" },
  { key: "cancelled_at", label: "Cancelled At", group: "Booking" },
  { key: "additional_charges", label: "Additional Charges", group: "Booking" },
  {
    key: "additional_charge_notes",
    label: "Additional Charge Notes",
    group: "Booking",
  },
  // People
  { key: "member", label: "Primary Member", group: "People" },
  { key: "members_list", label: "All Members", group: "People" },
  { key: "guests_list", label: "Guests", group: "People" },
  { key: "attendees", label: "All Attendees", group: "People" },
  { key: "attendee_count", label: "Total Attendees", group: "People" },
  { key: "members_count", label: "Member Count", group: "People" },
  { key: "guests_count", label: "Guest Count", group: "People" },
  // Dietary
  { key: "dietary", label: "Dietary Flags", group: "Dietary" },
  // Orders
  { key: "order_count", label: "Order Count", group: "Orders" },
  { key: "items_ordered", label: "Items Ordered", group: "Orders" },
];

const FIELD_GROUPS = ["Booking", "People", "Dietary", "Orders"];

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ReportsPage() {
  const { isAdmin } = useRole();
  const { name } = useTenant();

  const TABS = [
    { key: "daily", label: "Daily Run Sheet", icon: Calendar, adminOnly: true },
    { key: "kitchen", label: "Kitchen Chits", icon: ChefHat, adminOnly: false },
    { key: "eod", label: "End of Day", icon: BarChart3, adminOnly: true },
    {
      key: "covers",
      label: "Covers & Dietary",
      icon: FileText,
      adminOnly: true,
    },
    { key: "attendance", label: "Attendance", icon: FileText, adminOnly: true },
    { key: "custom", label: "Custom Export", icon: Table, adminOnly: true },
  ].filter((tab) => !tab.adminOnly || isAdmin) as {
    key: ReportTab;
    label: string;
    icon: React.ElementType;
  }[];

  const [activeTab, setActiveTab] = useState<ReportTab>(
    isAdmin ? "daily" : "kitchen",
  );
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [enriched, setEnriched] = useState<EnrichedBooking[]>([]);
  const [menuMap, setMenuMap] = useState<Record<number, string>>({});
  const [reportDate, setReportDate] = useState(today);
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [selectedFields, setSelectedFields] = useState<string[]>([
    "id",
    "member",
    "booking_date",
    "room",
    "party_size",
    "status",
  ]);

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      try {
        const [allBookings, menuItems, roomsRes] = await Promise.all([
          getAllBookings(),
          getMenuItems(),
          roomsApi.get<Room[]>("/rooms"),
        ]);

        const mmap: Record<number, string> = {};
        menuItems.forEach((m: MenuItem) => (mmap[m.id] = m.name));
        setMenuMap(mmap);

        const roomMap: Record<number, Room> = {};
        roomsRes.data.forEach((r: Room) => (roomMap[r.id] = r));

        const enrichedData = await Promise.all(
          allBookings.map(async (b) => {
            const [attendees, orders] = await Promise.allSettled([
              getAttendees(b.id),
              getOrdersByBooking(b.id),
            ]);
            const attendeeList =
              attendees.status === "fulfilled" ? attendees.value : [];
            const orderList = orders.status === "fulfilled" ? orders.value : [];
            const orderItemsMap: Record<number, OrderItem[]> = {};
            await Promise.all(
              orderList.map(async (o) => {
                try {
                  orderItemsMap[o.id] = await getOrderItems(o.id);
                } catch {
                  orderItemsMap[o.id] = [];
                }
              }),
            );
            return {
              booking: b,
              attendees: attendeeList,
              orders: orderList,
              orderItems: orderItemsMap,
              room: roomMap[b.room_id],
            };
          }),
        );
        setEnriched(enrichedData);
      } catch (err) {
        console.error("Reports load failed", err);
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  async function run(fn: () => void) {
    setGenerating(true);
    try {
      fn();
    } finally {
      setTimeout(() => setGenerating(false), 500);
    }
  }

  function toggleField(key: string) {
    setSelectedFields((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key],
    );
  }

  function exportCustomCSV() {
    const rows = enriched
      .filter(
        (e) =>
          e.booking.booking_date >= dateFrom &&
          e.booking.booking_date <= dateTo,
      )
      .map((e) => {
        const row: Record<string, unknown> = {};
        selectedFields.forEach((key) => {
          switch (key) {
            case "id":
              row["Booking ID"] = e.booking.id;
              break;
            case "member":
              row["Member"] = getMemberName(e.attendees);
              break;
            case "booking_date":
              row["Date"] = e.booking.booking_date;
              break;
            case "estimated_arrival":
              row["Arrival"] = e.booking.estimated_arrival.slice(0, 5);
              break;
            case "meal_type":
              row["Meal"] =
                MEAL_LABELS[e.booking.meal_type] ?? e.booking.meal_type;
              break;
            case "room":
              row["Room"] = e.room?.name ?? `Room ${e.booking.room_id}`;
              break;
            case "party_size":
              row["Party Size"] = e.booking.party_size;
              break;
            case "status":
              row["Status"] = e.booking.status;
              break;
            case "notes":
              row["Booking Notes"] = e.booking.notes ?? "";
              break;
            case "confirmed_at":
              row["Confirmed At"] = e.booking.confirmed_at ?? "";
              break;
            case "seated_at":
              row["Seated At"] = e.booking.seated_at ?? "";
              break;
            case "completed_at":
              row["Completed At"] = e.booking.completed_at ?? "";
              break;
            case "cancelled_at":
              row["Cancelled At"] = (e.booking as any).cancelled_at ?? "";
              break;
            case "additional_charges":
              row["Additional Charges"] =
                (e.booking as any).additional_charges ?? "";
              break;
            case "additional_charge_notes":
              row["Additional Charge Notes"] =
                (e.booking as any).additional_charge_notes ?? "";
              break;
            case "dietary":
              row["Dietary Flags"] = getDietaryStr(e.attendees);
              break;
            case "attendees":
              row["Attendees"] = getAttendeeNames(e.attendees);
              break;
            case "members_list":
              row["Members"] = getMemberNames(e.attendees);
              break;
            case "guests_list":
              row["Guests"] = getGuestNames(e.attendees);
              break;
            case "attendee_count":
              row["Total Attendees"] = e.attendees.length;
              break;
            case "members_count":
              row["Member Count"] = e.attendees.filter(
                (a) => a.linked_member_id !== null && !a.is_member_guest,
              ).length;
              break;
            case "guests_count":
              row["Guest Count"] = e.attendees.filter(
                (a) => a.linked_member_id === null || a.is_member_guest,
              ).length;
              break;
            case "order_count":
              row["Order Count"] = e.orders.length;
              break;
            case "items_ordered":
              row["Items Ordered"] = getItemsOrdered(e, menuMap);
              break;
          }
        });
        return row;
      });
    downloadCSV(`custom-export-${dateFrom}-to-${dateTo}.csv`, rows);
  }

  const btnStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 16px",
    borderRadius: "var(--radius-sm)",
    fontSize: "13px",
    fontWeight: 500,
    cursor: generating ? "not-allowed" : "pointer",
    border: "none",
    opacity: generating ? 0.6 : 1,
  };
  const pdfBtn: React.CSSProperties = {
    ...btnStyle,
    background: "var(--zinc-900)",
    color: "white",
  };
  const csvBtn: React.CSSProperties = {
    ...btnStyle,
    background: "var(--bg-surface)",
    color: "var(--zinc-800)",
    border: "1px solid var(--zinc-200)",
  };

  const dateInput = (value: string, onChange: (v: string) => void) => (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        padding: "6px 10px",
        border: "1px solid var(--zinc-300)",
        borderRadius: "var(--radius-sm)",
        fontSize: "13px",
      }}
    />
  );

  const sectionTitle = (title: string, sub: string) => (
    <div style={{ marginBottom: "1.5rem" }}>
      <h3
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "22px",
          fontWeight: 500,
        }}
      >
        {title}
      </h3>
      <p
        style={{ fontSize: "13px", color: "var(--zinc-500)", marginTop: "4px" }}
      >
        {sub}
      </p>
    </div>
  );

  if (loading) {
    return (
      <div className="table-state table-state--loading">
        <span className="page-spinner" />
        <span>Loading report data...</span>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2 className="page-title">Reports</h2>
      </div>

      <div
        style={{
          display: "flex",
          gap: "4px",
          borderBottom: "1px solid var(--zinc-200)",
          marginBottom: "2rem",
        }}
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "0.5rem 1.25rem",
                fontSize: "13px",
                fontWeight: activeTab === tab.key ? 600 : 400,
                color:
                  activeTab === tab.key ? "var(--zinc-900)" : "var(--zinc-500)",
                background: "none",
                border: "none",
                borderBottom:
                  activeTab === tab.key
                    ? "2px solid var(--zinc-900)"
                    : "2px solid transparent",
                cursor: "pointer",
                marginBottom: "-1px",
                borderRadius: 0,
              }}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "daily" && (
        <div>
          {sectionTitle(
            "Daily Run Sheet",
            "FOH reference sheet for a service day — all bookings sorted by arrival, with dietary flags and notes.",
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              marginBottom: "1.5rem",
            }}
          >
            <label style={{ fontSize: "13px", color: "var(--zinc-600)" }}>
              Date
            </label>
            {dateInput(reportDate, setReportDate)}
            <button
              style={pdfBtn}
              disabled={generating}
              onClick={() =>
                run(() => generateDailyRunSheet(enriched, reportDate, name))
              }
            >
              <Printer size={14} /> Print PDF
            </button>
          </div>
          <div
            style={{
              border: "1px solid var(--zinc-200)",
              borderRadius: "var(--radius-md)",
              overflow: "hidden",
              background: "var(--bg-surface)",
            }}
          >
            <div
              style={{
                padding: "0.75rem 1rem",
                background: "var(--zinc-50)",
                borderBottom: "1px solid var(--zinc-200)",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase" as const,
                color: "var(--zinc-500)",
              }}
            >
              Preview — {reportDate}
            </div>
            {enriched.filter(
              (e) =>
                e.booking.booking_date === reportDate &&
                e.booking.status !== "CANCELLED",
            ).length === 0 ? (
              <div className="table-state">No bookings for this date.</div>
            ) : (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "separate",
                  borderSpacing: 0,
                }}
              >
                <thead>
                  <tr>
                    {[
                      "Time",
                      "Member",
                      "Room",
                      "Party",
                      "Meal",
                      "Status",
                      "Dietary",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "0.5rem 1rem",
                          fontSize: "10px",
                          fontWeight: 700,
                          letterSpacing: "0.05em",
                          textTransform: "uppercase" as const,
                          color: "var(--zinc-400)",
                          background: "var(--zinc-50)",
                          borderBottom: "1px solid var(--zinc-100)",
                          textAlign: "left",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {enriched
                    .filter(
                      (e) =>
                        e.booking.booking_date === reportDate &&
                        e.booking.status !== "CANCELLED",
                    )
                    .sort((a, b) =>
                      a.booking.estimated_arrival.localeCompare(
                        b.booking.estimated_arrival,
                      ),
                    )
                    .map((e) => (
                      <tr key={e.booking.id}>
                        <td
                          style={{
                            padding: "0.75rem 1rem",
                            fontSize: "13px",
                            borderBottom: "1px solid var(--zinc-100)",
                            fontFamily: "ui-monospace,monospace",
                          }}
                        >
                          {e.booking.estimated_arrival.slice(0, 5)}
                        </td>
                        <td
                          style={{
                            padding: "0.75rem 1rem",
                            fontSize: "13px",
                            fontWeight: 500,
                            borderBottom: "1px solid var(--zinc-100)",
                          }}
                        >
                          {getMemberName(e.attendees)}
                        </td>
                        <td
                          style={{
                            padding: "0.75rem 1rem",
                            fontSize: "13px",
                            borderBottom: "1px solid var(--zinc-100)",
                          }}
                        >
                          {e.room?.name ?? `Room ${e.booking.room_id}`}
                        </td>
                        <td
                          style={{
                            padding: "0.75rem 1rem",
                            fontSize: "13px",
                            borderBottom: "1px solid var(--zinc-100)",
                            textAlign: "center",
                          }}
                        >
                          {e.booking.party_size}
                        </td>
                        <td
                          style={{
                            padding: "0.75rem 1rem",
                            fontSize: "13px",
                            borderBottom: "1px solid var(--zinc-100)",
                          }}
                        >
                          {MEAL_LABELS[e.booking.meal_type] ??
                            e.booking.meal_type}
                        </td>
                        <td
                          style={{
                            padding: "0.75rem 1rem",
                            borderBottom: "1px solid var(--zinc-100)",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: 700,
                              padding: "1px 7px",
                              borderRadius: "3px",
                              background: "var(--zinc-100)",
                              color: "var(--zinc-600)",
                              textTransform: "uppercase" as const,
                            }}
                          >
                            {e.booking.status}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "0.75rem 1rem",
                            fontSize: "11px",
                            color: "#92400e",
                            borderBottom: "1px solid var(--zinc-100)",
                          }}
                        >
                          {[
                            ...new Set(
                              e.attendees.flatMap((a) => a.dietary_flags),
                            ),
                          ]
                            .map((f) => f.replace(/_/g, " "))
                            .join(", ") || "—"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === "kitchen" && (
        <div>
          {sectionTitle(
            "Kitchen Chits",
            "One chit per order — prints booking context, party dietary flags, and all items with modifiers. Designed to be cut and clipped to the rail.",
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              marginBottom: "1.5rem",
            }}
          >
            <label style={{ fontSize: "13px", color: "var(--zinc-600)" }}>
              Date
            </label>
            {dateInput(reportDate, setReportDate)}
            <button
              style={pdfBtn}
              disabled={generating}
              onClick={() =>
                run(() =>
                  generateKitchenChits(enriched, menuMap, reportDate, name),
                )
              }
            >
              <Printer size={14} /> Print Chits
            </button>
          </div>
          <div
            style={{
              fontSize: "13px",
              color: "var(--zinc-500)",
              background: "var(--zinc-50)",
              border: "1px solid var(--zinc-200)",
              borderRadius: "var(--radius-sm)",
              padding: "1rem",
            }}
          >
            {(() => {
              const count = enriched.filter(
                (e) =>
                  e.booking.booking_date === reportDate && e.orders.length > 0,
              ).length;
              const orderCount = enriched
                .filter((e) => e.booking.booking_date === reportDate)
                .reduce((acc, e) => acc + e.orders.length, 0);
              return `${count} booking${count !== 1 ? "s" : ""} with orders on ${reportDate} · ${orderCount} total chit${orderCount !== 1 ? "s" : ""} will be generated`;
            })()}
          </div>
        </div>
      )}

      {activeTab === "eod" && (
        <div>
          {sectionTitle(
            "End of Day Summary",
            "Full service recap — covers, revenue estimate, items sold, dietary breakdown.",
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              marginBottom: "1.5rem",
            }}
          >
            <label style={{ fontSize: "13px", color: "var(--zinc-600)" }}>
              Date
            </label>
            {dateInput(reportDate, setReportDate)}
            <button
              style={pdfBtn}
              disabled={generating}
              onClick={() =>
                run(() => generateEndOfDay(enriched, menuMap, reportDate, name))
              }
            >
              <Printer size={14} /> Generate PDF
            </button>
            <button
              style={csvBtn}
              disabled={generating}
              onClick={() =>
                run(() =>
                  exportOrdersCSV(enriched, menuMap, reportDate, reportDate),
                )
              }
            >
              <Download size={14} /> Orders CSV
            </button>
          </div>
          {(() => {
            const day = enriched.filter(
              (e) =>
                e.booking.booking_date === reportDate &&
                e.booking.status !== "CANCELLED",
            );
            const covers = day.reduce(
              (acc, e) => acc + e.booking.party_size,
              0,
            );
            const revenue = day
              .flatMap((e) =>
                e.orders.flatMap((o) =>
                  (e.orderItems[o.id] ?? []).map(
                    (i) => i.quantity * i.unit_price,
                  ),
                ),
              )
              .reduce((a, b) => a + b, 0);
            return (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3,1fr)",
                  gap: "1rem",
                }}
              >
                {[
                  ["Bookings", day.length],
                  ["Total Covers", covers],
                  ["Est. Revenue", `$${revenue.toFixed(2)}`],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--zinc-200)",
                      borderRadius: "var(--radius-md)",
                      padding: "1.25rem",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "28px",
                        fontWeight: 500,
                      }}
                    >
                      {value}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--zinc-500)",
                        marginTop: "4px",
                      }}
                    >
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {activeTab === "covers" && (
        <div>
          {sectionTitle(
            "Covers & Dietary Reports",
            "Export covers and dietary data for a date range — useful for kitchen prep and capacity planning.",
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              flexWrap: "wrap",
              marginBottom: "1.5rem",
            }}
          >
            <label style={{ fontSize: "13px", color: "var(--zinc-600)" }}>
              From
            </label>
            {dateInput(dateFrom, setDateFrom)}
            <label style={{ fontSize: "13px", color: "var(--zinc-600)" }}>
              To
            </label>
            {dateInput(dateTo, setDateTo)}
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button
              style={csvBtn}
              disabled={generating}
              onClick={() =>
                run(() => exportBookingsCSV(enriched, dateFrom, dateTo))
              }
            >
              <Download size={14} /> Bookings CSV
            </button>
            <button
              style={csvBtn}
              disabled={generating}
              onClick={() =>
                run(() => exportCoversCSV(enriched, dateFrom, dateTo))
              }
            >
              <Download size={14} /> Covers CSV
            </button>
            <button
              style={csvBtn}
              disabled={generating}
              onClick={() =>
                run(() => exportDietaryCSV(enriched, dateFrom, dateTo))
              }
            >
              <Download size={14} /> Dietary CSV
            </button>
            <button
              style={csvBtn}
              disabled={generating}
              onClick={() =>
                run(() => exportOrdersCSV(enriched, menuMap, dateFrom, dateTo))
              }
            >
              <Download size={14} /> Orders CSV
            </button>
          </div>
        </div>
      )}

      {activeTab === "attendance" && (
        <div>
          {sectionTitle(
            "Attendance Report",
            "All bookings for a date range with members, guests, dietary flags, items ordered, and booking notes.",
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              flexWrap: "wrap",
              marginBottom: "1.5rem",
            }}
          >
            <label style={{ fontSize: "13px", color: "var(--zinc-600)" }}>
              From
            </label>
            {dateInput(dateFrom, setDateFrom)}
            <label style={{ fontSize: "13px", color: "var(--zinc-600)" }}>
              To
            </label>
            {dateInput(dateTo, setDateTo)}
            <button
              style={pdfBtn}
              disabled={generating}
              onClick={() =>
                run(() =>
                  generateAttendanceReport(enriched, dateFrom, dateTo, name),
                )
              }
            >
              <Printer size={14} /> Print PDF
            </button>
            <button
              style={csvBtn}
              disabled={generating}
              onClick={() =>
                run(() =>
                  exportAttendanceCSV(enriched, menuMap, dateFrom, dateTo),
                )
              }
            >
              <Download size={14} /> CSV
            </button>
          </div>
          <div style={{ fontSize: "13px", color: "var(--zinc-500)" }}>
            {
              enriched.filter(
                (e) =>
                  e.booking.booking_date >= dateFrom &&
                  e.booking.booking_date <= dateTo &&
                  e.booking.status !== "CANCELLED",
              ).length
            }{" "}
            bookings in range
          </div>
        </div>
      )}

      {activeTab === "custom" && (
        <div>
          {sectionTitle(
            "Custom CSV Export",
            "Pick the fields you want and export a custom booking report for any date range.",
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              flexWrap: "wrap",
              marginBottom: "1.5rem",
            }}
          >
            <label style={{ fontSize: "13px", color: "var(--zinc-600)" }}>
              From
            </label>
            {dateInput(dateFrom, setDateFrom)}
            <label style={{ fontSize: "13px", color: "var(--zinc-600)" }}>
              To
            </label>
            {dateInput(dateTo, setDateTo)}
          </div>
          <div style={{ marginBottom: "1.5rem" }}>
            {FIELD_GROUPS.map((group) => {
              const groupFields = ALL_BOOKING_FIELDS.filter(
                (f) => f.group === group,
              );
              return (
                <div key={group} style={{ marginBottom: "1.25rem" }}>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "var(--zinc-500)",
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.06em",
                      marginBottom: "0.5rem",
                    }}
                  >
                    {group}
                  </div>
                  <div
                    style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}
                  >
                    {groupFields.map((field) => {
                      const active = selectedFields.includes(field.key);
                      return (
                        <button
                          key={field.key}
                          type="button"
                          onClick={() => toggleField(field.key)}
                          style={{
                            padding: "4px 12px",
                            fontSize: "12px",
                            borderRadius: "20px",
                            cursor: "pointer",
                            border: `1px solid ${active ? "var(--zinc-900)" : "var(--zinc-200)"}`,
                            background: active
                              ? "var(--zinc-900)"
                              : "var(--bg-surface)",
                            color: active ? "white" : "var(--zinc-600)",
                            fontWeight: active ? 600 : 400,
                          }}
                        >
                          {field.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <div
            style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}
          >
            <button
              style={pdfBtn}
              disabled={generating || selectedFields.length === 0}
              onClick={() => run(exportCustomCSV)}
            >
              <Download size={14} /> Export {selectedFields.length} field
              {selectedFields.length !== 1 ? "s" : ""}
            </button>
            {selectedFields.length === 0 && (
              <span style={{ fontSize: "12px", color: "var(--zinc-400)" }}>
                Select at least one field
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
