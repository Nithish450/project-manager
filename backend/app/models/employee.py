from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.database.connection import Base


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    employee_code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    email = Column(String(150), nullable=False)
    phone = Column(String(30), nullable=True)
    designation = Column(String(100), nullable=True)
    department = Column(String(100), nullable=True)
    experience_years = Column(Integer, default=0)
    skills = Column(String(500), nullable=True)
    joining_date = Column(Date, nullable=True)
    status = Column(String(20), default="active", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="employee")
    managed_projects = relationship("Project", back_populates="project_manager")
    work_items = relationship("WorkItem", back_populates="assigned_employee")
