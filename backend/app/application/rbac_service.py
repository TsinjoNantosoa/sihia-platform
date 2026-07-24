from uuid import uuid4

from fastapi import HTTPException, status

from app.application.schemas import UserCreate, UserUpdate
from app.core.security import hash_password
from app.domain.models import User
from app.infrastructure.doctor_sync import ensure_doctor_profile_for_user
from app.infrastructure.sqlite_repositories import SQLiteUserRepository


def _user_payload(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "facility": user.facility,
        "status": user.status,
        "lastLogin": user.last_login,
    }


class RbacService:
    def __init__(self, users: SQLiteUserRepository) -> None:
        self.users = users

    def list_users(self) -> list[dict]:
        return [_user_payload(u) for u in self.users.list_all()]

    def create_user(self, data: UserCreate) -> dict:
        if self.users.find_by_email(data.email):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email déjà utilisé")
        user = User(
            id=f"u-{uuid4().hex[:10]}",
            name=data.name.strip(),
            email=data.email.lower().strip(),
            password=hash_password(data.password),
            role=data.role,
            facility=data.facility.strip(),
            status="active",
        )
        self.users.create(user)
        if user.role == "doctor":
            ensure_doctor_profile_for_user(user)
        return _user_payload(user)

    def update_user(self, user_id: str, data: UserUpdate, actor_id: str) -> dict:
        user = self.users.find_by_id(user_id)
        if user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable")

        updates = data.model_dump(exclude_unset=True)
        if not updates:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Aucun champ à mettre à jour")

        new_role = updates.get("role", user.role)
        new_status = updates.get("status", user.status)
        if user.role == "admin" and (new_role != "admin" or new_status == "suspended"):
            if self.users.count_admins() <= 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Impossible de retirer le dernier administrateur actif",
                )

        if "email" in updates:
            email = str(updates["email"]).lower().strip()
            existing = self.users.find_by_email(email)
            if existing and existing.id != user_id:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email déjà utilisé")
            user.email = email

        if "name" in updates:
            user.name = updates["name"].strip()
        if "role" in updates:
            user.role = updates["role"]
        if "status" in updates:
            user.status = updates["status"]
        if "facility" in updates:
            user.facility = updates["facility"].strip()
        if "password" in updates:
            user.password = hash_password(updates["password"])

        self.users.update(user)
        if user.role == "doctor" and user.status == "active":
            ensure_doctor_profile_for_user(user)
        return _user_payload(user)

    def delete_user(self, user_id: str, actor_id: str) -> None:
        if user_id == actor_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Impossible de supprimer votre propre compte")

        user = self.users.find_by_id(user_id)
        if user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable")

        if user.role == "admin" and self.users.count_admins() <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Impossible de supprimer le dernier administrateur actif",
            )

        self.users.delete(user_id)
