from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app.database.connection import get_db
from app.models.comment import Comment
from app.models.work_item import WorkItem
from app.schemas.comment import CommentCreate, CommentUpdate
from app.utils.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="", tags=["Comments"])


@router.post("/work-items/{work_item_id}/comments")
def create_comment(
    work_item_id: int,
    comment_data: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(WorkItem).filter(WorkItem.id == work_item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Work Item not found")

    new_comment = Comment(
        work_item_id=work_item_id,
        user_id=current_user.id,
        parent_comment_id=comment_data.parent_comment_id,
        content=comment_data.content,
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)

    return {"message": "Comment added successfully", "data": new_comment}


@router.get("/work-items/{work_item_id}/comments")
def get_comments(work_item_id: int, db: Session = Depends(get_db)):
    comments = (
        db.query(Comment)
        .filter(Comment.work_item_id == work_item_id)
        .order_by(Comment.created_at.asc())
        .all()
    )

    # Format reply hierarchy
    top_level = []
    lookup = {}
    for c in comments:
        c_dict = {
            "id": c.id,
            "work_item_id": c.work_item_id,
            "user_id": c.user_id,
            "user_name": c.user.name if c.user else "User",
            "parent_comment_id": c.parent_comment_id,
            "content": c.content,
            "created_at": c.created_at,
            "replies": [],
        }
        lookup[c.id] = c_dict
        if not c.parent_comment_id:
            top_level.append(c_dict)
        elif c.parent_comment_id in lookup:
            lookup[c.parent_comment_id]["replies"].append(c_dict)

    return {"data": top_level}


@router.put("/comments/{comment_id}")
def update_comment(
    comment_id: int,
    comment_data: CommentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    if comment.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to edit this comment")

    comment.content = comment_data.content
    db.commit()
    db.refresh(comment)
    return {"message": "Comment updated successfully", "data": comment}


@router.delete("/comments/{comment_id}")
def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    if comment.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")

    db.delete(comment)
    db.commit()
    return {"message": "Comment deleted successfully"}
