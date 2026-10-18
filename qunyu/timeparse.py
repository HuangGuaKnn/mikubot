from __future__ import annotations
import re
from datetime import datetime, timedelta, timezone

HK = timezone(timedelta(hours=8))


def parse_due(text: str, now=None):
    """Deliberately bounded Chinese time parser; ambiguous times are not guessed."""
    now = now or datetime.now(HK)
    if now.tzinfo is None:
        now = now.replace(tzinfo=HK)
    text = text.strip()
    relative = re.search(r'(\d{1,4})\s*(分钟|小时|天)后', text)
    if relative:
        value = int(relative[1])
        if not 0 < value <= 366:
            raise ValueError('相对提醒时间超出支持范围')
        delta = {'分钟': timedelta(minutes=value), '小时': timedelta(hours=value), '天': timedelta(days=value)}[relative[2]]
        return (now + delta).astimezone(timezone.utc).isoformat(), relative.span(), 'none'
    pattern = re.compile(r'(?:(每天|每周[一二三四五六日天])|(今天|明天|后天|明晚|今晚)|(?:(\d{4})[-/](\d{1,2})[-/](\d{1,2})))\s*(上午|下午|晚上|早上|中午)?\s*(\d{1,2}|[一二三四五六七八九十]{1,3})[点:：](?:(\d{1,2})分?|半)?')
    match = pattern.search(text)
    if not match:
        return None
    repeat, day, year, month, date, period, hour_raw, minute_raw = match.groups()
    numbers = {'一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10, '十一': 11, '十二': 12}
    hour = int(hour_raw) if hour_raw.isdigit() else numbers.get(hour_raw)
    if hour is None:
        return None
    minute = 30 if match[0].endswith('半') else int(minute_raw or 0)
    if period in ('下午', '晚上', '中午') or day in ('明晚', '今晚'):
        if hour < 12:
            hour += 12
    if not 0 <= hour <= 23 or not 0 <= minute <= 59:
        raise ValueError('提醒时间格式不正确')
    if year:
        target = datetime(int(year), int(month), int(date), hour, minute, tzinfo=HK)
    else:
        target = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
        if day in ('明天', '明晚'):
            target += timedelta(days=1)
        elif day == '后天':
            target += timedelta(days=2)
        elif repeat and repeat.startswith('每周'):
            weekday = '一二三四五六日'.index(repeat[-1].replace('天', '日'))
            target += timedelta(days=(weekday - target.weekday()) % 7)
    recurrence = 'daily' if repeat == '每天' else 'weekly' if repeat else 'none'
    if target <= now:
        if recurrence == 'daily':
            target += timedelta(days=1)
        elif recurrence == 'weekly':
            target += timedelta(days=7)
        else:
            raise ValueError('这个时间已经过去，请提供未来时间')
    return target.astimezone(timezone.utc).isoformat(), match.span(), recurrence
