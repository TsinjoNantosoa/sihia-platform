from dataclasses import asdict
from datetime import datetime, timezone
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse

from app.application.schemas import (
    AppointmentCreate,
    LoginRequest,
    LoginResponse,
    LogoutRequest,
    MedicalVisitCreate,
    PatientCreate,
    DoctorUpdate,
    PatientUpdate,
    RefreshTokenRequest,
    UserCreate,
    UserUpdate,
)
from app.presentation.deps import (
    analytics_service,
    appointments_service,
    auth_service,
    doctors_service,
    medical_history_service,
    patients_service,
    ml_service,
    rbac_service,
    require_auth,
    require_permission,
)
from app.infrastructure.audit_log import export_audit_jsonl, read_audit_records
from app.presentation.audit import log_admin_action
from app.presentation.rate_limit import check_login_allowed, register_login_failure, reset_login_limiter


def _doctor_payload(d) -> dict:
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


def _patient_payload(p) -> dict:
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

api_router = APIRouter(prefix="/api")


@api_router.post("/auth/login", response_model=LoginResponse)
def login(payload: LoginRequest, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    limiter_key = f"{client_ip}:{payload.email.lower()}"
    retry_after = check_login_allowed(limiter_key)
    if retry_after is not None:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "code": "TOO_MANY_ATTEMPTS",
                "message": "Trop de tentatives de connexion. Réessayez plus tard.",
                "retryAfterSeconds": retry_after,
            },
        )

    try:
        access_token, refresh_token = auth_service.login(payload.email, payload.password)
    except HTTPException as exc:
        if exc.status_code == status.HTTP_401_UNAUTHORIZED:
            register_login_failure(limiter_key)
        raise

    reset_login_limiter(limiter_key)
    return LoginResponse(access_token=access_token, refresh_token=refresh_token)


@api_router.post("/auth/refresh", response_model=LoginResponse)
def refresh_token(payload: RefreshTokenRequest):
    access_token, refresh_token_value = auth_service.refresh(payload.refresh_token)
    return LoginResponse(access_token=access_token, refresh_token=refresh_token_value)


@api_router.post("/auth/logout")
def logout(payload: LogoutRequest):
    auth_service.logout(payload.refresh_token)
    return {"success": True}


@api_router.post("/auth/logout-all")
def logout_all(request: Request, claims: dict = Depends(require_auth)):
    auth_service.logout_all(claims.get("sub"))
    log_admin_action(
        request,
        action="auth.logout_all",
        actor_id=claims.get("sub"),
        actor_email=claims.get("email"),
    )
    return {"success": True}


@api_router.get("/patients")
def list_patients(
    search: str | None = Query(default=None),
    status: str | None = Query(default=None),
    _claims: dict = Depends(require_permission("patients:read")),
):
    items = patients_service.list(search=search, status_filter=status)
    return [_patient_payload(p) for p in items]


@api_router.get("/patients/{patient_id}")
def get_patient(patient_id: str, _claims: dict = Depends(require_permission("patients:read"))):
    return _patient_payload(patients_service.get(patient_id))


@api_router.post("/patients")
def create_patient(payload: PatientCreate, _claims: dict = Depends(require_permission("patients:create"))):
    return _patient_payload(patients_service.create(payload))


@api_router.patch("/patients/{patient_id}")
def update_patient(
    patient_id: str,
    payload: PatientUpdate,
    _claims: dict = Depends(require_permission("patients:update")),
):
    return _patient_payload(patients_service.update(patient_id, payload))


@api_router.delete("/patients/{patient_id}", status_code=status.HTTP_200_OK)
def delete_patient(patient_id: str, _claims: dict = Depends(require_permission("patients:delete"))):
    patients_service.delete(patient_id)
    return {"success": True}


@api_router.get("/patients/{patient_id}/history")
def get_patient_history(patient_id: str, _claims: dict = Depends(require_permission("patients:read"))):
    visits = medical_history_service.list(patient_id)
    return [
        {
            "id": v.id,
            "date": v.date,
            "reason": v.reason,
            "doctorName": v.doctor_name,
            "specialty": v.specialty,
            "diagnosis": v.diagnosis,
            "treatment": v.treatment,
            "notes": v.notes,
        }
        for v in visits
    ]


@api_router.post("/patients/{patient_id}/history")
def add_patient_visit(
    patient_id: str,
    payload: MedicalVisitCreate,
    _claims: dict = Depends(require_permission("patients:update")),
):
    v = medical_history_service.add(patient_id, payload)
    return {
        "id": v.id,
        "date": v.date,
        "reason": v.reason,
        "doctorName": v.doctor_name,
        "specialty": v.specialty,
        "diagnosis": v.diagnosis,
        "treatment": v.treatment,
        "notes": v.notes,
    }


