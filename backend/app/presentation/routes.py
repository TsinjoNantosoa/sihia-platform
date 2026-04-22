from dataclasses import asdict

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.application.schemas import AppointmentCreate, LoginRequest, LoginResponse, PatientCreate
from app.presentation.deps import (
    appointments_service,
    auth_service,
    doctors_service,
    patients_service,
    require_auth,
)

api_router = APIRouter(prefix="/api")


@api_router.post("/auth/login", response_model=LoginResponse)
def login(payload: LoginRequest):
    token = auth_service.login(payload.email, payload.password)
    return LoginResponse(access_token=token)


@api_router.get("/patients")
def list_patients(
    search: str | None = Query(default=None),
    status: str | None = Query(default=None),
    _claims: dict = Depends(require_auth),
):
    items = patients_service.list(search=search, status_filter=status)
    return [
        {
            "id": p.id,
            "recordNumber": p.record_number,
            "firstName": p.first_name,
            "lastName": p.last_name,
            "dob": p.dob,
            "gender": p.gender,
            "phone": p.phone,
            "email": p.email,
            "address": p.address,
            "bloodType": p.blood_type,
            "allergies": p.allergies,
            "insurance": p.insurance,
            "status": p.status,
            "lastVisit": p.last_visit,
        }
        for p in items
    ]


@api_router.get("/patients/{patient_id}")
def get_patient(patient_id: str, _claims: dict = Depends(require_auth)):
    p = patients_service.get(patient_id)
    return {
        "id": p.id,
        "recordNumber": p.record_number,
        "firstName": p.first_name,
        "lastName": p.last_name,
        "dob": p.dob,
        "gender": p.gender,
        "phone": p.phone,
        "email": p.email,
        "address": p.address,
        "bloodType": p.blood_type,
        "allergies": p.allergies,
        "insurance": p.insurance,
        "status": p.status,
        "lastVisit": p.last_visit,
    }


@api_router.post("/patients")
def create_patient(payload: PatientCreate, _claims: dict = Depends(require_auth)):
    p = patients_service.create(payload)
    return {
        "id": p.id,
        "recordNumber": p.record_number,
        "firstName": p.first_name,
        "lastName": p.last_name,
        "dob": p.dob,
        "gender": p.gender,
        "phone": p.phone,
        "email": p.email,
        "address": p.address,
        "bloodType": p.blood_type,
        "allergies": p.allergies,
        "insurance": p.insurance,
        "status": p.status,
        "lastVisit": p.last_visit,
    }


@api_router.delete("/patients/{patient_id}", status_code=status.HTTP_200_OK)
def delete_patient(patient_id: str, _claims: dict = Depends(require_auth)):
    patients_service.delete(patient_id)
    return {"success": True}


@api_router.get("/doctors")
def list_doctors(_claims: dict = Depends(require_auth)):
    return [
        {
            "id": d.id,
            "firstName": d.first_name,
            "lastName": d.last_name,
            "specialty": d.specialty,
            "phone": d.phone,
            "email": d.email,
            "availability": d.availability,
            "patientsCount": d.patients_count,
            "weeklyAppointments": d.weekly_appointments,
            "satisfaction": d.satisfaction,
            "schedule": d.schedule,
        }
        for d in doctors_service.list()
    ]


@api_router.get("/doctors/{doctor_id}")
def get_doctor(doctor_id: str, _claims: dict = Depends(require_auth)):
    d = doctors_service.get(doctor_id)
    return {
        "id": d.id,
        "firstName": d.first_name,
        "lastName": d.last_name,
        "specialty": d.specialty,
        "phone": d.phone,
        "email": d.email,
        "availability": d.availability,
        "patientsCount": d.patients_count,
        "weeklyAppointments": d.weekly_appointments,
        "satisfaction": d.satisfaction,
        "schedule": d.schedule,
    }


