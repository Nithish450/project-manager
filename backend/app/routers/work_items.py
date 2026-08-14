from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date

from app.database.connection import get_db
from app.models.work_item import WorkItem
from app.schemas.work_item import (
    WorkItemCreate,
    WorkItemUpdate,
    WorkItemStatusUpdate,
    WorkItemPriorityUpdate,
)

router = APIRouter(prefix="/work-items", tags=["Work Items"])


@router.post("")
def create_work_item(item_data: WorkItemCreate, db: Session = Depends(get_db)):
    new_item = WorkItem(
        project_id=item_data.project_id,
        assigned_employee_id=item_data.assigned_employee_id,
        title=item_data.title,
        description=item_data.description,
        status=item_data.status,
        priority=item_data.priority,
        due_date=item_data.due_date,
        estimated_hours=item_data.estimated_hours,
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return {"message": "Work Item created successfully", "data": new_item}


@router.get("")
def get_work_items(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    project_id: Optional[int] = Query(None),
    assigned_employee_id: Optional[int] = Query(None),
    due_before: Optional[date] = Query(None),
    service_id: Optional[int] = Query(None),
    due_start: Optional[date] = Query(None),
    due_end: Optional[date] = Query(None),
    page: Optional[int] = Query(None, ge=1),
    limit: Optional[int] = Query(None, ge=1),
    db: Session = Depends(get_db),
):
    query = db.query(WorkItem)

    project_joined = False
    employee_joined = False

    if search:
        from app.models.project import Project
        from app.models.employee import Employee
        query = query.outerjoin(Project).outerjoin(Employee)
        project_joined = True
        employee_joined = True
        query = query.filter(
            (WorkItem.title.ilike(f"%{search}%")) |
            (Project.name.ilike(f"%{search}%")) |
            (Employee.name.ilike(f"%{search}%"))
        )

    today = date.today()
    if status:
        stat_lower = status.lower()
        if stat_lower == "overdue":
            query = query.filter(WorkItem.status != "completed", WorkItem.due_date < today)
        elif stat_lower == "pending":
            query = query.filter(WorkItem.status == "pending", (WorkItem.due_date == None) | (WorkItem.due_date >= today))
        elif stat_lower == "in_progress":
            query = query.filter(WorkItem.status == "in_progress", (WorkItem.due_date == None) | (WorkItem.due_date >= today))
        else:
            query = query.filter(WorkItem.status == status)

    if priority:
        query = query.filter(WorkItem.priority == priority)
    if project_id:
        query = query.filter(WorkItem.project_id == project_id)
    if assigned_employee_id:
        query = query.filter(WorkItem.assigned_employee_id == assigned_employee_id)
    if service_id:
        from app.models.project import Project
        if not project_joined:
            query = query.join(Project)
            project_joined = True
        query = query.filter(Project.service_id == service_id)
    if due_before:
        query = query.filter(WorkItem.due_date <= due_before)
    if due_start:
        query = query.filter(WorkItem.due_date >= due_start)
    if due_end:
        query = query.filter(WorkItem.due_date <= due_end)

    total_count = query.count()
    if page is not None and limit is not None:
        query = query.offset((page - 1) * limit).limit(limit)

    items = query.all()
    today = date.today()

    # Compute overdue dynamically if status not completed
    data = []
    for item in items:
        item_dict = {
            "id": item.id,
            "project_id": item.project_id,
            "assigned_employee_id": item.assigned_employee_id,
            "assigned_employee_name": item.assigned_employee.name if item.assigned_employee else "Unassigned",
            "title": item.title,
            "description": item.description,
            "status": "overdue"
            if (item.due_date and item.due_date < today and item.status != "completed")
            else item.status,
            "priority": item.priority,
            "due_date": item.due_date,
            "estimated_hours": item.estimated_hours,
            "created_at": item.created_at,
            "updated_at": item.updated_at,
        }
        data.append(item_dict)

    return {
        "count": len(data),
        "total": total_count,
        "page": page,
        "limit": limit,
        "data": data
    }


@router.get("/{work_item_id}")
def get_work_item(work_item_id: int, db: Session = Depends(get_db)):
    item = db.query(WorkItem).filter(WorkItem.id == work_item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Work Item not found")
    return item


@router.put("/{work_item_id}")
def update_work_item(
    work_item_id: int, item_data: WorkItemUpdate, db: Session = Depends(get_db)
):
    item = db.query(WorkItem).filter(WorkItem.id == work_item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Work Item not found")

    update_dict = item_data.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        setattr(item, field, val)

    db.commit()
    db.refresh(item)
    return {"message": "Work Item updated successfully", "data": item}


@router.patch("/{work_item_id}/status")
def update_work_item_status(
    work_item_id: int, payload: WorkItemStatusUpdate, db: Session = Depends(get_db)
):
    item = db.query(WorkItem).filter(WorkItem.id == work_item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Work Item not found")

    item.status = payload.status
    db.commit()
    db.refresh(item)
    return {"message": "Status updated successfully", "data": item}


@router.patch("/{work_item_id}/priority")
def update_work_item_priority(
    work_item_id: int, payload: WorkItemPriorityUpdate, db: Session = Depends(get_db)
):
    item = db.query(WorkItem).filter(WorkItem.id == work_item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Work Item not found")

    item.priority = payload.priority
    db.commit()
    db.refresh(item)
    return {"message": "Priority updated successfully", "data": item}


@router.delete("/{work_item_id}")
def delete_work_item(work_item_id: int, db: Session = Depends(get_db)):
    item = db.query(WorkItem).filter(WorkItem.id == work_item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Work Item not found")

    db.delete(item)
    db.commit()
    return {"message": "Work Item deleted successfully"}
