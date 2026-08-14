import hashlib
import hmac
import json
import base64
import time
from typing import Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.user import User

SECRET_KEY = "projectpulse_super_secret_jwt_key_2026"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_SECONDS = 3600 * 24  # 24 hours

security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return hashlib.sha256((password + SECRET_KEY).encode("utf-8")).hexdigest()


def verify_password(plain_password: str, password_hash: str) -> bool:
    return hash_password(plain_password) == password_hash


def base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("utf-8")


def base64url_decode(data: str) -> bytes:
    padding = "=" * (4 - (len(data) % 4))
    return base64.urlsafe_b64encode(data.encode("utf-8") + padding.encode("utf-8"))


def create_access_token(data: dict, expires_in: int = ACCESS_TOKEN_EXPIRE_SECONDS) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    payload = data.copy()
    payload["exp"] = int(time.time()) + expires_in

    header_b64 = base64.urlsafe_b64encode(json.dumps(header).encode("utf-8")).rstrip(b"=").decode("utf-8")
    payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode("utf-8")).rstrip(b"=").decode("utf-8")

    signature_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    signature = hmac.new(SECRET_KEY.encode("utf-8"), signature_input, hashlib.sha256).digest()
    sig_b64 = base64.urlsafe_b64encode(signature).rstrip(b"=").decode("utf-8")

    return f"{header_b64}.{payload_b64}.{sig_b64}"


def decode_access_token(token: str) -> Optional[dict]:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None

        header_b64, payload_b64, sig_b64 = parts
        signature_input = f"{header_b64}.{payload_b64}".encode("utf-8")
        expected_sig = base64.urlsafe_b64encode(
            hmac.new(SECRET_KEY.encode("utf-8"), signature_input, hashlib.sha256).digest()
        ).rstrip(b"=").decode("utf-8")

        if not hmac.compare_digest(sig_b64, expected_sig):
            return None

        padding = "=" * (4 - (len(payload_b64) % 4))
        payload_bytes = base64.urlsafe_b64decode((payload_b64 + padding).encode("utf-8"))
        payload = json.loads(payload_bytes.decode("utf-8"))

        if payload.get("exp", 0) < time.time():
            return None

        return payload
    except Exception:
        return None


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    if not credentials:
        # Fallback for dev mode / default admin user if no token provided
        admin_user = db.query(User).filter(User.role == "admin").first()
        if admin_user:
            return admin_user
        # Create default admin if none exists
        default_admin = User(
            name="System Admin",
            email="admin@projectpulse.com",
            password_hash=hash_password("admin123"),
            role="admin",
            is_active=True,
        )
        db.add(default_admin)
        db.commit()
        db.refresh(default_admin)
        return default_admin

    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    return user


def require_role(*allowed_roles: str):
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Action restricted to roles: {', '.join(allowed_roles)}",
            )
        return current_user

    return role_checker
