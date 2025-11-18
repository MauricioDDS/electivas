from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import uuid4
import pathlib, json, datetime

APP_FILE = "/data/events.json"

app = FastAPI(title="Calendar microservice")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class Event(BaseModel):
    id: Optional[str] = None
    title: str
    start: str
    end: Optional[str] = None
    allDay: Optional[bool] = False
    description: Optional[str] = None
    created_at: Optional[str] = None

def load_events() -> List[dict]:
    p = pathlib.Path(APP_FILE)
    if not p.exists():
        return []
    try:
        with p.open("r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def save_events(events: List[dict]):
    p = pathlib.Path(APP_FILE)
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("w", encoding="utf-8") as f:
        json.dump(events, f, ensure_ascii=False, indent=2)

@app.get("/events", response_model=List[Event])
def get_events():
    return load_events()

@app.post("/events", response_model=Event, status_code=201)
def create_event(e: Event):
    data = load_events()
    e.id = e.id or str(uuid4())
    e.created_at = datetime.datetime.utcnow().isoformat() + "Z"
    data.append(e.dict())
    save_events(data)
    return e

@app.put("/events/{event_id}", response_model=Event)
def update_event(event_id: str, e: Event):
    data = load_events()
    for i, ev in enumerate(data):
        if ev.get("id") == event_id:
            updated = ev.copy()
            updated.update(e.dict(exclude_unset=True))
            updated["id"] = event_id
            data[i] = updated
            save_events(data)
            return updated
    raise HTTPException(status_code=404, detail="Event not found")

@app.delete("/events/{event_id}", status_code=204)
def delete_event(event_id: str):
    data = load_events()
    new = [ev for ev in data if ev.get("id") != event_id]
    if len(new) == len(data):
        raise HTTPException(status_code=404, detail="Event not found")
    save_events(new)
    return
