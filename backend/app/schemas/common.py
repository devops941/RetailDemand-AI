from pydantic import BaseModel
from typing import Any, Optional, Generic, TypeVar, List

T = TypeVar("T")


class APIResponse(BaseModel):
    success: bool = True
    message: str = ""
    data: Optional[Any] = None
    meta: Optional[Any] = None


class PaginatedMeta(BaseModel):
    total: int
    page: int
    per_page: int
    total_pages: int


class PaginatedResponse(BaseModel):
    success: bool = True
    message: str = ""
    data: List[Any] = []
    meta: PaginatedMeta
