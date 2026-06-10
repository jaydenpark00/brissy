from fastapi import APIRouter
from pathlib import Path
import json

router = APIRouter()

_DATA_PATH = Path(__file__).parent.parent / "data" / "activities.json"


def _load() -> list[dict]:
    with open(_DATA_PATH, encoding="utf-8") as f:
        return json.load(f)["activities"]


TRIP_TYPE_TAGS: dict[str, list[str]] = {
    "자연": ["자연", "등산", "운동", "계곡", "드라이브", "스포츠"],
    "문화": ["문화", "역사", "도시", "사진"],
    "미식": ["미식", "카페"],
    "휴양": ["휴식", "바다", "야경", "가족", "커플", "혼자"],
}


@router.get("/activities")
def get_activities(
    grade: str | None = None,
    region: str | None = None,
    season: str | None = None,
    max_days: int | None = None,
    trip_type: str | None = None,
):
    items = _load()

    if grade:
        items = [a for a in items if grade in a["grade"]]
    if region:
        items = [a for a in items if a["region"] == region]
    if season:
        items = [a for a in items if season in a["season"]]
    if max_days:
        items = [a for a in items if a["duration_days"] <= max_days]
    if trip_type and trip_type in TRIP_TYPE_TAGS:
        target = TRIP_TYPE_TAGS[trip_type]
        items = [a for a in items if any(t in a["tags"] for t in target)]

    return {"activities": items, "total": len(items)}
