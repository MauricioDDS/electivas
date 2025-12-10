from fastapi import APIRouter, HTTPException, Body # <-- Asegúrate de tener APIRouter aquí
import httpx
import os
from pydantic import BaseModel

router = APIRouter()


SCRAPER_HOST = os.getenv("SCRAPER_HOST") 
HORARIO_PATH = os.getenv("SCRAPER_HORARIO_PATH", "/horario") 

class HorarioRequest(BaseModel):
    ci_session: str
    user: str

@router.post("/fetch-horario")
async def fetch_horario_proxy(body: HorarioRequest):

    scraper_url = f"{SCRAPER_HOST.rstrip('/')}{HORARIO_PATH}"
    
    try:
        params = {"ci_session": body.ci_session}
        
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.get(
                scraper_url, 
                params=params
            )
            
            resp.raise_for_status()
            
            return resp.json()
            
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code, 
            detail=f"Scraper error ({e.response.status_code}): {e.response.text.strip()}"
        )
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=503, 
            detail=f"Scraper service unavailable: {e}"
        )