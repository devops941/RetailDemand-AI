import os
import csv
from typing import Optional, List, Dict, Any
from datetime import datetime
from fastapi import HTTPException
from app.models.dataset import ProcessedDataset
from app.utils.path_resolver import resolve_file_path


class AnalyticsService:

    @staticmethod
    async def _load_processed_rows(dataset_id: str) -> List[Dict[str, Any]]:
        """Load processed dataset as a list of lowercased dicts without depending on binary extensions."""
        processed = await ProcessedDataset.find_one(
            ProcessedDataset.dataset_id == dataset_id
        )
        if not processed:
            raise HTTPException(
                status_code=400,
                detail="Dataset has not been processed yet. Run /process first.",
            )
        resolved_path = resolve_file_path(processed.processed_file_path)
        if not os.path.exists(resolved_path):
            raise HTTPException(
                status_code=400,
                detail="Processed file not found. Please re-process the dataset.",
            )
        with open(resolved_path, newline="", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            rows = [{k.lower().strip(): v for k, v in r.items()} for r in reader]
        return rows

    @staticmethod
    async def get_historical_trends(
        dataset_id: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        product_id: Optional[str] = None,
        granularity: str = "daily",
    ) -> Dict[str, Any]:
        rows = await AnalyticsService._load_processed_rows(dataset_id)
        if start_date:
            rows = [r for r in rows if r.get("date", "")[:10] >= start_date[:10]]
        if end_date:
            rows = [r for r in rows if r.get("date", "")[:10] <= end_date[:10]]
        if product_id:
            rows = [r for r in rows if str(r.get("product_id", "")).strip() == str(product_id).strip()]

        if not rows:
            return {"daily": [], "monthly": [], "summary": {}}

        daily_map: Dict[str, Dict[str, Any]] = {}
        monthly_map: Dict[str, Dict[str, Any]] = {}
        all_dates = []
        total_units = 0.0
        total_revenue = 0.0
        has_price = any("unit_price" in r for r in rows)

        for r in rows:
            d_str = r.get("date", "")[:10]
            if not d_str:
                continue
            all_dates.append(d_str)
            qty = float(r.get("quantity_sold", 0) or 0)
            price = float(r.get("unit_price", 0) or 0) if has_price else 0.0
            rev = qty * price

            total_units += qty
            total_revenue += rev

            if d_str not in daily_map:
                daily_map[d_str] = {"date": d_str, "units": 0.0, "revenue": 0.0}
            daily_map[d_str]["units"] += qty
            daily_map[d_str]["revenue"] += rev

            m_str = d_str[:7]
            if m_str not in monthly_map:
                monthly_map[m_str] = {"month": m_str, "units": 0.0, "revenue": 0.0}
            monthly_map[m_str]["units"] += qty
            monthly_map[m_str]["revenue"] += rev

        daily_list = [
            {"date": k, "units": int(daily_map[k]["units"]), "revenue": round(daily_map[k]["revenue"], 2)}
            for k in sorted(daily_map.keys())
        ]
        monthly_list = [
            {"month": k, "units": int(monthly_map[k]["units"]), "revenue": round(monthly_map[k]["revenue"], 2)}
            for k in sorted(monthly_map.keys())
        ]

        min_date = min(all_dates) if all_dates else ""
        max_date = max(all_dates) if all_dates else ""
        try:
            total_days = (datetime.strptime(max_date, "%Y-%m-%d") - datetime.strptime(min_date, "%Y-%m-%d")).days + 1
        except Exception:
            total_days = len(daily_list)

        avg_daily = round(total_units / max(len(daily_list), 1), 2)
        summary = {
            "total_units": int(total_units),
            "avg_daily_units": avg_daily,
            "date_range_start": min_date,
            "date_range_end": max_date,
            "total_days": total_days,
            "total_revenue": round(total_revenue, 2) if has_price else None,
        }

        return {
            "daily": daily_list,
            "monthly": monthly_list,
            "summary": summary,
        }

    @staticmethod
    async def get_product_analytics(dataset_id: str) -> List[Dict]:
        rows = await AnalyticsService._load_processed_rows(dataset_id)
        if not rows:
            return []
        prod_map: Dict[str, Dict[str, Any]] = {}
        for r in rows:
            pid = str(r.get("product_id", "")).strip()
            if not pid:
                continue
            qty = float(r.get("quantity_sold", 0) or 0)
            price = float(r.get("unit_price", 0) or 0)
            d_str = r.get("date", "")[:10]

            if pid not in prod_map:
                prod_map[pid] = {
                    "product_id": pid,
                    "product_name": r.get("product_name", pid),
                    "total_units": 0.0,
                    "days_set": set(),
                    "total_revenue": 0.0,
                }
            prod_map[pid]["total_units"] += qty
            prod_map[pid]["total_revenue"] += qty * price
            if d_str:
                prod_map[pid]["days_set"].add(d_str)

        result = []
        for p in prod_map.values():
            days_count = len(p["days_set"])
            result.append({
                "product_id": p["product_id"],
                "product_name": p["product_name"],
                "total_units": int(p["total_units"]),
                "avg_daily_units": round(p["total_units"] / max(days_count, 1), 2),
                "days_sold": days_count,
                "revenue": round(p["total_revenue"], 2),
            })
        result.sort(key=lambda x: x["total_units"], reverse=True)
        return result

    @staticmethod
    async def get_category_analytics(dataset_id: str) -> List[Dict]:
        rows = await AnalyticsService._load_processed_rows(dataset_id)
        if not rows:
            return []
        cat_map: Dict[str, Dict[str, Any]] = {}
        total_all_units = 0.0
        for r in rows:
            cat = str(r.get("category", "")).strip() or "Uncategorized"
            qty = float(r.get("quantity_sold", 0) or 0)
            price = float(r.get("unit_price", 0) or 0)
            pid = str(r.get("product_id", "")).strip()

            if cat not in cat_map:
                cat_map[cat] = {
                    "category": cat,
                    "total_units": 0.0,
                    "products_set": set(),
                    "total_revenue": 0.0,
                }
            cat_map[cat]["total_units"] += qty
            cat_map[cat]["total_revenue"] += qty * price
            if pid:
                cat_map[cat]["products_set"].add(pid)
            total_all_units += qty

        result = []
        for c in cat_map.values():
            share = round((c["total_units"] / total_all_units * 100), 1) if total_all_units > 0 else 0.0
            result.append({
                "category": c["category"],
                "total_units": int(c["total_units"]),
                "unique_products": len(c["products_set"]),
                "revenue": round(c["total_revenue"], 2),
                "share_pct": share,
            })
        result.sort(key=lambda x: x["total_units"], reverse=True)
        return result

    @staticmethod
    async def get_promotion_analytics(dataset_id: str) -> Dict[str, Any]:
        rows = await AnalyticsService._load_processed_rows(dataset_id)
        if not rows:
            return {"by_promotion_type": [], "by_discount_tier": [], "holiday_impact": []}

        promo_map: Dict[str, Dict[str, Any]] = {}
        for r in rows:
            pt = str(r.get("promotion_type", "")).strip() or "None"
            qty = float(r.get("quantity_sold", 0) or 0)
            if pt not in promo_map:
                promo_map[pt] = {"promotion_type": pt, "total_units": 0.0, "count": 0}
            promo_map[pt]["total_units"] += qty
            promo_map[pt]["count"] += 1

        by_promo = [
            {
                "promotion_type": p["promotion_type"],
                "total_units": int(p["total_units"]),
                "avg_units": round(p["total_units"] / max(p["count"], 1), 2),
                "record_count": p["count"],
            }
            for p in promo_map.values()
        ]

        tier_names = ["No Discount", "1-10%", "11-20%", "21-30%", "30%+"]
        tier_map = {t: {"discount_tier": t, "total_units": 0.0, "count": 0} for t in tier_names}
        for r in rows:
            try:
                disc = float(r.get("discount_percentage", 0) or 0)
            except Exception:
                disc = 0.0
            qty = float(r.get("quantity_sold", 0) or 0)
            if disc <= 0:
                t = "No Discount"
            elif disc <= 10:
                t = "1-10%"
            elif disc <= 20:
                t = "11-20%"
            elif disc <= 30:
                t = "21-30%"
            else:
                t = "30%+"
            tier_map[t]["total_units"] += qty
            tier_map[t]["count"] += 1

        by_tier = [
            {
                "discount_tier": t,
                "total_units": int(tier_map[t]["total_units"]),
                "avg_units": round(tier_map[t]["total_units"] / max(tier_map[t]["count"], 1), 2),
                "record_count": tier_map[t]["count"],
            }
            for t in tier_names
        ]

        hol_map = {
            0: {"label": "Regular Day", "total_units": 0.0, "count": 0},
            1: {"label": "Holiday", "total_units": 0.0, "count": 0},
        }
        for r in rows:
            h = 1 if str(r.get("holiday_indicator", "")).strip() in ("1", "true", "True") else 0
            qty = float(r.get("quantity_sold", 0) or 0)
            hol_map[h]["total_units"] += qty
            hol_map[h]["count"] += 1

        holiday_impact = [
            {
                "holiday_indicator": h,
                "label": hol_map[h]["label"],
                "total_units": int(hol_map[h]["total_units"]),
                "avg_units": round(hol_map[h]["total_units"] / max(hol_map[h]["count"], 1), 2),
            }
            for h in (0, 1)
        ]

        return {
            "by_promotion_type": by_promo,
            "by_discount_tier": by_tier,
            "holiday_impact": holiday_impact,
        }

    @staticmethod
    async def get_dataset_products(dataset_id: str) -> List[Dict]:
        """Return distinct products in a dataset for filter dropdowns."""
        rows = await AnalyticsService._load_processed_rows(dataset_id)
        if not rows:
            return []
        seen = set()
        products = []
        for r in rows:
            pid = str(r.get("product_id", "")).strip()
            if pid and pid not in seen:
                seen.add(pid)
                item: Dict[str, Any] = {"product_id": pid}
                if "product_name" in r and r["product_name"]:
                    item["product_name"] = r["product_name"]
                if "category" in r and r["category"]:
                    item["category"] = r["category"]
                products.append(item)
        return products
