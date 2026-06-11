from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import date
from backend.supabase_client import supabase
from typing import Optional

router = APIRouter()


class EventCreate(BaseModel):
    user_id: str = "default-user"
    date: date
    label: str

class EventUpdate(BaseModel):
    date: Optional[date] = None
    label: Optional[str] = None

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
def get_events(month: str, userId: str = "default-user"):
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

@router.put("/events/{event_id}", status_code=200)
def update_event(event_id: str, event_data: EventUpdate):
    update_data = {}
    if event_data.date is not None:
        update_data["date"] = str(event_data.date)
    if event_data.label is not None:
        update_data["label"] = event_data.label

    if not update_data:
        raise HTTPException(status_code=400, detail="수정할 데이터를 입력해주세요.")

    res = supabase.table("events").update(update_data).eq("id", event_id).execute()

    if not res.data:
        raise HTTPException(status_code=404, detail="해당 일정을 찾을 수 없거나 수정에 실패했습니다.")

    return res.data[0]