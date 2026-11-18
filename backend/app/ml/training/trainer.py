import math
import random
from datetime import datetime
from typing import Any, Dict, List, Tuple
from app.ml.evaluation.evaluator import evaluate_model


def _parse_date(val) -> datetime:
    if isinstance(val, datetime):
        return val
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(str(val)[:19], fmt)
        except ValueError:
            continue
    raise ValueError(f"Cannot parse date: {val}")


class TreeNode:
    def __init__(self, value=None, feat=None, thresh=None, left=None, right=None):
        self.value = value
        self.feat = feat
        self.thresh = thresh
        self.left = left
        self.right = right


def serialize_node(node):
    if node is None:
        return None
    if node.value is not None:
        return {"value": round(float(node.value), 4)}
    return {
        "feat": node.feat,
        "thresh": round(float(node.thresh), 4),
        "left": serialize_node(node.left),
        "right": serialize_node(node.right),
    }


def deserialize_node(d):
    if not d:
        return None
    if "value" in d:
        return TreeNode(value=d["value"])
    return TreeNode(
        feat=d["feat"],
        thresh=d["thresh"],
        left=deserialize_node(d.get("left")),
        right=deserialize_node(d.get("right")),
    )


def _predict_tree_one(node: TreeNode, row: list) -> float:
    if node.value is not None:
        return node.value
    if row[node.feat] <= node.thresh:
        return _predict_tree_one(node.left, row)
    return _predict_tree_one(node.right, row)


