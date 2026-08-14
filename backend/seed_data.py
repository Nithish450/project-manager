import sys
from datetime import datetime, date, timedelta, timezone
from sqlalchemy.orm import Session

from app.database.connection import SessionLocal, Base, engine
from app.utils.auth import hash_password

# Import models to ensure they are loaded and cleared properly
from app.models.user import User, RefreshToken
from app.models.department import Department
from app.models.employee import Employee
from app.models.client import Client
from app.models.service import Service, ClientService
from app.models.project import Project, ProjectEmployee
from app.models.work_item import WorkItem
from app.models.time_tracking import TaskAttempt, TimeLog, BreakLog


def seed_database():
    db: Session = SessionLocal()
    print("Clearing existing database tables...")
    try:
        # Clear logs and attempts
        db.query(TimeLog).delete()
        db.query(BreakLog).delete()
        db.query(TaskAttempt).delete()
        db.query(WorkItem).delete()
        db.query(ProjectEmployee).delete()
        db.query(Project).delete()
        db.query(ClientService).delete()
        db.query(Client).delete()
        db.query(Service).delete()
        db.query(Employee).delete()
        db.query(Department).delete()
        db.query(RefreshToken).delete()
        db.query(User).delete()
        db.commit()
    except Exception as e:
        print(f"Error clearing tables: {e}")
        db.rollback()
        sys.exit(1)

    print("Inserting departments...")
    depts = [
        Department(name="Engineering", description="Software development and QA team", is_active=True),
        Department(name="Product Management", description="Product strategy and planning", is_active=True),
        Department(name="UI/UX Design", description="User interface and experience design", is_active=True),
        Department(name="Sales & Marketing", description="Client acquisition and public relations", is_active=True),
        Department(name="HR & Ops", description="Human resources and office operations", is_active=True),
    ]
    db.add_all(depts)
    db.commit()

    print("Inserting services...")
    services = [
        Service(service_name="Web App Development", is_active=True),
        Service(service_name="Mobile App Development", is_active=True),
        Service(service_name="SEO & Marketing", is_active=True),
        Service(service_name="Cloud Architecture Consulting", is_active=True),
        Service(service_name="UI/UX Design Package", is_active=True),
    ]
    db.add_all(services)
    db.commit()

    # Retrieve committed objects to get IDs
    web_dev = db.query(Service).filter(Service.service_name == "Web App Development").first()
    mob_dev = db.query(Service).filter(Service.service_name == "Mobile App Development").first()
    seo_srv = db.query(Service).filter(Service.service_name == "SEO & Marketing").first()
    cloud_srv = db.query(Service).filter(Service.service_name == "Cloud Architecture Consulting").first()
    ui_srv = db.query(Service).filter(Service.service_name == "UI/UX Design Package").first()

    print("Inserting clients...")
    clients = [
        Client(company_name="Acme Corporation", contact_person="John Doe", email="contact@acme.com", phone="1234567890", website="https://acme.com", address="123 Industrial Parkway", industry="Technology", status="active"),
        Client(company_name="Globex Industries", contact_person="Alice Smith", email="info@globex.com", phone="9876543210", website="https://globex.com", address="456 Global Way", industry="Manufacturing", status="active"),
        Client(company_name="Stark Enterprises", contact_person="Pepper Potts", email="pepper@stark.com", phone="5551234567", website="https://starkenterprises.com", address="10880 Malibu Point", industry="Defense & Aerospace", status="active"),
        Client(company_name="Wayne Enterprises", contact_person="Lucius Fox", email="lfox@waynecorp.com", phone="5559876543", website="https://wayneenterprises.com", address="1007 Mountain Drive", industry="Logistics & Biotech", status="active"),
    ]
    db.add_all(clients)
    db.commit()

    acme = db.query(Client).filter(Client.company_name == "Acme Corporation").first()
    globex = db.query(Client).filter(Client.company_name == "Globex Industries").first()
    stark = db.query(Client).filter(Client.company_name == "Stark Enterprises").first()
    wayne = db.query(Client).filter(Client.company_name == "Wayne Enterprises").first()

    print("Mapping services to clients...")
    client_services = [
        ClientService(client_id=acme.id, service_id=web_dev.id),
        ClientService(client_id=acme.id, service_id=ui_srv.id),
        ClientService(client_id=globex.id, service_id=mob_dev.id),
        ClientService(client_id=stark.id, service_id=cloud_srv.id),
        ClientService(client_id=wayne.id, service_id=seo_srv.id),
        ClientService(client_id=wayne.id, service_id=web_dev.id),
    ]
    db.add_all(client_services)
    db.commit()

    print("Creating users...")
    # Password is "admin123" for admin, "manager123" for manager, "employee123" for employees
    users = [
        User(name="System Admin", email="admin@projectpulse.com", password_hash=hash_password("admin123"), role="admin", is_active=True, is_first_login=False, must_change_password=False),
        User(name="Marcus Vance", email="manager@projectpulse.com", password_hash=hash_password("manager123"), role="manager", is_active=True, is_first_login=False, must_change_password=False),
        User(name="Elena Rostova", email="elena@projectpulse.com", password_hash=hash_password("employee123"), role="employee", is_active=True, is_first_login=False, must_change_password=False),
        User(name="Devon Lane", email="devon@projectpulse.com", password_hash=hash_password("employee123"), role="employee", is_active=True, is_first_login=False, must_change_password=False),
    ]
    db.add_all(users)
    db.commit()

    admin_user = db.query(User).filter(User.email == "admin@projectpulse.com").first()
    manager_user = db.query(User).filter(User.email == "manager@projectpulse.com").first()
    elena_user = db.query(User).filter(User.email == "elena@projectpulse.com").first()
    devon_user = db.query(User).filter(User.email == "devon@projectpulse.com").first()

    print("Linking users to employee profiles...")
    employees = [
        Employee(user_id=admin_user.id, employee_code="EMP001", name="System Admin", email="admin@projectpulse.com", phone="1112223333", designation="Executive Director", department="HR & Ops", experience_years=10, skills="Management, Operations", joining_date=date(2022, 1, 15), status="active"),
        Employee(user_id=manager_user.id, employee_code="EMP002", name="Marcus Vance", email="manager@projectpulse.com", phone="2223334444", designation="Senior Delivery Lead", department="Engineering", experience_years=7, skills="Agile Project Management, Technical Leadership", joining_date=date(2023, 6, 1), status="active"),
        Employee(user_id=elena_user.id, employee_code="EMP003", name="Elena Rostova", email="elena@projectpulse.com", phone="3334445555", designation="Senior Full-Stack Developer", department="Engineering", experience_years=5, skills="React, FastAPI, Node.js, SQL", joining_date=date(2024, 2, 10), status="active"),
        Employee(user_id=devon_user.id, employee_code="EMP004", name="Devon Lane", email="devon@projectpulse.com", phone="4445556666", designation="UI/UX Visual Designer", department="UI/UX Design", experience_years=3, skills="Figma, Wireframing, Styling, Branding", joining_date=date(2025, 8, 20), status="active"),
    ]
    db.add_all(employees)
    db.commit()

    mgr_emp = db.query(Employee).filter(Employee.email == "manager@projectpulse.com").first()
    elena_emp = db.query(Employee).filter(Employee.email == "elena@projectpulse.com").first()
    devon_emp = db.query(Employee).filter(Employee.email == "devon@projectpulse.com").first()

    print("Inserting projects...")
    today = date.today()
    projects = [
        Project(name="Acme Enterprise Web Portal", description="Re-architecture and visual design of Acme's customer-facing web dashboard.", client_id=acme.id, service_id=web_dev.id, project_manager_id=mgr_emp.id, start_date=today - timedelta(days=45), end_date=today + timedelta(days=45), status="in_progress", priority="high", created_at=datetime.now(timezone.utc) - timedelta(days=45)),
        Project(name="Globex Android/iOS Application", description="Design and deployment of cross-platform mobile apps for Globex supply chain tracking.", client_id=globex.id, service_id=mob_dev.id, project_manager_id=mgr_emp.id, start_date=today - timedelta(days=10), end_date=today + timedelta(days=90), status="initiated", priority="medium", created_at=datetime.now(timezone.utc) - timedelta(days=10)),
        Project(name="Stark Cloud Consulting Security", description="Cloud infrastructure audit, compliance validation, and server hardened configurations.", client_id=stark.id, service_id=cloud_srv.id, project_manager_id=mgr_emp.id, start_date=today - timedelta(days=60), end_date=today - timedelta(days=5), status="completed", priority="urgent", created_at=datetime.now(timezone.utc) - timedelta(days=60)),
        Project(name="Wayne SEO Campaign", description="Search engine optimization and digital marketing strategy setup.", client_id=wayne.id, service_id=seo_srv.id, project_manager_id=mgr_emp.id, start_date=today + timedelta(days=10), end_date=today + timedelta(days=100), status="initiated", priority="low", created_at=datetime.now(timezone.utc) + timedelta(days=2)),
    ]
    db.add_all(projects)
    db.commit()

    acme_proj = db.query(Project).filter(Project.name == "Acme Enterprise Web Portal").first()
    globex_proj = db.query(Project).filter(Project.name == "Globex Android/iOS Application").first()
    stark_proj = db.query(Project).filter(Project.name == "Stark Cloud Consulting Security").first()

    print("Mapping employees to projects...")
    proj_employees = [
        ProjectEmployee(project_id=acme_proj.id, employee_id=elena_emp.id),
        ProjectEmployee(project_id=acme_proj.id, employee_id=devon_emp.id),
        ProjectEmployee(project_id=globex_proj.id, employee_id=elena_emp.id),
        ProjectEmployee(project_id=stark_proj.id, employee_id=elena_emp.id),
    ]
    db.add_all(proj_employees)
    db.commit()

    print("Inserting work items...")
    work_items = [
        # Acme Web Portal tasks
        WorkItem(project_id=acme_proj.id, assigned_employee_id=elena_emp.id, title="Database Schema & Migration", description="Design relational schema, write migrations, and seed default values.", status="completed", priority="high", due_date=today - timedelta(days=20), estimated_hours=16.0),
        WorkItem(project_id=acme_proj.id, assigned_employee_id=elena_emp.id, title="JWT Auth and User API", description="Develop register, login, profile, and change password REST endpoints.", status="in_progress", priority="high", due_date=today + timedelta(days=5), estimated_hours=12.0),
        WorkItem(project_id=acme_proj.id, assigned_employee_id=devon_emp.id, title="Create Figma Design & Wireframes", description="Draft customer interface layouts, select color palettes, and get client sign-off.", status="completed", priority="medium", due_date=today - timedelta(days=15), estimated_hours=24.0),
        WorkItem(project_id=acme_proj.id, assigned_employee_id=devon_emp.id, title="Build Component Library UI", description="Implement custom buttons, tables, dropdowns, and layouts in HTML/CSS.", status="pending", priority="medium", due_date=today + timedelta(days=25), estimated_hours=20.0),

        # Globex Mobile tasks
        WorkItem(project_id=globex_proj.id, assigned_employee_id=elena_emp.id, title="Configure React Native Repo", description="Initialize project, setup ESLint/Prettier, configure simulator environments.", status="completed", priority="low", due_date=today - timedelta(days=2), estimated_hours=8.0),
        WorkItem(project_id=globex_proj.id, assigned_employee_id=devon_emp.id, title="Mobile Navigation Prototypes", description="Create app routing flows, sidebar menus, and stack navigators.", status="pending", priority="medium", due_date=today + timedelta(days=15), estimated_hours=10.0),

        # Stark Cloud Security tasks
        WorkItem(project_id=stark_proj.id, assigned_employee_id=elena_emp.id, title="Infrastructure Auditing Check", description="Perform vulnerability scanning and audit AWS IAM credentials.", status="completed", priority="urgent", due_date=today - timedelta(days=10), estimated_hours=30.0),
    ]
    db.add_all(work_items)
    db.commit()

    db_schema_task = db.query(WorkItem).filter(WorkItem.title == "Database Schema & Migration").first()
    jwt_auth_task = db.query(WorkItem).filter(WorkItem.title == "JWT Auth and User API").first()
    figma_task = db.query(WorkItem).filter(WorkItem.title == "Create Figma Design & Wireframes").first()
    audit_task = db.query(WorkItem).filter(WorkItem.title == "Infrastructure Auditing Check").first()

    print("Adding task execution logs & attempts for analytics...")
    
    # 1. Database Schema Task (Completed by Elena 15 days ago)
    att1 = TaskAttempt(work_item_id=db_schema_task.id, employee_id=elena_emp.id, attempt_number=1, status="completed", started_at=datetime.now(timezone.utc) - timedelta(days=22), ended_at=datetime.now(timezone.utc) - timedelta(days=22, hours=10), working_duration_seconds=36000, break_duration_seconds=3600, total_duration_seconds=39600)
    db.add(att1)
    db.commit()
    db.refresh(att1)

    logs1 = [
        TimeLog(work_item_id=db_schema_task.id, attempt_id=att1.id, employee_id=elena_emp.id, event_type="start", timestamp=att1.started_at, remarks="Starting design phase"),
        TimeLog(work_item_id=db_schema_task.id, attempt_id=att1.id, employee_id=elena_emp.id, event_type="pause", timestamp=att1.started_at + timedelta(hours=4), remarks="Lunch break"),
        TimeLog(work_item_id=db_schema_task.id, attempt_id=att1.id, employee_id=elena_emp.id, event_type="resume", timestamp=att1.started_at + timedelta(hours=5)),
        TimeLog(work_item_id=db_schema_task.id, attempt_id=att1.id, employee_id=elena_emp.id, event_type="complete", timestamp=att1.ended_at, remarks="Schema implemented and validated"),
    ]
    db.add_all(logs1)
    db.commit()

    # 2. Figma Design Task (Completed by Devon 10 days ago)
    att2 = TaskAttempt(work_item_id=figma_task.id, employee_id=devon_emp.id, attempt_number=1, status="completed", started_at=datetime.now(timezone.utc) - timedelta(days=16), ended_at=datetime.now(timezone.utc) - timedelta(days=16, hours=12), working_duration_seconds=43200, break_duration_seconds=5400, total_duration_seconds=48600)
    db.add(att2)
    db.commit()
    db.refresh(att2)

    logs2 = [
        TimeLog(work_item_id=figma_task.id, attempt_id=att2.id, employee_id=devon_emp.id, event_type="start", timestamp=att2.started_at, remarks="Figma prototyping"),
        TimeLog(work_item_id=figma_task.id, attempt_id=att2.id, employee_id=devon_emp.id, event_type="complete", timestamp=att2.ended_at, remarks="Client approved visual wireframes"),
    ]
    db.add_all(logs2)
    db.commit()

    # 3. Infrastructure Auditing Check (Completed by Elena)
    att3 = TaskAttempt(work_item_id=audit_task.id, employee_id=elena_emp.id, attempt_number=1, status="completed", started_at=datetime.now(timezone.utc) - timedelta(days=11), ended_at=datetime.now(timezone.utc) - timedelta(days=11, hours=15), working_duration_seconds=54000, break_duration_seconds=3600, total_duration_seconds=57600)
    db.add(att3)
    db.commit()
    db.refresh(att3)

    db.add(TimeLog(work_item_id=audit_task.id, attempt_id=att3.id, employee_id=elena_emp.id, event_type="start", timestamp=att3.started_at))
    db.add(TimeLog(work_item_id=audit_task.id, attempt_id=att3.id, employee_id=elena_emp.id, event_type="complete", timestamp=att3.ended_at, remarks="AWS security checks fully cleared"))
    db.commit()

    # 4. JWT Auth Task - Active/In-progress logs to populate Weekly Work Hours
    # We will simulate attempts log in the past 7 days to fill up dashboard weekly hours line chart
    
    # 4a. 4 days ago session (Elena logged 6 hours)
    att4a = TaskAttempt(work_item_id=jwt_auth_task.id, employee_id=elena_emp.id, attempt_number=1, status="completed", started_at=datetime.now(timezone.utc) - timedelta(days=4), ended_at=datetime.now(timezone.utc) - timedelta(days=4, hours=6), working_duration_seconds=21600, break_duration_seconds=1200, total_duration_seconds=22800)
    db.add(att4a)
    db.commit()
    db.refresh(att4a)
    db.add(TimeLog(work_item_id=jwt_auth_task.id, attempt_id=att4a.id, employee_id=elena_emp.id, event_type="start", timestamp=att4a.started_at, remarks="Setup auth controllers"))
    db.add(TimeLog(work_item_id=jwt_auth_task.id, attempt_id=att4a.id, employee_id=elena_emp.id, event_type="complete", timestamp=att4a.ended_at, remarks="Controllers verified"))
    db.commit()

    # 4b. 2 days ago session (Elena logged 4.5 hours)
    att4b = TaskAttempt(work_item_id=jwt_auth_task.id, employee_id=elena_emp.id, attempt_number=2, status="completed", started_at=datetime.now(timezone.utc) - timedelta(days=2), ended_at=datetime.now(timezone.utc) - timedelta(days=2, hours=5), working_duration_seconds=16200, break_duration_seconds=1800, total_duration_seconds=18000)
    db.add(att4b)
    db.commit()
    db.refresh(att4b)
    db.add(TimeLog(work_item_id=jwt_auth_task.id, attempt_id=att4b.id, employee_id=elena_emp.id, event_type="start", timestamp=att4b.started_at, remarks="Write JWT helper library"))
    db.add(TimeLog(work_item_id=jwt_auth_task.id, attempt_id=att4b.id, employee_id=elena_emp.id, event_type="complete", timestamp=att4b.ended_at, remarks="JWT helper library fully working"))
    db.commit()

    # 4c. Today's active running/paused session
    att4c = TaskAttempt(work_item_id=jwt_auth_task.id, employee_id=elena_emp.id, attempt_number=3, status="paused", started_at=datetime.now(timezone.utc) - timedelta(minutes=45), working_duration_seconds=1800, break_duration_seconds=900, total_duration_seconds=2700)
    db.add(att4c)
    db.commit()
    db.refresh(att4c)
    db.add(TimeLog(work_item_id=jwt_auth_task.id, attempt_id=att4c.id, employee_id=elena_emp.id, event_type="start", timestamp=att4c.started_at, remarks="Frontend login connection"))
    db.add(TimeLog(work_item_id=jwt_auth_task.id, attempt_id=att4c.id, employee_id=elena_emp.id, event_type="pause", timestamp=att4c.started_at + timedelta(minutes=30), remarks="Coffee break"))
    db.commit()

    print("Database seeding completed successfully!")
    db.close()


if __name__ == "__main__":
    seed_database()
