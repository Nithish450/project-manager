from pydantic import BaseModel
from typing import Optional, List


class ServiceBase(BaseModel):
    service_name: str
    is_active: bool = True


class ServiceResponse(ServiceBase):
    id: int

    class Config:
        from_attributes = True
