from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date, timedelta

from app.database.connection import get_db
from app.models.work_item import WorkItem
from app.models.time_tracking import TaskAttempt, TimeLog, BreakLog
from app.models.employee import Employee
from app.models.user import User

router = APIRouter(prefix="/tasks", tags=["Task Execution & Time Tracking"])


class ActionPayload(BaseModel):
    employee_id: Optional[int] = None
    remarks: Optional[str] = None


def get_now():
    """Return current local time as naive datetime (no timezone info)."""
    return datetime.now()


def safe_diff_seconds(end_dt, start_dt):
    """Safely compute seconds difference between two datetimes, stripping any tzinfo."""
    if not end_dt or not start_dt:
        return 0
    # Strip timezone info if present to avoid mixed comparison errors
    e = end_dt.replace(tzinfo=None) if end_dt.tzinfo else end_dt
    s = start_dt.replace(tzinfo=None) if start_dt.tzinfo else start_dt
    return max(0, int((e - s).total_seconds()))


@router.post("/{work_item_id}/start")
def start_task(work_item_id: int, payload: ActionPayload = None, db: Session = Depends(get_db)):
    work_item = db.query(WorkItem).filter(WorkItem.id == work_item_id).first()
    if not work_item:
        raise HTTPException(status_code=404, detail="Work item not found")

    emp_id = payload.employee_id if (payload and payload.employee_id) else work_item.assigned_employee_id
    if not emp_id:
        emp = db.query(Employee).first()
        emp_id = emp.id if emp else 1

    # Check if there is an active/paused attempt
    attempt = (
        db.query(TaskAttempt)
        .filter(TaskAttempt.work_item_id == work_item_id, TaskAttempt.status.in_(["started", "paused"]))
        .order_by(TaskAttempt.attempt_number.desc())
        .first()
    )

    now = get_now()

    if not attempt:
        last_attempt = (
            db.query(TaskAttempt)
            .filter(TaskAttempt.work_item_id == work_item_id)
            .order_by(TaskAttempt.attempt_number.desc())
            .first()
        )
        next_attempt_num = (last_attempt.attempt_number + 1) if last_attempt else 1

        attempt = TaskAttempt(
            work_item_id=work_item_id,
            employee_id=emp_id,
            attempt_number=next_attempt_num,
            status="started",
            started_at=now,
        )
        db.add(attempt)
        db.commit()
        db.refresh(attempt)

    else:
        if attempt.status == "paused":
            open_break = (
                db.query(BreakLog)
                .filter(BreakLog.attempt_id == attempt.id, BreakLog.ended_at == None)
                .first()
            )
            if open_break:
                open_break.ended_at = now
                open_break.duration_seconds = safe_diff_seconds(now, open_break.started_at)
                attempt.break_duration_seconds = (attempt.break_duration_seconds or 0) + open_break.duration_seconds

            attempt.status = "started"
            db.commit()

    # Log event
    t_log = TimeLog(
        work_item_id=work_item_id,
        attempt_id=attempt.id,
        employee_id=emp_id,
        event_type="started",
        timestamp=now,
        remarks=payload.remarks if payload else None,
    )
    db.add(t_log)

    # Update WorkItem status
    work_item.status = "in_progress"
    db.commit()

    return {"message": f"Task attempt #{attempt.attempt_number} started", "attempt": attempt}


@router.post("/{work_item_id}/pause")
def pause_task(work_item_id: int, payload: ActionPayload = None, db: Session = Depends(get_db)):
    attempt = (
        db.query(TaskAttempt)
        .filter(TaskAttempt.work_item_id == work_item_id, TaskAttempt.status == "started")
        .order_by(TaskAttempt.attempt_number.desc())
        .first()
    )
    if not attempt:
        raise HTTPException(status_code=400, detail="No active started task session found to pause.")

    now = get_now()
    attempt.status = "paused"

    break_log = BreakLog(attempt_id=attempt.id, started_at=now)
    db.add(break_log)

    emp_id = payload.employee_id if (payload and payload.employee_id) else attempt.employee_id
    t_log = TimeLog(
        work_item_id=work_item_id,
        attempt_id=attempt.id,
        employee_id=emp_id,
        event_type="paused",
        timestamp=now,
        remarks=payload.remarks if payload else None,
    )
    db.add(t_log)

    db.commit()
    return {"message": "Task paused successfully", "attempt": attempt}


