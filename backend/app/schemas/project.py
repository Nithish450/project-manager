from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    client_id: Optional[int] = None
    service_id: Optional[int] = None
    project_manager_id: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: str = "in_progress"
    priority: str = "medium"


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    client_id: Optional[int] = None
    service_id: Optional[int] = None
    project_manager_id: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[str] = None
    priority: Optional[str] = None


class ProjectResponse(ProjectBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
