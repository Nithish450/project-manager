from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from datetime import date, datetime, timedelta

from app.database.connection import get_db
from app.models.project import Project, ProjectEmployee
from app.models.service import ClientService
from app.models.employee import Employee
from app.schemas.project import ProjectCreate, ProjectUpdate

router = APIRouter(prefix="/projects", tags=["Projects Management"])


class AssignEmployeesSchema(BaseModel):
    employee_ids: List[int]


@router.post("")
def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    # Validate service belongs to client if both provided
    if project.client_id and project.service_id:
        cs = (
            db.query(ClientService)
            .filter(
                ClientService.client_id == project.client_id,
                ClientService.service_id == project.service_id,
            )
            .first()
        )
        if not cs:
            raise HTTPException(
                status_code=400,
                detail="Selected service does not belong to the chosen client.",
            )

    new_project = Project(
        name=project.name,
        description=project.description,
        client_id=project.client_id,
        service_id=project.service_id,
        project_manager_id=project.project_manager_id,
        start_date=project.start_date,
        end_date=project.end_date,
        status=project.status,
        priority=project.priority,
    )

    db.add(new_project)
    db.commit()
    db.refresh(new_project)

    return {
        "message": "Project Created Successfully",
        "project": new_project,
    }


@router.get("")
def get_projects(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    client_id: Optional[int] = Query(None),
    service_id: Optional[int] = Query(None),
    start_date_from: Optional[date] = Query(None),
    start_date_to: Optional[date] = Query(None),
    end_date_from: Optional[date] = Query(None),
    end_date_to: Optional[date] = Query(None),
    page: Optional[int] = Query(None, ge=1),
    limit: Optional[int] = Query(None, ge=1),
    db: Session = Depends(get_db),
):
    query = db.query(Project)

    if search:
        query = query.filter(Project.name.ilike(f"%{search}%"))
    if status:
        query = query.filter(Project.status == status)
    if priority:
        query = query.filter(Project.priority == priority)
    if client_id:
        query = query.filter(Project.client_id == client_id)
    if service_id:
        query = query.filter(Project.service_id == service_id)
    if start_date_from:
        query = query.filter(Project.start_date >= start_date_from)
    if start_date_to:
        query = query.filter(Project.start_date <= start_date_to)
    if end_date_from:
        query = query.filter(Project.end_date >= end_date_from)
    if end_date_to:
        query = query.filter(Project.end_date <= end_date_to)

    total_count = query.count()
    if page is not None and limit is not None:
        query = query.offset((page - 1) * limit).limit(limit)

    projects = query.all()
    
    projects_data = []
    for p in projects:
        total_tasks = len(p.work_items)
        completed_tasks = sum(1 for item in p.work_items if item.status == "completed")
        completion_percentage = int((completed_tasks / total_tasks) * 100) if total_tasks > 0 else 0
        
        projects_data.append({
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "client_id": p.client_id,
            "service_id": p.service_id,
            "project_manager_id": p.project_manager_id,
            "start_date": p.start_date.isoformat() if p.start_date else None,
            "end_date": p.end_date.isoformat() if p.end_date else None,
            "status": p.status,
            "priority": p.priority,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "updated_at": p.updated_at.isoformat() if p.updated_at else None,
            "total_tasks_count": total_tasks,
            "completed_tasks_count": completed_tasks,
            "completion_percentage": completion_percentage,
        })

    return {
        "count": len(projects_data),
        "total": total_count,
        "page": page,
        "limit": limit,
        "data": projects_data,
    }


