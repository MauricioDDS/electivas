from fastapi import FastAPI, HTTPException, Request, BackgroundTasks, Header, Response, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import os
import pathlib
import requests
from typing import Optional
import uuid
import threading
from fastapi.responses import FileResponse, JSONResponse
import pika
import datetime


app = FastAPI(title="Sistema de Pensum Universitario")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "rabbitmq")
RABBITMQ_PORT = int(os.getenv("RABBITMQ_PORT", "5672"))
RABBITMQ_USER = os.getenv("RABBITMQ_USER", "guest")
RABBITMQ_PASS = os.getenv("RABBITMQ_PASS", "guest")
EMAIL_QUEUE = os.getenv("EMAIL_QUEUE", "email_queue")
SCRAPER_HOST = os.getenv("SCRAPER_HOST", "http://scraper-ms:4004")
SCRAPER_PENSUM_PATH = os.getenv("SCRAPER_PENSUM_PATH", "/pensum")
SCRAPER_URL = SCRAPER_HOST.rstrip("/") + SCRAPER_PENSUM_PATH
ADMIN_KEY = os.getenv("ADMIN_KEY", "dev-admin-key")
COURSES_JSON_PATH = os.getenv("COURSES_JSON_PATH", "courses.json")
REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", "60"))
NEW_GROUP_QUEUE = os.getenv("NEW_GROUP_QUEUE", "new_group_notification")

TASKS = {}

class SyncBody(BaseModel):
    ci_session: str
    delay: Optional[int] = None

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

def publish_email_message(payload: dict):
    """Publish a JSON message to RabbitMQ (blocking)."""
    credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASS)
    params = pika.ConnectionParameters(host=RABBITMQ_HOST, port=RABBITMQ_PORT, credentials=credentials)
    try:
        connection = pika.BlockingConnection(params)
        channel = connection.channel()
        channel.queue_declare(queue=EMAIL_QUEUE, durable=True)
        channel.basic_publish(
            exchange="",
            routing_key=EMAIL_QUEUE,
            body=json.dumps(payload),
            properties=pika.BasicProperties(delivery_mode=2),  # persistent
        )
        connection.close()
        print("[publish_email_message] published to queue")
    except Exception as e:
        print(f"[publish_email_message] error publishing: {e}")
        raise

class CupoRequest(BaseModel):
    course_code: str
    group_name: str
    user_email: str
    message: Optional[str] = ""

@app.post("/request-cupo")
async def request_cupo(body: CupoRequest, request: Request):
    header_admin = request.headers.get("X-ADMIN-KEY", "")
    if header_admin != ADMIN_KEY:
        raise HTTPException(status_code=403, detail="forbidden")

    to_email = os.getenv("EMAIL_TO", body.user_email)
    payload = {
        "to": to_email,
        "subject": f"Solicitud de cupo: {body.course_code} ({body.group_name})",
        "body": (
            f"El estudiante {body.user_email} solicita cupo en {body.group_name} de {body.course_code}.\n\n"
            f"Mensaje:\n{body.message or '(sin mensaje)'}"
        ),
        "meta": {
            "course_code": body.course_code,
            "group_name": body.group_name,
            "requester": body.user_email,
        },
    }

    try:
        publish_email_message(payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to queue email: {e}")

    return {"status": "queued", "message": "Solicitud encolada correctamente"}

class GroupCreate(BaseModel):
    group_name: str
    schedule: str
    available_slots: int
    professor: str | None = None

def publish_to_queue(queue_name, message):
    credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASS)
    params = pika.ConnectionParameters(host=RABBITMQ_HOST, credentials=credentials)
    connection = None
    try:
        connection = pika.BlockingConnection(params)
        channel = connection.channel()
        channel.queue_declare(queue=queue_name, durable=True)
        channel.basic_publish(
            exchange="",
            routing_key=queue_name,
            body=json.dumps(message),
            properties=pika.BasicProperties(delivery_mode=2),
        )
        print(f"[publish_to_queue] published to queue {queue_name}")
    except Exception as e:
        print(f"[publish_to_queue] error publishing to {queue_name}: {e}")
        raise
    finally:
        if connection and connection.is_open:
            try:
                connection.close()
            except Exception:
                pass

