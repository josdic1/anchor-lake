import json
from datetime import date, datetime, time
from decimal import Decimal


class SafeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        if isinstance(obj, time):
            return str(obj)
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)


def write_audit(cur, entity_type: str, entity_id: int, action: str,
                performed_by: int, old_value=None, new_value=None, notes=None):
    cur.execute("""
        INSERT INTO audit_log (entity_type, entity_id, action, old_value, new_value, performed_by, notes)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """, (
        entity_type, entity_id, action,
        json.dumps(old_value, cls=SafeEncoder) if old_value else None,
        json.dumps(new_value, cls=SafeEncoder) if new_value else None,
        performed_by, notes
    ))