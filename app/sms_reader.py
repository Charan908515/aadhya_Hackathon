import time


class SmsReader:
    def __init__(self):
        self.last_seen_id = None

    @staticmethod
    def _is_android():
        try:
            from kivy.utils import platform

            return platform == "android"
        except Exception:
            return False

    def fetch_latest_inbox(self, limit=30):
        if not self._is_android():
            return []

        from jnius import autoclass

        PythonActivity = autoclass("org.kivy.android.PythonActivity")
        Uri = autoclass("android.net.Uri")

        activity = PythonActivity.mActivity
        resolver = activity.getContentResolver()
        sms_uri = Uri.parse("content://sms/inbox")

        projection = ["_id", "body", "address", "date"]
        cursor = resolver.query(sms_uri, projection, None, None, "date DESC")
        if cursor is None:
            return []

        id_idx = cursor.getColumnIndex("_id")
        body_idx = cursor.getColumnIndex("body")
        addr_idx = cursor.getColumnIndex("address")
        date_idx = cursor.getColumnIndex("date")

        messages = []
        count = 0
        while cursor.moveToNext() and count < limit:
            msg = {
                "id": int(cursor.getString(id_idx)),
                "body": cursor.getString(body_idx) or "",
                "address": cursor.getString(addr_idx) or "",
                "date": int(cursor.getString(date_idx) or 0),
            }
            messages.append(msg)
            count += 1
        cursor.close()
        return messages

    def get_new_messages(self, limit=20):
        inbox = self.fetch_latest_inbox(limit=limit)
        if not inbox:
            return []

        if self.last_seen_id is None:
            self.last_seen_id = inbox[0]["id"]
            return []

        new_msgs = [m for m in inbox if m["id"] > self.last_seen_id]
        if inbox:
            self.last_seen_id = max(self.last_seen_id, inbox[0]["id"])
        return sorted(new_msgs, key=lambda x: x["id"])

    def fetch_recent_messages_for_manual_scan(self, limit=10):
        inbox = self.fetch_latest_inbox(limit=limit)
        return list(reversed(inbox))

    @staticmethod
    def desktop_demo_messages():
        now = int(time.time() * 1000)
        return [
            {
                "id": 1,
                "body": "Congrats winner! Claim reward now at bit.ly/fraud and pay processing fee",
                "address": "VM-OFFER",
                "date": now,
            },
            {
                "id": 2,
                "body": "Your account credited Rs 1200 for cashback. Ignore if not yours.",
                "address": "BANK",
                "date": now,
            },
        ]