@api_router.get("/appointments")
def list_appointments(_claims: dict = Depends(require_auth)):
    return [
        {
            "id": a.id,
            "patientId": a.patient_id,
            "patientName": a.patient_name,
            "doctorId": a.doctor_id,
            "doctorName": a.doctor_name,
            "date": a.date,
            "durationMin": a.duration_min,
            "reason": a.reason,
            "status": a.status,
        }
        for a in appointments_service.list()
    ]


@api_router.post("/appointments")
def create_appointment(payload: AppointmentCreate, _claims: dict = Depends(require_auth)):
    a = appointments_service.create(payload)
    return {
        "id": a.id,
        "patientId": a.patient_id,
        "patientName": a.patient_name,
        "doctorId": a.doctor_id,
        "doctorName": a.doctor_name,
        "date": a.date,
        "durationMin": a.duration_min,
        "reason": a.reason,
        "status": a.status,
    }


@api_router.post("/appointments/{appointment_id}/cancel")
def cancel_appointment(appointment_id: str, _claims: dict = Depends(require_auth)):
    a = appointments_service.cancel(appointment_id)
    return asdict(a)


@api_router.get("/analytics/kpis")
def kpis(_claims: dict = Depends(require_auth)):
    return {
        "patientsToday": 142,
        "patientsTrend": 4.2,
        "occupancy": 87.5,
        "occupancyCapacity": 320,
        "appointments": 412,
        "appointmentsCapacity": 450,
        "criticalAlerts": 3,
    }


@api_router.get("/analytics/revenue")
def monthly_revenue(_claims: dict = Depends(require_auth)):
    return [
        {"label": "Jan", "value": 90000},
        {"label": "Fev", "value": 94000},
        {"label": "Mar", "value": 98000},
        {"label": "Avr", "value": 102000},
        {"label": "Mai", "value": 107000},
        {"label": "Juin", "value": 110000},
    ]


@api_router.get("/analytics/admissions-dept")
def admissions_by_dept(_claims: dict = Depends(require_auth)):
    return [{"label": "Urgences", "value": 320}, {"label": "Cardio", "value": 210}, {"label": "Pediatrie", "value": 180}]


@api_router.get("/analytics/satisfaction")
def satisfaction(_claims: dict = Depends(require_auth)):
    return [{"label": "S1", "value": 82}, {"label": "S2", "value": 85}, {"label": "S3", "value": 88}]


@api_router.get("/ml/predict-7d")
def predict(_claims: dict = Depends(require_auth)):
    points = [
        {"date": "2026-04-21", "actual": 118},
        {"date": "2026-04-22", "actual": 121},
        {"date": "2026-04-23", "actual": 124},
        {"date": "2026-04-24", "forecast": 126, "upper": 132, "lower": 120},
        {"date": "2026-04-25", "forecast": 130, "upper": 137, "lower": 123},
        {"date": "2026-04-26", "forecast": 128, "upper": 136, "lower": 121},
    ]
    return {
        "points": points,
        "model": "LSTM-v1",
        "confidence": 0.87,
        "peak": {"date": "2026-04-25", "value": 130},
        "recommendation": "Renforcer l'effectif jeudi-vendredi.",
    }


@api_router.get("/alerts")
def alerts(_claims: dict = Depends(require_auth)):
    return [
        {
            "id": "al-1",
            "level": "critical",
            "title": "Tension sur les lits",
            "description": "Le taux d'occupation depasse 85%.",
            "area": "Hospitalisation",
            "createdAt": "2026-04-21T09:20:00Z",
        }
    ]


@api_router.get("/rbac/users")
def rbac_users(_claims: dict = Depends(require_auth)):
    return [
        {"id": "u-admin", "name": "Admin SIH", "email": "admin@sihia.health", "role": "admin", "status": "active", "lastLogin": "2026-04-21T10:00:00Z"},
        {"id": "u-doc", "name": "Dr Benali", "email": "dr.benali@sihia.health", "role": "doctor", "status": "active", "lastLogin": "2026-04-21T08:30:00Z"},
    ]
