import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import bocetos, schedules

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Calendar Service (bocetos)")

origins = os.getenv("CORS_ORIGINS", "")
origins = [o.strip() for o in origins.split(",") if o.strip()] if origins else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(bocetos.router, prefix="/bocetos")
app.include_router(schedules.router, prefix="/horarios")

@app.get("/")
def root():
    return {"status": "calendar service running"}
