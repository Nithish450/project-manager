import io
import csv
from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date

from app.database.connection import get_db
from app.models.project import Project
from app.models.client import Client
from app.models.employee import Employee
from app.models.work_item import WorkItem
from app.models.service import Service

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])


@router.get("/projects")
def project_report(
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
    export: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Project)

    if search:
        query = query.filter(Project.name.ilike(f"%{search}%"))
    if status:
        if status.lower() != "all":
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

    # Do not paginate if export requested
    if not export and page is not None and limit is not None:
        query = query.offset((page - 1) * limit).limit(limit)

    projects = query.all()
    data = []
    for p in projects:
        total_tasks = len(p.work_items)
        completed_tasks = sum(1 for item in p.work_items if item.status == "completed")
        completion_percentage = int((completed_tasks / total_tasks) * 100) if total_tasks > 0 else 0

        data.append({
            "ID": p.id,
            "Name": p.name,
            "Description": p.description or "",
            "Client": p.client.company_name if p.client else "N/A",
            "Client ID": p.client_id,
            "Manager": p.project_manager.name if p.project_manager else "N/A",
            "Manager ID": p.project_manager_id,
            "Status": p.status,
            "Priority": p.priority,
            "Completion Percentage": completion_percentage,
            "Start Date": str(p.start_date) if p.start_date else "",
            "End Date": str(p.end_date) if p.end_date else "",
        })

    if export == "excel" or export == "csv":
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=["ID", "Name", "Client", "Manager", "Priority", "Completion Percentage", "Status", "Start Date", "End Date"])
        writer.writeheader()
        csv_data = []
        for d in data:
            csv_data.append({
                "ID": d["ID"],
                "Name": d["Name"],
                "Client": d["Client"],
                "Manager": d["Manager"],
                "Priority": d["Priority"],
                "Completion Percentage": f"{d['Completion Percentage']}%",
                "Status": d["Status"],
                "Start Date": d["Start Date"],
                "End Date": d["End Date"],
            })
        writer.writerows(csv_data)
        output.seek(0)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode("utf-8")),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=project_report.csv"},
        )

    return {"count": total_count, "data": data}


@router.get("/work-items")
def work_item_report(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    project_id: Optional[int] = Query(None),
    assigned_employee_id: Optional[int] = Query(None),
    service_id: Optional[int] = Query(None),
    due_start: Optional[date] = Query(None),
    due_end: Optional[date] = Query(None),
    page: Optional[int] = Query(None, ge=1),
    limit: Optional[int] = Query(None, ge=1),
    export: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(WorkItem)

    if search:
        from app.models.project import Project
        from app.models.employee import Employee
        query = query.outerjoin(Project).outerjoin(Employee)
        query = query.filter(
            (WorkItem.title.ilike(f"%{search}%")) |
            (Project.name.ilike(f"%{search}%")) |
            (Employee.name.ilike(f"%{search}%"))
        )

    today = date.today()
    if status:
        stat_lower = status.lower()
        if stat_lower == "all":
            pass
        elif stat_lower == "overdue":
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
        query = query.join(Project).filter(Project.service_id == service_id)
    if due_start:
        query = query.filter(WorkItem.due_date >= due_start)
    if due_end:
        query = query.filter(WorkItem.due_date <= due_end)

    total_count = query.count()

    # Do not paginate if export requested
    if not export and page is not None and limit is not None:
        query = query.offset((page - 1) * limit).limit(limit)

    items = query.all()
    data = []
    for i in items:
        service_name = ""
        if i.project and i.project.service:
            service_name = i.project.service.service_name

        data.append({
            "ID": i.id,
            "Title": i.title,
            "Description": i.description or "",
            "Project ID": i.project_id,
            "Project Name": i.project.name if i.project else "N/A",
            "Service Name": service_name,
            "Assigned Employee": i.assigned_employee.name if i.assigned_employee else "Unassigned",
            "Assigned Employee ID": i.assigned_employee_id,
            "Status": i.status,
            "Priority": i.priority,
            "Due Date": str(i.due_date) if i.due_date else "",
            "Estimated Hours": float(i.estimated_hours or 0),
        })

    if export == "excel" or export == "csv":
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=["ID", "Title", "Project Name", "Service Name", "Assigned Employee", "Priority", "Due Date", "Status"])
        writer.writeheader()
        csv_data = []
        for d in data:
            csv_data.append({
                "ID": d["ID"],
                "Title": d["Title"],
                "Project Name": d["Project Name"],
                "Service Name": d["Service Name"],
                "Assigned Employee": d["Assigned Employee"],
                "Priority": d["Priority"],
                "Due Date": d["Due Date"],
                "Status": d["Status"],
            })
        writer.writerows(csv_data)
        output.seek(0)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode("utf-8")),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=work_item_report.csv"},
        )

    return {"count": total_count, "data": data}
