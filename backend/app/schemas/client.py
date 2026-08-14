from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.schemas.service import ServiceResponse


class ClientBase(BaseModel):
    company_name: str
    contact_person: str
    email: str
    phone: str
    website: Optional[str] = None
    address: Optional[str] = None
    industry: Optional[str] = "General Services"
    gst_number: Optional[str] = None
    status: str = "active"


class ClientCreate(ClientBase):
    service_ids: Optional[List[int]] = []


class ClientUpdate(BaseModel):
    company_name: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    industry: Optional[str] = None
    gst_number: Optional[str] = None
    status: Optional[str] = None
    service_ids: Optional[List[int]] = None


class ClientResponse(ClientBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    services: List[ServiceResponse] = []

    class Config:
        from_attributes = True
