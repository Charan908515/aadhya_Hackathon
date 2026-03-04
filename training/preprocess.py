import re


def clean_text(text):
    text = (text or "").lower().strip()
    text = re.sub(r"http\S+|www\.\S+", " urltoken ", text)
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text
