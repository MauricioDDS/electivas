# routers/bocetos.py
from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.orm import Session
from database import SessionLocal
from models import DraftSchedule, DraftGroup, StudentSchedule, ScheduledGroup
from schemas import DraftCreate, DraftOut, AddGroupIn, DraftOutCourse
import os, json, requests
from typing import List, Optional

router = APIRouter(tags=["bocetos"])

COURSE_SERVICE = os.getenv("COURSE_SERVICE", "http://courses-ms:8000")
AUTH_SERVICE_ME = os.getenv("AUTH_SERVICE_ME", None)
MAX_CREDITS = int(os.getenv("MAX_CREDITS", "20"))

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- auth helper: validate token by calling auth-ms /api/auth/me/ (if configured)
def validate_token(auth_header: Optional[str]):
    if not auth_header:
        raise HTTPException(status_code=401, detail="Authorization header required")
    if not AUTH_SERVICE_ME:
        # no remote validation configured; accept but return minimal user
        return {"email": "unknown", "id": None}
    try:
        resp = requests.get(AUTH_SERVICE_ME, headers={"Authorization": auth_header}, timeout=5)
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="invalid token")
        return resp.json()
    except requests.RequestException:
        raise HTTPException(status_code=502, detail="auth service unreachable")

# utility: parse minutes
def to_minutes(hhmm):
    h,m = hhmm.split(":")
    return int(h)*60 + int(m)

def overlaps(a_start, a_end, b_start, b_end):
    return not (to_minutes(a_end) <= to_minutes(b_start) or to_minutes(b_end) <= to_minutes(a_start))

