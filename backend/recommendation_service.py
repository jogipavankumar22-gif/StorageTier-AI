"""
Personalized Storage Tier Recommendation Service
Stage 5 Enhancement: User Preference & Stated Intent Engine

Core Architecture Principle:
- Machine Learning predicts based on observed historical behavior (XGBoost 97.83%).
- Personalized recommendation uses user-stated importance and expected usage.
- Generative AI explains the result but does not make or override the decision.
- Personalized recommendation engine decides. Generative AI explains.
"""

from typing import Any, Dict, Optional

IMPORTANCE_SCORES = {
    "VERY IMPORTANT": 5,
    "IMPORTANT": 4,
    "MODERATELY USEFUL": 3,
    "LESS IMPORTANT": 2,
    "LEAST IMPORTANT": 1,
}

USAGE_SCORES = {
    "VERY FREQUENTLY": 5,
    "FREQUENTLY": 4,
    "OCCASIONALLY": 3,
    "RARELY": 2,
    "ALMOST NEVER": 1,
}

IMPORTANCE_LABELS = {
    "VERY IMPORTANT": "Very Important",
    "IMPORTANT": "Important",
    "MODERATELY USEFUL": "Moderately Useful",
    "LESS IMPORTANT": "Less Important",
    "LEAST IMPORTANT": "Least Important",
}

USAGE_LABELS = {
    "VERY FREQUENTLY": "Very Frequently",
    "FREQUENTLY": "Frequently",
    "OCCASIONALLY": "Occasionally",
    "RARELY": "Rarely",
    "ALMOST NEVER": "Almost Never",
}


def calculate_personalized_recommendation(
    importance: str,
    expected_usage: str,
    file_metadata: Optional[Dict[str, Any]] = None,
    ml_prediction: Optional[str] = None,
    ml_confidence: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Deterministic rule-based recommendation combining User Importance and Expected Usage.

    Scoring:
      importance_score: 1 to 5
      usage_score: 1 to 5
      priority_score: (importance_score + usage_score) / 2

    Tiers:
      4.0 - 5.0 -> HOT
      3.0 - 3.99 -> COOL
      1.0 - 2.99 -> ARCHIVE

    Safety Override:
      If importance == 'VERY IMPORTANT', minimum recommended tier is COOL (never ARCHIVE).
    """
    imp_key = str(importance).strip().upper()
    use_key = str(expected_usage).strip().upper()

    imp_score = IMPORTANCE_SCORES.get(imp_key, 3)
    use_score = USAGE_SCORES.get(use_key, 3)

    priority_score = round((imp_score + use_score) / 2.0, 2)

    # Initial mapping based on priority score
    if priority_score >= 4.0:
        recommended_tier = "HOT"
    elif priority_score >= 3.0:
        recommended_tier = "COOL"
    else:
        recommended_tier = "ARCHIVE"

    # Safety Override Rule:
    # If file is VERY IMPORTANT, it must never be demoted to ARCHIVE.
    # When usage is low (RARELY or ALMOST NEVER), the safeguard protects the asset with a minimum tier of COOL.
    safeguard_applied = False
    if imp_key == "VERY IMPORTANT":
        if recommended_tier == "ARCHIVE":
            recommended_tier = "COOL"
            safeguard_applied = True
        elif use_score <= 2:
            safeguard_applied = True

    # Build dynamic rationale
    imp_label = IMPORTANCE_LABELS.get(imp_key, importance)
    use_label = USAGE_LABELS.get(use_key, expected_usage)

    if recommended_tier == "HOT":
        reason = (
            f"Your file is marked as {imp_label} and expected to be accessed {use_label.lower()}. "
            f"With a priority score of {priority_score}/5.0, HOT storage is recommended to ensure "
            f"instant, low-latency access and uninterrupted workload availability."
        )
    elif recommended_tier == "COOL":
        if safeguard_applied:
            reason = (
                f"Safety Policy Override: Although expected usage is {use_label.lower()}, the file is marked as "
                f"VERY IMPORTANT. To protect critical assets from high retrieval latency and archive restore fees, "
                f"the policy enforces a minimum tier of COOL."
            )
        else:
            reason = (
                f"Your file is marked as {imp_label} with {use_label.lower()} expected access. "
                f"With a priority score of {priority_score}/5.0, COOL storage provides an optimal balance "
                f"between reliable accessibility and cost efficiency."
            )
    else:  # ARCHIVE
        reason = (
            f"Your file is marked as {imp_label} with {use_label.lower()} expected access. "
            f"With a priority score of {priority_score}/5.0, ARCHIVE tier is recommended for "
            f"long-term, cost-effective storage of dormant or secondary assets."
        )

    # ML Comparison Analysis (if behavioral prediction is supplied)
    comparison = None
    if ml_prediction:
        ml_tier_clean = str(ml_prediction).strip().upper()
        signals_agree = ml_tier_clean == recommended_tier
        if signals_agree:
            comp_message = (
                f"Both signals agree on {recommended_tier}. The historical access behavior in the trace "
                f"and your stated usage preference align perfectly."
            )
        else:
            comp_message = (
                f"Signals differ: Behavioral XGBoost predicts {ml_tier_clean} based on historical trace events, "
                f"whereas your personalized preference recommends {recommended_tier} based on stated importance and expected usage."
            )

        comparison = {
            "ml_predicted_tier": ml_tier_clean,
            "ml_confidence": ml_confidence,
            "personalized_recommended_tier": recommended_tier,
            "signals_agree": signals_agree,
            "summary": comp_message,
        }

    return {
        "recommended_tier": recommended_tier,
        "importance": imp_key,
        "importance_label": imp_label,
        "importance_score": imp_score,
        "expected_usage": use_key,
        "usage_label": use_label,
        "usage_score": use_score,
        "priority_score": priority_score,
        "reason": reason,
        "safeguard_applied": safeguard_applied,
        "policy": "personalized_preference_rules",
        "comparison_with_ml": comparison,
        "disclaimer": (
            "Personalized storage tier recommendation is a deterministic policy derived from user-stated "
            "importance and expected usage. It is not an ML model prediction and does not claim accuracy "
            "against real cloud billing schedules."
        ),
    }
