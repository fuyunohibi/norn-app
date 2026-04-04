"""Unit tests for ActivityMonitoringService (V&V / thesis)."""

import pytest
from app.models.sensor import ActivityEventData, IMUAlertData
from app.services.activity_monitoring_service import ActivityMonitoringService


class _FakeBackgroundTasks:
    """Captures background tasks without running them."""

    def __init__(self) -> None:
        self.calls: list[tuple] = []

    def add_task(self, fn, *args, **kwargs) -> None:
        self.calls.append((fn, args, kwargs))


class _FakeSupabase:
    def __init__(self) -> None:
        self.activity_stores: list[dict] = []
        self.stats_requests: list[dict] = []
        self.alert_calls: list[dict] = []

    async def store_activity_event(self, **kwargs):
        self.activity_stores.append(kwargs)
        return {"id": "1"}

    def get_activity_statistics(self, user_id: str, period: str):
        self.stats_requests.append({"user_id": user_id, "period": period})
        return {"period": period, "by_activity": {}}

    def get_imu_live_status(self, user_id: str, device_id=None, stale_seconds=90):
        return {
            "online": False,
            "last_seen_at": None,
            "age_seconds": None,
            "activity_code": None,
            "activity_label": None,
            "device_id": device_id,
            "reason": "no_events",
        }

    async def create_alert(self, alert_data: dict):
        self.alert_calls.append(alert_data)
        return {"id": "a1"}


@pytest.fixture
def fake_db() -> _FakeSupabase:
    return _FakeSupabase()


@pytest.fixture
def svc(fake_db: _FakeSupabase) -> ActivityMonitoringService:
    return ActivityMonitoringService(fake_db)


def test_process_imu_alert_non_critical_returns_no_alert_row(svc: ActivityMonitoringService) -> None:
    data = IMUAlertData(device_id="d1", timestamp=1, prediction="st")
    body, alert = svc.process_imu_alert("user-1", data)
    assert body["alert_created"] is False
    assert alert is None


def test_process_imu_alert_fall_creates_alert_payload(svc: ActivityMonitoringService) -> None:
    data = IMUAlertData(device_id="d1", timestamp=1, prediction="f")
    body, alert = svc.process_imu_alert("user-1", data)
    assert body["alert_created"] is True
    assert alert is not None
    assert alert["alert_type"] == "fall"
    assert alert["severity"] == "critical"
    assert alert["alert_data"]["prediction"] == "f"


def test_get_activity_statistics_invalid_period(svc: ActivityMonitoringService) -> None:
    with pytest.raises(ValueError):
        svc.get_activity_statistics(user_id="u1", period="invalid")


def test_get_activity_statistics_ok(svc: ActivityMonitoringService, fake_db: _FakeSupabase) -> None:
    out = svc.get_activity_statistics(user_id="u1", period="today")
    assert out["status"] == "success"
    assert fake_db.stats_requests[-1]["period"] == "today"


def test_get_imu_live_status_wraps_db(svc: ActivityMonitoringService) -> None:
    out = svc.get_imu_live_status(user_id="u1", device_id="d1")
    assert out["status"] == "success"
    assert out["online"] is False
    assert out["reason"] == "no_events"


def test_enqueue_activity_event_schedules_store(svc: ActivityMonitoringService, fake_db: _FakeSupabase) -> None:
    bg = _FakeBackgroundTasks()
    ev = ActivityEventData(device_id="d1", timestamp=10, activity="st")
    out = svc.enqueue_activity_event(bg, user_id="u1", data=ev)
    assert out["status"] == "success"
    assert len(bg.calls) == 1
    fn, args, kwargs = bg.calls[0]
    assert kwargs["user_id"] == "u1"
    assert kwargs["activity"] == "st"


def test_service_requires_db() -> None:
    bad = ActivityMonitoringService(None)
    with pytest.raises(RuntimeError):
        bad.get_activity_statistics(user_id="u", period="today")


def test_activity_event_model_lowercase_strip() -> None:
    ev = ActivityEventData(device_id="d", timestamp=1, activity="  W  ")
    assert ev.activity.strip().lower() == "w"
