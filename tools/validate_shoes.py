"""Validate shoes_data.json. Usage: python tools/validate_shoes.py"""
import json
import sys
from pathlib import Path

CATEGORIES = {"running", "walking", "daily"}  # fashion/lifestyle sneakers are out of scope
REQUIRED = ["id", "name", "brand", "price", "weight_g", "category", "cushion", "terrain", "score_base", "url"]

shoes = json.loads((Path(__file__).parent.parent / "shoes_data.json").read_text(encoding="utf-8"))
errors, ids = [], set()
for s in shoes:
    label = s.get("name", s.get("id", "?"))
    for k in REQUIRED:
        if k not in s:
            errors.append(f"{label}: missing '{k}'")
    if s.get("category") not in CATEGORIES:
        errors.append(f"{label}: category must be one of {sorted(CATEGORIES)}")
    if s.get("id") in ids:
        errors.append(f"{label}: duplicate id {s.get('id')}")
    ids.add(s.get("id"))
    if not isinstance(s.get("price"), int) or s["price"] <= 0:
        errors.append(f"{label}: invalid price")
print(f"{len(shoes)} shoes, {len(errors)} errors")
for e in errors:
    print(" -", e)
sys.exit(1 if errors else 0)
