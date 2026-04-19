from datetime import date, timedelta


DAY_MAP = {
    "月": 0,
    "火": 1,
    "水": 2,
    "木": 3,
    "金": 4,
    "土": 5,
    "日": 6,
}


def get_quarter_range(year: int, quarter: int) -> tuple[date, date]:
    quarter_ranges = {
        1: (date(year, 4, 6), date(year, 6, 4)),
        2: (date(year, 6, 11), date(year, 8, 6)),
        3: (date(year, 10, 1), date(year, 12, 2)),
        4: (date(year, 12, 9), date(year + 1, 2, 10)),
    }

    if quarter not in quarter_ranges:
        raise ValueError(f"invalid quarter: {quarter}")

    return quarter_ranges[quarter]


def build_class_dates(year: int, quarter: int, day_of_week: str) -> list[date]:
    if day_of_week not in DAY_MAP:
        raise ValueError(f"invalid day_of_week: {day_of_week}")

    start, end = get_quarter_range(year, quarter)
    target_weekday = DAY_MAP[day_of_week]

    result: list[date] = []
    current = start

    while current <= end:
        if current.weekday() == target_weekday:
            result.append(current)
        current += timedelta(days=1)

    return result
