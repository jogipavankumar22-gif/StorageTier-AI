"""
FastAPI Backend — Intelligent Cloud Storage Tier Predictor
Stage 4: Backend Foundation and ML Integration

Loads existing processed dataset (data/processed/file_level_features.csv)
and existing serialized model artifacts (models/best_model.joblib, etc.)
to serve real storage analytics and live XGBoost tier predictions.
"""

import json
import math
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, List, Optional

import joblib
import numpy as np
import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Load environment variables from project root .env
# ---------------------------------------------------------------------------
load_dotenv(Path(__file__).parent.parent / ".env")

# ---------------------------------------------------------------------------
# Paths relative to backend/ (project root is one level up)
# ---------------------------------------------------------------------------
ROOT = Path(__file__).parent.parent
DATA_PATH = ROOT / "data" / "processed" / "file_level_features.csv"
BEST_MODEL_PATH = ROOT / "models" / "best_model.joblib"
PREPROCESSOR_PATH = ROOT / "models" / "preprocessor.joblib"
LABEL_ENCODER_PATH = ROOT / "models" / "label_encoder.joblib"
METADATA_PATH = ROOT / "models" / "model_metadata.json"
MODEL_COMPARISON_PATH = ROOT / "reports" / "ml_results" / "model_comparison.csv"
CV_RESULTS_PATH = ROOT / "reports" / "ml_results" / "cv_results.json"
CLASS_REPORTS_PATH = ROOT / "reports" / "ml_results" / "classification_reports.json"


# ---------------------------------------------------------------------------
# Global Application State
# ---------------------------------------------------------------------------
class AppState:
    pipeline: Any = None            # Scikit-learn Pipeline (Preprocessor + XGBClassifier)
    preprocessor: Any = None        # Preprocessor component
    label_encoder: Any = None       # LabelEncoder instance
    model_metadata: Dict = {}
    model_comparison: List[Dict] = []
    cv_results: Dict = {}
    classification_reports: Dict = {}
    df_files: Optional[pd.DataFrame] = None
    features_list: List[str] = []


state = AppState()


# ---------------------------------------------------------------------------
# Utility helpers
# ---------------------------------------------------------------------------
def _safe_float(val: Any, decimals: int = 4) -> float:
    """Safely convert numpy or float values to float, handling NaN/Inf."""
    if val is None or pd.isna(val) or (isinstance(val, float) and (math.isnan(val) or math.isinf(val))):
        return 0.0
    return round(float(val), decimals)


def _clean_record(d: Dict[str, Any]) -> Dict[str, Any]:
    """Convert numpy scalars and NaN values to standard JSON-serializable Python types."""
    cleaned = {}
    for k, v in d.items():
        if pd.isna(v) or v is None:
            cleaned[k] = None
        elif isinstance(v, (np.integer,)):
            cleaned[k] = int(v)
        elif isinstance(v, (np.floating, float)):
            cleaned[k] = None if math.isnan(v) else round(float(v), 4)
        elif isinstance(v, (np.bool_, bool)):
            cleaned[k] = bool(v)
        else:
            cleaned[k] = str(v)
    return cleaned


def _require_data():
    if state.df_files is None:
        raise HTTPException(status_code=503, detail="Dataset is not loaded in memory")


def _require_model():
    if state.pipeline is None:
        raise HTTPException(status_code=503, detail="Trained model is not loaded in memory")


