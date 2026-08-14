from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from decimal import Decimal


class WorkItemBase(BaseModel):
    project_id: int
    assigned_employee_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    status: str = "pending"
    priority: str = "medium"
    due_date: Optional[date] = None
    estimated_hours: Optional[Decimal] = Decimal("0.0")


class WorkItemCreate(WorkItemBase):
    pass


class WorkItemUpdate(BaseModel):
    project_id: Optional[int] = None
    assigned_employee_id: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[date] = None
    estimated_hours: Optional[Decimal] = None


class WorkItemStatusUpdate(BaseModel):
    status: str


class WorkItemPriorityUpdate(BaseModel):
    priority: str


class WorkItemResponse(WorkItemBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
