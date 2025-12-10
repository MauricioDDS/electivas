from fastapi import APIRouter, Depends
from database import SessionLocal

router = APIRouter(prefix="/horarios", tags=["Horarios"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/")
def get_horarios(student_id: int, db=Depends(get_db)):
    schedules = db.query(StudentSchedule).filter_by(student_id=student_id).all()

    result = []
    for sch in schedules:
        groups = db.query(ScheduledGroup).filter_by(schedule_id=sch.id).all()
        result.append({
            "id": sch.id,
            "student_id": sch.student_id,
            "name": sch.name,
            "semester": sch.semester,
            "created_at": sch.created_at,
            "groups": [
                {
                    "course_code": g.course_code,
                    "course_name": g.course_name,
                    "group_name": g.group_name,
                    "day": g.day,
                    "start": g.start,
                    "end": g.end
                }
                for g in groups
            ]
        })
    return result
