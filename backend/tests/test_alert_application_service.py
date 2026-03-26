"""Unit tests for AlertApplicationService."""

import pytest

from app.services.alert_application_service import AlertApplicationService


class _FakeSupabase:
    def __init__(self) -> None:
        self.updated: list[dict] = []

    def get_alerts(self, user_id: str, limit: int, is_read=None, is_resolved=None):
        return [{"id": "1", "user_id": user_id}]

    def update_alert(self, alert_id: str, is_read=None, is_resolved=None):
        self.updated.append(
            {"id": alert_id, "is_read": is_read, "is_resolved": is_resolved}
        )
        return {"id": alert_id, "is_read": is_read, "is_resolved": is_resolved}


@pytest.fixture
def svc() -> AlertApplicationService:
    return AlertApplicationService(_FakeSupabase())


def test_list_alerts(svc: AlertApplicationService) -> None:
    out = svc.list_alerts(user_id="u1", limit=10)
    assert out["status"] == "success"
    assert out["count"] == 1


def test_patch_alert_requires_field(svc: AlertApplicationService) -> None:
    with pytest.raises(ValueError):
        svc.patch_alert(alert_id="x")


def test_patch_alert(svc: AlertApplicationService) -> None:
    row = svc.patch_alert(alert_id="a1", is_read=True)
    assert row is not None
    assert row["is_read"] is True


def test_alert_service_requires_db() -> None:
    bad = AlertApplicationService(None)
    with pytest.raises(RuntimeError):
        bad.list_alerts(user_id="u")
