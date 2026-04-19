from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.cases import router as cases_router
from app.api.routes.documents import router as documents_router
from app.api.routes.estimates import router as estimates_router
from app.api.routes.exports import router as exports_router
from app.api.routes.health import router as health_router
from app.api.routes.research import router as research_router
from app.config import settings


app = FastAPI(
    title=settings.app_name,
    version=settings.estimation_engine_version,
    description="RefundIQ OCR, normalization, and deterministic tax estimation service",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(documents_router)
app.include_router(estimates_router)
app.include_router(cases_router)
app.include_router(exports_router)
app.include_router(research_router)
