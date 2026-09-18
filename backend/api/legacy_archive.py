"""Retention helpers for the read-only PR41 archive tables.

The archive has no ORM models or HTTP/admin surface. Access is intentionally
limited to retention deletion and verification procedures.
"""

from django.db import connection


ARCHIVE_TABLES = (
    "archive_api_d2rattentionevent_pr41",
    "archive_api_d2rresult_pr41",
    "archive_api_d2rschedule_pr41",
    "archive_api_d2rsession_pr41",
)


def _existing_tables():
    return set(connection.introspection.table_names())


def count_participant_rows(participant_id):
    existing = _existing_tables()
    total = 0
    with connection.cursor() as cursor:
        for table in ARCHIVE_TABLES:
            if table not in existing:
                continue
            cursor.execute(
                f"SELECT COUNT(*) FROM {connection.ops.quote_name(table)} WHERE user_id = %s",
                [participant_id],
            )
            total += cursor.fetchone()[0]
    return total


def delete_participant_rows(participant_id):
    existing = _existing_tables()
    deleted = 0
    with connection.cursor() as cursor:
        for table in ARCHIVE_TABLES[:-1]:
            if table not in existing:
                continue
            cursor.execute(
                f"DELETE FROM {connection.ops.quote_name(table)} WHERE user_id = %s",
                [participant_id],
            )
            deleted += cursor.rowcount
        session_table = ARCHIVE_TABLES[-1]
        if session_table in existing:
            cursor.execute(
                f"DELETE FROM {connection.ops.quote_name(session_table)} WHERE user_id = %s",
                [participant_id],
            )
            deleted += cursor.rowcount
    return deleted
