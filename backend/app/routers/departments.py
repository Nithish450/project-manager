from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.database.connection import get_db
from app.models.department import Department

router = APIRouter(prefix="/departments", tags=["Departments Master"])

DEFAULT_DEPARTMENTS = [
    "Engineering",
    "Software Development",
    "UI/UX Design",
    "Digital Marketing & SEO",
    "Sales & Business Development",
    "Human Resources",
    "Finance & Accounting",
    "Operations",
    "Customer Support & IT",
    "Management",
]


class DepartmentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True


@router.get("")
def get_departments(db: Session = Depends(get_db)):
    # Auto-seed if empty
    count = db.query(Department).count()
    if count == 0:
        for d_name in DEFAULT_DEPARTMENTS:
            db.add(Department(name=d_name, is_active=True))
        db.commit()

    deps = db.query(Department).all()
    return {"data": deps}


@router.post("")
def create_department(payload: DepartmentCreate, db: Session = Depends(get_db)):
    existing = db.query(Department).filter(Department.name.ilike(payload.name)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Department already exists.")

    dep = Department(name=payload.name, description=payload.description, is_active=payload.is_active)
    db.add(dep)
    db.commit()
    db.refresh(dep)
    return {"message": "Department created successfully", "data": dep}


@router.put("/{dep_id}")
def update_department(dep_id: int, payload: DepartmentCreate, db: Session = Depends(get_db)):
    dep = db.query(Department).filter(Department.id == dep_id).first()
    if not dep:
        raise HTTPException(status_code=404, detail="Department not found.")

    dep.name = payload.name
    dep.description = payload.description
    dep.is_active = payload.is_active
    db.commit()
    db.refresh(dep)
    return {"message": "Department updated successfully", "data": dep}


@router.delete("/{dep_id}")
def delete_department(dep_id: int, db: Session = Depends(get_db)):
    dep = db.query(Department).filter(Department.id == dep_id).first()
    if not dep:
        raise HTTPException(status_code=404, detail="Department not found.")

    db.delete(dep)
    db.commit()
    return {"message": "Department deleted successfully"}
