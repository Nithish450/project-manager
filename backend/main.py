from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database.connection import Base, engine
import app.models

from app.routers import (
    auth,
    services,
    clients,
    employees,
    departments,
    projects,
    work_items,
    task_execution,
    comments,
    attachments,
    dashboard,
    reports,
    notifications,
    profile,
    settings,
)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="ProjectPulse API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"http://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"message": "Welcome to ProjectPulse Work Management System API"}


# Register all routers
app.include_router(auth.router)
app.include_router(services.router)
app.include_router(clients.router)
app.include_router(employees.router)
app.include_router(departments.router)
app.include_router(projects.router)
app.include_router(work_items.router)
app.include_router(task_execution.router)
app.include_router(comments.router)
app.include_router(attachments.router)
app.include_router(dashboard.router)
app.include_router(reports.router)
app.include_router(notifications.router)
app.include_router(profile.router)
app.include_router(settings.router)
