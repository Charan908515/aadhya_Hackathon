import os
from datetime import datetime

from kivy.app import App
from kivy.clock import Clock
from kivy.core.clipboard import Clipboard
from kivy.lang import Builder
from kivy.metrics import dp
from kivy.utils import platform

from fraud_detector import FraudDetector
from sms_reader import SmsReader
from storage import ScanStorage

try:
    from plyer import notification
except Exception:
    notification = None


KV = """
BoxLayout:
    orientation: "vertical"
    padding: dp(14)
    spacing: dp(10)

    Label:
        text: "AI Fraud Risk Detection"
        font_size: "24sp"
        bold: True
        size_hint_y: None
        height: dp(42)

    TextInput:
        id: msg_input
        hint_text: "Paste or type SMS/message..."
        multiline: True
        size_hint_y: None
        height: dp(120)
        font_size: "18sp"

    BoxLayout:
        size_hint_y: None
        height: dp(52)
        spacing: dp(8)
        Button:
            text: "Scan Message"
            font_size: "18sp"
            on_release: app.scan_manual()
        Button:
            text: "Paste + Scan"
            font_size: "18sp"
            on_release: app.scan_clipboard()

    BoxLayout:
        size_hint_y: None
        height: dp(52)
        spacing: dp(8)
        Button:
            text: "Scan Stored SMS"
            font_size: "18sp"
            on_release: app.scan_stored_sms()
        Button:
            text: "Auto SMS: ON" if app.auto_mode else "Auto SMS: OFF"
            font_size: "18sp"
            on_release: app.toggle_auto_mode()

    Label:
        id: risk_banner
        text: "Risk Level: -"
        font_size: "22sp"
        bold: True
        size_hint_y: None
        height: dp(40)
        color: (0.2, 0.2, 0.2, 1)

    Label:
        id: score_text
        text: "Fraud Probability: -"
        font_size: "20sp"
        size_hint_y: None
        height: dp(36)

    Label:
        id: type_text
        text: "Fraud Type: -"
        font_size: "20sp"
        size_hint_y: None
        height: dp(36)

    Label:
        id: kw_text
        text: "Suspicious Words: -"
        font_size: "17sp"
        text_size: self.width, None
        halign: "left"
        valign: "middle"
        size_hint_y: None
        height: dp(64)

    Label:
        id: explanation_text
        text: "Explanation: -"
        font_size: "17sp"
        text_size: self.width, None
        halign: "left"
        valign: "top"
        size_hint_y: None
        height: dp(90)

    Label:
        id: tips_text
        text: "Safety Tips: -"
        font_size: "16sp"
        text_size: self.width, None
        halign: "left"
        valign: "top"
        size_hint_y: None
        height: dp(100)

    BoxLayout:
        size_hint_y: None
        height: dp(44)
        Button:
            text: "Report: 1930"
            font_size: "17sp"
            on_release: app.open_cybercrime_portal()
        Button:
            text: "View History"
            font_size: "17sp"
            on_release: app.show_history_summary()
"""


class FraudAwarenessApp(App):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.detector = FraudDetector()
        self.storage = ScanStorage()
        self.sms_reader = SmsReader()
        self.auto_mode = True

    def build(self):
        self.title = "AI Fraud Awareness"
        root = Builder.load_string(KV)
        self._request_android_permissions()
        Clock.schedule_interval(self.auto_scan_new_sms, 18)
        return root

    def _request_android_permissions(self):
        if platform != "android":
            return
        try:
            from android.permissions import Permission, request_permissions

            request_permissions(
                [
                    Permission.READ_SMS,
                    Permission.RECEIVE_SMS,
                    Permission.INTERNET,
                    Permission.POST_NOTIFICATIONS,
                ]
            )
        except Exception:
            pass

    def _render_result(self, result):
        risk = result["risk_level"]
        color = {
            "SAFE": (0.1, 0.5, 0.1, 1),
            "SUSPICIOUS": (0.95, 0.6, 0.0, 1),
            "HIGH RISK": (0.9, 0.1, 0.1, 1),
        }.get(risk, (0.2, 0.2, 0.2, 1))

        self.root.ids.risk_banner.text = f"Risk Level: {risk}"
        self.root.ids.risk_banner.color = color
        self.root.ids.score_text.text = f"Fraud Probability: {result['fraud_probability']}%"
        self.root.ids.type_text.text = f"Fraud Type: {result['fraud_type']}"

        kws = result["suspicious_keywords"][:6]
        self.root.ids.kw_text.text = "Suspicious Words: " + (", ".join(kws) if kws else "None")
        self.root.ids.explanation_text.text = "Explanation: " + result["explanation"]
        self.root.ids.tips_text.text = "Safety Tips:\n- " + "\n- ".join(result["safety_tips"][:5])

    def _scan_text(self, message, source="manual"):
        if not message or not message.strip():
            return
        result = self.detector.analyze(message)
        self.storage.save_scan(message, result)
        self._render_result(result)

        if result["risk_level"] == "HIGH RISK":
            self._notify_high_risk(message, result, source=source)

    def scan_manual(self):
        message = self.root.ids.msg_input.text
        self._scan_text(message, source="manual")

    def scan_clipboard(self):
        message = Clipboard.paste() or ""
        self.root.ids.msg_input.text = message
        self._scan_text(message, source="clipboard")

    def scan_stored_sms(self):
        if platform == "android":
            messages = self.sms_reader.fetch_recent_messages_for_manual_scan(limit=12)
        else:
            messages = self.sms_reader.desktop_demo_messages()
        if not messages:
            self.root.ids.explanation_text.text = "Explanation: No SMS found."
            return
        # Show the latest scanned result in UI, but store all.
        for msg in messages:
            self._scan_text(msg["body"], source="stored_sms")

    def toggle_auto_mode(self):
        self.auto_mode = not self.auto_mode
        status = "ON" if self.auto_mode else "OFF"
        self.root.ids.explanation_text.text = f"Explanation: Auto SMS scan is {status}."

    def auto_scan_new_sms(self, _dt):
        if not self.auto_mode:
            return
        if platform != "android":
            return
        try:
            messages = self.sms_reader.get_new_messages(limit=12)
            for msg in messages:
                self._scan_text(msg["body"], source="incoming_sms")
        except Exception:
            pass

    def _notify_high_risk(self, message, result, source):
        if notification is None:
            return
        title = "SCAM MESSAGE DETECTED"
        text = (
            f"Risk: {result['risk_level']} ({result['fraud_probability']}%) | "
            f"Type: {result['fraud_type']} | Source: {source}"
        )
        try:
            notification.notify(title=title, message=text, timeout=6)
        except Exception:
            pass

    def open_cybercrime_portal(self):
        try:
            from webbrowser import open as open_url

            open_url("https://cybercrime.gov.in")
        except Exception:
            pass
        self.root.ids.explanation_text.text = (
            "Explanation: Report fraud at helpline 1930 or cybercrime.gov.in."
        )

    def show_history_summary(self):
        rows = self.storage.recent_scans(limit=6)
        if not rows:
            self.root.ids.explanation_text.text = "Explanation: No scan history available."
            return
        lines = []
        for row in rows:
            _, _, prob, risk, ftype, scanned_at = row
            t = datetime.fromisoformat(scanned_at).strftime("%d-%m %H:%M")
            lines.append(f"{t} | {risk} {prob}% | {ftype}")
        self.root.ids.explanation_text.text = "History:\n" + "\n".join(lines)


if __name__ == "__main__":
    FraudAwarenessApp().run()
