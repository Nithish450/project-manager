from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.database.connection import get_db
from app.models.service import Service

router = APIRouter(prefix="/services", tags=["Services Master"])

DEFAULT_SERVICES = [
    "Software Development",
    "Website Development",
    "Mobile App Development",
    "UI/UX Design",
    "Graphic Design",
    "Logo Design",
    "Branding",
    "Digital Marketing",
    "SEO",
    "Social Media Marketing",
    "Content Writing",
    "Video Editing",
    "Photography",
    "Cloud Services",
    "IT Consulting",
    "Maintenance & Support",
    "ERP Development",
    "CRM Development",
    "HRMS Development",
    "Custom Software",
    "Other",
]


class ServiceCreate(BaseModel):
    service_name: str
    is_active: bool = True


@router.get("")
def get_services(db: Session = Depends(get_db)):
    # Auto-seed if empty
    existing_count = db.query(Service).count()
    if existing_count == 0:
        for s_name in DEFAULT_SERVICES:
            db.add(Service(service_name=s_name, is_active=True))
        db.commit()

    services = db.query(Service).all()
    return {"data": services}


@router.post("")
def create_service(payload: ServiceCreate, db: Session = Depends(get_db)):
    existing = db.query(Service).filter(Service.service_name.ilike(payload.service_name)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Service already exists.")

    srv = Service(service_name=payload.service_name, is_active=payload.is_active)
    db.add(srv)
    db.commit()
    db.refresh(srv)
    return {"message": "Service created successfully", "data": srv}


@router.put("/{service_id}")
def update_service(service_id: int, payload: ServiceCreate, db: Session = Depends(get_db)):
    srv = db.query(Service).filter(Service.id == service_id).first()
    if not srv:
        raise HTTPException(status_code=404, detail="Service not found.")

    srv.service_name = payload.service_name
    srv.is_active = payload.is_active
    db.commit()
    db.refresh(srv)
    return {"message": "Service updated successfully", "data": srv}


@router.delete("/{service_id}")
def delete_service(service_id: int, db: Session = Depends(get_db)):
    srv = db.query(Service).filter(Service.id == service_id).first()
    if not srv:
        raise HTTPException(status_code=404, detail="Service not found.")

    db.delete(srv)
    db.commit()
    return {"message": "Service deleted successfully"}
