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

def validate_token(auth_header: Optional[str]):
    if not auth_header:
        raise HTTPException(status_code=401, detail="Authorization header required")
    if not AUTH_SERVICE_ME:
        return {"email": "unknown", "id": None}
    try:
        resp = requests.get(AUTH_SERVICE_ME, headers={"Authorization": auth_header}, timeout=5)
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="invalid token")
        return resp.json()
    except requests.RequestException:
        raise HTTPException(status_code=502, detail="auth service unreachable")

def to_minutes(hhmm):
    h,m = hhmm.split(":")
    return int(h)*60 + int(m)

def overlaps(a_start, a_end, b_start, b_end):
    return not (to_minutes(a_end) <= to_minutes(b_start) or to_minutes(b_end) <= to_minutes(a_start))

@router.post("/", response_model=DraftOut, status_code=201)
def create_boceto(payload: DraftCreate, Authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    userinfo = validate_token(Authorization)
    
    d = DraftSchedule(student_id=payload.student_id, semester=payload.semester, name=payload.name, description=payload.description)
    db.add(d)
    db.commit()
    db.refresh(d)

    return {
        "id": d.id, 
        "student_id": d.student_id, 
        "semester": d.semester, 
        "name": d.name, 
        "description": d.description, 
        "created_at": d.created_at, 
        "courses": []
    }

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

@router.delete("/{boceto_id}", status_code=204)
def delete_boceto(boceto_id: int, Authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    _ = validate_token(Authorization)
    
    d = db.query(DraftSchedule).filter(DraftSchedule.id == boceto_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="boceto not found")

    db.query(DraftGroup).filter(DraftGroup.boceto_id == boceto_id).delete()
    
    db.delete(d)
    db.commit()
    return

@router.post("/{boceto_id}/groups", status_code=201)
def add_group(boceto_id: int, payload: AddGroupIn, Authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    _ = validate_token(Authorization)
    boc = db.query(DraftSchedule).filter(DraftSchedule.id == boceto_id).first()
    if not boc:
        raise HTTPException(status_code=404, detail="boceto not found")

    existing = db.query(DraftGroup).filter(DraftGroup.boceto_id == boceto_id).all()
    for ex in existing:
        if ex.day and payload.schedule:
            for s in payload.schedule:
                if ex.day.strip().lower() == s.dia.strip().lower():
                    if ex.start and ex.end and overlaps(ex.start, ex.end, s.start, s.end):
                        raise HTTPException(status_code=409, detail=f"conflict with {ex.course_code} {ex.group_name} at {ex.day} {ex.start}-{ex.end}")

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

    prereqs = []
    if payload.meta:
        try:
            prereqs = payload.meta.get("requisitos", [])
        except:
            prereqs = []

    missing_cre = None
    for r in prereqs:
        if r.lower().startswith("cre:"):
            try:
                req_cre = int(r.split(":")[1])
                if current_credits < req_cre:
                    missing_cre = req_cre
            except:
                pass

    if missing_cre:
        raise HTTPException(
            status_code=400,
            detail=f"Requiere mínimo {missing_cre} créditos aprobados"
        )

    missing_courses = []
    for r in prereqs:
        if r.lower().startswith("cre:"):
            continue 
        try:
            hist = requests.get(f"{COURSE_SERVICE}/students/{boc.student_id}/history").json()
            codes_hist = [str(h["codigo"]) for h in hist]
            if str(r) not in codes_hist:
                missing_courses.append(r)
        except:
            pass 

    if missing_courses:
        raise HTTPException(
            status_code=400,
            detail=f"Faltan prerrequisitos: {', '.join(missing_courses)}"
        )

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

@router.delete("/{boceto_id}/groups/{group_id}", status_code=204)
def remove_group(boceto_id: int, group_id: int, Authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    _ = validate_token(Authorization)
    deleted = db.query(DraftGroup).filter(DraftGroup.boceto_id == boceto_id, DraftGroup.id == group_id).delete()
    db.commit()
    if not deleted:
        raise HTTPException(status_code=404, detail="group not found")
    return

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