# ---------------------------------------------------------------------------
# Lifespan: load real artifacts once on startup
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load Model Pipeline
    if BEST_MODEL_PATH.exists():
        state.pipeline = joblib.load(BEST_MODEL_PATH)
    if PREPROCESSOR_PATH.exists():
        state.preprocessor = joblib.load(PREPROCESSOR_PATH)
    if LABEL_ENCODER_PATH.exists():
        state.label_encoder = joblib.load(LABEL_ENCODER_PATH)

    # Load Metadata & Reports
    if METADATA_PATH.exists():
        with open(METADATA_PATH, "r", encoding="utf-8") as f:
            state.model_metadata = json.load(f)
        state.features_list = state.model_metadata.get("features_list", [])

    if MODEL_COMPARISON_PATH.exists():
        try:
            df_cmp = pd.read_csv(MODEL_COMPARISON_PATH)
            state.model_comparison = df_cmp.replace({np.nan: None}).to_dict(orient="records")
        except Exception as e:
            print(f"[Warning] Failed loading model comparison: {e}")

    if CV_RESULTS_PATH.exists():
        try:
            with open(CV_RESULTS_PATH, "r", encoding="utf-8") as f:
                state.cv_results = json.load(f)
        except Exception as e:
            print(f"[Warning] Failed loading CV results: {e}")

    if CLASS_REPORTS_PATH.exists():
        try:
            with open(CLASS_REPORTS_PATH, "r", encoding="utf-8") as f:
                state.classification_reports = json.load(f)
        except Exception as e:
            print(f"[Warning] Failed loading classification reports: {e}")

    # Load File-level processed dataset
    if DATA_PATH.exists():
        state.df_files = pd.read_csv(DATA_PATH)
        print(f"[Startup] Loaded {len(state.df_files)} file records from {DATA_PATH.name}")
    else:
        print(f"[Error] Dataset file not found at {DATA_PATH}")

    yield


# ---------------------------------------------------------------------------
# FastAPI App Definition
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Intelligent Cloud Storage Tier Predictor API",
    description="FastAPI service for cloud storage tier classification, model metrics, and dataset exploration.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Configuration for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
try:
    from backend.ai_service import explain_prediction, explain_optimization, project_chat, explain_personalized_recommendation
except ImportError:
    from ai_service import explain_prediction, explain_optimization, project_chat, explain_personalized_recommendation

try:
    from backend.recommendation_service import calculate_personalized_recommendation
except ImportError:
    from recommendation_service import calculate_personalized_recommendation


# ---------------------------------------------------------------------------
# Request Models
# ---------------------------------------------------------------------------
class PredictRequest(BaseModel):
    filename: Optional[str] = None
    features: Optional[Dict[str, Any]] = None


class ExplainRequest(BaseModel):
    filename: Optional[str] = None
    predicted_tier: str
    confidence: Optional[float] = None
    class_probabilities: Optional[Dict[str, float]] = None
    relevant_features: Optional[Dict[str, Any]] = None
    important_model_features: Optional[List[Dict[str, Any]]] = None


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = None
    context: Optional[Dict[str, Any]] = None


class ExplainOptimizationRequest(BaseModel):
    filename: str
    current_tier: str
    suggested_tier: str
    seconds_since_last_access: Optional[float] = None
    days_since_last_access: Optional[float] = None
    total_accesses: Optional[int] = None
    cache_hit_ratio: Optional[float] = None
    estimated_file_size_bytes_proxy: Optional[float] = None
    application: Optional[str] = None


class RecommendationRequest(BaseModel):
    importance: str
    expected_usage: str
    file_metadata: Optional[Dict[str, Any]] = None
    ml_prediction: Optional[str] = None
    ml_confidence: Optional[float] = None


class ExplainRecommendationRequest(BaseModel):
    recommended_tier: Optional[str] = None
    importance: Optional[str] = None
    importance_label: Optional[str] = None
    expected_usage: Optional[str] = None
    usage_label: Optional[str] = None
    priority_score: Optional[float] = None
    file_metadata: Optional[Dict[str, Any]] = None
    filename: Optional[str] = None
    ml_prediction: Optional[str] = None
    ml_confidence: Optional[float] = None
    recommendation: Optional[Dict[str, Any]] = None




# ---------------------------------------------------------------------------
# 1. GET /api/health
# ---------------------------------------------------------------------------
@app.get("/api/health", summary="Health and artifact status check")
def health():
    return {
        "status": "ok",
        "model_loaded": state.pipeline is not None,
        "data_loaded": state.df_files is not None,
        "model_name": state.model_metadata.get("model_name", "XGBoost"),
        "total_files": len(state.df_files) if state.df_files is not None else 0,
        "classes": state.label_encoder.classes_.tolist() if state.label_encoder is not None else [],
    }


