from fastapi import APIRouter
from datetime import date, timedelta
import calendar
from backend.supabase_client import supabase

router = APIRouter()

WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def _grade(days: list[date]) -> str:
    n = len(days)
    if n >= 4:
        return "S"
    if n == 3:
        return "A"
    if n == 2:
        has_weekend = any(d.weekday() >= 5 for d in days)
        return "B" if has_weekend else "C"
    return "D"


def _group_consecutive(dates: list[date]) -> list[list[date]]:
    if not dates:
        return []
    groups: list[list[date]] = [[dates[0]]]
    for d in dates[1:]:
        if d - groups[-1][-1] == timedelta(days=1):
            groups[-1].append(d)
        else:
            groups.append([d])
    return groups


@router.get("/free-windows")
def get_free_windows(month: str, userId: str = None):
    """month: YYYY-MM"""
    year, mon = map(int, month.split("-"))
    last_day = calendar.monthrange(year, mon)[1]
    all_days = [date(year, mon, d) for d in range(1, last_day + 1)]

    start = str(all_days[0])
    end = str(all_days[-1])
    q = (
        supabase.table("events")
        .select("date")
        .gte("date", start)
        .lte("date", end)
    )
    if userId:
        q = q.eq("user_id", userId)
    res = q.execute()
    busy = {row["date"] for row in (res.data or [])}

    free_days = sorted([d for d in all_days if str(d) not in busy])
    groups = _group_consecutive(free_days)

    windows = []
    for group in groups:
        grade = _grade(group)
        windows.append({
            "dates": [str(d) for d in group],
            "duration_days": len(group),
            "grade": grade,
            "has_weekend": any(d.weekday() >= 5 for d in group),
        })

    windows.sort(key=lambda w: ("S", "A", "B", "C", "D").index(w["grade"]))
    return {"month": month, "free_windows": windows}
