from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import os
import pathlib
import requests
from typing import Optional
import uuid
import threading
from fastapi import BackgroundTasks
from fastapi.responses import FileResponse

app = FastAPI(title="Sistema de Pensum Universitario")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SCRAPER_HOST = os.getenv("SCRAPER_HOST", "http://scraper-ms:4004")
SCRAPER_PENSUM_PATH = os.getenv("SCRAPER_PENSUM_PATH", "/pensum")
SCRAPER_URL = SCRAPER_HOST.rstrip("/") + SCRAPER_PENSUM_PATH
ADMIN_KEY = os.getenv("ADMIN_KEY", "dev-admin-key")
COURSES_JSON_PATH = os.getenv("COURSES_JSON_PATH", "courses.json")
REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", "60"))

TASKS = {}

class SyncBody(BaseModel):
    ci_session: str
    delay: Optional[int] = None

# --- helpers ---
def load_courses_raw():
    """
    Devuelve el contenido crudo de courses.json (puede ser lista antigua,
    o dict con 'materias' como lo produce el scraper).
    """
    p = pathlib.Path(COURSES_JSON_PATH)
    if not p.exists():
        return None
    try:
        with p.open("r", encoding="utf-8-sig") as f:
            data = json.load(f)
            return data
    except Exception as e:
        print(f"[load_courses_raw] could not read {COURSES_JSON_PATH}: {e}")
        return None

def normalize_courses(data):
    """
    Normaliza las diferentes formas que puede devolver el archivo:
    - lista plana de materias -> devuelve la misma lista
    - dict pensum con 'materias' -> devuelve list(materias.values())
    - lista con un solo pensum obj -> devuelve list(pensum.materias.values())
    - None/otro -> devuelve []
    """
    if not data:
        return []
    if isinstance(data, list):

        if len(data) == 1 and isinstance(data[0], dict) and "materias" in data[0]:
            materias_map = data[0].get("materias", {})
            if isinstance(materias_map, dict):
                return list(materias_map.values())
            return []

        return list(data)
    if isinstance(data, dict):

        if "materias" in data and isinstance(data["materias"], dict):
            return list(data["materias"].values())
        return [data]
    return []

def atomic_write(path: pathlib.Path, raw_text: str):
    tmp = path.with_suffix(".tmp")
    tmp.write_text(raw_text, encoding="utf-8")
    tmp.replace(path)

def _background_sync(task_id: str, ci_session: str, delay: Optional[int] = None):
    """Background worker function. Runs inside thread."""
    TASKS[task_id] = {"status": "running", "msg": None, "saved_to": None}
    params = {"ci_session": ci_session}
    if delay is not None:
        params["delay"] = str(delay)

    try:
        timeout = int(os.getenv("REQUEST_TIMEOUT", "300"))
        resp = requests.get(SCRAPER_URL, params=params, timeout=timeout)

        if resp.status_code == 404:
            alt_url = SCRAPER_HOST.rstrip("/") + "/divisist/pensum"
            resp = requests.get(alt_url, params=params, timeout=timeout)

        if resp.status_code != 200:
            snippet = resp.text[:1000]
            TASKS[task_id].update({"status": "error", "msg": f"scraper returned {resp.status_code}: {snippet}"})
            return

        pensum_json = resp.json()

        if not isinstance(pensum_json, dict) or ("materias" not in pensum_json and not isinstance(pensum_json, list)):
            TASKS[task_id].update({"status": "error", "msg": "scraper response missing expected structure ('materias')" })
            return

        p = pathlib.Path(COURSES_JSON_PATH)
        pretty = json.dumps(pensum_json, ensure_ascii=False, indent=2)
        atomic_write(p, pretty)

        TASKS[task_id].update({"status": "success", "msg": "saved", "saved_to": str(p.resolve())})
    except Exception as e:
        TASKS[task_id].update({"status": "error", "msg": str(e)})

