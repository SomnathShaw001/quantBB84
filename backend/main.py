"""FastAPI Application entry point for BB84 Quantum Key Distribution Simulator.

Configured for local development as well as Zoho Catalyst AppSail deployment:
- Listens on environment variable X_ZOHO_CATALYST_LISTEN_PORT (defaults to 8000)
- Serves API routes under /api
- Serves static frontend files from ./frontend
"""
from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .api.routes import router as api_router
from .storage import init_db

app = FastAPI(
    title="BB84 Quantum Key Distribution Simulator",
    description="Interactive research instrument and educational laboratory for BB84 QKD protocol with Qiskit Aer simulation.",
    version="1.0.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize storage
init_db()

# Mount API routes
app.include_router(api_router, prefix="/api")

# Mount frontend static directory if exists
frontend_path = Path(__file__).resolve().parent.parent / "frontend"
if frontend_path.exists():
    app.mount("/", StaticFiles(directory=str(frontend_path), html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("X_ZOHO_CATALYST_LISTEN_PORT", os.environ.get("PORT", 8000)))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=True)
