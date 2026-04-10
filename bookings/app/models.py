from pydantic import BaseModel
from typing import Optional
from datetime import date, time, datetime
from enum import Enum


class MealType(str, Enum):
    LUNCH = "LUNCH"
    DINNER = "DINNER"
    AFTERHOURS = "AFTERHOURS"
    SPECIAL_EVENT = "SPECIAL_EVENT"


class BookingStatus(str, Enum):
    DRAFT = "DRAFT"
    CONFIRMED = "CONFIRMED"
    SEATED = "SEATED"
    SERVICE = "SERVICE"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class BookingCreate(BaseModel):
    room_id: int
    booking_date: date
    meal_type: MealType
    estimated_arrival: time
    notes: Optional[str] = None
    is_special_event: bool = False


class BookingUpdate(BaseModel):
    room_id: Optional[int] = None
    booking_date: Optional[date] = None
    meal_type: Optional[MealType] = None
    estimated_arrival: Optional[time] = None
    notes: Optional[str] = None
    additional_charges: Optional[float] = None
    additional_charge_notes: Optional[str] = None


class BookingStatusUpdate(BaseModel):
    status: BookingStatus


class BookingResponse(BaseModel):
    id: int
    booking_member_id: int
    room_id: int
    booking_date: date
    meal_type: MealType
    estimated_arrival: time
    status: BookingStatus
    party_size: int
    is_special_event: bool
    notify_email_sent: bool
    notes: Optional[str]
    additional_charges: Optional[float]
    additional_charge_notes: Optional[str]
    confirmed_at: Optional[datetime]
    seated_at: Optional[datetime]
    service_at: Optional[datetime]
    completed_at: Optional[datetime]
    cancelled_at: Optional[datetime]
    force_completed: bool


class AttendeeCreate(BaseModel):
    linked_member_id: Optional[int] = None
    guest_first_name: Optional[str] = None
    guest_last_name: Optional[str] = None
    is_member_guest: bool = False
    dietary_flags: list[str] = []
    notes: Optional[str] = None


class AttendeeResponse(BaseModel):
    id: int
    booking_id: int
    linked_member_id: Optional[int]
    guest_first_name: Optional[str]
    guest_last_name: Optional[str]
    is_member_guest: bool
    dietary_flags: list[str]
    notes: Optional[str]


# ─── New models for atomic booking creation ─────────────────────────────────

class GuestAttendeeInput(BaseModel):
    first_name: str
    last_name: str
    linked_member_id: Optional[int] = None
    is_member_guest: bool = False
    dietary_flags: list[str] = []
    notes: Optional[str] = None


class AttendeeListInput(BaseModel):
    member_ids: list[int] = []
    guests: list[GuestAttendeeInput] = []


class BookingCreateFull(BaseModel):
    room_id: int
    booking_date: date
    meal_type: MealType
    estimated_arrival: time
    notes: Optional[str] = None
    is_special_event: bool = False
    confirm_immediately: bool = False
    attendees: AttendeeListInput


class AllowedAction(BaseModel):
    action: str
    label: str
    confirm: bool
    variant: str = "ghost"


class BookingCommandResponse(BaseModel):
    booking: BookingResponse
    attendees: list[AttendeeResponse]
    allowed_actions: list[AllowedAction]