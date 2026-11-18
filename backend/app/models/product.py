from beanie import Document
from pymongo import IndexModel, ASCENDING
from pydantic import Field
from typing import Optional
from datetime import datetime


class ProductCategory(Document):
    name: str
    description: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "product_categories"
        indexes = [IndexModel([("name", ASCENDING)], unique=True)]


class Product(Document):
    product_id: str
    name: str
    category: str
    unit_price: float
    dataset_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "products"
        indexes = [IndexModel([("product_id", ASCENDING)], unique=True)]
