from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date, datetime


class EmployeeBase(BaseModel):
    employee_code: str
    name: str
    email: str
    phone: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    experience_years: Optional[int] = 0
    skills: Optional[str] = None
    joining_date: Optional[date] = None
    status: str = "active"


class EmployeeCreate(EmployeeBase):
    user_id: Optional[int] = None


class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    experience_years: Optional[int] = None
    skills: Optional[str] = None
    joining_date: Optional[date] = None
    status: Optional[str] = None
    user_id: Optional[int] = None


class EmployeeResponse(EmployeeBase):
    id: int
    user_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
