from datetime import datetime


def add_time_features_row(d: datetime) -> dict:
    return {
        "year": d.year,
        "month": d.month,
        "week": d.isocalendar()[1],
        "day_of_month": d.day,
        "day_of_week": d.weekday(),
        "is_weekend": 1 if d.weekday() >= 5 else 0,
    }


def build_feature_matrix(data: list) -> list:
    """data: list of dicts. Adds time feature keys to each dict."""
    result = []
    for row in data:
        r = dict(row)
        d = row.get("date")
        if isinstance(d, str):
            d = datetime.strptime(d[:10], "%Y-%m-%d")
        if isinstance(d, datetime):
            r.update(add_time_features_row(d))
        result.append(r)
    return result
