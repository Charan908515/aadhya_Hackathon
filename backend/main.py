from __future__ import annotations

import sys
import os

# Ensure the project root (parent of backend/) is on sys.path so `app` is importable.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from typing import List, Optional
from datetime import datetime

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.fraud_detector import FraudDetector
from app.storage import ScanStorage


# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Fraud Shield API",
    version="1.0.0",
    description="Backend API for AI-Based Fraud Risk Detection & Digital Awareness System",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # In production restrict to your actual origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Singletons – created once on startup
detector = FraudDetector()
storage = ScanStorage()


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class AnalyzeRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000, description="SMS/message text to analyze")


class AnalyzeResponse(BaseModel):
    fraud_probability: int          # 0-100
    risk_level: str                 # SAFE | SUSPICIOUS | HIGH RISK
    fraud_type: str
    suspicious_keywords: List[str]
    patterns: List[str]
    explanation: str
    safety_tips: List[str]
    cybercrime_helpline: str
    cybercrime_website: str


class SpamTypeItem(BaseModel):
    label: str
    value: int


class StatsResponse(BaseModel):
    total: int
    spam: int
    normal: int
    top_spam_types: List[SpamTypeItem]
    latest_normal: List[str]
    latest_spam: List[str]


class HistoryItem(BaseModel):
    id: int
    message: str
    fraud_probability: int
    risk_level: str
    fraud_type: str
    scanned_at: str


class HistoryResponse(BaseModel):
    items: List[HistoryItem]
    count: int


class BatchAnalyzeRequest(BaseModel):
    messages: List[str] = Field(..., min_length=1, max_length=50)


class BatchAnalyzeItem(BaseModel):
    message: str
    fraud_probability: int
    risk_level: str
    fraud_type: str
    suspicious_keywords: List[str]
    explanation: str


class BatchAnalyzeResponse(BaseModel):
    results: List[BatchAnalyzeItem]
    count: int


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@app.get("/health", tags=["System"])
def health() -> dict:
    """Quick liveness check. Returns 200 when the server is running."""
    return {"status": "ok", "version": "1.0.0", "timestamp": datetime.utcnow().isoformat()}


@app.get("/", tags=["System"])
def root() -> dict:
    """Root – redirect hint for browsers."""
    return {
        "message": "Fraud Shield API is running.",
        "docs": "/docs",
        "health": "/health",
    }


# ── Core: analyze one message ──────────────────────────────────────────────

@app.post("/analyze", response_model=AnalyzeResponse, tags=["Detection"])
def analyze(req: AnalyzeRequest) -> dict:
    """
    Analyze a single SMS/message for fraud.

    Returns risk level (SAFE / SUSPICIOUS / HIGH RISK), probability 0-100,
    fraud type, suspicious keywords, pattern flags, explanation, and safety tips.
    The result is automatically saved to scan history.
    """
    if not req.message.strip():
        raise HTTPException(status_code=422, detail="Message cannot be empty or whitespace.")

    result = detector.analyze(req.message)
    storage.save_scan(req.message, result)
    return result


# ── Batch analyze ──────────────────────────────────────────────────────────

@app.post("/analyze/batch", response_model=BatchAnalyzeResponse, tags=["Detection"])
def analyze_batch(req: BatchAnalyzeRequest) -> dict:
    """
    Analyze up to 50 messages in one request (e.g. SMS inbox scan).
    Each result is saved to history. HIGH RISK items appear first in the response.
    """
    results = []
    for msg in req.messages:
        if not msg.strip():
            continue
        r = detector.analyze(msg)
        storage.save_scan(msg, r)
        results.append(
            {
                "message": msg[:120],       # truncate preview
                "fraud_probability": r["fraud_probability"],
                "risk_level": r["risk_level"],
                "fraud_type": r["fraud_type"],
                "suspicious_keywords": r["suspicious_keywords"],
                "explanation": r["explanation"],
            }
        )

    # Sort so HIGH RISK comes first, then SUSPICIOUS, then SAFE
    _order = {"HIGH RISK": 0, "SUSPICIOUS": 1, "SAFE": 2}
    results.sort(key=lambda x: _order.get(x["risk_level"], 3))

    return {"results": results, "count": len(results)}


# ── Dashboard stats ────────────────────────────────────────────────────────

@app.get("/stats", response_model=StatsResponse, tags=["Dashboard"])
def stats() -> dict:
    """
    Aggregated dashboard stats:
    - total / spam / normal counts
    - top fraud types (by count)
    - last 3 normal and spam message previews
    """
    return storage.stats()


# ── Scan history ───────────────────────────────────────────────────────────

@app.get("/history", response_model=HistoryResponse, tags=["Dashboard"])
def history(
    limit: int = Query(default=20, ge=1, le=100, description="Number of records to return"),
    risk: Optional[str] = Query(default=None, description="Filter by risk level: SAFE | SUSPICIOUS | HIGH RISK"),
) -> dict:
    """
    Recent scan history, newest first.
    Optionally filter by risk level using the `risk` query param.
    """
    rows = storage.recent_scans(limit=limit)
    items = [
        {
            "id": row[0],
            "message": row[1],
            "fraud_probability": row[2],
            "risk_level": row[3],
            "fraud_type": row[4],
            "scanned_at": row[5],
        }
        for row in rows
    ]

    if risk:
        items = [i for i in items if i["risk_level"].upper() == risk.upper()]

    return {"items": items, "count": len(items)}


# ── Delete history ─────────────────────────────────────────────────────────

@app.delete("/history", tags=["Dashboard"])
def clear_history() -> dict:
    """
    Clear all scan history from the database.
    Useful for resetting during testing.
    """
    storage.clear_all()
    return {"status": "cleared"}


# ── Report endpoint (logging only) ────────────────────────────────────────

class ReportRequest(BaseModel):
    message: str = Field(..., min_length=1)
    fraud_type: str = Field(default="Unknown")
    notes: str = Field(default="")


@app.post("/report", tags=["Detection"])
def report(req: ReportRequest) -> dict:
    """
    User-initiated fraud report for a message they received.
    Forces a HIGH RISK analysis and saves to history for record-keeping.
    Displays cybercrime reporting contact details.
    """
    result = detector.analyze(req.message)
    # Override risk to HIGH RISK since user is actively reporting it
    result["risk_level"] = "HIGH RISK"
    result["fraud_probability"] = max(result["fraud_probability"], 85)
    if req.fraud_type != "Unknown":
        result["fraud_type"] = req.fraud_type
    storage.save_scan(req.message, result)
    return {
        "status": "reported",
        "cybercrime_helpline": "1930",
        "cybercrime_website": "https://cybercrime.gov.in",
        "message": "Report registered. Please also call 1930 or file at cybercrime.gov.in",
    }


# ---------------------------------------------------------------------------
# Entrypoint (direct run)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=["app", "backend"],
    )