@api_router.get("/doctors")
def list_doctors(_claims: dict = Depends(require_permission("doctors:read"))):
    return [_doctor_payload(d) for d in doctors_service.list()]


@api_router.get("/doctors/{doctor_id}")
def get_doctor(doctor_id: str, _claims: dict = Depends(require_permission("doctors:read"))):
    return _doctor_payload(doctors_service.get(doctor_id))


@api_router.patch("/doctors/{doctor_id}")
def update_doctor(
    doctor_id: str,
    payload: DoctorUpdate,
    _claims: dict = Depends(require_permission("doctors:update")),
):
    return _doctor_payload(doctors_service.update(doctor_id, payload))


@api_router.get("/appointments")
def list_appointments(_claims: dict = Depends(require_permission("appointments:read"))):
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
def create_appointment(payload: AppointmentCreate, _claims: dict = Depends(require_permission("appointments:create"))):
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
def cancel_appointment(appointment_id: str, _claims: dict = Depends(require_permission("appointments:update"))):
    a = appointments_service.cancel(appointment_id)
    return asdict(a)


@api_router.get("/analytics/kpis")
def kpis(_claims: dict = Depends(require_permission("analytics:read"))):
    return analytics_service.kpis()


@api_router.get("/analytics/revenue")
def monthly_revenue(period: str = Query(default="6m"), _claims: dict = Depends(require_permission("analytics:read"))):
    return analytics_service.monthly_revenue(period)


@api_router.get("/analytics/admissions-dept")
def admissions_by_dept(_claims: dict = Depends(require_permission("analytics:read"))):
    return analytics_service.admissions_by_dept()


@api_router.get("/analytics/satisfaction")
def satisfaction(_claims: dict = Depends(require_permission("analytics:read"))):
    return analytics_service.satisfaction()


@api_router.get("/analytics/export/excel")
def export_excel(period: str = Query(default="6m"), _claims: dict = Depends(require_permission("analytics:read"))):
    import openpyxl
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Analytics Export"

    ws.append(["Rapport Analytique - SIH IA"])
    ws.append(["Période", period])
    ws.append([])

    ws.append(["Indicateurs Clés"])
    ws.append(["Indicateur", "Valeur"])
    kpi_data = analytics_service.kpis()
    ws.append(["Patients Aujourd'hui", kpi_data["patientsToday"]])
    ws.append(["Taux d'occupation", f"{kpi_data['occupancy']}%"])
    ws.append(["Total Rendez-vous", kpi_data["appointments"]])
    ws.append([])

    ws.append(["Revenus mensuels"])
    ws.append(["Mois", "Revenu (€)"])
    revenue_data = analytics_service.monthly_revenue(period)
    for r in revenue_data:
        ws.append([r["label"], r["value"]])

    ws2 = wb.create_sheet(title="Patients")
    ws2.append(["ID Dossier", "Nom", "Prenom", "Telephone", "Statut", "Derniere Visite"])
    for p in patients_service.list(None, None):
        ws2.append([p.record_number, p.last_name, p.first_name, p.phone, p.status, p.last_visit])

    ws3 = wb.create_sheet(title="Rendez-vous")
    ws3.append(["ID", "Patient", "Medecin", "Date", "Motif", "Statut"])
    for a in appointments_service.list():
        ws3.append([a.id, a.patient_name, a.doctor_name, a.date, a.reason, a.status])

    out = BytesIO()
    wb.save(out)
    out.seek(0)
    return StreamingResponse(
        out,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=analytics_{period}.xlsx"}
    )


