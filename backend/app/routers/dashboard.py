from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta
from typing import Optional

from app.database.connection import get_db
from app.models.client import Client
from app.models.employee import Employee
from app.models.project import Project
from app.models.work_item import WorkItem
from app.models.time_tracking import TaskAttempt

router = APIRouter(prefix="/dashboard", tags=["Dashboard Aggregations"])


@router.get("/stats")
def get_dashboard_stats(
    employee_id: Optional[int] = Query(None), db: Session = Depends(get_db)
):
    total_clients = db.query(Client).count()
    total_employees = db.query(Employee).count()
    total_projects = db.query(Project).count()
    active_projects = db.query(Project).filter(Project.status == "in_progress").count()
    inactive_projects = (
        db.query(Project)
        .filter(Project.status.in_(["on_hold", "cancelled", "completed"]))
        .count()
    )

    query = db.query(WorkItem)
    if employee_id:
        query = query.filter(WorkItem.assigned_employee_id == employee_id)

    work_items = query.all()
    today = date.today()

    total_work_items = len(work_items)
    pending_work_items = sum(1 for w in work_items if w.status == "pending")
    in_progress_work_items = sum(1 for w in work_items if w.status == "in_progress")
    completed_work_items = sum(1 for w in work_items if w.status == "completed")
    overdue_work_items = sum(
        1
        for w in work_items
        if w.due_date and w.due_date < today and w.status != "completed"
    )

    # Calculate time metrics from TaskAttempt
    attempts_q = db.query(TaskAttempt)
    if employee_id:
        attempts_q = attempts_q.filter(TaskAttempt.employee_id == employee_id)
    attempts = attempts_q.all()

    total_work_secs = sum(a.working_duration_seconds or 0 for a in attempts)
    total_break_secs = sum(a.break_duration_seconds or 0 for a in attempts)

    today_work_secs = sum(
        (a.working_duration_seconds or 0)
        for a in attempts
        if a.started_at and a.started_at.date() == today
    )
    today_break_secs = sum(
        (a.break_duration_seconds or 0)
        for a in attempts
        if a.started_at and a.started_at.date() == today
    )

    productivity_pct = 100.0
    if (today_work_secs + today_break_secs) > 0:
        productivity_pct = round(
            (today_work_secs / (today_work_secs + today_break_secs)) * 100, 1
        )

    return {
        "total_clients": total_clients,
        "total_employees": total_employees,
        "total_projects": total_projects,
        "active_projects": active_projects,
        "inactive_projects": inactive_projects,
        "total_work_items": total_work_items,
        "pending_work_items": pending_work_items,
        "in_progress_work_items": in_progress_work_items,
        "completed_work_items": completed_work_items,
        "overdue_work_items": overdue_work_items,
        "today_working_minutes": round(today_work_secs / 60, 1),
        "today_break_minutes": round(today_break_secs / 60, 1),
        "productivity_percentage": productivity_pct,
    }


@router.get("/charts")
def get_dashboard_charts(db: Session = Depends(get_db)):
    # 1. Projects by Status
    project_status_raw = (
        db.query(Project.status, func.count(Project.id)).group_by(Project.status).all()
    )
    project_status_distribution = {
        status: count for status, count in project_status_raw
    }

    # 2. Task Completion / Work Items Status
    today = date.today()
    work_items = db.query(WorkItem).all()
    pending_work_items = sum(1 for w in work_items if w.status == "pending")
    in_progress_work_items = sum(1 for w in work_items if w.status == "in_progress")
    completed_work_items = sum(1 for w in work_items if w.status == "completed")
    overdue_work_items = sum(
        1
        for w in work_items
        if w.due_date and w.due_date < today and w.status != "completed"
    )
    work_item_status_distribution = {
        "pending": pending_work_items,
        "in_progress": in_progress_work_items,
        "completed": completed_work_items,
        "overdue": overdue_work_items
    }

    # 3. Employee Productivity (Working hours)
    employee_productivity_raw = (
        db.query(Employee.name, func.sum(TaskAttempt.working_duration_seconds))
        .join(TaskAttempt, Employee.id == TaskAttempt.employee_id)
        .group_by(Employee.id, Employee.name)
        .all()
    )
    employee_productivity = [
        {"employee_name": name, "working_hours": round((total_secs or 0) / 3600, 2)}
        for name, total_secs in employee_productivity_raw
    ]

    # 4. Monthly Projects (Past 6 months count)
    projects = db.query(Project).all()
    monthly_counts = {}
    for p in projects:
        if p.created_at:
            month_key = p.created_at.strftime("%Y-%m")
            monthly_counts[month_key] = monthly_counts.get(month_key, 0) + 1
    
    # Sort and slice past 6 months
    sorted_months = sorted(monthly_counts.keys())[-6:]
    monthly_projects = [{"month": m, "count": monthly_counts[m]} for m in sorted_months]
    
    # 5. Weekly Work Hours (Work hours by weekday for the last 7 days)
    weekly_hours = {}
    for i in range(7):
        d = date.today() - timedelta(days=i)
        weekly_hours[d.strftime("%a")] = 0.0

    attempts = db.query(TaskAttempt).filter(TaskAttempt.started_at >= date.today() - timedelta(days=7)).all()
    for a in attempts:
        if a.started_at:
            day_key = a.started_at.strftime("%a")
            if day_key in weekly_hours:
                weekly_hours[day_key] += (a.working_duration_seconds or 0) / 3600

    weekly_work_hours = []
    for i in range(6, -1, -1):
        d = date.today() - timedelta(days=i)
        day_key = d.strftime("%a")
        weekly_work_hours.append({"day": day_key, "hours": round(weekly_hours.get(day_key, 0.0), 2)})

    return {
        "project_status_distribution": project_status_distribution,
        "work_item_status_distribution": work_item_status_distribution,
        "employee_productivity": employee_productivity,
        "monthly_projects": monthly_projects,
        "weekly_work_hours": weekly_work_hours,
    }


@router.get("/widgets")
def get_dashboard_widgets(db: Session = Depends(get_db)):
    today = date.today()
    next_week = today + timedelta(days=7)

    recent_projects = db.query(Project).order_by(Project.id.desc()).limit(5).all()
    recent_work_items = db.query(WorkItem).order_by(WorkItem.id.desc()).limit(5).all()
    upcoming_deadlines = (
        db.query(WorkItem)
        .filter(
            WorkItem.due_date >= today,
            WorkItem.due_date <= next_week,
            WorkItem.status != "completed",
        )
        .order_by(WorkItem.due_date.asc())
        .limit(5)
        .all()
    )
    todays_work_items = db.query(WorkItem).filter(WorkItem.due_date == today).all()

    return {
        "recent_projects": recent_projects,
        "recent_work_items": recent_work_items,
        "upcoming_deadlines": upcoming_deadlines,
        "todays_work_items": todays_work_items,
    }