def _fit_tree(X: list, y: list, depth: int = 0, max_depth: int = 5, min_split: int = 4, max_features: int = None, rng: random.Random = None) -> TreeNode:
    if depth >= max_depth or len(y) < min_split:
        return TreeNode(value=sum(y) / len(y) if y else 0.0)

    p = len(X[0])
    feats = list(range(p))
    if max_features and max_features < p and rng:
        feats = rng.sample(feats, max_features)

    best_sse = float("inf")
    best_split = None
    mean_all = sum(y) / len(y)
    curr_sse = sum((yi - mean_all) ** 2 for yi in y)

    for f in feats:
        vals = sorted(set(row[f] for row in X))
        if len(vals) < 2:
            continue
        step = max(1, len(vals) // 10)
        for i in range(0, len(vals) - 1, step):
            thresh = (vals[i] + vals[i + 1]) / 2.0
            left_y = [yi for row, yi in zip(X, y) if row[f] <= thresh]
            right_y = [yi for row, yi in zip(X, y) if row[f] > thresh]
            if len(left_y) < 2 or len(right_y) < 2:
                continue
            m_l = sum(left_y) / len(left_y)
            m_r = sum(right_y) / len(right_y)
            sse = sum((yi - m_l) ** 2 for yi in left_y) + sum((yi - m_r) ** 2 for yi in right_y)
            if sse < best_sse:
                best_sse = sse
                best_split = (f, thresh)

    if not best_split or best_sse >= curr_sse:
        return TreeNode(value=sum(y) / len(y) if y else 0.0)

    f, thresh = best_split
    left_X = [row for row in X if row[f] <= thresh]
    left_y = [yi for row, yi in zip(X, y) if row[f] <= thresh]
    right_X = [row for row in X if row[f] > thresh]
    right_y = [yi for row, yi in zip(X, y) if row[f] > thresh]

    return TreeNode(
        feat=f,
        thresh=thresh,
        left=_fit_tree(left_X, left_y, depth + 1, max_depth, min_split, max_features, rng),
        right=_fit_tree(right_X, right_y, depth + 1, max_depth, min_split, max_features, rng),
    )


def _solve_linear(A: list, b: list) -> list:
    n = len(b)
    M = [A[i][:] + [b[i]] for i in range(n)]
    for i in range(n):
        max_row = max(range(i, n), key=lambda r: abs(M[r][i]))
        M[i], M[max_row] = M[max_row], M[i]
        pivot = M[i][i]
        if abs(pivot) < 1e-12:
            continue
        for k in range(i, n + 1):
            M[i][k] /= pivot
        for r in range(n):
            if r != i and abs(M[r][i]) > 1e-12:
                factor = M[r][i]
                for k in range(i, n + 1):
                    M[r][k] -= factor * M[i][k]
    return [M[i][n] for i in range(n)]


def _fit_linear_regression(X: list, y: list, l2: float = 1e-3) -> list:
    X_aug = [[1.0] + row for row in X]
    p = len(X_aug[0])
    n = len(X_aug)
    XtX = [[sum(X_aug[i][j] * X_aug[i][k] for i in range(n)) for k in range(p)] for j in range(p)]
    for j in range(1, p):
        XtX[j][j] += l2
    Xty = [sum(X_aug[i][j] * y[i] for i in range(n)) for j in range(p)]
    return _solve_linear(XtX, Xty)


def extract_row_features(row: dict, base_date: datetime) -> list:
    d = _parse_date(row["date"])
    day_offset = float((d - base_date).days)
    dow = float(d.weekday())
    is_weekend = 1.0 if d.weekday() in (5, 6) else 0.0
    month = float(d.month)
    price = float(row.get("unit_price", 10) or 10)
    disc = float(row.get("discount_percentage", 0) or 0)
    promo = 1.0 if str(row.get("promotion_type", "")).lower() not in ("", "none", "0", "false", "no promotion") else 0.0
    holiday = 1.0 if int(row.get("holiday_indicator", 0) or 0) else 0.0
    return [day_offset, dow, is_weekend, month, price, disc, promo, holiday]


def train(data: list, algorithm: str = "random_forest", target_col: str = "quantity_sold") -> Tuple[Any, Dict, List[str]]:
    """
    data: list of dicts with keys: date, quantity_sold, unit_price, discount_percentage,
          promotion_type, holiday_indicator
    Returns: (model_dict, metrics_dict, feature_cols)
    """
    data_sorted = sorted(data, key=lambda x: _parse_date(x["date"]))
    n = len(data_sorted)
    if n < 10:
        raise ValueError("Need at least 10 rows of data")

    dates = [_parse_date(r["date"]) for r in data_sorted]
    qty = [float(r.get("quantity_sold", 0) or 0) for r in data_sorted]
    base_date = dates[0]

    feature_cols = [
        "day_offset",
        "day_of_week",
        "is_weekend",
        "month",
        "unit_price",
        "discount_percentage",
        "promotion_type",
        "holiday_indicator",
    ]

    X = [extract_row_features(r, base_date) for r in data_sorted]
    y = qty

    # Train / Validation split (80% train, 20% validation)
    split_idx = max(8, int(n * 0.8))
    X_train, y_train = X[:split_idx], y[:split_idx]
    X_val, y_val = X[split_idx:], y[split_idx:]

    model_dict: Dict[str, Any] = {
        "algorithm": algorithm,
        "base_date": base_date.strftime("%Y-%m-%d"),
        "n_training_rows": n,
        "mean_y": sum(y_train) / len(y_train) if y_train else 1.0,
    }

    val_preds: List[float] = []

    algo_clean = algorithm.lower().replace("-", "_").replace(" ", "_")

    if algo_clean == "linear_regression":
        weights = _fit_linear_regression(X_train, y_train, l2=1e-2)
        model_dict["weights"] = [round(w, 5) for w in weights]
        for row in X_val:
            pred = weights[0] + sum(w * x for w, x in zip(weights[1:], row))
            val_preds.append(max(0.0, pred))

    elif algo_clean == "gradient_boosting":
        base_val = sum(y_train) / len(y_train)
        curr_train_pred = [base_val] * len(y_train)
        gb_trees: List[TreeNode] = []
        lr_rate = 0.1
        n_estimators = 15

        for _ in range(n_estimators):
            res = [yi - pi for yi, pi in zip(y_train, curr_train_pred)]
            t = _fit_tree(X_train, res, max_depth=3, min_split=4)
            gb_trees.append(t)
            res_preds = [_predict_tree_one(t, row) for row in X_train]
            curr_train_pred = [p + lr_rate * rp for p, rp in zip(curr_train_pred, res_preds)]

        model_dict["base_value"] = round(base_val, 4)
        model_dict["learning_rate"] = lr_rate
        model_dict["trees"] = [serialize_node(t) for t in gb_trees]

        for row in X_val:
            pred = base_val + lr_rate * sum(_predict_tree_one(t, row) for t in gb_trees)
            val_preds.append(max(0.0, pred))

    else:
        # Default: Random Forest
        algo_clean = "random_forest"
        model_dict["algorithm"] = "random_forest"
        rng = random.Random(42)
        rf_trees: List[TreeNode] = []
        n_trees = 15

        for _ in range(n_trees):
            boot_idx = [rng.randint(0, len(X_train) - 1) for _ in range(len(X_train))]
            bx = [X_train[i] for i in boot_idx]
            by = [y_train[i] for i in boot_idx]
            t = _fit_tree(bx, by, max_depth=5, min_split=4, max_features=4, rng=rng)
            rf_trees.append(t)

        model_dict["trees"] = [serialize_node(t) for t in rf_trees]

        for row in X_val:
            pred = sum(_predict_tree_one(t, row) for t in rf_trees) / n_trees
            val_preds.append(max(0.0, pred))

    metrics = evaluate_model(y_val, val_preds)
    return model_dict, metrics, feature_cols