@api_router.get("/analytics/export/pdf")
def export_pdf(period: str = Query(default="6m"), _claims: dict = Depends(require_permission("analytics:read"))):
    from fpdf import FPDF
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("helvetica", size=16)
    pdf.cell(0, 10, text="Rapport Analytique - SIH IA", ln=True, align="C")
    
    pdf.set_font("helvetica", size=12)
    pdf.ln(10)
    pdf.cell(0, 10, text=f"Periode : {period}", ln=True)
    pdf.ln(5)

    pdf.set_font("helvetica", style="B", size=14)
    pdf.cell(0, 10, text="Indicateurs Cles", ln=True)
    pdf.set_font("helvetica", size=12)
    kpi_data = analytics_service.kpis()
    pdf.cell(0, 10, text=f"Patients Aujourd'hui : {kpi_data['patientsToday']}", ln=True)
    pdf.cell(0, 10, text=f"Taux d'occupation : {kpi_data['occupancy']}%", ln=True)
    pdf.cell(0, 10, text=f"Total Rendez-vous : {kpi_data['appointments']}", ln=True)
    pdf.ln(5)

    pdf.set_font("helvetica", style="B", size=14)
    pdf.cell(0, 10, text="Revenus mensuels", ln=True)
    pdf.set_font("helvetica", size=12)
    revenue_data = analytics_service.monthly_revenue(period)
    for r in revenue_data:
        pdf.cell(0, 10, text=f"{r['label']} : {r['value']} eur", ln=True)

    pdf.add_page()
    pdf.set_font("helvetica", style="B", size=14)
    pdf.cell(0, 10, text="Registre des Patients (Extrait)", ln=True)
    pdf.set_font("helvetica", size=10)
    pdf.cell(40, 10, text="Dossier", border=1)
    pdf.cell(60, 10, text="Nom Prenom", border=1)
    pdf.cell(40, 10, text="Telephone", border=1)
    pdf.cell(40, 10, text="Statut", border=1, ln=True)
    
    # Export up to 100 recent patients for PDF to avoid blowing up memory quickly
    all_patients = patients_service.list(None, None)[:100]
    for p in all_patients:
        pdf.cell(40, 10, text=str(p.record_number), border=1)
        pdf.cell(60, 10, text=f"{p.last_name[:15]} {p.first_name[:15]}", border=1)
        pdf.cell(40, 10, text=str(p.phone), border=1)
        pdf.cell(40, 10, text=str(p.status), border=1, ln=True)

    out = BytesIO(pdf.output())
    return StreamingResponse(
        out,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=analytics_{period}.pdf"}
    )


@api_router.get("/ml/predict-7d")
def predict(_claims: dict = Depends(require_permission("ml:read"))):
    return ml_service.predict_7d()


@api_router.get("/ml/predict-30d")
def predict_30d(_claims: dict = Depends(require_permission("ml:read"))):
    body = ml_service.predict_30d()
    body["horizon"] = 30
    body["model_version"] = body.get("model", "linear-sqlite")
    return body


@api_router.get("/alerts")
def alerts(_claims: dict = Depends(require_permission("dashboard:read"))):
    return analytics_service.alerts()


@api_router.get("/rbac/users")
def rbac_users(_claims: dict = Depends(require_permission("users:read"))):
    return rbac_service.list_users()


@api_router.post("/rbac/users", status_code=201)
def create_rbac_user(
    request: Request,
    payload: UserCreate,
    claims: dict = Depends(require_permission("users:create")),
):
    created = rbac_service.create_user(payload)
    log_admin_action(
        request,
        action="rbac.user.create",
        actor_id=claims.get("sub"),
        actor_email=claims.get("email"),
        target_id=created.get("id"),
        extra={"role": created.get("role"), "status": created.get("status")},
    )
    return created


@api_router.patch("/rbac/users/{user_id}")
def update_rbac_user(
    request: Request,
    user_id: str,
    payload: UserUpdate,
    claims: dict = Depends(require_permission("users:update")),
):
    updated = rbac_service.update_user(user_id, payload, claims.get("sub", ""))
    log_admin_action(
        request,
        action="rbac.user.update",
        actor_id=claims.get("sub"),
        actor_email=claims.get("email"),
        target_id=user_id,
        extra={"role": updated.get("role"), "status": updated.get("status")},
    )
    return updated


@api_router.get("/admin/audit-logs")
def list_audit_logs(
    request: Request,
    limit: int = Query(default=100, ge=1, le=1000),
    claims: dict = Depends(require_permission("users:read")),
):
    items = read_audit_records(limit=limit)
    log_admin_action(
        request,
        action="audit.logs.list",
        actor_id=claims.get("sub"),
        actor_email=claims.get("email"),
        extra={"limit": limit, "count": len(items)},
    )
    return {"items": items, "count": len(items)}


@api_router.get("/admin/audit-logs/export")
def export_audit_logs(
    request: Request,
    limit: int = Query(default=5000, ge=1, le=20000),
    claims: dict = Depends(require_permission("users:read")),
):
    log_admin_action(
        request,
        action="audit.logs.export",
        actor_id=claims.get("sub"),
        actor_email=claims.get("email"),
        extra={"limit": limit},
    )
    content = export_audit_jsonl(limit=limit)
    stamp = datetime.now(tz=timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"sihia_audit_{stamp}.jsonl"
    return StreamingResponse(
        BytesIO(content),
        media_type="application/x-ndjson",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@api_router.delete("/rbac/users/{user_id}", status_code=204)
def delete_rbac_user(
    request: Request,
    user_id: str,
    claims: dict = Depends(require_permission("users:delete")),
):
    rbac_service.delete_user(user_id, claims.get("sub", ""))
    log_admin_action(
        request,
        action="rbac.user.delete",
        actor_id=claims.get("sub"),
        actor_email=claims.get("email"),
        target_id=user_id,
    )
