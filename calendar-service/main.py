import os
import json
import pathlib
import datetime
import requests
from uuid import uuid4
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

APP_FILE = "/data/events.json"
SCRAPER_HOST = os.getenv("SCRAPER_HOST", "http://scraper-ms:4004")
SCRAPER_HORARIO_CANDIDATES = [
    "/divisist/informacion_academica/horario",
    "/divisist/horario",
    "/informacion_academica/horario",
    "/horario",
    "/fetch-horario",
    "/divisist/informacion_academica/horario.json",
]
REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", "60"))

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

class FetchHorarioBody(BaseModel):
    ci_session: str
    user: Optional[str] = None

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

@app.post("/fetch-horario/")
def fetch_horario(body: FetchHorarioBody = Body(...)):
    """
    Proxy to scraper-ms to obtain the horario using ci_session.
    Returns JSON: { "horario": [...] }
    """
    ci_session = (body.ci_session or "").strip()
    if not ci_session:
        raise HTTPException(status_code=400, detail="ci_session required")

    last_err = None
    timeout = REQUEST_TIMEOUT

    for candidate in SCRAPER_HORARIO_CANDIDATES:
        url = SCRAPER_HOST.rstrip("/") + candidate
        try:
            resp = requests.get(url, params={"ci_session": ci_session}, timeout=timeout)
        except Exception as e:
            last_err = f"request failed for {url}: {e}"
            continue

        content_type = (resp.headers.get("Content-Type") or "").lower()

        if resp.status_code == 200:
            try:
                payload = resp.json()
            except Exception:
                snippet = resp.text[:1000]
                raise HTTPException(status_code=502, detail=f"scraper returned 200 but payload not JSON. snippet: {snippet}")

            if isinstance(payload, dict) and "horario" in payload:
                horario = payload.get("horario") or []
            else:
                horario = payload
            return {"horario": horario}

        if resp.status_code in (404, 500) or "text/html" in content_type:
            snippet = resp.text[:1200]
            last_err = f"{resp.status_code} from {url}: {snippet}"
            continue

        last_err = f"{resp.status_code} from {url}: {resp.text[:500]}"
        continue

    raise HTTPException(status_code=502, detail=f"scraper fetch failed. last error: {last_err}")

@app.get("/health")
def health():
    return {"status": "ok", "time": datetime.datetime.utcnow().isoformat() + "Z"}
