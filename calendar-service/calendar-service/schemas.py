from pydantic import BaseModel, Field, validator
from typing import List, Optional, Any
from datetime import datetime

class ClassTime(BaseModel):
    dia: str
    start: str
    end: str
    salon: Optional[str] = None

    @validator("start","end")
    def hhmm(cls,v):
        if ":" not in v:
            raise ValueError("time must be HH:MM")
        parts=v.split(":")
        if len(parts)!=2 or not parts[0].isdigit() or not parts[1].isdigit():
            raise ValueError("time must be HH:MM")
        h=int(parts[0]); m=int(parts[1])
        if not (0<=h<24 and 0<=m<60):
            raise ValueError("invalid time")
        return f"{h:02d}:{m:02d}"

class DraftCreate(BaseModel):
    student_id: int
    semester: Optional[int] = None
    name: Optional[str] = "Mi boceto"
    description: Optional[str] = None

class AddGroupIn(BaseModel):
    course_code: str
    group_name: Optional[str] = None
    schedule: Optional[List[ClassTime]] = None
    course_name: Optional[str] = None
    credits: Optional[int] = 0
    meta: Optional[Any] = None

class DraftOutCourse(BaseModel):
    id: int
    course_code: str
    course_name: Optional[str]
    group_name: Optional[str]
    day: Optional[str]
    start: Optional[str]
    end: Optional[str]
    meta: Optional[Any]

class DraftOut(BaseModel):
    id: int
    student_id: int
    semester: Optional[int]
    name: str
    description: Optional[str]
    created_at: datetime
    courses: List[DraftOutCourse] = []
