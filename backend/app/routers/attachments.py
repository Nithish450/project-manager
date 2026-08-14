import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional

from app.database.connection import get_db
from app.models.attachment import Attachment
from app.utils.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/attachments", tags=["Attachments"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {"pdf", "jpg", "jpeg", "png", "gif", "docx", "xlsx", "zip"}
MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB


@router.post("/upload")
async def upload_attachment(
    file: UploadFile = File(...),
    attachable_type: str = Form(...),  # project or work_item
    attachable_id: int = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if attachable_type not in ["project", "work_item"]:
        raise HTTPException(status_code=400, detail="Invalid attachable_type. Must be 'project' or 'work_item'.")

    file_ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File extension '.{file_ext}' is not allowed.")

    contents = await file.read()
    file_size = len(contents)
    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File size exceeds maximum 20MB limit.")

    safe_filename = f"{attachable_type}_{attachable_id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)

    with open(file_path, "wb") as f:
        f.write(contents)

    attachment = Attachment(
        file_name=file.filename,
        file_path=file_path,
        file_type=file_ext,
        file_size=file_size,
        uploaded_by=current_user.id,
        attachable_type=attachable_type,
        attachable_id=attachable_id,
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)

    return {"message": "File uploaded successfully", "data": attachment}


@router.get("")
def list_attachments(
    attachable_type: str,
    attachable_id: int,
    db: Session = Depends(get_db),
):
    items = (
        db.query(Attachment)
        .filter(
            Attachment.attachable_type == attachable_type,
            Attachment.attachable_id == attachable_id,
        )
        .all()
    )
    return {"data": items}


@router.get("/{attachment_id}/download")
def download_attachment(attachment_id: int, db: Session = Depends(get_db)):
    att = db.query(Attachment).filter(Attachment.id == attachment_id).first()
    if not att or not os.path.exists(att.file_path):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(att.file_path, filename=att.file_name)


@router.delete("/{attachment_id}")
def delete_attachment(attachment_id: int, db: Session = Depends(get_db)):
    att = db.query(Attachment).filter(Attachment.id == attachment_id).first()
    if not att:
        raise HTTPException(status_code=404, detail="Attachment not found")

    if os.path.exists(att.file_path):
        try:
            os.remove(att.file_path)
        except Exception:
            pass

    db.delete(att)
    db.commit()
    return {"message": "Attachment deleted successfully"}
