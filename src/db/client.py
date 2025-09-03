import os
import json
from typing import List, Dict, Any

DATA_DIR = os.environ.get("DATA_DIR", "./data")
os.makedirs(DATA_DIR, exist_ok=True)


def save_individual(ind: Dict[str, Any]) -> str:
    path = os.path.join(DATA_DIR, f"individual_{ind.get('canonical_name','anon')}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(ind, f)
    return path


def list_individuals() -> List[str]:
    return [f for f in os.listdir(DATA_DIR) if f.startswith("individual_")]
