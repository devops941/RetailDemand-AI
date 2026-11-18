import math
from typing import Dict, Optional


def evaluate_model(y_true: list, y_pred: list) -> Dict[str, Optional[float]]:
    n = len(y_true)
    if n == 0:
        return {"mae": 0.0, "rmse": 0.0, "mape": None, "wape": None, "r2": None}
    errors = [abs(yt - yp) for yt, yp in zip(y_true, y_pred)]
    mae = sum(errors) / n
    rmse = math.sqrt(sum((yt - yp) ** 2 for yt, yp in zip(y_true, y_pred)) / n)
    mape_vals = [abs(yt - yp) / abs(yt) * 100 for yt, yp in zip(y_true, y_pred) if yt != 0]
    mape = sum(mape_vals) / len(mape_vals) if mape_vals else None
    sum_abs_true = sum(abs(yt) for yt in y_true)
    wape = sum(errors) / sum_abs_true if sum_abs_true > 0 else None
    mean_true = sum(y_true) / n
    ss_res = sum((yt - yp) ** 2 for yt, yp in zip(y_true, y_pred))
    ss_tot = sum((yt - mean_true) ** 2 for yt in y_true)
    r2 = 1.0 - ss_res / ss_tot if ss_tot > 0 else None
    return {"mae": mae, "rmse": rmse, "mape": mape, "wape": wape, "r2": r2}
