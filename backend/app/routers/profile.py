from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.database.connection import get_db
from app.utils.auth import get_current_user, hash_password, verify_password
from app.models.user import User

router = APIRouter(prefix="/profile", tags=["User Profile"])


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    profile_picture_url: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


@router.get("")
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("")
def update_profile(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.name:
        current_user.name = payload.name
    if payload.email:
        current_user.email = payload.email
    if payload.profile_picture_url:
        current_user.profile_picture_url = payload.profile_picture_url

    db.commit()
    db.refresh(current_user)
    return {"message": "Profile updated successfully", "user": current_user}


@router.post("/change-password")
def change_password(
    payload: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect current password")

    current_user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"message": "Password changed successfully"}
