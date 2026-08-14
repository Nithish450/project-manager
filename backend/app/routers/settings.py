from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.database.connection import get_db
from app.models.setting import Setting

router = APIRouter(prefix="/settings", tags=["Application Settings"])


class SettingUpdate(BaseModel):
    company_name: Optional[str] = None
    theme: Optional[str] = None
    email_notifications_enabled: Optional[bool] = None
    in_app_notifications_enabled: Optional[bool] = None


@router.get("")
def get_settings(db: Session = Depends(get_db)):
    setting = db.query(Setting).first()
    if not setting:
        setting = Setting(
            company_name="ProjectPulse Inc.",
            theme="light",
            email_notifications_enabled=True,
            in_app_notifications_enabled=True,
        )
        db.add(setting)
        db.commit()
        db.refresh(setting)
    return setting


@router.put("")
def update_settings(payload: SettingUpdate, db: Session = Depends(get_db)):
    setting = db.query(Setting).first()
    if not setting:
        setting = Setting()
        db.add(setting)

    update_dict = payload.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        setattr(setting, field, val)

    db.commit()
    db.refresh(setting)
    return {"message": "Settings updated successfully", "data": setting}
