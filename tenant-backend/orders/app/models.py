from pydantic import BaseModel
from typing import Optional
from enum import Enum
from datetime import datetime

class KitchenStatus(str, Enum):
    INCOMING = "INCOMING"
    IN_KITCHEN = "IN_KITCHEN"
    READY = "READY"
    SERVED = "SERVED"


class OrderCreate(BaseModel):
    booking_id: int
    notes: Optional[str] = None


class OrderResponse(BaseModel):
    id: int
    booking_id: int
    created_by: Optional[int]
    kitchen_status: KitchenStatus
    fired_at: Optional[datetime]
    print_triggered: bool
    notes: Optional[str]


class OrderItemCreate(BaseModel):
    menu_item_id: int
    quantity: int = 1
    unit_price: float
    special_instructions: Optional[str] = None
    modifier_ids: list[int] = []


class OrderItemUpdate(BaseModel):
    quantity: Optional[int] = None
    special_instructions: Optional[str] = None
    modifier_ids: Optional[list[int]] = None


class OrderItemResponse(BaseModel):
    id: int
    order_id: int
    menu_item_id: int
    quantity: int
    unit_price: float
    special_instructions: Optional[str]
    modifier_ids: list[int]
    voided: bool = False


class KitchenStatusUpdate(BaseModel):
    kitchen_status: KitchenStatus