@router.get("/{project_id}")
def get_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project Not Found")
    
    # Calculate stats
    total_tasks = len(project.work_items)
    completed_tasks = sum(1 for item in project.work_items if item.status == "completed")
    in_progress_tasks = sum(1 for item in project.work_items if item.status == "in_progress")
    pending_tasks = sum(1 for item in project.work_items if item.status == "pending")
    
    today = date.today()
    overdue_tasks = sum(
        1 for item in project.work_items 
        if item.due_date and item.due_date < today and item.status != "completed"
    )
    
    completion_percentage = int((completed_tasks / total_tasks) * 100) if total_tasks > 0 else 0
    
    # Working duration sums
    total_logged_seconds = 0
    total_working_seconds = 0
    total_break_seconds = 0
    
    for item in project.work_items:
        for att in item.attempts:
            total_logged_seconds += getattr(att, "total_duration_seconds", 0) or 0
            total_working_seconds += getattr(att, "working_duration_seconds", 0) or 0
            total_break_seconds += getattr(att, "break_duration_seconds", 0) or 0
            
    # Calculate user performance
    # Get all project employees
    assigned_employees = [pe.employee for pe in project.project_employees if pe.employee]
    # In case there are tasks assigned to employees who aren't explicitly assigned to the project:
    assigned_emp_ids = {e.id for e in assigned_employees}
    for item in project.work_items:
        if item.assigned_employee and item.assigned_employee.id not in assigned_emp_ids:
            assigned_employees.append(item.assigned_employee)
            assigned_emp_ids.add(item.assigned_employee.id)
            
    employee_stats = []
    for emp in assigned_employees:
        emp_tasks = [item for item in project.work_items if item.assigned_employee_id == emp.id]
        emp_tasks_count = len(emp_tasks)
        emp_completed = sum(1 for item in emp_tasks if item.status == "completed")
        emp_overdue = sum(
            1 for item in emp_tasks 
            if item.due_date and item.due_date < today and item.status != "completed"
        )
        
        emp_working_secs = 0
        for item in emp_tasks:
            for att in item.attempts:
                emp_working_secs += getattr(att, "working_duration_seconds", 0) or 0
                
        employee_stats.append({
            "employee_id": emp.id,
            "employee_name": emp.name,
            "tasks_count": emp_tasks_count,
            "completed_count": emp_completed,
            "overdue_count": emp_overdue,
            "working_hours": round(emp_working_secs / 3600, 2),
        })

    priority_low = sum(1 for item in project.work_items if item.priority == "low")
    priority_medium = sum(1 for item in project.work_items if item.priority == "medium")
    priority_high = sum(1 for item in project.work_items if item.priority == "high")
    priority_urgent = sum(1 for item in project.work_items if item.priority == "urgent")

    # Calculate weekly trend (last 7 days)
    weekly_trend = []
    for i in range(6, -1, -1):
        day_date = today - timedelta(days=i)
        day_label = day_date.strftime("%a")
        
        day_secs = 0
        for item in project.work_items:
            for att in item.attempts:
                if att.started_at:
                    att_date = att.started_at.date() if isinstance(att.started_at, datetime) else att.started_at
                    if att_date == day_date:
                        day_secs += getattr(att, "working_duration_seconds", 0) or 0
        
        weekly_trend.append({
            "date": day_date.isoformat(),
            "label": day_label,
            "working_hours": round(day_secs / 3600, 2)
        })

    # Return serialized project + stats
    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "client_id": project.client_id,
        "client_name": project.client.company_name if project.client else "N/A",
        "service_id": project.service_id,
        "service_name": project.service.service_name if project.service else "N/A",
        "project_manager_id": project.project_manager_id,
        "manager_name": project.project_manager.name if project.project_manager else "N/A",
        "start_date": project.start_date.isoformat() if project.start_date else None,
        "end_date": project.end_date.isoformat() if project.end_date else None,
        "status": project.status,
        "priority": project.priority,
        "created_at": project.created_at.isoformat() if project.created_at else None,
        "updated_at": project.updated_at.isoformat() if project.updated_at else None,
        "stats": {
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "in_progress_tasks": in_progress_tasks,
            "pending_tasks": pending_tasks,
            "overdue_tasks": overdue_tasks,
            "priority_low": priority_low,
            "priority_medium": priority_medium,
            "priority_high": priority_high,
            "priority_urgent": priority_urgent,
            "completion_percentage": completion_percentage,
            "total_logged_hours": round(total_logged_seconds / 3600, 2),
            "total_working_hours": round(total_working_seconds / 3600, 2),
            "total_break_hours": round(total_break_seconds / 3600, 2),
            "employee_stats": employee_stats,
            "weekly_trend": weekly_trend,
        }
    }


@router.put("/{project_id}")
def update_project(
    project_id: int, project: ProjectUpdate, db: Session = Depends(get_db)
):
    existing_project = db.query(Project).filter(Project.id == project_id).first()
    if not existing_project:
        raise HTTPException(status_code=404, detail="Project Not Found")

    update_data = project.model_dump(exclude_unset=True)

    # If client_id or service_id updated, validate mapping
    c_id = update_data.get("client_id", existing_project.client_id)
    s_id = update_data.get("service_id", existing_project.service_id)
    if c_id and s_id:
        cs = (
            db.query(ClientService)
            .filter(
                ClientService.client_id == c_id,
                ClientService.service_id == s_id,
            )
            .first()
        )
        if not cs:
            raise HTTPException(
                status_code=400,
                detail="Selected service does not belong to the chosen client.",
            )

    for field, value in update_data.items():
        setattr(existing_project, field, value)

    db.commit()
    db.refresh(existing_project)

    return {
        "message": "Project Updated Successfully",
        "project": existing_project,
    }


@router.delete("/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project Not Found")

    db.delete(project)
    db.commit()

    return {
        "message": "Project Deleted Successfully",
    }


@router.post("/{project_id}/employees")
def assign_employees(
    project_id: int,
    payload: AssignEmployeesSchema,
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Clear existing assignments & set new ones
    db.query(ProjectEmployee).filter(ProjectEmployee.project_id == project_id).delete()
    for emp_id in payload.employee_ids:
        db.add(ProjectEmployee(project_id=project_id, employee_id=emp_id))

    db.commit()
    return {"message": "Project team updated successfully"}


@router.get("/{project_id}/employees")
def get_assigned_employees(project_id: int, db: Session = Depends(get_db)):
    employees = (
        db.query(Employee)
        .join(ProjectEmployee, Employee.id == ProjectEmployee.employee_id)
        .filter(ProjectEmployee.project_id == project_id)
        .all()
    )
    return {"data": employees}
