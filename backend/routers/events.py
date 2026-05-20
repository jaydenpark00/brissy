from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import date
from backend.supabase_client import supabase

router = APIRouter()


class EventCreate(BaseModel):
    user_id: str
    date: date
    label: str


@router.post("/events", status_code=200)
def create_event(event: EventCreate):
    res = supabase.table("events").insert({
        "user_id": event.user_id,
        "date": str(event.date),
        "label": event.label,
    }).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create event")
    return res.data[0]


@router.get("/events")
def get_events(month: str, userId: str):
    """month: YYYY-MM"""
    start = f"{month}-01"
    year, mon = map(int, month.split("-"))
    import calendar
    last_day = calendar.monthrange(year, mon)[1]
    end = f"{month}-{last_day:02d}"

    res = (
        supabase.table("events")
        .select("*")
        .eq("user_id", userId)
        .gte("date", start)
        .lte("date", end)
        .order("date")
        .execute()
    )
    return res.data


@router.delete("/events/{event_id}", status_code=204)
def delete_event(event_id: str):
    res = supabase.table("events").delete().eq("id", event_id).execute()
    if res.data is None:
        raise HTTPException(status_code=404, detail="Event not found")
