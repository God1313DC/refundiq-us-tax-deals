from datetime import datetime, timedelta, timezone

from app.workers.scheduler import should_run


def test_should_run_when_never_run_before():
    assert should_run(None, datetime.now(timezone.utc), 60) is True


def test_should_run_respects_interval():
    now = datetime.now(timezone.utc)
    assert should_run(now - timedelta(minutes=61), now, 60) is True
    assert should_run(now - timedelta(minutes=30), now, 60) is False
