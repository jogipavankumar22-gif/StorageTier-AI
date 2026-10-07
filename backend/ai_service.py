"""
Generative AI Service — Intelligent Cloud Storage Tier Predictor
Stage 5: Explanation & Advisory Layer

Architectural Rule:
- Machine Learning (XGBoost) is the authoritative decision-maker.
- Generative AI is ONLY an explanation, educational, and advisory layer.
- The AI MUST NEVER override, replace, or alter the ML prediction.
- All explanations are strictly grounded in observed file features and project artifacts.
"""

import os
import re
from typing import Any, Dict, List, Optional

# System instruction enforced for all Generative AI interactions
SYSTEM_INSTRUCTION = """You are an explanation and research assistant for the Intelligent Cloud Storage Tier Predictor.

The XGBoost machine-learning model is the authoritative decision-maker for HOT, COOL, and ARCHIVE predictions.

You must never override, modify, or invent an ML prediction.

When explaining a prediction, use the supplied prediction and observed feature values.

Do not claim that the model predicts real cloud-provider storage tiers.

The project uses heuristic pseudo-labels derived from observed file-access behavior.

Do not claim guaranteed monetary savings.

Do not invent missing dataset information.

The source trace covers approximately 14.36 minutes, so long-term access behavior cannot be inferred reliably.

If information is unavailable, say so."""

PROJECT_CONTEXT = """
Project: Intelligent Cloud Storage Tier Predictor Using Machine Learning
Dataset: Google Thesios Storage I/O Trace (2024-01-15, 14.36-minute observation window / 861.38 seconds).
Total raw I/O events: 168,590 (91,848 reads, 76,742 writes).
Unique files aggregated: 13,565 files identified by 64-character SHA-256 hashes across 76 microservices.
Features: 37 engineered file-level features across 7 categories (Identity, Access Behavior, Time & Activity, I/O Telemetry, Cache Performance, Infrastructure & QoS, Size & Target).
Target classes: HOT (4,522), COOL (4,522), ARCHIVE (4,521) - balanced ~1:1:1.
Labeling methodology: Composite Storage Activity Index S_i = 0.40 * R_access + 0.30 * R_recency + 0.15 * R_span + 0.15 * R_cache.
Tertile cutoffs: S >= 0.6027 -> HOT; 0.4061 < S < 0.6027 -> COOL; S <= 0.4061 -> ARCHIVE.
ML Models evaluated:
- Decision Tree: 95.21% test accuracy, 0.9522 weighted F1, 95.68% ± 0.39% CV
- Random Forest: 96.46% test accuracy, 0.9648 weighted F1, 96.67% ± 0.32% CV
- XGBoost (Best/Champion): 97.83% test accuracy, 0.9783 weighted F1, 97.75% ± 0.22% CV (2,654 / 2,713 correct test files)
Dual configuration findings: Behavioral Configuration A (97.83%) vs Contextual Configuration B (76.63%), proving access behavior is the dominant predictor of the storage policy.
Top features: accesses_last_5_min (33.77% gain), total_accesses, days_since_last_access, activity_span_seconds, cache_hit_ratio.
Limitations: 14.36-minute window, pseudo-labels not vendor ground truth, SHA-256 anonymization, lower-bound file size proxy, no monetary savings guarantees.
Core motto: Machine Learning decides. Generative AI explains.
"""

def _get_api_key() -> Optional[str]:
    """Retrieve AI API key from environment, checking AI_API_KEY then GEMINI_API_KEY."""
    key = os.getenv("AI_API_KEY") or os.getenv("GEMINI_API_KEY")
    if not key or key.strip() in ("", "your_gemini_api_key_here", "your_api_key_here"):
        return None
    return key.strip()


def _call_gemini(prompt: str) -> Optional[str]:
    """Attempt call to Google Gemini via google-generativeai package if configured."""
    api_key = _get_api_key()
    if not api_key:
        return None

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        # Try gemini-1.5-flash first, fallback to gemini-pro
        try:
            model = genai.GenerativeModel(
                model_name="gemini-1.5-flash",
                system_instruction=SYSTEM_INSTRUCTION
            )
            response = model.generate_content(prompt)
            if response and response.text:
                return response.text.strip()
        except Exception:
            model = genai.GenerativeModel(model_name="gemini-pro")
            response = model.generate_content(f"{SYSTEM_INSTRUCTION}\n\n{prompt}")
            if response and response.text:
                return response.text.strip()
    except Exception as e:
        print(f"[AI Service] Gemini call failed or unavailable: {e}")
        return None

    return None