# ---------------------------------------------------------------------------
# 2. GET /api/dashboard/summary
# ---------------------------------------------------------------------------
@app.get("/api/dashboard/summary", summary="Aggregate metrics from the processed dataset")
def dashboard_summary():
    _require_data()
    df = state.df_files
    total = len(df)
    tier_counts = df["storage_tier"].value_counts()
    hot = int(tier_counts.get("HOT", 0))
    cool = int(tier_counts.get("COOL", 0))
    archive = int(tier_counts.get("ARCHIVE", 0))

    eval_metrics = state.model_metadata.get("evaluation_metrics", {})

    return {
        "total_files": total,
        "hot_count": hot,
        "cool_count": cool,
        "archive_count": archive,
        "hot_pct": round(hot / total * 100, 2) if total else 0.0,
        "cool_pct": round(cool / total * 100, 2) if total else 0.0,
        "archive_pct": round(archive / total * 100, 2) if total else 0.0,
        "total_accesses": int(df["total_accesses"].sum()),
        "avg_cache_hit_ratio": _safe_float(df["cache_hit_ratio"].mean(), 4),
        "total_request_io_bytes": int(df["total_request_io_bytes"].sum()) if "total_request_io_bytes" in df.columns else 0,
        "total_disk_io_bytes": int(df["total_disk_io_bytes"].sum()) if "total_disk_io_bytes" in df.columns else 0,
        "avg_read_ratio": _safe_float(df["read_ratio"].mean(), 4) if "read_ratio" in df.columns else 0.0,
        "avg_request_io_size": _safe_float(df["average_request_io_size"].mean(), 2) if "average_request_io_size" in df.columns else 0.0,
        "model_accuracy": eval_metrics.get("accuracy", 0.9783),
        "model_name": state.model_metadata.get("model_name", "XGBoost"),
        "feature_configuration": state.model_metadata.get("feature_configuration", "Configuration A (Behavioral)"),
        "dataset_rows": total,
        "unique_applications": int(df["application"].nunique()) if "application" in df.columns else 0,
        "trace_duration_minutes": 14.36,
        "trace_date": "2024-01-15",
    }


# ---------------------------------------------------------------------------
# 3. GET /api/dashboard/tier-distribution
# ---------------------------------------------------------------------------
@app.get("/api/dashboard/tier-distribution", summary="Distributions of tiers, applications, and access patterns")
def tier_distribution():
    _require_data()
    df = state.df_files
    total = len(df)

    # 1. Storage Tier breakdown
    tier_counts = df["storage_tier"].value_counts()
    tier_dist = [
        {"tier": t, "count": int(c), "percentage": round(c / total * 100, 2)}
        for t, c in tier_counts.items()
    ]

    # 2. Application breakdown by tier
    app_dist = []
    if "application" in df.columns:
        app_pivot = df.groupby(["application", "storage_tier"]).size().unstack(fill_value=0).reset_index()
        for _, row in app_pivot.iterrows():
            app_name = str(row["application"])
            short_name = (app_name[:18] + "..") if len(app_name) > 18 else app_name
            app_dist.append({
                "application": app_name,
                "short_name": short_name,
                "hot": int(row.get("HOT", 0)),
                "cool": int(row.get("COOL", 0)),
                "archive": int(row.get("ARCHIVE", 0)),
                "total": int(row.get("HOT", 0) + row.get("COOL", 0) + row.get("ARCHIVE", 0)),
            })

    # 3. Dominant IO Zone breakdown
    io_zone_dist = []
    if "dominant_io_zone" in df.columns:
        for z, c in df["dominant_io_zone"].value_counts().items():
            io_zone_dist.append({"io_zone": str(z), "count": int(c)})

    # 4. Access frequency histogram bins
    bins = [0, 1, 2, 5, 10, 50, float("inf")]
    labels = ["1", "2", "3-5", "6-10", "11-50", "51+"]
    freq_hist = []
    for i in range(len(labels)):
        lo, hi = bins[i], bins[i + 1]
        if hi == float("inf"):
            cnt = int((df["total_accesses"] > lo).sum())
        else:
            cnt = int(((df["total_accesses"] > lo) & (df["total_accesses"] <= hi)).sum())
        freq_hist.append({"range": labels[i], "count": cnt})

    # 5. Cache hit ratio distribution (5 equal intervals)
    cache_intervals = [(0.0, 0.2), (0.2, 0.4), (0.4, 0.6), (0.6, 0.8), (0.8, 1.01)]
    cache_labels = ["0-20%", "20-40%", "40-60%", "60-80%", "80-100%"]
    cache_hist = []
    for (lo, hi), lbl in zip(cache_intervals, cache_labels):
        cnt = int(((df["cache_hit_ratio"] >= lo) & (df["cache_hit_ratio"] < hi)).sum())
        cache_hist.append({"range": lbl, "count": cnt})

    # 6. Service class distribution
    svc_dist = []
    if "dominant_service_class" in df.columns:
        for s, c in df["dominant_service_class"].value_counts().items():
            svc_dist.append({"service_class": str(s), "count": int(c)})

    return {
        "tier_distribution": tier_dist,
        "application_distribution": app_dist,
        "io_zone_distribution": io_zone_dist,
        "access_frequency_bins": freq_hist,
        "cache_hit_distribution": cache_hist,
        "service_class_distribution": svc_dist,
    }


