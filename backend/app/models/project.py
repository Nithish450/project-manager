from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Date,
    DateTime,
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.database.connection import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    client_id = Column(
        Integer, ForeignKey("clients.id", ondelete="RESTRICT"), nullable=True
    )
    service_id = Column(
        Integer, ForeignKey("services.id", ondelete="RESTRICT"), nullable=True
    )
    project_manager_id = Column(
        Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True
    )
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    status = Column(String(50), default="in_progress", nullable=False)
    priority = Column(String(20), default="medium", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    client = relationship("Client", back_populates="projects")
    service = relationship("Service", back_populates="projects")
    project_manager = relationship("Employee", back_populates="managed_projects")
    project_employees = relationship(
        "ProjectEmployee", back_populates="project", cascade="all, delete-orphan"
    )
    work_items = relationship(
        "WorkItem", back_populates="project", cascade="all, delete-orphan"
    )


class ProjectEmployee(Base):
    __tablename__ = "project_employees"
    __table_args__ = (
        UniqueConstraint("project_id", "employee_id", name="uq_project_employee"),
    )

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(
        Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    employee_id = Column(
        Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False
    )

    project = relationship("Project", back_populates="project_employees")
    employee = relationship("Employee")
