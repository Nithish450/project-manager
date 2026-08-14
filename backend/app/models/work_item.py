from sqlalchemy import Column, Integer, String, Text, Date, Numeric, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.database.connection import Base


class WorkItem(Base):
    __tablename__ = "work_items"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    assigned_employee_id = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="pending", nullable=False)
    priority = Column(String(20), default="medium", nullable=False)
    due_date = Column(Date, nullable=True)
    estimated_hours = Column(Numeric(6, 2), default=0.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    project = relationship("Project", back_populates="work_items")
    assigned_employee = relationship("Employee", back_populates="work_items")
    comments = relationship("Comment", back_populates="work_item", cascade="all, delete-orphan")
