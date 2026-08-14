from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database.connection import Base


class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    service_name = Column(String(100), unique=True, nullable=False)
    is_active = Column(Boolean, default=True)

    client_services = relationship("ClientService", back_populates="service")
    projects = relationship("Project", back_populates="service")


class ClientService(Base):
    __tablename__ = "client_services"
    __table_args__ = (
        UniqueConstraint("client_id", "service_id", name="uq_client_service"),
    )

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    service_id = Column(Integer, ForeignKey("services.id", ondelete="RESTRICT"), nullable=False)

    client = relationship("Client", back_populates="client_services")
    service = relationship("Service", back_populates="client_services")
