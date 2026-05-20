from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import date
from backend.supabase_client import supabase

router = APIRouter()


class ConfirmedCreate(BaseModel):
    user_id: str
    date: date
    activity: str
    grade: str


@router.post("/confirmed", status_code=200)
def create_confirmed(body: ConfirmedCreate):
    res = supabase.table("confirmed").insert({
        "user_id": body.user_id,
        "date": str(body.date),
        "activity": body.activity,
        "grade": body.grade,
    }).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to save confirmed activity")
    return res.data[0]


@router.get("/confirmed")
def get_confirmed(month: str, userId: str):
    """month: YYYY-MM"""
    import calendar
    start = f"{month}-01"
    year, mon = map(int, month.split("-"))
    last_day = calendar.monthrange(year, mon)[1]
    end = f"{month}-{last_day:02d}"

    res = (
        supabase.table("confirmed")
        .select("*")
        .eq("user_id", userId)
        .gte("date", start)
        .lte("date", end)
        .order("date")
        .execute()
    )
    return res.data
