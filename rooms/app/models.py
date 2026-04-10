from pydantic import BaseModel
from typing import Optional
from datetime import date


class RoomResponse(BaseModel):
    id: int
    name: str
    capacity: int
    one_booking_max: bool
    dines_only: bool
    is_active: bool
    notes: Optional[str]


class RoomUpdate(BaseModel):
    name: Optional[str] = None
    capacity: Optional[int] = None
    one_booking_max: Optional[bool] = None
    dines_only: Optional[bool] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class RoomBlockCreate(BaseModel):
    room_id: int
    blocked_date: date
    reason: Optional[str] = None


class RoomBlockResponse(BaseModel):
    id: int
    room_id: int
    blocked_date: date
    reason: Optional[str]
    created_by: Optional[int]