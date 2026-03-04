import os
import sqlite3
from datetime import datetime


class ScanStorage:
    def __init__(self, db_path=None):
        if db_path is None:
            db_path = os.path.join(os.path.dirname(__file__), "scan_history.db")
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS scans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message TEXT NOT NULL,
                fraud_probability INTEGER NOT NULL,
                risk_level TEXT NOT NULL,
                fraud_type TEXT NOT NULL,
                explanation TEXT NOT NULL,
                scanned_at TEXT NOT NULL
            )
            """
        )
        conn.commit()
        conn.close()

    def save_scan(self, message, result):
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO scans (
                message, fraud_probability, risk_level, fraud_type, explanation, scanned_at
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                message,
                int(result["fraud_probability"]),
                result["risk_level"],
                result["fraud_type"],
                result["explanation"],
                datetime.utcnow().isoformat(),
            ),
        )
        conn.commit()
        conn.close()

    def recent_scans(self, limit=20):
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        cur.execute(
            """
            SELECT id, message, fraud_probability, risk_level, fraud_type, scanned_at
            FROM scans
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        )
        rows = cur.fetchall()
        conn.close()
        return rows

    def stats(self, limit_latest=3, top_types=4):
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()

        cur.execute("SELECT COUNT(*) FROM scans")
        total = int(cur.fetchone()[0] or 0)

        cur.execute("SELECT COUNT(*) FROM scans WHERE risk_level != 'SAFE'")
        spam = int(cur.fetchone()[0] or 0)

        cur.execute(
            """
            SELECT fraud_type, COUNT(*)
            FROM scans
            WHERE risk_level != 'SAFE'
            GROUP BY fraud_type
            ORDER BY COUNT(*) DESC
            LIMIT ?
            """,
            (top_types,),
        )
        top_spam_types = [{"label": row[0], "value": int(row[1])} for row in cur.fetchall()]

        cur.execute(
            """
            SELECT message
            FROM scans
            WHERE risk_level = 'SAFE'
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit_latest,),
        )
        latest_normal = [row[0] for row in cur.fetchall()]

        cur.execute(
            """
            SELECT message
            FROM scans
            WHERE risk_level != 'SAFE'
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit_latest,),
        )
        latest_spam = [row[0] for row in cur.fetchall()]

        conn.close()

        return {
            "total": total,
            "spam": spam,
            "normal": max(total - spam, 0),
            "top_spam_types": top_spam_types,
            "latest_normal": latest_normal,
            "latest_spam": latest_spam,
        }

    def clear_all(self) -> None:
        """Delete all scan records from the database."""
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        cur.execute("DELETE FROM scans")
        conn.commit()
        conn.close()