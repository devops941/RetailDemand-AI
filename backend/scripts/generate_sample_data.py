"""
Generate a synthetic retail sales dataset for development and testing.
This data is entirely synthetic and does NOT represent real sales figures.
"""
import os
from datetime import datetime, timedelta
import random

random.seed(42)

PRODUCTS = [
    {"product_id": "P001", "product_name": "Wireless Headphones", "category": "Electronics", "base_price": 59.99},
    {"product_id": "P002", "product_name": "Bluetooth Speaker", "category": "Electronics", "base_price": 39.99},
    {"product_id": "P003", "product_name": "Running Shoes", "category": "Footwear", "base_price": 89.99},
    {"product_id": "P004", "product_name": "Sports T-Shirt", "category": "Apparel", "base_price": 24.99},
    {"product_id": "P005", "product_name": "Coffee Maker", "category": "Appliances", "base_price": 49.99},
    {"product_id": "P006", "product_name": "Yoga Mat", "category": "Sports", "base_price": 29.99},
    {"product_id": "P007", "product_name": "Water Bottle", "category": "Sports", "base_price": 19.99},
    {"product_id": "P008", "product_name": "Notebook Set", "category": "Stationery", "base_price": 14.99},
    {"product_id": "P009", "product_name": "Desk Lamp", "category": "Home", "base_price": 34.99},
    {"product_id": "P010", "product_name": "Face Wash", "category": "Personal Care", "base_price": 12.99},
]

PROMOTION_TYPES = ["None", "Flash Sale", "Seasonal Sale", "Festival Offer", "Weekend Deal", "Clearance"]
STORES = ["S001", "S002", "S003"]

HOLIDAYS = {
    "2023-01-01", "2023-01-26", "2023-03-08", "2023-04-14",
    "2023-05-01", "2023-08-15", "2023-10-02", "2023-10-23",
    "2023-10-24", "2023-11-01", "2023-12-25", "2023-12-31",
    "2024-01-01", "2024-01-26", "2024-03-25", "2024-04-14",
    "2024-05-01", "2024-08-15", "2024-10-02", "2024-10-12",
    "2024-10-13", "2024-11-01", "2024-12-25", "2024-12-31",
}


def seasonal_multiplier(date: datetime, category: str) -> float:
    month = date.month
    if category == "Electronics":
        return 1.0 + 0.4 * (month in [11, 12]) + 0.2 * (month in [7, 8])
    if category == "Apparel":
        return 1.0 + 0.3 * (month in [3, 4, 10, 11]) + 0.15 * (month in [6, 7])
    if category == "Sports":
        return 1.0 + 0.35 * (month in [1, 2, 6, 7])
    if category == "Appliances":
        return 1.0 + 0.25 * (month in [11, 12])
    return 1.0 + 0.1 * (month in [11, 12])


def generate_rows():
    import numpy as np

    np.random.seed(42)

    rows = []
    start = datetime(2023, 1, 1)
    end = datetime(2024, 12, 31)
    current = start

    while current <= end:
        date_str = current.strftime("%Y-%m-%d")
        is_holiday = date_str in HOLIDAYS
        is_weekend = current.weekday() >= 5

        for product in PRODUCTS:
            store = random.choice(STORES)
            base_qty = int(np.random.poisson(lam=20))

            seasonal = seasonal_multiplier(current, product["category"])
            weekend_boost = 1.3 if is_weekend else 1.0
            holiday_boost = 1.6 if is_holiday else 1.0

            # Promotions ~25% of days
            if random.random() < 0.25:
                promo = random.choice(PROMOTION_TYPES[1:])
                discount = random.choice([5, 10, 15, 20, 25, 30])
            else:
                promo = "None"
                discount = 0

            promo_multiplier = 1.0 + (discount / 100) * 1.5

            qty = int(base_qty * seasonal * weekend_boost * holiday_boost * promo_multiplier)
            qty = max(0, qty + np.random.randint(-3, 4))

            unit_price = round(product["base_price"] * random.uniform(0.95, 1.05), 2)

            rows.append({
                "date": date_str,
                "product_id": product["product_id"],
                "product_name": product["product_name"],
                "category": product["category"],
                "quantity_sold": qty,
                "unit_price": unit_price,
                "discount_percentage": discount,
                "promotion_type": promo,
                "holiday_indicator": int(is_holiday),
                "store_id": store,
                "inventory_available": random.randint(50, 500),
            })

        current += timedelta(days=1)

    return rows


if __name__ == "__main__":
    import pandas as pd

    print("Generating synthetic retail sales dataset...")
    rows = generate_rows()
    df = pd.DataFrame(rows)
    df = df.sort_values(["date", "product_id"]).reset_index(drop=True)

    out_dir = os.path.join(os.path.dirname(__file__), "..", "uploads")
    os.makedirs(out_dir, exist_ok=True)

    csv_path = os.path.join(out_dir, "sample_retail_sales.csv")
    df.to_csv(csv_path, index=False)

    print(f"Dataset generated: {csv_path}")
    print(f"Total rows: {len(df):,}")
    print(f"Date range: {df['date'].min()} to {df['date'].max()}")
    print(f"Products: {df['product_id'].nunique()}")
    print(f"Categories: {df['category'].nunique()}")
    print(f"Rows with promotions: {(df['promotion_type'] != 'None').sum():,}")
    print(f"Holiday rows: {df['holiday_indicator'].sum():,}")
    print("\nNOTE: This dataset is entirely synthetic and for development/testing only.")
