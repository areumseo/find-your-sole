"""Validate shoes_data.json. Usage: python tools/validate_shoes.py"""
import json
import sys
from pathlib import Path

CATEGORIES = {"running", "walking", "daily"}  # fashion/lifestyle sneakers are out of scope
REQUIRED = ["id", "name", "brand", "price", "weight_g", "categories", "cushion", "terrain", "score_base", "url"]

shoes = json.loads((Path(__file__).parent.parent / "shoes_data.json").read_text(encoding="utf-8"))
errors, ids = [], set()
for s in shoes:
    label = s.get("name", s.get("id", "?"))
    for k in REQUIRED:
        if k not in s:
            errors.append(f"{label}: missing '{k}'")
    cats = s.get("categories")
    if not isinstance(cats, list) or not cats or not set(cats) <= CATEGORIES:
        errors.append(f"{label}: categories must be a non-empty list from {sorted(CATEGORIES)}")
    if "price_source" in s and s["price_source"] not in ("kr_list", "estimate"):
        errors.append(f"{label}: price_source must be 'kr_list' or 'estimate'")
    if s.get("price_source") == "estimate" and not isinstance(s.get("price_usd"), int):
        errors.append(f"{label}: estimated prices need price_usd (the overseas list price shown to users)")
    for key in ('weight_g', 'drop_mm'):
        value = s.get(key)
        if value is not None and (isinstance(value, bool) or not isinstance(value, int) or value < 0):
            errors.append(f"{label}: invalid {key}")
    if s.get('source_product_id'):
        if not s.get('source_url', '').startswith('https://') or not s.get('specs_checked_at'):
            errors.append(f"{label}: verified products need source URL and check date")
    if "price_usd" in s and (not isinstance(s["price_usd"], int) or s["price_usd"] <= 0):
        errors.append(f"{label}: invalid price_usd")
    if not str(s.get("url", "")).startswith("https://"):
        errors.append(f"{label}: url must be the brand's https site")
    if s.get("id") in ids:
        errors.append(f"{label}: duplicate id {s.get('id')}")
    ids.add(s.get("id"))
    if not isinstance(s.get("price"), int) or s["price"] <= 0:
        errors.append(f"{label}: invalid price")
print(f"{len(shoes)} shoes, {len(errors)} errors")
for e in errors:
    print(" -", e)
sys.exit(1 if errors else 0)
