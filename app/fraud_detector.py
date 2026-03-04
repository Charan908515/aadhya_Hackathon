import json
import math
import os
import re
from collections import Counter


class FraudDetector:
    KEYWORD_CATEGORIES = {
        "UPI Fraud": [
            "upi",
            "collect request",
            "upi pin",
            "payment request",
            "pay now",
            "money transfer",
            "gpay",
            "phonepe",
            "paytm",
        ],
        "Job Scam": [
            "job offer",
            "work from home",
            "data entry",
            "interview",
            "registration fee",
            "training fee",
            "urgent hiring",
        ],
        "Lottery Scam": [
            "lottery",
            "winner",
            "won",
            "claim reward",
            "jackpot",
            "prize",
            "lucky draw",
        ],
        "Phishing": [
            "verify account",
            "bank verification",
            "click link",
            "login",
            "kyc",
            "suspended",
            "update details",
            "urgent action",
        ],
        "Investment Scam": [
            "double money",
            "guaranteed return",
            "crypto tip",
            "investment plan",
            "profit in 24 hours",
            "trading signal",
        ],
        "Loan Scam": [
            "instant loan",
            "no cibil",
            "processing fee",
            "loan approved",
            "disbursal",
            "advance payment",
        ],
    }

    SUSPICIOUS_KEYWORDS = [
        "lottery",
        "winner",
        "claim reward",
        "urgent action",
        "upi payment",
        "otp share",
        "bank verification",
        "click link",
        "processing fee",
        "kyc",
        "verify",
        "collect request",
        "refund",
        "cashback",
    ]

    SHORT_URL_RE = re.compile(r"\b(?:bit\.ly|tinyurl\.com|goo\.gl|t\.co|cutt\.ly|rb\.gy)\S*", re.I)
    URL_RE = re.compile(r"https?://\S+|www\.\S+", re.I)
    OTP_RE = re.compile(r"\botp\b|\bpin\b|\bpassword\b", re.I)
    PAYMENT_RE = re.compile(r"\bpay\b|\bpayment\b|\bupi\b|\btransfer\b|\bcollect\b|\brs\.?\s?\d+", re.I)
    TOKEN_RE = re.compile(r"[a-z0-9]+")

    def __init__(self, model_path=None):
        if model_path is None:
            model_path = os.path.join(os.path.dirname(__file__), "model", "lite_model.json")
        self.model_path = model_path
        self.model = self._load_model()

    def _load_model(self):
        if not os.path.exists(self.model_path):
            return {
                "vocabulary": {},
                "idf": {},
                "coef": {},
                "intercept": 0.0,
            }
        with open(self.model_path, "r", encoding="utf-8") as f:
            return json.load(f)

    @staticmethod
    def _normalize_text(text):
        text = (text or "").strip().lower()
        text = re.sub(r"\s+", " ", text)
        return text

    def _tokenize(self, text):
        return self.TOKEN_RE.findall(text.lower())

    def _vectorize_single(self, text):
        tokens = self._tokenize(text)
        if not tokens:
            return {}
        counts = Counter(tokens)
        doc_len = len(tokens)
        features = {}
        vocabulary = self.model.get("vocabulary", {})
        idf = self.model.get("idf", {})
        for token, count in counts.items():
            if token not in vocabulary:
                continue
            tf = count / doc_len
            features[token] = tf * float(idf.get(token, 1.0))
        return features

    def _predict_prob(self, text):
        features = self._vectorize_single(text)
        coef = self.model.get("coef", {})
        intercept = float(self.model.get("intercept", 0.0))
        logit = intercept
        for token, value in features.items():
            logit += float(coef.get(token, 0.0)) * value
        prob = 1.0 / (1.0 + math.exp(-max(min(logit, 30), -30)))
        return prob

    def _detect_fraud_type(self, text):
        text_l = text.lower()
        scores = {}
        for category, phrases in self.KEYWORD_CATEGORIES.items():
            score = 0
            for p in phrases:
                if p in text_l:
                    score += 2
                else:
                    p_words = p.split()
                    if all(w in text_l for w in p_words):
                        score += 1
            scores[category] = score

        if self.URL_RE.search(text_l) and ("bank" in text_l or "verify" in text_l or "login" in text_l):
            scores["Phishing"] = scores.get("Phishing", 0) + 2

        best = max(scores, key=scores.get)
        return best if scores[best] > 0 else "Other Scam"

    def _collect_suspicious_keywords(self, text):
        text_l = text.lower()
        hits = []
        for kw in self.SUSPICIOUS_KEYWORDS:
            if kw in text_l:
                hits.append(kw)

        for cat_words in self.KEYWORD_CATEGORIES.values():
            for kw in cat_words:
                if kw in text_l and kw not in hits and len(hits) < 10:
                    hits.append(kw)
        return hits[:10]

    def _detect_patterns(self, text):
        patterns = []
        if self.SHORT_URL_RE.search(text):
            patterns.append("shortened_url")
        if self.URL_RE.search(text):
            patterns.append("url_present")
        if self.OTP_RE.search(text):
            patterns.append("otp_or_pin_reference")
        if self.PAYMENT_RE.search(text):
            patterns.append("payment_reference")
        if "bank" in text.lower() and ("verify" in text.lower() or "kyc" in text.lower()):
            patterns.append("bank_verification_pressure")
        return patterns

    @staticmethod
    def _risk_level(probability_percent):
        if probability_percent <= 30:
            return "SAFE"
        if probability_percent <= 70:
            return "SUSPICIOUS"
        return "HIGH RISK"

    @staticmethod
    def _safety_tips(fraud_type):
        tips = [
            "Do not share OTP or UPI PIN.",
            "Do not send money to unknown accounts.",
            "Avoid clicking unknown links.",
            "Verify using official customer care numbers.",
        ]
        type_specific = {
            "UPI Fraud": "Never approve unknown UPI collect requests.",
            "Job Scam": "Do not pay registration or interview fees.",
            "Lottery Scam": "Real lotteries do not ask processing fees upfront.",
            "Phishing": "Type bank website manually instead of opening SMS links.",
            "Investment Scam": "Avoid guaranteed return schemes without regulation proof.",
            "Loan Scam": "Do not pay advance fees for instant loans.",
        }
        if fraud_type in type_specific:
            tips.append(type_specific[fraud_type])
        return tips

    def analyze(self, text):
        cleaned = self._normalize_text(text)
        prob = self._predict_prob(cleaned)

        keywords = self._collect_suspicious_keywords(cleaned)
        patterns = self._detect_patterns(cleaned)
        fraud_type = self._detect_fraud_type(cleaned)

        # Pattern heuristics adjust model output for real-time safety behavior.
        boost = 0.0
        if "shortened_url" in patterns:
            boost += 0.12
        if "otp_or_pin_reference" in patterns and "payment_reference" in patterns:
            boost += 0.10
        if "bank_verification_pressure" in patterns:
            boost += 0.08
        if len(keywords) >= 3:
            boost += 0.05

        final_prob = min(max(prob + boost, 0.0), 1.0)
        pct = int(round(final_prob * 100))
        risk = self._risk_level(pct)
        if risk == "SAFE":
            fraud_type = "Other Scam"

        reasons = []
        if keywords:
            reasons.append("contains suspicious words: " + ", ".join(keywords[:4]))
        if patterns:
            reasons.append("matches scam patterns: " + ", ".join(patterns))
        if not reasons:
            reasons.append("does not match major known scam patterns")

        explanation = "This message " + " and ".join(reasons) + "."

        return {
            "fraud_probability": pct,
            "risk_level": risk,
            "fraud_type": fraud_type,
            "suspicious_keywords": keywords,
            "patterns": patterns,
            "explanation": explanation,
            "safety_tips": self._safety_tips(fraud_type),
            "cybercrime_helpline": "1930",
            "cybercrime_website": "https://cybercrime.gov.in",
        }
