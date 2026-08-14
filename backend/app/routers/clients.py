from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List

from app.database.connection import get_db
from app.models.client import Client
from app.models.service import Service, ClientService
from app.models.project import Project
from app.schemas.client import ClientCreate, ClientUpdate

router = APIRouter(prefix="/clients", tags=["Clients"])


@router.post("")
def create_client(client_data: ClientCreate, db: Session = Depends(get_db)):
    new_client = Client(
        company_name=client_data.company_name,
        contact_person=client_data.contact_person,
        email=client_data.email,
        phone=client_data.phone,
        website=client_data.website,
        address=client_data.address,
        industry=client_data.industry or "General Services",
        gst_number=client_data.gst_number,
        status=client_data.status,
    )
    db.add(new_client)
    db.commit()
    db.refresh(new_client)

    # Attach client services
    if client_data.service_ids:
        for sid in client_data.service_ids:
            db.add(ClientService(client_id=new_client.id, service_id=sid))
        db.commit()

    return {"message": "Client created successfully", "data": new_client}


@router.get("")
def get_clients(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    industry: Optional[str] = Query(None),
    page: Optional[int] = Query(None, ge=1),
    limit: Optional[int] = Query(None, ge=1),
    db: Session = Depends(get_db),
):
    query = db.query(Client)

    if search:
        query = query.filter(
            (Client.company_name.ilike(f"%{search}%"))
            | (Client.contact_person.ilike(f"%{search}%"))
            | (Client.email.ilike(f"%{search}%"))
        )
    if status:
        query = query.filter(Client.status == status)
    if industry:
        query = query.filter(Client.industry == industry)

    total_count = query.count()
    if page is not None and limit is not None:
        query = query.offset((page - 1) * limit).limit(limit)

    clients = query.all()
    results = []

    for c in clients:
        services = (
            db.query(Service)
            .join(ClientService, Service.id == ClientService.service_id)
            .filter(ClientService.client_id == c.id)
            .all()
        )
        c_dict = {
            "id": c.id,
            "company_name": c.company_name,
            "contact_person": c.contact_person,
            "email": c.email,
            "phone": c.phone,
            "website": c.website,
            "address": c.address,
            "industry": c.industry,
            "gst_number": c.gst_number,
            "status": c.status,
            "services": services,
        }
        results.append(c_dict)

    return {
        "count": len(results),
        "total": total_count,
        "page": page,
        "limit": limit,
        "data": results
    }


@router.get("/{client_id}")
def get_client_profile(client_id: int, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    services = (
        db.query(Service)
        .join(ClientService, Service.id == ClientService.service_id)
        .filter(ClientService.client_id == client.id)
        .all()
    )

    projects = db.query(Project).filter(Project.client_id == client.id).all()

    return {
        "client": client,
        "services": services,
        "projects": projects,
    }


@router.get("/{client_id}/services")
def get_client_available_services(client_id: int, db: Session = Depends(get_db)):
    services = (
        db.query(Service)
        .join(ClientService, Service.id == ClientService.service_id)
        .filter(ClientService.client_id == client_id)
        .all()
    )
    return {"data": services}


@router.put("/{client_id}")
def update_client(client_id: int, client_data: ClientUpdate, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    update_dict = client_data.model_dump(exclude_unset=True)
    service_ids = update_dict.pop("service_ids", None)

    for field, val in update_dict.items():
        setattr(client, field, val)

    if service_ids is not None:
        db.query(ClientService).filter(ClientService.client_id == client_id).delete()
        for sid in service_ids:
            db.add(ClientService(client_id=client_id, service_id=sid))

    db.commit()
    db.refresh(client)
    return {"message": "Client updated successfully", "data": client}


@router.delete("/{client_id}")
def delete_client(client_id: int, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    db.delete(client)
    db.commit()
    return {"message": "Client deleted successfully"}
