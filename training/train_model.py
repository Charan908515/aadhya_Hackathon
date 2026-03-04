import csv
import json
import math
import os
import pickle
import random
import re
import sys
from collections import Counter, defaultdict

SKLEARN_AVAILABLE = True
try:
    import joblib
    import pandas as pd
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression
    from sklearn.metrics import classification_report
    from sklearn.model_selection import train_test_split
except Exception:
    SKLEARN_AVAILABLE = False

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)
sys.path.append(CURRENT_DIR)

from preprocess import clean_text  # noqa: E402


DATASET_PATH = os.path.join(CURRENT_DIR, "data", "sms_fraud_dataset.csv")
MODEL_DIR = os.path.join(PROJECT_ROOT, "app", "model")
PKL_MODEL_PATH = os.path.join(MODEL_DIR, "fraud_model.pkl")
PKL_VECTORIZER_PATH = os.path.join(MODEL_DIR, "vectorizer.pkl")
LITE_MODEL_PATH = os.path.join(MODEL_DIR, "lite_model.json")


def export_lite_model(vectorizer, model, out_path):
    vocab = vectorizer.vocabulary_
    idf = vectorizer.idf_
    coef = model.coef_[0]

    id_to_term = {idx: term for term, idx in vocab.items()}
    lite = {
        "vocabulary": vocab,
        "idf": {id_to_term[i]: float(idf[i]) for i in range(len(idf))},
        "coef": {id_to_term[i]: float(coef[i]) for i in range(len(coef))},
        "intercept": float(model.intercept_[0]),
    }
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(lite, f, indent=2)


TOKEN_RE = re.compile(r"[a-z0-9]+")


def sigmoid(x):
    return 1.0 / (1.0 + math.exp(-max(min(x, 30), -30)))


def tokenize(text):
    return TOKEN_RE.findall(text.lower())


def load_dataset_rows(path):
    rows = []
    with open(path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append({"text": clean_text(row["text"]), "label": int(row["label"])})
    return rows


def split_train_test(rows, test_size=0.25, seed=42):
    random.seed(seed)
    fraud = [r for r in rows if r["label"] == 1]
    legit = [r for r in rows if r["label"] == 0]
    random.shuffle(fraud)
    random.shuffle(legit)
    f_cut = int(len(fraud) * (1 - test_size))
    l_cut = int(len(legit) * (1 - test_size))
    train = fraud[:f_cut] + legit[:l_cut]
    test = fraud[f_cut:] + legit[l_cut:]
    random.shuffle(train)
    random.shuffle(test)
    return train, test


def train_fallback_model(train_rows):
    fraud_docs = 0
    legit_docs = 0
    token_in_fraud = defaultdict(int)
    token_in_legit = defaultdict(int)
    doc_freq = defaultdict(int)

    for row in train_rows:
        tokens = set(tokenize(row["text"]))
        if row["label"] == 1:
            fraud_docs += 1
            for t in tokens:
                token_in_fraud[t] += 1
        else:
            legit_docs += 1
            for t in tokens:
                token_in_legit[t] += 1
        for t in tokens:
            doc_freq[t] += 1

    total_docs = fraud_docs + legit_docs
    vocabulary = {t: i for i, t in enumerate(sorted(doc_freq.keys()))}
    idf = {}
    coef = {}
    for token in vocabulary:
        idf[token] = math.log((1 + total_docs) / (1 + doc_freq[token])) + 1.0
        fraud_rate = (token_in_fraud[token] + 1) / (fraud_docs + 2)
        legit_rate = (token_in_legit[token] + 1) / (legit_docs + 2)
        coef[token] = math.log(fraud_rate / legit_rate)

    intercept = math.log((fraud_docs + 1) / (legit_docs + 1))
    return {"vocabulary": vocabulary, "idf": idf, "coef": coef, "intercept": intercept}


def predict_with_lite(text, lite_model):
    tokens = tokenize(text)
    if not tokens:
        return 0.0
    counts = Counter(tokens)
    doc_len = len(tokens)
    logit = lite_model["intercept"]
    for token, count in counts.items():
        if token not in lite_model["vocabulary"]:
            continue
        tfidf = (count / doc_len) * lite_model["idf"].get(token, 1.0)
        logit += tfidf * lite_model["coef"].get(token, 0.0)
    return sigmoid(logit)


def evaluate_fallback(test_rows, lite_model):
    tp = fp = tn = fn = 0
    for row in test_rows:
        p = predict_with_lite(row["text"], lite_model)
        pred = 1 if p >= 0.5 else 0
        true = row["label"]
        if pred == 1 and true == 1:
            tp += 1
        elif pred == 1 and true == 0:
            fp += 1
        elif pred == 0 and true == 0:
            tn += 1
        else:
            fn += 1
    acc = (tp + tn) / max((tp + tn + fp + fn), 1)
    print(
        "Fallback evaluation | accuracy={:.4f} precision={:.4f} recall={:.4f}".format(
            acc,
            tp / max((tp + fp), 1),
            tp / max((tp + fn), 1),
        )
    )


def save_pickle(path, obj):
    with open(path, "wb") as f:
        pickle.dump(obj, f)


def train_with_sklearn():
    df = pd.read_csv(DATASET_PATH)
    df["text"] = df["text"].astype(str).map(clean_text)
    df["label"] = df["label"].astype(int)

    x_train, x_test, y_train, y_test = train_test_split(
        df["text"], df["label"], test_size=0.25, random_state=42, stratify=df["label"]
    )
    vectorizer = TfidfVectorizer(ngram_range=(1, 2), min_df=1, max_features=3500)
    x_train_vec = vectorizer.fit_transform(x_train)
    x_test_vec = vectorizer.transform(x_test)
    model = LogisticRegression(max_iter=300, class_weight="balanced")
    model.fit(x_train_vec, y_train)
    y_pred = model.predict(x_test_vec)
    print(classification_report(y_test, y_pred, digits=4))
    joblib.dump(model, PKL_MODEL_PATH)
    joblib.dump(vectorizer, PKL_VECTORIZER_PATH)
    export_lite_model(vectorizer, model, LITE_MODEL_PATH)


def train_without_sklearn():
    rows = load_dataset_rows(DATASET_PATH)
    train_rows, test_rows = split_train_test(rows, test_size=0.25, seed=42)
    lite_model = train_fallback_model(train_rows)
    evaluate_fallback(test_rows, lite_model)
    with open(LITE_MODEL_PATH, "w", encoding="utf-8") as f:
        json.dump(lite_model, f, indent=2)
    # Keep these deliverables present, even in fallback mode.
    save_pickle(PKL_MODEL_PATH, {"fallback_model": "linear_token_odds", **lite_model})
    save_pickle(PKL_VECTORIZER_PATH, {"fallback_vectorizer": True, "vocabulary": lite_model["vocabulary"]})


def main():
    os.makedirs(MODEL_DIR, exist_ok=True)
    if SKLEARN_AVAILABLE:
        train_with_sklearn()
    else:
        print("scikit-learn not available. Using fallback local trainer.")
        train_without_sklearn()
    print("Saved:", PKL_MODEL_PATH)
    print("Saved:", PKL_VECTORIZER_PATH)
    print("Saved:", LITE_MODEL_PATH)


if __name__ == "__main__":
    main()
