from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from database import Base
import datetime

class DraftSchedule(Base):
    __tablename__ = "draft_schedules"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, index=True, nullable=False)
    semester = Column(Integer, nullable=True)
    name = Column(String, default="Mi boceto")
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class DraftGroup(Base):
    __tablename__ = "draft_groups"
    id = Column(Integer, primary_key=True, index=True)
    boceto_id = Column(Integer, ForeignKey("draft_schedules.id", ondelete="CASCADE"), index=True, nullable=False)
    course_code = Column(String, nullable=False)
    course_name = Column(String, nullable=True)
    group_name = Column(String, nullable=True)
    day = Column(String, nullable=True)
    start = Column(String, nullable=True)  # HH:MM
    end = Column(String, nullable=True)    # HH:MM
    meta = Column(Text, nullable=True)

class StudentSchedule(Base):
    __tablename__ = "student_schedules"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, index=True, nullable=False)
    semester = Column(Integer, nullable=True)
    name = Column(String, default="Horario definitivo")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class ScheduledGroup(Base):
    __tablename__ = "scheduled_groups"
    id = Column(Integer, primary_key=True, index=True)
    schedule_id = Column(Integer, ForeignKey("student_schedules.id", ondelete="CASCADE"), index=True, nullable=False)
    course_code = Column(String, nullable=False)
    course_name = Column(String, nullable=True)
    group_name = Column(String, nullable=True)
    day = Column(String, nullable=True)
    start = Column(String, nullable=True)
    end = Column(String, nullable=True)
    meta = Column(Text, nullable=True)
