from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware;
import json

app = FastAPI(title="Sistema de Pensum Universitario")

app.add_middleware(
    CORSMiddleware,
    allow_origins =["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

with open("courses.json", encoding="utf-8") as f:
    courses = json.load(f)

@app.get("/courses")
def get_courses(tipo: str = None):
    if tipo:
        return [c for c in courses if c["tipo"].lower() == tipo.lower()]
    return courses

@app.get("/course/{course_id}")
def get_course(course_id: int):
    for c in courses:
        if c["id"] == course_id:
            return c
    raise HTTPException(status_code=404, detail="Materia no encontrada")
