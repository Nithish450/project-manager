import secrets
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional

from app.database.connection import get_db
from app.models.employee import Employee
from app.models.user import User
from app.models.notification import Notification
from app.models.setting import Setting
from app.schemas.employee import EmployeeCreate, EmployeeUpdate
from app.utils.auth import hash_password
from app.utils.email import send_email

router = APIRouter(prefix="/employees", tags=["Employee Management"])


@router.post("")
def create_employee(
    emp_data: EmployeeCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    try:
        existing = db.query(Employee).filter(Employee.employee_code == emp_data.employee_code).first()
        if existing:
            raise HTTPException(status_code=400, detail="Employee code already exists")

        # Auto-generate login User credentials if no user_id supplied
        generated_password = None
        user_id = emp_data.user_id

        if not user_id:
            existing_user = db.query(User).filter(User.email == emp_data.email).first()
            if existing_user:
                user_id = existing_user.id
            else:
                generated_password = f"Pulse@{secrets.token_hex(3)}"
                new_user = User(
                    name=emp_data.name,
                    email=emp_data.email,
                    password_hash=hash_password(generated_password),
                    role="employee",
                    is_active=True,
                )
                db.add(new_user)
                db.flush()
                user_id = new_user.id

                # Create notification email stub with credentials
                welcome_msg = (
                    f"Welcome {emp_data.name}! Your ProjectPulse employee account has been activated. "
                    f"Username: {emp_data.email} | Initial Password: {generated_password}"
                )
                db.add(Notification(
                    user_id=new_user.id,
                    type="work_assigned",
                    message=welcome_msg,
                    reference_type="employee",
                    reference_id=user_id,
                ))
                db.flush()

                # Send email notifications if enabled
                settings = db.query(Setting).first()
                email_enabled = settings.email_notifications_enabled if settings else True
                if email_enabled:
                    email_subject = "Welcome to ProjectPulse - Your Account Details"
                    email_body = (
                        f"Hi {emp_data.name},\n\n"
                        f"Your ProjectPulse employee account has been activated.\n"
                        f"Please log in using the following credentials:\n\n"
                        f"Username/Email: {emp_data.email}\n"
                        f"Initial Password: {generated_password}\n\n"
                        f"Best regards,\n"
                        f"ProjectPulse Team"
                    )
                    background_tasks.add_task(send_email, emp_data.email, email_subject, email_body)

        new_emp = Employee(
            user_id=user_id,
            employee_code=emp_data.employee_code,
            name=emp_data.name,
            email=emp_data.email,
            phone=emp_data.phone,
            designation=emp_data.designation,
            department=emp_data.department,
            experience_years=emp_data.experience_years,
            skills=emp_data.skills,
            joining_date=emp_data.joining_date,
            status=emp_data.status,
        )
        db.add(new_emp)
        db.commit()
        db.refresh(new_emp)

        return {
            "message": "Employee created successfully",
            "data": new_emp,
            "credentials": {
                "email": emp_data.email,
                "generated_password": generated_password,
            } if generated_password else None,
        }
    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))


@router.get("")
def get_employees(
    search: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    designation: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: Optional[int] = Query(None, ge=1),
    limit: Optional[int] = Query(None, ge=1),
    db: Session = Depends(get_db),
):
    query = db.query(Employee)

    if search:
        query = query.filter(
            (Employee.name.ilike(f"%{search}%"))
            | (Employee.email.ilike(f"%{search}%"))
            | (Employee.employee_code.ilike(f"%{search}%"))
        )
    if department:
        query = query.filter(Employee.department == department)
    if designation:
        query = query.filter(Employee.designation == designation)
    if status:
        query = query.filter(Employee.status == status)

    total_count = query.count()
    if page is not None and limit is not None:
        query = query.offset((page - 1) * limit).limit(limit)

    employees = query.all()

    return {
        "count": len(employees),
        "total": total_count,
        "page": page,
        "limit": limit,
        "data": employees,
    }


@router.get("/{employee_id}")
def get_employee(employee_id: int, db: Session = Depends(get_db)):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee


@router.put("/{employee_id}")
def update_employee(employee_id: int, emp_data: EmployeeUpdate, db: Session = Depends(get_db)):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    update_dict = emp_data.model_dump(exclude_unset=True)

    # Update linked User email/name/active-state if they changed
    if employee.user_id:
        user = db.query(User).filter(User.id == employee.user_id).first()
        if user:
            if "email" in update_dict:
                user.email = update_dict["email"]
            if "name" in update_dict:
                user.name = update_dict["name"]
            if "status" in update_dict:
                user.is_active = (update_dict["status"] == "active")

    for field, val in update_dict.items():
        setattr(employee, field, val)

    db.commit()
    db.refresh(employee)
    return {"message": "Employee updated successfully", "data": employee}


@router.delete("/{employee_id}")
def delete_employee(employee_id: int, db: Session = Depends(get_db)):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # If employee has linked user, delete user as well
    if employee.user_id:
        user = db.query(User).filter(User.id == employee.user_id).first()
        if user:
            db.delete(user)

    db.delete(employee)
    db.commit()
    return {"message": "Employee deleted successfully"}
