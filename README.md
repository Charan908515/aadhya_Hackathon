# AI-Based Fraud Risk Detection & Digital Awareness System

Offline Android-focused fraud detection app built with Python + Kivy.

## What this project includes

- Kivy mobile app source (`app/main.py`)
- Offline local inference engine (`app/fraud_detector.py`)
- SMS inbox scanner for Android (`app/sms_reader.py`)
- SQLite scan history storage (`app/storage.py`)
- Local training pipeline (`training/train_model.py`)
- Dataset preprocessing script (`training/preprocess.py`)
- Sample fraud dataset (`training/data/sms_fraud_dataset.csv`)
- Exported model artifacts:
  - `app/model/fraud_model.pkl`
  - `app/model/vectorizer.pkl`
  - `app/model/lite_model.json` (Android-friendly runtime model)
- Buildozer config (`buildozer.spec`) for APK generation

## Core capabilities

- Manual message scan
- Clipboard paste and scan
- Scan stored SMS from inbox (Android)
- Automatic background inbox polling for new SMS (Android)
- Fraud probability score (0-100)
- Risk levels: SAFE / SUSPICIOUS / HIGH RISK
- Fraud type detection:
  - UPI Fraud
  - Job Scam
  - Lottery Scam
  - Phishing
  - Investment Scam
  - Loan Scam
  - Other Scam
- Suspicious keyword and pattern detection (URL/payment/OTP)
- Explainable output and safety tips
- Cybercrime report details (1930, cybercrime.gov.in)

## Project structure

```text
.
├── app/
│   ├── main.py
│   ├── fraud_detector.py
│   ├── sms_reader.py
│   ├── storage.py
│   ├── model/
│   │   ├── fraud_model.pkl
│   │   ├── vectorizer.pkl
│   │   └── lite_model.json
├── training/
│   ├── preprocess.py
│   ├── train_model.py
│   └── data/
│       └── sms_fraud_dataset.csv
├── requirements-train.txt
├── buildozer.spec
└── README.md
```

## Local training (desktop)

1. Create environment and install dependencies.

```bash
pip install -r requirements-train.txt
```

2. Train model and export artifacts.

```bash
python training/train_model.py
```

This creates/updates:

- `app/model/fraud_model.pkl`
- `app/model/vectorizer.pkl`
- `app/model/lite_model.json`

## Run app locally (desktop test mode)

```bash
pip install kivy
python app/main.py
```

Desktop mode supports manual and clipboard scan. Android SMS inbox scan requires Android runtime.

## Build APK (Linux/WSL recommended)

Buildozer works best on Linux. On Ubuntu/WSL:

```bash
sudo apt update
sudo apt install -y python3-pip git zip unzip openjdk-17-jdk
pip install buildozer cython
buildozer android debug
```

APK path after build:

```text
bin/ai_fraud_awareness-0.1-debug.apk
```

## Example test messages

1. `Congratulations! You won lottery prize. Click bit.ly/claim and pay processing fee now.`
2. `Dear customer, your bank KYC expired. Verify immediately at http://secure-update-login.com`
3. `UPI alert: Collect request of Rs 45000 from unknown account. Enter UPI pin to approve.`
4. `Interview confirmed. To receive offer letter, submit refundable training deposit today.`
5. `EMI loan approved instantly without documents. Pay advance processing charge to release.`
6. `Your SBI account credited with salary Rs 24,500. Available balance is ...`

## Cybercrime reporting

- Helpline: `1930`
- Portal: `https://cybercrime.gov.in`

## Notes

- Model inference runs fully offline on-device using `lite_model.json`.
- No external LLM APIs are used.
