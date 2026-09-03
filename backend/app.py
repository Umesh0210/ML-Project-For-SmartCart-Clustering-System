"""Flask API serving the SmartCart clustering pipeline."""

from __future__ import annotations

import io
import uuid

import pandas as pd
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS

from pipeline import (
    DROPPED_COLS,
    PROFILE_COLS,
    SPENDING_COLS,
    SmartCartPipeline,
    build_profiles,
    load_dataset,
)

REQUIRED_COLUMNS = sorted(
    set(DROPPED_COLS)
    | set(SPENDING_COLS)
    | {"Education", "Recency", "Income", "Response", "Complain"}
    | {col for col in PROFILE_COLS if col.startswith("Num")}
)

app = Flask(__name__)
CORS(app)

DEFAULT_DATASET_ID = "default"
_pipelines: dict[str, SmartCartPipeline] = {}
_names: dict[str, str] = {DEFAULT_DATASET_ID: "smartcart_customers (2).csv"}


def get_pipeline(dataset_id: str) -> SmartCartPipeline:
    if dataset_id not in _pipelines:
        if dataset_id != DEFAULT_DATASET_ID:
            raise KeyError(dataset_id)
        _pipelines[dataset_id] = SmartCartPipeline(load_dataset())
    return _pipelines[dataset_id]


def requested_pipeline() -> SmartCartPipeline:
    return get_pipeline(request.args.get("dataset_id", DEFAULT_DATASET_ID))


def requested_k() -> int:
    return max(2, min(10, request.args.get("k", default=4, type=int)))


@app.errorhandler(KeyError)
def handle_unknown_dataset(exc: KeyError):
    return jsonify({"error": f"unknown dataset {exc}"}), 404


@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.get("/api/dataset")
def dataset():
    pipeline = requested_pipeline()
    raw, cleaned = pipeline.raw, pipeline.cleaned
    return jsonify(
        {
            "name": _names.get(request.args.get("dataset_id", DEFAULT_DATASET_ID)),
            "rows": int(len(raw)),
            "rows_after_cleaning": int(len(cleaned)),
            "columns": int(raw.shape[1]),
            "missing_income": int(raw["Income"].isna().sum()),
            "engineered_columns": [
                "Age",
                "Costumer_tenure_days",
                "Total_spending",
                "Total_children",
                "Living_with",
            ],
            "summary": [
                {"metric": col, **cleaned[col].describe()[["mean", "min", "max"]].to_dict()}
                for col in ["Income", "Age", "Total_spending", "Recency", "Total_children"]
            ],
            "preview": cleaned.head(10).round(2).to_dict(orient="records"),
        }
    )


@app.get("/api/k-analysis")
def k_analysis():
    return jsonify(requested_pipeline().k_analysis())


@app.get("/api/clusters")
def clusters():
    pipeline = requested_pipeline()
    result = pipeline.segment(requested_k())
    cleaned = result.cleaned
    points = [
        {
            "x": float(result.coords[i, 0]),
            "y": float(result.coords[i, 1]),
            "z": float(result.coords[i, 2]),
            "cluster": int(result.labels[i]),
            "income": float(cleaned["Income"].iat[i]),
            "age": int(cleaned["Age"].iat[i]),
            "spending": float(cleaned["Total_spending"].iat[i]),
        }
        for i in range(len(cleaned))
    ]
    return jsonify(
        {
            "k": result.k,
            "silhouette": result.silhouette,
            "explained_variance": result.explained_variance,
            "points": points,
            "profiles": build_profiles(result),
        }
    )


@app.post("/api/predict")
def predict():
    pipeline = requested_pipeline()
    payload = request.get_json(silent=True) or {}
    k = max(2, min(10, int(payload.get("k", 4))))
    cluster = pipeline.predict(payload, k=k)
    profile = next(
        p for p in build_profiles(pipeline.segment(k)) if p["cluster"] == cluster
    )
    return jsonify({"cluster": cluster, "profile": profile})


@app.get("/api/schema")
def schema():
    return jsonify(requested_pipeline().input_schema())


@app.post("/api/upload")
def upload():
    file = request.files.get("file")
    if file is None:
        return jsonify({"error": "no file uploaded"}), 400
    try:
        df = pd.read_csv(file)
    except Exception as exc:  # noqa: BLE001 - surface parsing errors to the UI
        return jsonify({"error": f"could not read CSV: {exc}"}), 400

    missing = [column for column in REQUIRED_COLUMNS if column not in df.columns]
    if missing:
        return jsonify({"error": f"CSV is missing required columns: {', '.join(missing)}"}), 400

    try:
        pipeline = SmartCartPipeline(df)
    except Exception as exc:  # noqa: BLE001 - surface pipeline errors to the UI
        return jsonify({"error": f"could not process CSV: {exc}"}), 400

    dataset_id = uuid.uuid4().hex[:8]
    _pipelines[dataset_id] = pipeline
    _names[dataset_id] = file.filename
    return jsonify({"dataset_id": dataset_id, "rows": int(len(pipeline.cleaned))})


@app.get("/api/download")
def download():
    pipeline = requested_pipeline()
    result = pipeline.segment(requested_k())
    labelled = result.cleaned.copy()
    labelled["Cluster"] = result.labels
    names = {p["cluster"]: p["name"] for p in build_profiles(result)}
    labelled["Segment"] = labelled["Cluster"].map(names)

    buffer = io.BytesIO(labelled.to_csv(index=False).encode())
    return send_file(
        buffer,
        mimetype="text/csv",
        as_attachment=True,
        download_name=f"smartcart_segments_k{result.k}.csv",
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
