from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
import secrets
from datetime import datetime, timedelta, timezone

from app.database.connection import get_db
from app.models.user import User, RefreshToken
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    TokenResponse,
    RefreshTokenRequest,
)
from app.utils.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


class ChangePasswordPayload(BaseModel):
    current_password: str
    new_password: str


class ForgotPasswordPayload(BaseModel):
    email: str


class ResetPasswordPayload(BaseModel):
    email: str
    reset_token: str
    new_password: str


@router.post("/register")
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address is already registered",
        )

    new_user = User(
        name=user_data.name,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        role=user_data.role,
        is_active=True,
        is_first_login=False,
        must_change_password=False,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "User registered successfully", "user_id": new_user.id}


@router.post("/login")
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )

    access_token = create_access_token({"sub": user.id, "role": user.role})
    refresh_token_str = secrets.token_hex(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)

    ref_token_obj = RefreshToken(
        user_id=user.id,
        token=refresh_token_str,
        expires_at=expires_at,
        revoked=False,
    )
    db.add(ref_token_obj)
    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token_str,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "is_first_login": getattr(user, "is_first_login", False),
            "must_change_password": getattr(user, "must_change_password", False),
        },
    }


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordPayload, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User with this email address does not exist.")

    # Generate temporary reset code
    reset_token = f"RESET-{secrets.token_hex(4).upper()}"
    
    return {
        "message": f"Password reset code generated. Use code '{reset_token}' to reset your password.",
        "reset_token": reset_token,
        "email": payload.email,
    }


@router.post("/reset-password")
def reset_password(payload: ResetPasswordPayload, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if not payload.reset_token or len(payload.reset_token) < 4:
        raise HTTPException(status_code=400, detail="Invalid reset token.")

    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters.")

    user.password_hash = hash_password(payload.new_password)
    user.is_first_login = False
    user.must_change_password = False
    db.commit()

    return {"message": "Password reset successfully. You can now login with your new password."}


@router.post("/change-password")
def change_password(payload: ChangePasswordPayload, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password incorrect.")

    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters.")

    current_user.password_hash = hash_password(payload.new_password)
    current_user.is_first_login = False
    current_user.must_change_password = False
    db.commit()

    return {"message": "Password changed successfully."}


@router.post("/refresh-token")
def refresh_token(payload: RefreshTokenRequest, db: Session = Depends(get_db)):
    ref_obj = (
        db.query(RefreshToken)
        .filter(RefreshToken.token == payload.refresh_token, RefreshToken.revoked == False)
        .first()
    )
    if not ref_obj:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked refresh token",
        )

    new_access_token = create_access_token({"sub": ref_obj.user_id})
    return {"access_token": new_access_token, "token_type": "bearer"}


@router.post("/logout")
def logout(payload: RefreshTokenRequest, db: Session = Depends(get_db)):
    ref_obj = (
        db.query(RefreshToken)
        .filter(RefreshToken.token == payload.refresh_token)
        .first()
    )
    if ref_obj:
        ref_obj.revoked = True
        db.commit()

    return {"message": "Logged out successfully"}


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "profile_picture_url": current_user.profile_picture_url,
        "is_first_login": getattr(current_user, "is_first_login", False),
        "must_change_password": getattr(current_user, "must_change_password", False),
    }
