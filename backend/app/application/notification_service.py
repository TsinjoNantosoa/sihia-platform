"""Centre de notifications : alertes + état lu + préférences utilisateur."""

from __future__ import annotations

from typing import Any

from app.application.analytics_service import AnalyticsService
from app.infrastructure.notification_repository import NotificationRepository


class NotificationService:
    def __init__(
        self,
        analytics: AnalyticsService | None = None,
        repo: NotificationRepository | None = None,
    ) -> None:
        self.analytics = analytics or AnalyticsService()
        self.repo = repo or NotificationRepository()

    def list_for_user(
        self,
        user_id: str,
        *,
        level: str | None = None,
        unread_only: bool = False,
        area: str | None = None,
    ) -> dict[str, Any]:
        prefs = self.repo.get_prefs(user_id)
        alerts = self.analytics.alerts(level_filter=level)
        read_ids = self.repo.list_read_ids(user_id)

        items: list[dict[str, Any]] = []
        for alert in alerts:
            if area and str(alert.get("area", "")).lower() != area.lower():
                continue
            alert_id = str(alert["id"])
            is_read = alert_id in read_ids
            if unread_only and is_read:
                continue
            # Si alertes désactivées, on masque les info (garde critical/warning)
            if not prefs["alertsEnabled"] and alert.get("level") == "info":
                continue
            items.append({**alert, "read": is_read})

        unread_count = sum(1 for i in items if not i["read"])
        return {
            "items": items,
            "total": len(items),
            "unreadCount": unread_count,
            "prefs": prefs,
        }

    def mark_read(self, user_id: str, alert_ids: list[str]) -> dict[str, Any]:
        cleaned = [a.strip() for a in alert_ids if isinstance(a, str) and a.strip()]
        marked = self.repo.mark_read(user_id, cleaned)
        return {"marked": marked, "alertIds": cleaned}

    def mark_all_read(self, user_id: str) -> dict[str, Any]:
        alerts = self.analytics.alerts()
        ids = [str(a["id"]) for a in alerts]
        marked = self.repo.mark_read(user_id, ids)
        return {"marked": marked, "alertIds": ids}

    def get_prefs(self, user_id: str) -> dict[str, Any]:
        return self.repo.get_prefs(user_id)

    def update_prefs(self, user_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        return self.repo.upsert_prefs(
            user_id,
            alerts_enabled=payload.get("alertsEnabled"),
            reminders_enabled=payload.get("remindersEnabled"),
            weekly_digest_enabled=payload.get("weeklyDigestEnabled"),
        )
