from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from database import db
from routes import router as elements_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Zarządza cyklem życia aplikacji FastAPI.

    Asynchroniczny menedżer kontekstu zastępujący zdarzenia 'startup' i 'shutdown'.
    Kod znajdujący się przed instrukcją `yield` wykonuje się podczas startu serwera,
    natomiast kod po `yield` gwarantuje bezpieczne zwolnienie zasobów przy
    wyłączaniu aplikacji (w tym przypadku zamyka połączenie ze sterownikiem bazy Neo4j).

    Args:
        app (FastAPI): Główna instancja aplikacji FastAPI.
    """
    yield
    db.close()


app = FastAPI(title="Radioaktywność - Baza Grafowa Neo4j", lifespan=lifespan)

app.include_router(elements_router)

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
