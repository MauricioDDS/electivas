from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import json

app = FastAPI(title="Sistema de Pensum Universitario")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

with open("courses.json", "r", encoding="utf-8-sig") as f:
    courses = json.load(f)

@app.get("/courses")
def get_courses(tipo: str = None):
    if isinstance(courses, dict):
        courses_list = [courses]
    else:
        courses_list = courses

    if tipo:
        return [c for c in courses_list if c["tipo"].lower() == tipo.lower()]
    return courses_list

@app.get("/course/{course_id}")
def get_course(course_id: int):
    for c in courses:
        if c["id"] == course_id:
            return c
    raise HTTPException(status_code=404, detail="Materia no encontrada")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000)
