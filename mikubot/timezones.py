"""One configurable calendar for budgets, activity windows and statistics."""
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

DEFAULT_TIMEZONE = 'Asia/Shanghai'


def config_zone(settings=None):
    config = settings if isinstance(settings, dict) else settings.get() if settings is not None else {}
    name = config.get('time', {}).get('timezone', DEFAULT_TIMEZONE)
    if not isinstance(name, str) or len(name) > 100:
        raise ValueError('时区须为有效的 IANA 名称，例如 Asia/Shanghai 或 America/New_York')
    try:
        return ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError) as exc:
        raise ValueError('时区须为有效的 IANA 名称，例如 Asia/Shanghai 或 America/New_York') from exc


def local_now(settings=None):
    return datetime.now(config_zone(settings))


def day_bounds(settings=None, *, now=None):
    zone = config_zone(settings)
    current = (now or datetime.now(timezone.utc)).astimezone(zone)
    start = current.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=1)
    stamp = lambda value: value.astimezone(timezone.utc).isoformat(timespec='microseconds').replace('+00:00', 'Z')
    return stamp(start), stamp(end)
