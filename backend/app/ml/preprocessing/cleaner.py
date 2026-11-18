from typing import Tuple, List


def clean_dataframe(df: "pd.DataFrame") -> Tuple["pd.DataFrame", List[str]]:
    import pandas as pd

    notes = []
    df = df.copy()
    df.columns = df.columns.str.lower().str.strip()

    before = len(df)
    df = df.drop_duplicates()
    removed = before - len(df)
    if removed:
        notes.append(f"Removed {removed} duplicate rows")

    if "date" in df.columns:
        df["date"] = pd.to_datetime(df["date"], errors="coerce")
        invalid_dates = df["date"].isna().sum()
        if invalid_dates:
            notes.append(f"Removed {invalid_dates} rows with invalid dates")
        df = df.dropna(subset=["date"])

    if "quantity_sold" in df.columns:
        neg = (df["quantity_sold"] < 0).sum()
        if neg:
            notes.append(f"Set {neg} negative quantity_sold values to 0")
        df["quantity_sold"] = df["quantity_sold"].clip(lower=0)

    if "unit_price" in df.columns:
        neg_price = (df["unit_price"] < 0).sum()
        if neg_price:
            notes.append(f"Removed {neg_price} rows with negative unit_price")
        df = df[df["unit_price"] >= 0]

    if "discount_percentage" in df.columns:
        df["discount_percentage"] = df["discount_percentage"].fillna(0).clip(0, 100)

    return df, notes
