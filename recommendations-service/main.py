from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Tuple
import os
import httpx

AUTH_ME_URL = os.getenv("AUTH_ME_URL", "http://auth-ms:8000/api/auth/me/")
COURSES_HOST = os.getenv("COURSES_HOST", "http://courses-ms:8000")
COURSES_PATH = os.getenv("COURSES_PATH", "/courses")

DEFAULT_MAX_CREDITS = int(os.getenv("MAX_CREDITS_DEFAULT", "20"))

app = FastAPI(
    title="Recommendations Service",
    description="Microservicio para recomendar un horario a partir de las materias disponibles.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # ajusta si quieres restringir al frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ===================== MODELOS =====================

class ScheduleRequest(BaseModel):
    max_credits: int = Field(DEFAULT_MAX_CREDITS, ge=1, le=30)
    include_electives: bool = True


class GroupSlot(BaseModel):
    dia: int
    hora_inicio: int
    hora_fin: int
    salon: Optional[str] = None


class CourseSchedule(BaseModel):
    codigo: str
    nombre: str
    creditos: int
    is_electiva: bool
    semestre: Optional[int] = None
    grupo: Optional[str] = None
    slots: List[GroupSlot]


class ScheduleResponse(BaseModel):
    user: Dict[str, Any]
    total_credits: int
    max_credits: int
    courses: List[CourseSchedule]
    skipped_for_conflicts: List[str]
    raw_courses: List[Dict[str, Any]]


# ===================== UTILIDADES =====================

async def get_current_user(request: Request) -> Dict[str, Any]:
    token = request.headers.get("Authorization")
    if not token:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(AUTH_ME_URL, headers={"Authorization": token})

    if resp.status_code != 200:
        raise HTTPException(
            status_code=401,
            detail=f"Auth service rejected token (status {resp.status_code})",
        )
    return resp.json()


async def fetch_courses() -> List[Dict[str, Any]]:
    url = COURSES_HOST.rstrip("/") + COURSES_PATH
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url)

    if resp.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"courses-ms returned {resp.status_code}: {resp.text[:500]}",
        )

    data = resp.json()
    if not isinstance(data, list):
        raise HTTPException(status_code=500, detail="courses-ms returned invalid format")
    return data


def is_course_available(c: Dict[str, Any]) -> bool:
    """
    Consideramos 'disponible' una materia que:
    - tiene créditos > 0
    - tiene al menos un grupo con CLASES definidas y cupos disponibles
    """
    creditos = int(c.get("creditos") or 0)
    if creditos <= 0:
        return False

    grupos = c.get("grupos") or {}
    if not isinstance(grupos, dict) or not grupos:
        return False

    for g in grupos.values():
        # estado 0 = activo / abierto (según tu JSON)
        if g.get("estado", 0) != 0:
            continue

        # si quieres tener en cuenta cupos:
        disponible = int(g.get("disponible") or 0)
        if disponible <= 0:
            continue

        clases = g.get("clases") or []
        if isinstance(clases, list) and clases:
            return True

    return False

def separate_courses(courses: List[Dict[str, Any]], include_electives: bool) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    required: List[Dict[str, Any]] = []
    electives: List[Dict[str, Any]] = []

    for c in courses:
        if not is_course_available(c):
            continue
        is_electiva = bool(c.get("isElectiva"))
        if is_electiva:
            electives.append(c)
        else:
            required.append(c)

    # Ordenamos por semestre ascendente y código
    def key(c):
        sem = c.get("semestre")
        try:
            sem_val = int(sem) if sem is not None else 99
        except Exception:
            sem_val = 99
        return (sem_val, str(c.get("codigo") or ""))

    required.sort(key=key)
    electives.sort(key=key)

    if not include_electives:
        electives = []

    return required, electives