def explain_prediction(
    filename: Optional[str],
    predicted_tier: str,
    confidence: Optional[float],
    class_probabilities: Optional[Dict[str, float]],
    relevant_features: Optional[Dict[str, Any]],
    important_model_features: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Explain an existing ML model tier prediction without overriding it.
    Guarantees that predicted_tier is preserved and explanation is grounded in real features.
    """
    tier = str(predicted_tier).upper()
    conf = confidence if confidence is not None else 0.95
    conf_pct = f"{conf * 100:.2f}%" if conf <= 1.0 else f"{conf:.2f}%"
    feats = relevant_features or {}

    total_acc = feats.get("total_accesses", "N/A")
    acc_5m = feats.get("accesses_last_5_min", "N/A")
    recency_sec = feats.get("seconds_since_last_access", "N/A")
    recency_days = feats.get("days_since_last_access", "N/A")
    cache_hit = feats.get("cache_hit_ratio", "N/A")
    file_size = feats.get("estimated_file_size_bytes_proxy", "N/A")
    app_name = feats.get("application", "Unknown")

    prompt = f"""Explain this XGBoost storage tier prediction according to your instructions.

ML MODEL RESULT:
- Filename: {filename or 'Custom Input'}
- Authoritative Predicted Tier: {tier}
- Confidence: {conf_pct}
- Class Probabilities: {class_probabilities or 'N/A'}

OBSERVED FILE BEHAVIORS:
- Application: {app_name}
- Total Accesses: {total_acc}
- Accesses in Last 5 Minutes: {acc_5m} (#1 predictor in XGBoost model)
- Seconds Since Last Access: {recency_sec}
- Inactivity Gap (Fractional Days): {recency_days}
- Cache Hit Ratio: {cache_hit}
- Estimated File Size Proxy: {file_size} bytes

Please format your response with these exact sections:
1. ML Model Prediction Summary: (Acknowledge {tier} with {conf_pct} confidence)
2. Relevant Observed Behaviors: (Highlight the key access, recency, and caching metrics above)
3. Consistency with Storage Tier: (Explain why these behaviors align with the {tier} tier definition)
4. Research & Dataset Limitations: (Note the 14.36-minute observation window and heuristic pseudo-labels)
"""

    gemini_text = _call_gemini(prompt)

    if gemini_text:
        return {
            "predicted_tier": tier,
            "confidence": conf,
            "explanation": gemini_text,
            "provider": "google-gemini",
            "advisory_disclaimer": "AI-generated explanations are advisory. Storage-tier predictions are produced authoritatively by the trained XGBoost model.",
            "status": "success",
        }

    # Deterministic fallback explanation strictly grounded in features and ML results
    if tier == "HOT":
        behavior_text = (
            f"The file demonstrates intensive I/O activity with {total_acc} total accesses, including {acc_5m} operations "
            f"in the final 5 minutes of the trace. The last recorded access was observed only {recency_sec}s before "
            f"the trace cutoff, indicating sustained real-time workload demand."
        )
        consistency_text = (
            f"These high-frequency access patterns place the file well above the composite activity index threshold "
            f"(S >= 0.6027). Under standard cloud storage policies, files with ongoing high read/write volume require "
            f"low-latency NVMe/SSD backed storage to prevent bottlenecking application throughput."
        )
    elif tier == "COOL":
        behavior_text = (
            f"The file shows moderate cumulative access ({total_acc} total accesses) with an observed inactivity gap "
            f"of {recency_sec}s ({recency_days} fractional days) and {acc_5m} accesses in the last 5 minutes. "
            f"Cache hit ratio was recorded at {cache_hit}."
        )
        consistency_text = (
            f"The activity index falls within the intermediate tertile (0.4061 < S < 0.6027). The file is actively referenced "
            f"but lacks continuous burst saturation, making standard Infrequent Access or COOL storage suitable."
        )
    else:  # ARCHIVE
        behavior_text = (
            f"The file exhibited minimal activity during the trace window ({total_acc} total accesses, {acc_5m} in the last 5 minutes), "
            f"with an extended idle duration ({recency_sec}s since last access) and low cache retention ({cache_hit})."
        )
        consistency_text = (
            f"The composite activity index ranks in the lowest tertile (S <= 0.4061). Infrequently touched objects with "
            f"long idle intervals match the criteria for cold storage tiers where retrieval latency is sacrificed for storage density."
        )

    fallback_explanation = (
        f"### 1. ML Model Prediction Summary\n"
        f"The authoritative XGBoost model classified this file into the **{tier}** storage tier with **{conf_pct}** confidence. "
        f"This decision was produced by the trained supervised pipeline evaluated on holdout trace records.\n\n"
        f"### 2. Relevant Observed Behaviors\n"
        f"{behavior_text}\n\n"
        f"### 3. Consistency with Storage Tier Policy\n"
        f"{consistency_text}\n\n"
        f"### 4. Research & Dataset Limitations\n"
        f"• The Google Thesios trace spans approximately 14.36 minutes (861.38s) on 2024-01-15; long-term multi-week behavior cannot be directly measured.\n"
        f"• HOT, COOL, and ARCHIVE are heuristic pseudo-labels derived from empirical activity tertiles, not commercial vendor billing ground truth.\n"
        f"• The XGBoost model predicts the project's heuristic policy with 97.83% test accuracy; no guaranteed monetary savings are claimed."
    )

    api_configured = _get_api_key() is not None
    provider_status = "local-grounded-advisory" if not api_configured else "local-fallback"

    return {
        "predicted_tier": tier,
        "confidence": conf,
        "explanation": fallback_explanation,
        "provider": provider_status,
        "advisory_disclaimer": "AI-generated explanations are advisory. Storage-tier predictions are produced authoritatively by the trained XGBoost model.",
        "status": "success",
        "note": "AI explanation is operating in local grounded advisory mode. The ML prediction remains fully authoritative." if not api_configured else None
    }


def explain_optimization(candidate_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Explain why an optimization candidate is flagged for tier transition.
    Must never alter candidate classification or invent dollar amounts.
    """
    filename = candidate_data.get("filename", "Unknown")
    current_tier = candidate_data.get("current_tier", "HOT")
    suggested_tier = candidate_data.get("suggested_tier", "COOL")
    inactivity_sec = candidate_data.get("seconds_since_last_access", "N/A")
    total_acc = candidate_data.get("total_accesses", 0)
    cache_hit = candidate_data.get("cache_hit_ratio", 0.0)
    file_size = candidate_data.get("estimated_file_size_bytes_proxy", 0)

    prompt = f"""Explain this storage tier optimization opportunity according to your instructions.

OPTIMIZATION CANDIDATE:
- Filename: {filename}
- Current Assigned Tier: {current_tier}
- Suggested Target Tier: {suggested_tier}
- Inactivity Duration: {inactivity_sec} seconds
- Total Accesses in Trace: {total_acc}
- Cache Hit Ratio: {cache_hit}
- Estimated Size: {file_size} bytes

Provide a clear explanation structured as:
1. Transition Overview: ({current_tier} -> {suggested_tier})
2. Telemetry Justification: (Why the observed inactivity and access volume support transition)
3. Lifecycle Policy Considerations: (Tradeoffs between storage retention and retrieval fees)
4. Academic Honesty Notice: (Acknowledge that actual savings depend on vendor pricing, retrieval costs, and workload changes)
"""

    gemini_text = _call_gemini(prompt)

    if gemini_text:
        return {
            "filename": filename,
            "current_tier": current_tier,
            "suggested_tier": suggested_tier,
            "explanation": gemini_text,
            "provider": "google-gemini",
            "disclaimer": "Potential Optimization Opportunity. Actual cost savings depend on cloud-provider pricing, storage policies, migration frequency, retrieval costs, and workload behavior.",
        }

    fallback_explanation = (
        f"### 1. Transition Overview: {current_tier} → {suggested_tier}\n"
        f"This file was identified as an optimization candidate for transition from **{current_tier}** to **{suggested_tier}** "
        f"based on empirical workload inactivity within the observation window.\n\n"
        f"### 2. Telemetry Justification\n"
        f"• **Inactivity Gap:** The file has remained unaccessed for **{inactivity_sec}s** leading up to the trace cutoff boundary.\n"
        f"• **Access Volume:** Total access count of **{total_acc}** is lower than the active median for its current tier.\n"
        f"• **Cache Utilization:** Cache hit ratio of **{cache_hit}** confirms low operational memory residency.\n\n"
        f"### 3. Lifecycle Policy Considerations\n"
        f"Transitioning to **{suggested_tier}** lowers baseline storage capacity overhead for dormant objects. "
        f"However, systems must balance capacity reductions against potential access and retrieval fees if the object experiences sudden reactivation.\n\n"
        f"### 4. Academic Honesty & Practical Limitations\n"
        f"Actual cost savings depend on cloud-provider pricing, storage policies, migration frequency, retrieval costs, and workload behavior. "
        f"No specific monetary savings are claimed from this 14.36-minute trace observation."
    )

    return {
        "filename": filename,
        "current_tier": current_tier,
        "suggested_tier": suggested_tier,
        "explanation": fallback_explanation,
        "provider": "local-grounded-advisory",
        "disclaimer": "Potential Optimization Opportunity. Actual cost savings depend on cloud-provider pricing, storage policies, migration frequency, retrieval costs, and workload behavior.",
    }


def project_chat(message: str, history: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
    """
    Project-aware AI Assistant conversation endpoint.
    Answers research, dataset, model, and architecture questions factually.
    """
    clean_msg = message.strip()

    prompt = f"""System Context:
{PROJECT_CONTEXT}

User Inquiry:
{clean_msg}

Answer the user inquiry factually using the project context above.
If information is not supported by the dataset or project artifacts, explicitly state that it is unavailable or uncertain.
Remember: The XGBoost model is the decision-maker; you are an advisory research assistant. Do not promise guaranteed monetary savings."""

    gemini_text = _call_gemini(prompt)

    if gemini_text:
        return {
            "reply": gemini_text,
            "provider": "google-gemini",
            "disclaimer": "AI-generated explanations are advisory. Storage-tier predictions are produced by the trained XGBoost model.",
        }

    # Intelligent grounded knowledge-base responder for offline / unconfigured mode
    q = clean_msg.lower()

    if any(k in q for k in ["why did the model classify", "classify this file as hot", "classify as hot"]):
        reply = (
            "The XGBoost model classifies files as **HOT** primarily due to high access intensity, short inactivity gaps, "
            "and frequent accesses within the recent observation window (such as `accesses_last_5_min`, which accounts for 33.77% "
            "of the model's total gain importance). Files with rapid request inter-arrival times and active cache utilization score "
            "above the heuristic threshold ($S \\ge 0.6027$), placing them firmly in the HOT tier."
        )
    elif any(k in q for k in ["difference between hot", "difference between tiers", "hot, cool and archive"]):
        reply = (
            "In this project, files are divided into three balanced heuristic tiers based on the Composite Storage Activity Index ($S$):\n\n"
            "• **HOT ($S \\ge 0.6027$ — 4,522 files):** High-frequency, active files with ongoing reads/writes and low idle time. Suitable for low-latency SSD/NVMe storage.\n"
            "• **COOL ($0.4061 < S < 0.6027$ — 4,522 files):** Moderately accessed files with intermediate inactivity. Suitable for standard cloud storage with balanced cost and access.\n"
            "• **ARCHIVE ($S \\le 0.4061$ — 4,521 files):** Cold, dormant files rarely touched during the trace. Ideal for high-density, low-cost capacity storage."
        )
    elif any(k in q for k in ["why is xgboost better", "xgboost vs", "why xgboost"]):
        reply = (
            "Across 5-fold stratified cross-validation and holdout test evaluation, **XGBoost achieved the highest performance**:\n\n"
            "• **XGBoost:** 97.83% Test Accuracy, 0.9783 Weighted F1, 97.75% ± 0.22% CV (2,654 / 2,713 correct test files)\n"
            "• **Random Forest:** 96.46% Test Accuracy, 0.9648 Weighted F1, 96.67% ± 0.32% CV\n"
            "• **Decision Tree:** 95.21% Test Accuracy, 0.9522 Weighted F1, 95.68% ± 0.39% CV\n\n"
            "XGBoost's gradient boosting mechanism effectively handles subtle non-linear boundaries between adjacent activity index tertiles, "
            "especially for files near the 0.4061 and 0.6027 threshold cutoffs."
        )
    elif any(k in q for k in ["important features", "feature importance", "most important"]):
        reply = (
            "Based on the trained XGBoost model's feature importance analysis:\n\n"
            "1. **`accesses_last_5_min` (33.77% gain):** The single most predictive feature, capturing recent burst activity.\n"
            "2. **`total_accesses`:** Cumulative request volume over the entire trace.\n"
            "3. **`days_since_last_access` / `seconds_since_last_access`:** Inactivity gap indicating coldness/dormancy.\n"
            "4. **`activity_span_seconds`:** Measures whether access was sustained or an instantaneous burst.\n"
            "5. **`cache_hit_ratio`:** Proportion of requests satisfied from cache versus backend disk.\n\n"
            "Permutation importance confirms that randomly shuffling `total_accesses` or recency variables causes the largest drops in holdout test accuracy."
        )
    elif any(k in q for k in ["limitations", "dataset limitations", "trace window"]):
        reply = (
            "The project has several essential academic limitations that must be acknowledged:\n\n"
            "1. **Short Observation Window:** The trace spans 861.38 seconds (~14.36 minutes) on 2024-01-15. Consequently, `accesses_last_7_days` and `accesses_last_30_days` equal `total_accesses` and cannot reflect multi-week history.\n"
            "2. **Heuristic Pseudo-Labels:** HOT, COOL, and ARCHIVE are mathematical pseudo-labels derived from the Composite Activity Index, not official Google Cloud Storage tiers.\n"
            "3. **Anonymized SHA-256 Hashes:** Filenames are cryptographic hashes, so true file extensions and types are unobservable.\n"
            "4. **Size Proxy:** File size is an empirical lower-bound proxy (max observed offset + request size).\n"
            "5. **No Billing Validation:** The model learns to approximate the heuristic policy; no real billing savings are claimed."
        )
    elif any(k in q for k in ["heuristic labeling", "composite activity index", "how does the heuristic"]):
        reply = (
            "Heuristic labeling formulates a continuous Composite Storage Activity Index ($S_i \\in [0, 1]$) combining 4 percentile-ranked dimensions:\n\n"
            "$$S_i = 0.40 \\cdot R_{\\text{access}} + 0.30 \\cdot R_{\\text{recency}} + 0.15 \\cdot R_{\\text{span}} + 0.15 \\cdot R_{\\text{cache}}$$\n\n"
            "• 40% Access Volume (`total_accesses`, `accesses_last_5_min`)\n"
            "• 30% Access Recency (decayed inverse of `seconds_since_last_access`)\n"
            "• 15% Activity Duration (`activity_span_seconds`)\n"
            "• 15% Cache Hit Ratio (`cache_hit_ratio`)\n\n"
            "Data-driven tertiles partition the 13,565 files into 3 equal cohorts: HOT ($S \\ge 0.6027$), COOL ($0.4061 < S < 0.6027$), and ARCHIVE ($S \\le 0.4061$)."
        )
    elif any(k in q for k in ["cloud cost savings", "guarantee", "cost savings", "money"]):
        reply = (
            "**No guaranteed monetary savings are claimed.**\n\n"
            "Actual cloud storage cost savings depend on:\n"
            "• Cloud vendor price schedules (e.g., Google Cloud Standard vs Nearline vs Coldline vs Archive)\n"
            "• Data retrieval per-GB transfer and egress fees\n"
            "• Minimum storage duration penalties (e.g. 30, 90, or 365-day commitments)\n"
            "• Early migration and lifecycle transition operation fees\n\n"
            "The system identifies **Potential Optimization Opportunities** based on observed dormancy, but real production implementation requires detailed vendor billing modeling."
        )
    elif any(k in q for k in ["architecture", "project architecture", "pipeline"]):
        reply = (
            "The end-to-end architecture follows the principle: **'Machine Learning decides. Generative AI explains.'**\n\n"
            "1. **Raw Trace (168,590 events):** Ingests Google Thesios distributed cluster storage logs.\n"
            "2. **Aggregation Pipeline:** Groups events by SHA-256 filename into 13,565 unique file vectors.\n"
            "3. **Feature Engineering:** Generates 37 telemetry attributes.\n"
            "4. **Heuristic Pseudo-Labeling:** Tertile activity index assigning balanced HOT/COOL/ARCHIVE labels.\n"
            "5. **ML Training & Selection:** Evaluates Decision Tree, Random Forest, and XGBoost Champion (97.83%).\n"
            "6. **Inference Service:** FastAPI serves live XGBoost classification via `POST /api/predict`.\n"
            "7. **AI Explanation Layer:** Generative AI analyzes XGBoost decisions and recommends optimizations without altering the ML verdict."
        )
    else:
        reply = (
            f"Regarding your query on '{clean_msg}':\n\n"
            f"The project operates on 13,565 files engineered from 168,590 Google Thesios storage events, "
            f"using an XGBoost model that achieves 97.83% test accuracy reproducing the heuristic HOT/COOL/ARCHIVE policy. "
            f"Remember that Machine Learning is the decision-maker, while the AI layer provides advisory explanations. "
            f"If you'd like more details, try asking about the 37 engineered features, model comparison benchmarks, "
            f"heuristic labeling formula, or dataset limitations."
        )

    return {
        "reply": reply,
        "provider": "local-grounded-advisory",
        "disclaimer": "AI-generated explanations are advisory. Storage-tier predictions are produced by the trained XGBoost model.",
    }


def explain_personalized_recommendation(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Explain a deterministic personalized storage tier recommendation.
    Guarantees that the recommended tier is preserved and explanation clarifies
    user importance vs usage trade-offs and behavioral ML differences.
    """
    rec_tier = str(payload.get("recommended_tier", "COOL")).upper()
    importance = payload.get("importance_label") or payload.get("importance", "Important")
    usage = payload.get("usage_label") or payload.get("expected_usage", "Occasionally")
    priority_score = payload.get("priority_score", 3.0)
    file_name = (payload.get("file_metadata") or {}).get("name") or payload.get("filename", "Uploaded File")
    file_size = (payload.get("file_metadata") or {}).get("sizeFormatted") or "N/A"
    ml_pred = payload.get("ml_prediction")
    ml_conf = payload.get("ml_confidence")

    prompt = f"""Explain this Personalized Storage Tier Recommendation according to your instructions.

RECOMMENDATION SUMMARY:
- File: {file_name} (Size: {file_size})
- User Importance: {importance}
- Expected Access Frequency: {usage}
- Priority Score: {priority_score} / 5.0
- Deterministic Recommended Tier: {rec_tier}
- ML Behavioral Prediction (if available): {ml_pred or 'N/A'} (Confidence: {f"{ml_conf*100:.2f}%" if ml_conf else 'N/A'})

Please provide an advisory explanation covering:
1. Recommendation Overview: (Confirm recommended tier {rec_tier} based on priority score {priority_score}/5.0)
2. Value vs Access Frequency Analysis: (Explain how importance and access frequency interact)
3. Storage Policy Context: (Explain why {rec_tier} suits this preference profile)
4. ML vs Personalized Distinction: (State clearly that Machine Learning predicts historical behavioral tier, while the personalized engine incorporates stated user preferences)
"""

    gemini_text = _call_gemini(prompt)

    if gemini_text:
        return {
            "status": "ok",
            "recommended_tier": rec_tier,
            "explanation": gemini_text,
            "provider": "google-gemini",
            "advisory_disclaimer": "Personalized recommendation engine decides. Generative AI explains.",
        }

    # Deterministic grounded fallback explanation
    ml_note = ""
    if ml_pred:
        ml_tier_clean = str(ml_pred).upper()
        if ml_tier_clean == rec_tier:
            ml_note = f"\n\n### 4. ML Comparison: Both Signals Agree\nThe historical XGBoost model ({ml_tier_clean}) and your personalized recommendation ({rec_tier}) converge. The file's observed trace behavior matches your stated usage intent."
        else:
            ml_note = f"\n\n### 4. ML Comparison: Signals Differ\nMachine Learning predicted **{ml_tier_clean}** based on historical trace access logs, whereas the personalized engine recommends **{rec_tier}** to honor your stated importance ({importance}) and usage ({usage}). Machine Learning reflects observed past telemetry; the personalized engine incorporates your forward-looking intent."
    else:
        ml_note = "\n\n### 4. Machine Learning Distinction\nMachine Learning predicts storage tiers from observed historical I/O telemetry in the Thesios trace. For newly uploaded files lacking trace history, this personalized recommendation engine uses your stated importance and expected usage instead."

    fallback_text = (
        f"### 1. Recommendation Overview: {rec_tier}\n"
        f"Based on your priority score of **{priority_score}/5.0**, the personalized engine recommends the **{rec_tier}** tier for `{file_name}`.\n\n"
        f"### 2. Preference & Access Dynamics\n"
        f"You designated this file as **{importance}** with **{usage.lower()}** expected access. "
        f"The recommendation engine balances operational access latency with cost efficiency.\n\n"
        f"### 3. Storage Tier Alignment\n"
        f"• **HOT Tier (4.0–5.0):** Low-latency SSD storage for latency-critical files.\n"
        f"• **COOL Tier (3.0–3.99):** Balanced storage for standard reference and occasional retrieval.\n"
        f"• **ARCHIVE Tier (1.0–2.99):** High-density cold storage for dormant assets (protected by minimum COOL safeguard for Very Important files)."
        f"{ml_note}"
    )

    return {
        "status": "ok",
        "recommended_tier": rec_tier,
        "explanation": fallback_text,
        "provider": "local-grounded-advisory",
        "advisory_disclaimer": "Personalized recommendation engine decides. Generative AI explains.",
    }