# --- create draft
@router.post("/", response_model=DraftOut, status_code=201)
def create_boceto(payload: DraftCreate, Authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    # validate token
    userinfo = validate_token(Authorization)
    # note: additional ownership validation can be added
    d = DraftSchedule(student_id=payload.student_id, semester=payload.semester, name=payload.name, description=payload.description)
    db.add(d)
    db.commit()
    db.refresh(d)

    # attempt to pre-populate candidate groups from course-service for that semester
    courses = []
    try:
        resp = requests.get(f"{COURSE_SERVICE}/courses", timeout=8)
        if resp.ok:
            all_courses = resp.json()
            # filter by semester if provided
            if payload.semester:
                all_courses = [c for c in all_courses if (c.get("semestre") == payload.semester or str(c.get("semestre"))==str(payload.semester))]
            # for each course try to extract groups/clases and add as DraftGroup candidates with meta
            for c in all_courses:
                codigo = str(c.get("codigo") or c.get("code") or c.get("id"))
                nombre = c.get("nombre") or c.get("name")
                grupos = c.get("grupos") or c.get("grupos") or {}
                # grupos can be dict or list
                if isinstance(grupos, dict):
                    for gid, gobj in grupos.items():
                        clases = gobj.get("clases") or gobj.get("horario") or gobj.get("schedule") or []
                        for clase in clases:
                            dia = clase.get("dia")
                            hi = clase.get("horaInicio") or clase.get("hora_inicio") or clase.get("start")
                            hf = clase.get("horaFin") or clase.get("hora_fin") or clase.get("end")
                            def to_hhmm(v):
                                if v is None:
                                    return None
                                try:
                                    vi = int(v)
                                    return f"{vi:02d}:00"
                                except:
                                    return str(v)
                            start = to_hhmm(hi)
                            end = to_hhmm(hf)
                            if start and end:
                                dg = DraftGroup(boceto_id=d.id, course_code=codigo, course_name=nombre, group_name=str(gid), day=str(dia), start=start, end=end, meta=json.dumps({"raw_group": gobj}))
                                db.add(dg)
                elif isinstance(grupos, list):
                    for gobj in grupos:
                        clases = gobj.get("clases") or gobj.get("horario") or []
                        for clase in clases:
                            dia = clase.get("dia")
                            hi = clase.get("horaInicio") or clase.get("start")
                            hf = clase.get("horaFin") or clase.get("end")
                            def to_hhmm(v):
                                if v is None:
                                    return None
                                try:
                                    vi = int(v)
                                    return f"{vi:02d}:00"
                                except:
                                    return str(v)
                            start = to_hhmm(hi)
                            end = to_hhmm(hf)
                            if start and end:
                                dg = DraftGroup(boceto_id=d.id, course_code=codigo, course_name=nombre, group_name=gobj.get("nombre") or gobj.get("group_name"), day=str(dia), start=start, end=end, meta=json.dumps({"raw_group": gobj}))
                                db.add(dg)
            db.commit()
        else:
            # ignore non-ok
            pass
    except Exception:
        # ignore fetch errors - service should still function
        pass

    # Build response
    rows = db.query(DraftGroup).filter(DraftGroup.boceto_id == d.id).all()
    out = []
    for r in rows:
        out.append({"id": r.id, "course_code": r.course_code, "course_name": r.course_name, "group_name": r.group_name, "day": r.day, "start": r.start, "end": r.end, "meta": json.loads(r.meta) if r.meta else None})
    return {"id": d.id, "student_id": d.student_id, "semester": d.semester, "name": d.name, "description": d.description, "created_at": d.created_at, "courses": out}

# --- list drafts for student
@router.get("/", response_model=List[DraftOut])
def list_bocetos(student_id: Optional[int] = None, Authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    _ = validate_token(Authorization)
    if not student_id:
        raise HTTPException(status_code=400, detail="student_id required as query param")
    drafts = db.query(DraftSchedule).filter(DraftSchedule.student_id == student_id).order_by(DraftSchedule.created_at.desc()).all()
    out=[]
    for d in drafts:
        rows = db.query(DraftGroup).filter(DraftGroup.boceto_id == d.id).all()
        courses=[]
        for r in rows:
            courses.append(DraftOutCourse(
                id=r.id, course_code=r.course_code, course_name=r.course_name, group_name=r.group_name,
                day=r.day, start=r.start, end=r.end, meta=json.loads(r.meta) if r.meta else None
            ))
        out.append({"id": d.id, "student_id": d.student_id, "semester": d.semester, "name": d.name, "description": d.description, "created_at": d.created_at, "courses": courses})
    return out

# --- get boceto
@router.get("/{boceto_id}", response_model=DraftOut)
def get_boceto(boceto_id: int, Authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    _ = validate_token(Authorization)
    d = db.query(DraftSchedule).filter(DraftSchedule.id == boceto_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="boceto not found")
    rows = db.query(DraftGroup).filter(DraftGroup.boceto_id == d.id).all()
    courses=[]
    for r in rows:
        courses.append(DraftOutCourse(
            id=r.id, course_code=r.course_code, course_name=r.course_name, group_name=r.group_name,
            day=r.day, start=r.start, end=r.end, meta=json.loads(r.meta) if r.meta else None
        ))
    return {"id": d.id, "student_id": d.student_id, "semester": d.semester, "name": d.name, "description": d.description, "created_at": d.created_at, "courses": courses}

# --- add a group to boceto (manual)
@router.post("/{boceto_id}/groups", status_code=201)
def add_group(boceto_id: int, payload: AddGroupIn, Authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    _ = validate_token(Authorization)
    boc = db.query(DraftSchedule).filter(DraftSchedule.id == boceto_id).first()
    if not boc:
        raise HTTPException(status_code=404, detail="boceto not found")

    # collect existing schedules in this boceto to validate conflicts
    existing = db.query(DraftGroup).filter(DraftGroup.boceto_id == boceto_id).all()
    for ex in existing:
        if ex.day and payload.schedule:
            for s in payload.schedule:
                if ex.day.strip().lower() == s.dia.strip().lower():
                    if ex.start and ex.end and overlaps(ex.start, ex.end, s.start, s.end):
                        raise HTTPException(status_code=409, detail=f"conflict with {ex.course_code} {ex.group_name} at {ex.day} {ex.start}-{ex.end}")

    # credit limit check: sum credits in boceto + new
    current_credits = 0
    rows = db.query(DraftGroup).filter(DraftGroup.boceto_id == boceto_id).all()
    for r in rows:
        try:
            meta = json.loads(r.meta) if r.meta else {}
            current_credits += int(meta.get("credits", 0))
        except:
            pass
    add_credits = int(payload.credits or 0)
    if (current_credits + add_credits) > MAX_CREDITS:
        raise HTTPException(status_code=400, detail=f"credit limit exceeded (current={current_credits}, adding={add_credits}, max={MAX_CREDITS})")

    # add groups (if schedule list provided create one DraftGroup per class)
    if payload.schedule:
        created=[]
        for s in payload.schedule:
            dg = DraftGroup(boceto_id=boceto_id, course_code=payload.course_code, course_name=payload.course_name, group_name=payload.group_name or "", day=s.dia, start=s.start, end=s.end, meta=json.dumps(payload.meta or {}))
            db.add(dg)
            db.commit()
            db.refresh(dg)
            created.append({"id": dg.id, "course_code": dg.course_code, "course_name": dg.course_name, "group_name": dg.group_name, "day": dg.day, "start": dg.start, "end": dg.end})
        return {"created": created}
    else:
        dg = DraftGroup(boceto_id=boceto_id, course_code=payload.course_code, course_name=payload.course_name, group_name=payload.group_name or "", meta=json.dumps(payload.meta or {}))
        db.add(dg)
        db.commit()
        db.refresh(dg)
        return {"id": dg.id, "course_code": dg.course_code, "course_name": dg.course_name, "group_name": dg.group_name}

# --- remove group
@router.delete("/{boceto_id}/groups/{group_id}", status_code=204)
def remove_group(boceto_id: int, group_id: int, Authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    _ = validate_token(Authorization)
    deleted = db.query(DraftGroup).filter(DraftGroup.boceto_id == boceto_id, DraftGroup.id == group_id).delete()
    db.commit()
    if not deleted:
        raise HTTPException(status_code=404, detail="group not found")
    return

# --- apply boceto -> create StudentSchedule
@router.post("/{boceto_id}/apply")
def aplicar_boceto(boceto_id: int, db=Depends(get_db)):

    boceto = db.query(DraftSchedule).filter_by(id=boceto_id).first()
    if not boceto:
        raise HTTPException(404, "Boceto no encontrado")

    groups = db.query(DraftGroup).filter_by(boceto_id=boceto.id).all()

    schedule = StudentSchedule(
        student_id=boceto.student_id,
        semester=boceto.semester,
        name="Horario definitivo"
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)

    for g in groups:
        db.add(ScheduledGroup(
            schedule_id=schedule.id,
            course_code=g.course_code,
            course_name=g.course_name,
            group_name=g.group_name,
            day=g.day,
            start=g.start,
            end=g.end
        ))

    db.commit()

    return {"status": "ok", "schedule_id": schedule.id}