@app.post("/courses/{course_code}/groups")
def create_group(course_code: str, group: GroupCreate, x_admin_key: str = Header(None), response: Response = None):
    if x_admin_key != ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Not authorized")

    group_payload = {
        "group_name": group.group_name,
        "schedule": group.schedule,
        "available_slots": group.available_slots,
        "professor": group.professor,
    }

    raw = load_courses_raw()
    if raw is None:
        raise HTTPException(status_code=500, detail="courses.json not found or unreadable")

    try:
        new_group_id = _find_and_add_group_in_raw(raw, course_code, group_payload)
    except KeyError as ke:
        raise HTTPException(status_code=404, detail=str(ke))
    except Exception as e:
        print(f"[create_group] error adding group to raw data: {e}")
        raise HTTPException(status_code=500, detail="Failed to add group to courses.json")

    try:
        saved_to = save_raw_courses(raw)
        print(f"[create_group] wrote new group {new_group_id} to {saved_to}")
    except Exception as e:
        print(f"[create_group] error writing courses.json: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to persist courses.json: {e}")

    publish_error = None
    try:
        publish_to_queue(
            NEW_GROUP_QUEUE,
            {
                "type": "new_group",
                "course_name": course_code,
                "group_id": new_group_id,
                **group_payload,
            },
        )
        print(f"[create_group] published new_group for {course_code} group_id={new_group_id}")
    except Exception as e:
        publish_error = str(e)
        print(f"[create_group] publish failed: {publish_error}")

    result = {
        "message": "Group created and saved to courses.json",
        "group": {
            "group_id": new_group_id,
            **group_payload,
        },
        "saved_to": saved_to,
    }

    if publish_error:
        result["warning"] = "failed to publish notification"
        result["publish_error"] = publish_error
        response.status_code = 201
        return result

    response.status_code = 201
    result["detail"] = "published to queue"
    return result

def save_raw_courses(raw_data):
    """
    Persist the raw_data object to COURSES_JSON_PATH using atomic_write.
    """
    try:
        p = pathlib.Path(COURSES_JSON_PATH)
        pretty = json.dumps(raw_data, ensure_ascii=False, indent=2)
        atomic_write(p, pretty)
        return str(p.resolve())
    except Exception as e:
        raise

def _find_and_add_group_in_raw(raw, course_code, group_payload):
    """
    Mutates `raw` and adds a group entry for course_code.
    Returns the generated group_id.
    Supports these formats of courses.json:
      - dict with key "materias" -> materias is a dict of codigo -> materia
      - list of course objects -> each has 'codigo'
      - single dict representing a course
    """
    group_id = str(uuid.uuid4())
    group_obj = {
        "id": group_id,
        "group_name": group_payload.get("group_name"),
        "nombre": group_payload.get("group_name"),
        "schedule": group_payload.get("schedule"),
        "horario": group_payload.get("schedule"),
        "available_slots": int(group_payload.get("available_slots") or 0),
        "disponible": int(group_payload.get("available_slots") or 0),
        "professor": group_payload.get("professor"),
        "profesor": group_payload.get("professor"),
    }

    if isinstance(raw, dict) and "materias" in raw and isinstance(raw["materias"], dict):
        materias = raw["materias"]
        if course_code not in materias:
            raise KeyError(f"course {course_code} not found in materias")
        materia = materias[course_code]
        if not isinstance(materia, dict):
            raise TypeError("materia entry is not a dict")
        grupos = materia.get("grupos")
        if grupos is None:
            materia["grupos"] = {}
            grupos = materia["grupos"]
        grupos[group_id] = group_obj
        return group_id

    if isinstance(raw, list):
        for c in raw:
            try:
                if str(c.get("codigo", "")).strip() == str(course_code).strip():
                    if "grupos" not in c or not isinstance(c["grupos"], dict):
                        c["grupos"] = {}
                    c["grupos"][group_id] = group_obj
                    return group_id
            except Exception:
                continue
        raise KeyError(f"course {course_code} not found in list")

    if isinstance(raw, dict):
        try:
            if str(raw.get("codigo", "")).strip() == str(course_code).strip():
                if "grupos" not in raw or not isinstance(raw["grupos"], dict):
                    raw["grupos"] = {}
                raw["grupos"][group_id] = group_obj
                return group_id
        except Exception:
            pass

    raise KeyError(f"course {course_code} not found in courses.json")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000)