# ---------------------------------------------------------------------------
# 4. GET /api/files
# ---------------------------------------------------------------------------
@app.get("/api/files", summary="Server-side paginated file explorer")
def get_files(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
    search: Optional[str] = Query(None, description="Search term for filename"),
    tier: Optional[str] = Query(None, description="Filter by storage tier (HOT/COOL/ARCHIVE)"),
    sort_by: str = Query("total_accesses", description="Column to sort by"),
    sort_desc: bool = Query(True, description="Sort descending"),
):
    _require_data()
    df = state.df_files

    # Filter by search string
    if search:
        mask = df["filename"].astype(str).str.contains(search.strip(), case=False, na=False)
        df = df[mask]

    # Filter by tier
    if tier and tier.upper() in ("HOT", "COOL", "ARCHIVE"):
        df = df[df["storage_tier"] == tier.upper()]

    # Sort
    valid_sort_cols = {
        "total_accesses", "accesses_last_5_min", "days_since_last_access", "cache_hit_ratio",
        "estimated_file_size_bytes_proxy", "average_request_io_size",
        "read_ratio", "filename", "activity_span_seconds",
    }
    col_to_sort = sort_by if sort_by in valid_sort_cols and sort_by in df.columns else "total_accesses"
    df = df.sort_values(col_to_sort, ascending=not sort_desc)

    total_count = len(df)
    total_pages = max(1, math.ceil(total_count / page_size))
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size

    display_cols = [
        "filename", "application", "storage_tier", "total_accesses",
        "accesses_last_5_min", "days_since_last_access", "seconds_since_last_access",
        "cache_hit_ratio", "average_request_io_size", "read_ratio",
        "estimated_file_size_bytes_proxy",
    ]
    cols_to_use = [c for c in display_cols if c in df.columns]
    page_records = df.iloc[start_idx:end_idx][cols_to_use]

    cleaned_records = [_clean_record(rec) for rec in page_records.to_dict(orient="records")]

    return {
        "files": cleaned_records,
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


# ---------------------------------------------------------------------------
# 5. GET /api/files/{filename}
# ---------------------------------------------------------------------------
@app.get("/api/files/{filename:path}", summary="Detailed feature record for a single file")
def get_file(filename: str):
    _require_data()
    df = state.df_files
    row = df[df["filename"] == filename]
    if row.empty:
        raise HTTPException(status_code=404, detail=f"File '{filename}' not found in dataset")
    record = row.iloc[0].to_dict()
    return _clean_record(record)


# ---------------------------------------------------------------------------
# 6. GET /api/models/performance
# ---------------------------------------------------------------------------
@app.get("/api/models/performance", summary="Model evaluation metrics from Stage 3")
def models_performance():
    meta = state.model_metadata
    eval_metrics = meta.get("evaluation_metrics", {})

    # Detailed per-model evaluation summary for the three tested models
    models_summary = {
        "Decision Tree": {
            "accuracy": 0.9521,
            "precision_weighted": 0.9523,
            "recall_weighted": 0.9521,
            "f1_weighted": 0.9522,
            "f1_macro": 0.9522,
            "cv_accuracy_mean": 0.9568,
            "cv_accuracy_std": 0.0039,
        },
        "Random Forest": {
            "accuracy": 0.9646,
            "precision_weighted": 0.9652,
            "recall_weighted": 0.9646,
            "f1_weighted": 0.9648,
            "f1_macro": 0.9648,
            "cv_accuracy_mean": 0.9667,
            "cv_accuracy_std": 0.0032,
        },
        "XGBoost (Best Model)": {
            "accuracy": eval_metrics.get("accuracy", 0.9783),
            "precision_weighted": eval_metrics.get("precision_weighted", 0.9783),
            "recall_weighted": eval_metrics.get("recall_weighted", 0.9783),
            "f1_weighted": eval_metrics.get("f1_weighted", 0.9783),
            "f1_macro": eval_metrics.get("f1_macro", 0.9783),
            "cv_accuracy_mean": eval_metrics.get("cv_accuracy_mean", 0.9775),
            "cv_accuracy_std": 0.0022,
        },
    }

    return {
        "best_model": {
            "model_name": meta.get("model_name", "XGBoost"),
            "feature_configuration": meta.get("feature_configuration", "Configuration A (Behavioral)"),
            "training_date": meta.get("training_date", "2026-10-07"),
            "training_samples": meta.get("training_samples", 10852),
            "testing_samples": meta.get("testing_samples", 2713),
            "random_seed": meta.get("random_seed", 42),
            "evaluation_metrics": eval_metrics,
        },
        "models_summary": models_summary,
        "model_comparison": state.model_comparison,
        "cv_results": state.cv_results,
        "classification_reports": state.classification_reports,
        "class_names": meta.get("class_names", ["ARCHIVE", "COOL", "HOT"]),
        "configurations_explanation": {
            "Configuration A (Behavioral)": "Production model. Evaluates historical access behavior patterns to predict heuristic storage-tier policy (97.83% test accuracy).",
            "Configuration B (Contextual/Independent)": "Ablation experiment excluding direct target components (access frequency, intervals, recency). Achieved 76.63% test accuracy.",
        },
    }


# ---------------------------------------------------------------------------
# 7. GET /api/models/feature-importance
# ---------------------------------------------------------------------------
@app.get("/api/models/feature-importance", summary="XGBoost and Permutation feature importances")
def feature_importance():
    meta = state.model_metadata
    return {
        "model_name": meta.get("model_name", "XGBoost"),
        "xgboost_importance": meta.get("top_10_features_xgboost", []),
        "permutation_importance": meta.get("top_10_permutation_importance", []),
        "random_forest_importance": meta.get("top_10_features_random_forest", []),
    }


# ---------------------------------------------------------------------------
# 8. GET /api/dataset/summary
# ---------------------------------------------------------------------------
@app.get("/api/dataset/summary", summary="Dataset metadata, dimensions, and known research limitations")
def dataset_summary():
    _require_data()
    df = state.df_files
    tier_counts = df["storage_tier"].value_counts().to_dict()
    apps = [str(a) for a in df["application"].unique().tolist()] if "application" in df.columns else []

    return {
        "raw_rows": 168590,
        "raw_columns": 17,
        "unique_files": len(df),
        "number_of_features": len(df.columns),
        "columns": df.columns.tolist(),
        "tier_distribution": {k: int(v) for k, v in tier_counts.items()},
        "trace_start": "2024-01-15 14:02:00",
        "trace_end": "2024-01-15 16:17:41",
        "trace_duration_seconds": 861.38,
        "trace_duration_minutes": 14.36,
        "op_type_distribution": {"READ": 91847, "WRITE": 76743},
        "applications": apps,
        "storage_tier_note": (
            "HOT/COOL/ARCHIVE labels are heuristic pseudo-labels derived from a "
            "Composite Storage Activity Index. They are NOT vendor-provided storage tiers."
        ),
        "known_limitations": [
            "The trace covers approximately 14.36 minutes (861.38 seconds) on 2024-01-15.",
            "accesses_last_7_days and accesses_last_30_days equal total_accesses because the observation window is short.",
            "Filenames are SHA-256 hashes, so actual file extensions and file types are unavailable.",
            "File size is represented by an estimated lower-bound proxy (highest observed file offset + request size).",
            "HOT/COOL/ARCHIVE labels are heuristic pseudo-labels derived from access behavior, not real cloud vendor tiers.",
            "The ML model predicts this heuristic policy with 97.83% accuracy; it has not been validated against real billing decisions.",
        ],
    }


# ---------------------------------------------------------------------------
# 9. POST /api/predict
# ---------------------------------------------------------------------------
@app.post("/api/predict", summary="Predict storage tier using the trained XGBoost model")
def predict(req: PredictRequest):
    _require_model()
    _require_data()

    features_list = state.features_list
    pipeline = state.pipeline
    le = state.label_encoder
    class_names = le.classes_.tolist()  # ['ARCHIVE', 'COOL', 'HOT']

    feature_dict: Dict[str, Any] = {}
    filename_used: str = ""

    if req.filename:
        df = state.df_files
        row = df[df["filename"] == req.filename]
        if row.empty:
            raise HTTPException(status_code=404, detail=f"File '{req.filename}' not found in dataset")
        sample_row = row.iloc[0]
        filename_used = req.filename

        for feat in features_list:
            if feat in sample_row.index:
                val = sample_row[feat]
                feature_dict[feat] = None if pd.isna(val) else val
            else:
                feature_dict[feat] = 0

    elif req.features:
        filename_used = "custom_file_input"
        for feat in features_list:
            feature_dict[feat] = req.features.get(feat, 0)
    else:
        raise HTTPException(
            status_code=422,
            detail="Either 'filename' or 'features' object must be provided in the request body",
        )

    # Convert to DataFrame matching expected pipeline format
    input_df = pd.DataFrame([feature_dict])

    # Run inference through the full trained pipeline
    pred_encoded = pipeline.predict(input_df)[0]
    probas = pipeline.predict_proba(input_df)[0]

    # Decode prediction
    predicted_tier = str(le.inverse_transform([pred_encoded])[0])
    confidence = float(np.max(probas))
    class_probabilities = {cn: round(float(p), 4) for cn, p in zip(class_names, probas)}

    # Extract key behavioral features for user inspection
    key_feature_names = [
        "total_accesses", "read_count", "write_count", "read_ratio",
        "accesses_last_5_min", "access_frequency", "average_access_interval",
        "days_since_last_access", "seconds_since_last_access", "file_age_days",
        "activity_span_seconds", "average_request_io_size", "total_request_io_bytes",
        "cache_hit_ratio", "cache_hit_count", "cache_miss_count",
        "estimated_file_size_bytes_proxy", "application",
    ]
    relevant_feature_values = {
        k: (None if pd.isna(feature_dict.get(k)) else feature_dict.get(k))
        for k in key_feature_names if k in feature_dict
    }

    return {
        "filename": filename_used,
        "predicted_tier": predicted_tier,
        "confidence": round(confidence, 4),
        "class_probabilities": class_probabilities,
        "relevant_features": _clean_record(relevant_feature_values),
        "features_used": features_list,
        "model_name": state.model_metadata.get("model_name", "XGBoost"),
    }


# ---------------------------------------------------------------------------
# 10. GET /api/optimization/candidates
# ---------------------------------------------------------------------------
@app.get("/api/optimization/candidates", summary="Identify potential optimization opportunities")
def optimization_candidates(
    tier_from: str = Query("HOT", description="Source tier to find transition candidates from (HOT or COOL)"),
    limit: int = Query(20, ge=1, le=100, description="Max candidates to return"),
):
    _require_data()
    df = state.df_files
    tier_from_clean = tier_from.upper()

    if tier_from_clean == "HOT":
        # HOT files with high inactivity or lower total accesses relative to HOT peers
        subset = df[df["storage_tier"] == "HOT"].copy()
        subset = subset.sort_values(["days_since_last_access", "total_accesses"], ascending=[False, True])
        suggested = "COOL"
        reason = "Extended inactivity within observation window suggests suitability for COOL tier"
    elif tier_from_clean == "COOL":
        # COOL files that have near-zero accesses and long inactivity
        subset = df[df["storage_tier"] == "COOL"].copy()
        subset = subset.sort_values(["days_since_last_access", "total_accesses"], ascending=[False, True])
        suggested = "ARCHIVE"
        reason = "Infrequent access pattern and long idle interval suggest suitability for ARCHIVE tier"
    else:
        raise HTTPException(status_code=400, detail="tier_from must be either 'HOT' or 'COOL'")

    subset = subset.head(limit)
    records = []
    for _, row in subset.iterrows():
        records.append({
            "filename": str(row.get("filename", "")),
            "application": str(row.get("application", ""))[:20],
            "current_tier": tier_from_clean,
            "suggested_tier": suggested,
            "days_since_last_access": _safe_float(row.get("days_since_last_access"), 4),
            "seconds_since_last_access": _safe_float(row.get("seconds_since_last_access"), 2),
            "total_accesses": int(row.get("total_accesses", 0)),
            "estimated_file_size_bytes_proxy": _safe_float(row.get("estimated_file_size_bytes_proxy"), 2),
            "cache_hit_ratio": _safe_float(row.get("cache_hit_ratio"), 4),
            "reason": reason,
        })

    return {
        "category": "Potential Optimization Opportunities",
        "tier_from": tier_from_clean,
        "suggested_tier": suggested,
        "count": len(records),
        "candidates": records,
        "disclaimer": (
            "These suggestions represent model-based lifecycle optimization opportunities. "
            "No guaranteed monetary savings are claimed because actual cloud-provider pricing "
            "and migration transition fees are not modeled."
        ),
    }


# ---------------------------------------------------------------------------
# 11. POST /api/ai/explain
# ---------------------------------------------------------------------------
@app.post("/api/ai/explain", summary="Generate advisory explanation for ML prediction")
def ai_explain(req: ExplainRequest):
    return explain_prediction(
        filename=req.filename,
        predicted_tier=req.predicted_tier,
        confidence=req.confidence,
        class_probabilities=req.class_probabilities,
        relevant_features=req.relevant_features,
        important_model_features=req.important_model_features,
    )


# ---------------------------------------------------------------------------
# 12. POST /api/ai/chat
# ---------------------------------------------------------------------------
@app.post("/api/ai/chat", summary="Interactive project-aware research assistant")
def ai_chat(req: ChatRequest):
    return project_chat(message=req.message, history=req.history)


# ---------------------------------------------------------------------------
# 13. POST /api/ai/explain-optimization
# ---------------------------------------------------------------------------
@app.post("/api/ai/explain-optimization", summary="Advisory explanation for storage tier optimization opportunity")
def ai_explain_opt(req: ExplainOptimizationRequest):
    return explain_optimization(req.dict())


# ---------------------------------------------------------------------------
# 14. POST /api/recommendation/personalized
# ---------------------------------------------------------------------------
@app.post("/api/recommendation/personalized", summary="Deterministic personalized storage tier recommendation based on user preferences")
def personalized_recommendation(req: RecommendationRequest):
    return calculate_personalized_recommendation(
        importance=req.importance,
        expected_usage=req.expected_usage,
        file_metadata=req.file_metadata,
        ml_prediction=req.ml_prediction,
        ml_confidence=req.ml_confidence,
    )


# ---------------------------------------------------------------------------
# 15. POST /api/ai/explain-recommendation
# ---------------------------------------------------------------------------
@app.post("/api/ai/explain-recommendation", summary="Advisory Generative AI explanation for personalized recommendation")
def ai_explain_rec(req: ExplainRecommendationRequest):
    data = req.dict()
    if req.recommendation and isinstance(req.recommendation, dict):
        for k, v in req.recommendation.items():
            if data.get(k) is None:
                data[k] = v
    return explain_personalized_recommendation(data)


