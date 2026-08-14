from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.database.connection import Base


class TaskAttempt(Base):
    __tablename__ = "task_attempts"

    id = Column(Integer, primary_key=True, index=True)
    work_item_id = Column(Integer, ForeignKey("work_items.id", ondelete="CASCADE"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    attempt_number = Column(Integer, default=1, nullable=False)
    status = Column(String(30), default="started", nullable=False)  # started, paused, completed
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    ended_at = Column(DateTime, nullable=True)
    working_duration_seconds = Column(Integer, default=0)
    break_duration_seconds = Column(Integer, default=0)
    total_duration_seconds = Column(Integer, default=0)

    work_item = relationship("WorkItem", backref="attempts")
    employee = relationship("Employee")
    time_logs = relationship("TimeLog", back_populates="attempt", cascade="all, delete-orphan")
    break_logs = relationship("BreakLog", back_populates="attempt", cascade="all, delete-orphan")


class TimeLog(Base):
    __tablename__ = "time_logs"

    id = Column(Integer, primary_key=True, index=True)
    work_item_id = Column(Integer, ForeignKey("work_items.id", ondelete="CASCADE"), nullable=False)
    attempt_id = Column(Integer, ForeignKey("task_attempts.id", ondelete="CASCADE"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    event_type = Column(String(50), nullable=False)  # started, paused, resumed, completed
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    remarks = Column(Text, nullable=True)

    attempt = relationship("TaskAttempt", back_populates="time_logs")
    employee = relationship("Employee")


class BreakLog(Base):
    __tablename__ = "break_logs"

    id = Column(Integer, primary_key=True, index=True)
    attempt_id = Column(Integer, ForeignKey("task_attempts.id", ondelete="CASCADE"), nullable=False)
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    ended_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer, default=0)

    attempt = relationship("TaskAttempt", back_populates="break_logs")
