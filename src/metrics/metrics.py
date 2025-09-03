from typing import Dict, Any
from pydantic import BaseModel


class Metric(BaseModel):
    key: str
    value: Dict[str, Any]


def compute_bias(text: str) -> Metric:
    # Placeholder: run a model or heuristic to compute bias score
    score = {"bias_score": 0.0, "notes": "placeholder"}
    return Metric(key="bias", value=score)


def compute_toxicity(text: str) -> Metric:
    return Metric(key="toxicity", value={"toxicity_score": 0.0})
