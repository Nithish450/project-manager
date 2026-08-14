from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.database.connection import Base


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(150), nullable=False)
    contact_person = Column(String(100), nullable=False)
    email = Column(String(150), nullable=False)
    phone = Column(String(30), nullable=False)
    website = Column(String(200), nullable=True)
    address = Column(Text, nullable=True)
    industry = Column(String(100), nullable=True, default="General Services")
    gst_number = Column(String(50), nullable=True)
    status = Column(String(20), default="active", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    client_services = relationship("ClientService", back_populates="client", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="client")
