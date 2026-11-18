from datetime import datetime, timedelta
from typing import List, Dict, Any
from app.ml.training.trainer import deserialize_node, _predict_tree_one


def _parse_date(val) -> datetime:
    if isinstance(val, datetime):
        return val
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(str(val)[:19], fmt)
        except ValueError:
            continue
    raise ValueError(f"Cannot parse date: {val}")


def forecast(
    model_dict: dict,
    start_date: str,
    end_date: str,
    unit_price: float,
    discount_percentage: float,
    promotion_type: str,
    holiday_indicator: bool,
) -> List[Dict[str, Any]]:
    start = _parse_date(start_date)
    end = _parse_date(end_date)

    dates = []
    d = start
    while d <= end:
        dates.append(d)
        d += timedelta(days=1)

    is_promo = 1.0 if str(promotion_type).lower() not in ("", "none", "0", "false", "no promotion") else 0.0
    is_holiday = 1.0 if bool(holiday_indicator) else 0.0
    disc = float(discount_percentage)

    algorithm = str(model_dict.get("algorithm", "")).lower().replace("-", "_").replace(" ", "_")
    base_date_str = model_dict.get("base_date")
    base_date = _parse_date(base_date_str) if base_date_str else start

    results = []

    # 1. Linear Regression
    if "weights" in model_dict:
        weights = model_dict["weights"]
        for d in dates:
            day_offset = float((d - base_date).days)
            dow = float(d.weekday())
            is_weekend = 1.0 if d.weekday() in (5, 6) else 0.0
            month = float(d.month)
            row = [day_offset, dow, is_weekend, month, float(unit_price), disc, is_promo, is_holiday]
            pred = max(0.0, weights[0] + sum(w * x for w, x in zip(weights[1:], row)))
            disc_factor = max(0.0, 1.0 - (disc / 100.0))
            revenue = round(pred * unit_price * disc_factor, 2)
            results.append({
                "date": d.strftime("%Y-%m-%d"),
                "predicted_units": round(pred, 2),
                "expected_revenue": revenue,
            })
        return results

    # 2. Gradient Boosting
    elif "learning_rate" in model_dict and "trees" in model_dict:
        trees = [deserialize_node(t) for t in model_dict["trees"]]
        base_val = model_dict.get("base_value", 0.0)
        lr = model_dict.get("learning_rate", 0.1)
        for d in dates:
            day_offset = float((d - base_date).days)
            dow = float(d.weekday())
            is_weekend = 1.0 if d.weekday() in (5, 6) else 0.0
            month = float(d.month)
            row = [day_offset, dow, is_weekend, month, float(unit_price), disc, is_promo, is_holiday]
            val = base_val + lr * sum(_predict_tree_one(t, row) for t in trees)
            pred = max(0.0, val)
            disc_factor = max(0.0, 1.0 - (disc / 100.0))
            revenue = round(pred * unit_price * disc_factor, 2)
            results.append({
                "date": d.strftime("%Y-%m-%d"),
                "predicted_units": round(pred, 2),
                "expected_revenue": revenue,
            })
        return results

    # 3. Random Forest
    elif "trees" in model_dict:
        trees = [deserialize_node(t) for t in model_dict["trees"]]
        n_trees = len(trees) or 1
        for d in dates:
            day_offset = float((d - base_date).days)
            dow = float(d.weekday())
            is_weekend = 1.0 if d.weekday() in (5, 6) else 0.0
            month = float(d.month)
            row = [day_offset, dow, is_weekend, month, float(unit_price), disc, is_promo, is_holiday]
            pred = max(0.0, sum(_predict_tree_one(t, row) for t in trees) / n_trees)
            disc_factor = max(0.0, 1.0 - (disc / 100.0))
            revenue = round(pred * unit_price * disc_factor, 2)
            results.append({
                "date": d.strftime("%Y-%m-%d"),
                "predicted_units": round(pred, 2),
                "expected_revenue": revenue,
            })
        return results

    # 4. Fallback / Legacy format
    else:
        baseline = model_dict.get("baseline", 10.0)
        monthly_factors = {int(k): v for k, v in model_dict.get("monthly_factors", {}).items()}
        dow_factors = {int(k): v for k, v in model_dict.get("dow_factors", {}).items()}
        trend_slope = model_dict.get("trend_slope", 0.0)
        trend_intercept = model_dict.get("trend_intercept", baseline)
        last_day_idx = model_dict.get("last_day_idx", 0)
        price_sensitivity = model_dict.get("price_sensitivity", 0.1)
        promo_effect = model_dict.get("promo_effect", 1.2)
        holiday_effect = model_dict.get("holiday_effect", 1.15)
        mean_discount = model_dict.get("mean_discount", 0.0)
        disc_ratio = disc / 100.0

        for i, d in enumerate(dates):
            day_idx = last_day_idx + 1 + i
            trend_val = trend_slope * day_idx + trend_intercept
            m_factor = monthly_factors.get(d.month, 1.0)
            dow_factor = dow_factors.get(d.weekday(), 1.0)
            price_effect = 1 + price_sensitivity * (disc_ratio - mean_discount)
            p_effect = promo_effect if is_promo else 1.0
            h_effect = holiday_effect if is_holiday else 1.0
            pred = max(0.0, trend_val * m_factor * dow_factor * price_effect * p_effect * h_effect)
            revenue = round(pred * unit_price * (1.0 - disc_ratio), 2)
            results.append({
                "date": d.strftime("%Y-%m-%d"),
                "predicted_units": round(pred, 2),
                "expected_revenue": revenue,
            })

        return results