@router.post("/{work_item_id}/resume")
def resume_task(work_item_id: int, payload: ActionPayload = None, db: Session = Depends(get_db)):
    attempt = (
        db.query(TaskAttempt)
        .filter(TaskAttempt.work_item_id == work_item_id, TaskAttempt.status == "paused")
        .order_by(TaskAttempt.attempt_number.desc())
        .first()
    )
    if not attempt:
        raise HTTPException(status_code=400, detail="No paused task session found to resume.")

    now = get_now()
    attempt.status = "started"

    open_break = (
        db.query(BreakLog)
        .filter(BreakLog.attempt_id == attempt.id, BreakLog.ended_at == None)
        .first()
    )
    if open_break:
        open_break.ended_at = now
        open_break.duration_seconds = safe_diff_seconds(now, open_break.started_at)
        attempt.break_duration_seconds = (attempt.break_duration_seconds or 0) + open_break.duration_seconds

    emp_id = payload.employee_id if (payload and payload.employee_id) else attempt.employee_id
    t_log = TimeLog(
        work_item_id=work_item_id,
        attempt_id=attempt.id,
        employee_id=emp_id,
        event_type="resumed",
        timestamp=now,
        remarks=payload.remarks if payload else None,
    )
    db.add(t_log)

    db.commit()
    return {"message": "Task resumed successfully", "attempt": attempt}


@router.post("/{work_item_id}/complete")
def complete_task(work_item_id: int, payload: ActionPayload = None, db: Session = Depends(get_db)):
    work_item = db.query(WorkItem).filter(WorkItem.id == work_item_id).first()
    if not work_item:
        raise HTTPException(status_code=404, detail="Work item not found")

    attempt = (
        db.query(TaskAttempt)
        .filter(TaskAttempt.work_item_id == work_item_id, TaskAttempt.status.in_(["started", "paused"]))
        .order_by(TaskAttempt.attempt_number.desc())
        .first()
    )

    now = get_now()

    if attempt:
        if attempt.status == "paused":
            open_break = (
                db.query(BreakLog)
                .filter(BreakLog.attempt_id == attempt.id, BreakLog.ended_at == None)
                .first()
            )
            if open_break:
                open_break.ended_at = now
                open_break.duration_seconds = safe_diff_seconds(now, open_break.started_at)
                attempt.break_duration_seconds = (attempt.break_duration_seconds or 0) + open_break.duration_seconds

        attempt.status = "completed"
        attempt.ended_at = now

        total_secs = safe_diff_seconds(now, attempt.started_at)
        attempt.total_duration_seconds = total_secs
        attempt.working_duration_seconds = max(0, total_secs - (attempt.break_duration_seconds or 0))

        emp_id = payload.employee_id if (payload and payload.employee_id) else attempt.employee_id
        t_log = TimeLog(
            work_item_id=work_item_id,
            attempt_id=attempt.id,
            employee_id=emp_id,
            event_type="completed",
            timestamp=now,
            remarks=payload.remarks if payload else None,
        )
        db.add(t_log)

    work_item.status = "completed"
    db.commit()

    return {"message": "Task marked as completed", "attempt": attempt}


@router.get("/{work_item_id}/attempts")
def get_task_attempts_history(work_item_id: int, db: Session = Depends(get_db)):
    attempts = (
        db.query(TaskAttempt)
        .filter(TaskAttempt.work_item_id == work_item_id)
        .order_by(TaskAttempt.attempt_number.asc())
        .all()
    )

    logs = (
        db.query(TimeLog)
        .filter(TimeLog.work_item_id == work_item_id)
        .order_by(TimeLog.timestamp.asc())
        .all()
    )

    result_attempts = []
    now = get_now()

    for att in attempts:
        # Always recalculate break duration from actual BreakLog records
        all_breaks = (
            db.query(BreakLog)
            .filter(BreakLog.attempt_id == att.id)
            .all()
        )
        b_secs = 0
        for brk in all_breaks:
            if brk.ended_at:
                b_secs += safe_diff_seconds(brk.ended_at, brk.started_at)
            else:
                b_secs += safe_diff_seconds(now, brk.started_at)

        # Calculate total elapsed time
        if att.ended_at:
            total_secs = safe_diff_seconds(att.ended_at, att.started_at)
        else:
            total_secs = safe_diff_seconds(now, att.started_at)

        w_secs = max(0, total_secs - b_secs)

        # Return started_at as ISO string for frontend live timer
        started_at_iso = att.started_at.isoformat() if att.started_at else None

        result_attempts.append({
            "id": att.id,
            "attempt_number": att.attempt_number,
            "status": att.status,
            "started_at": started_at_iso,
            "ended_at": att.ended_at,
            "working_duration_seconds": w_secs,
            "break_duration_seconds": b_secs,
            "total_duration_seconds": total_secs,
        })

    # Serialize log timestamps as ISO strings
    serialized_logs = []
    for log in logs:
        serialized_logs.append({
            "id": log.id,
            "event_type": log.event_type,
            "timestamp": log.timestamp.isoformat() if log.timestamp else None,
            "remarks": log.remarks,
        })

    return {
        "attempts": result_attempts,
        "logs": serialized_logs,
        "attempt_count": len(attempts),
    }