def select_courses(required: List[Dict[str, Any]], electives: List[Dict[str, Any]], max_credits: int) -> List[Dict[str, Any]]:
    selected: List[Dict[str, Any]] = []
    total_credits = 0

    def add_list(lst: List[Dict[str, Any]]):
        nonlocal total_credits, selected
        for c in lst:
            creditos = int(c.get("creditos") or 0)
            if creditos <= 0:
                continue
            if total_credits + creditos > max_credits:
                continue
            selected.append(c)
            total_credits += creditos

    # Primero obligatorias, luego electivas
    add_list(required)
    add_list(electives)
    return selected


def slots_conflict(a: Dict[str, Any], b: Dict[str, Any]) -> bool:
    try:
        dia_a = int(a.get("dia"))
        dia_b = int(b.get("dia"))
        if dia_a != dia_b:
            return False
        h1_start = int(a.get("horaInicio"))
        h1_end = int(a.get("horaFin"))
        h2_start = int(b.get("horaInicio"))
        h2_end = int(b.get("horaFin"))
    except Exception:
        return False

    # solapan si los intervalos se cruzan
    return not (h1_end <= h2_start or h2_end <= h1_start)


def choose_group_for_course(course: Dict[str, Any], occupied: List[Dict[str, Any]]) -> Tuple[Optional[str], List[Dict[str, Any]]]:
    grupos = course.get("grupos") or {}
    if not isinstance(grupos, dict) or not grupos:
        return None, []

    for group_code, group in grupos.items():
        # Solo grupos activos
        if group.get("estado", 0) != 0:
            continue

        # Solo grupos con cupos
        disponible = int(group.get("disponible") or 0)
        if disponible <= 0:
            continue

        clases = group.get("clases") or []
        if not isinstance(clases, list) or not clases:
            continue

        conflict = False
        for slot in clases:
            for occ in occupied:
                if slots_conflict(slot, occ):
                    conflict = True
                    break
            if conflict:
                break

        if not conflict:
            # usamos 'clases' como horario del grupo
            return str(group_code), clases

    return None, []


def map_slot(slot: Dict[str, Any]) -> GroupSlot:
    return GroupSlot(
        dia=int(slot.get("dia")),
        hora_inicio=int(slot.get("horaInicio")),
        hora_fin=int(slot.get("horaFin")),
        salon=str(slot.get("salon") or "") or None,
    )


# ===================== ENDPOINTS =====================

@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/recommend-schedule", response_model=ScheduleResponse)
async def recommend_schedule(
    body: ScheduleRequest,
    user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Genera un horario recomendado:
    - lee las materias desde courses-ms (/courses)
    - filtra materias 'disponibles'
    - selecciona materias hasta max_credits priorizando obligatorias
    - asigna grupos evitando choques de horario
    """
    courses = await fetch_courses()
    required, electives = separate_courses(courses, body.include_electives)
    selected = select_courses(required, electives, body.max_credits)

    occupied_slots: List[Dict[str, Any]] = []
    response_courses: List[CourseSchedule] = []
    skipped_conflicts: List[str] = []
    total_credits = 0

    for c in selected:
        group_code, horario = choose_group_for_course(c, occupied_slots)
        if group_code is None:
            skipped_conflicts.append(str(c.get("codigo") or ""))
            continue

        for slot in horario:
            occupied_slots.append(slot)

        creditos = int(c.get("creditos") or 0)
        total_credits += creditos

        response_courses.append(
            CourseSchedule(
                codigo=str(c.get("codigo") or ""),
                nombre=str(c.get("nombre") or c.get("materia") or ""),
                creditos=creditos,
                is_electiva=bool(c.get("isElectiva")),
                semestre=c.get("semestre"),
                grupo=group_code,
                slots=[map_slot(s) for s in horario],
            )
        )

    return ScheduleResponse(
        user=user,
        total_credits=total_credits,
        max_credits=body.max_credits,
        courses=response_courses,
        skipped_for_conflicts=skipped_conflicts,
        raw_courses=courses,
    )

# opcional: mantener /study-plan como alias para no romper nada
@app.post("/study-plan", response_model=ScheduleResponse)
async def study_plan_alias(body: ScheduleRequest, user: Dict[str, Any] = Depends(get_current_user)):
    return await recommend_schedule(body, user)