@app.post("/sync-pensum-async/")
def sync_pensum_async(body: SyncBody, background_tasks: BackgroundTasks, request: Request):
    header_admin = request.headers.get("X-ADMIN-KEY", "")
    if header_admin != ADMIN_KEY:
        raise HTTPException(status_code=403, detail="forbidden")

    ci_session = (body.ci_session or "").strip()
    if not ci_session:
        raise HTTPException(status_code=400, detail="ci_session required")

    task_id = str(uuid.uuid4())
    TASKS[task_id] = {"status": "pending", "msg": None, "saved_to": None}

    thread = threading.Thread(target=_background_sync, args=(task_id, ci_session, body.delay), daemon=True)
    thread.start()

    return {"task_id": task_id, "status": "started"}

@app.get("/raw-courses")
def raw_courses():
    p = pathlib.Path(COURSES_JSON_PATH)
    if not p.exists():
        raise HTTPException(status_code=404, detail="file not found")
    return FileResponse(str(p))

@app.get("/sync-status/{task_id}")
def sync_status(task_id: str, request: Request):
    header_admin = request.headers.get("X-ADMIN-KEY", "")
    if header_admin != ADMIN_KEY:
        raise HTTPException(status_code=403, detail="forbidden")

    if task_id not in TASKS:
        raise HTTPException(status_code=404, detail="task not found")
    return TASKS[task_id]

@app.get("/courses")
def get_courses(tipo: Optional[str] = None):
    """
    Devuelve SIEMPRE una lista plana de materias.
    """
    raw = load_courses_raw()
    courses_list = normalize_courses(raw)

    if tipo:
        try:
            return [c for c in courses_list if (c.get("tipo") or c.get("tipo") or "").lower() == tipo.lower()]
        except Exception:
            return []
    return courses_list

@app.get("/course/{code}")
def get_course(code: str):
    """
    Busca una materia por su código (codigo) en el pensum.
    Acepta código como string (p. ej. "1155101").
    """
    raw = load_courses_raw()
    courses_list = normalize_courses(raw)

    for c in courses_list:
        try:
            if str(c.get("codigo", "")).strip() == str(code).strip():
                return c
        except Exception:
            continue
    raise HTTPException(status_code=404, detail="Materia no encontrada")

@app.post("/sync-pensum/")
def sync_pensum(body: SyncBody, request: Request):
    header_admin = request.headers.get("X-ADMIN-KEY", "")
    if header_admin != ADMIN_KEY:
        raise HTTPException(status_code=403, detail="forbidden")

    ci_session = (body.ci_session or "").strip()
    if not ci_session:
        raise HTTPException(status_code=400, detail="ci_session required")

    params = {"ci_session": ci_session}
    if body.delay is not None:
        params["delay"] = str(body.delay)

    try:
        resp = requests.get(SCRAPER_URL, params=params, timeout=REQUEST_TIMEOUT)
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"scraper unreachable: {e}")

    if resp.status_code == 404:
        alt_path = "/divisist/pensum"
        alt_url = SCRAPER_HOST.rstrip("/") + alt_path
        try:
            resp = requests.get(alt_url, params=params, timeout=REQUEST_TIMEOUT)
        except requests.RequestException as e:
            raise HTTPException(status_code=502, detail=f"scraper unreachable (fallback): {e}")

    if resp.status_code != 200:
        snippet = resp.text[:1000]
        raise HTTPException(status_code=502, detail=f"scraper returned {resp.status_code}: {snippet}")

    try:
        pensum_json = resp.json()
    except ValueError:
        raise HTTPException(status_code=502, detail="scraper returned invalid JSON")

    if not isinstance(pensum_json, dict) or ("materias" not in pensum_json and not isinstance(pensum_json, list)):
        raise HTTPException(status_code=502, detail="scraper response missing expected structure ('materias' key)")

    try:
        p = pathlib.Path(COURSES_JSON_PATH)
        pretty = json.dumps(pensum_json, ensure_ascii=False, indent=2)
        atomic_write(p, pretty)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"could not write courses.json: {e}")

    total_mat = 0
    try:
        if isinstance(pensum_json, dict) and "materias" in pensum_json:
            total_mat = len(pensum_json.get("materias", {}))
        elif isinstance(pensum_json, list):
            total_mat = len(pensum_json)
    except Exception:
        total_mat = 0

    return {"status": "ok", "saved_to": str(p.resolve()), "total_materias": total_mat}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000)
