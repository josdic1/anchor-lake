from pydantic import BaseModel
from typing import Optional
from enum import Enum


class MenuCategory(str, Enum):
    STARTER = "STARTER"
    MAIN    = "MAIN"
    SIDE    = "SIDE"
    DESSERT = "DESSERT"
    DRINK   = "DRINK"
    SPECIAL = "SPECIAL"


class MenuItemCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: MenuCategory
    price: float
    is_starter: bool = False
    is_special: bool = False
    is_modifier: bool = False
    parent_item_id: Optional[int] = None
    dietary_flags: list[str] = []
    sort_order: int = 0


class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[MenuCategory] = None
    price: Optional[float] = None
    is_starter: Optional[bool] = None
    is_active: Optional[bool] = None
    is_special: Optional[bool] = None
    is_modifier: Optional[bool] = None
    parent_item_id: Optional[int] = None
    dietary_flags: Optional[list[str]] = None
    sort_order: Optional[int] = None


class MenuItemResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    category: MenuCategory
    price: float
    is_starter: bool
    is_active: bool
    is_special: bool
    is_modifier: bool
    parent_item_id: Optional[int]
    dietary_flags: list[str]
    sort_order: int