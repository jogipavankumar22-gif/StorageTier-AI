"""
Personalized Storage Tier Recommendation Automated Test Suite
Verifies:
1. Deterministic Rule Engine (backend/recommendation_service.py)
   - VERY IMPORTANT + VERY FREQUENTLY -> HOT (Priority Score 5.0)
   - VERY IMPORTANT + ALMOST NEVER -> COOL (Priority Score 3.0, Minimum COOL Safeguard)
   - IMPORTANT + FREQUENTLY -> HOT (Priority Score 4.0)
   - IMPORTANT + OCCASIONALLY -> COOL (Priority Score 3.5)
   - LESS IMPORTANT + RARELY -> ARCHIVE (Priority Score 2.0)
   - LEAST IMPORTANT + ALMOST NEVER -> ARCHIVE (Priority Score 1.0)
2. Priority Score calculation accuracy: (Importance + Usage) / 2.0
3. Safety Safeguard enforcement: VERY IMPORTANT files NEVER assigned to ARCHIVE
4. FastAPI Endpoint POST /api/recommendation/personalized (200 OK)
   - Uploaded file (without ML prediction)
   - Dataset file comparison (with ML prediction, signals_agree test)
5. Advisory AI Explanation Endpoint POST /api/ai/explain-recommendation (200 OK)
6. Regression check: ML behavioral model (XGBoost 97.83%) and GET /api/health remain intact
"""

import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).parent))

from fastapi.testclient import TestClient
from backend.main import app
from backend.recommendation_service import (
    calculate_personalized_recommendation,
    IMPORTANCE_SCORES,
    USAGE_SCORES,
)


def test_personalized_recommendation_unit():
    print("==================================================")
    print("PERSONALIZED RECOMMENDATION UNIT TESTS")
    print("==================================================")

    # Test 1: VERY IMPORTANT + VERY FREQUENTLY -> HOT (5.0)
    print("\n[1] Testing VERY IMPORTANT + VERY FREQUENTLY...")
    res1 = calculate_personalized_recommendation(
        importance="VERY IMPORTANT",
        expected_usage="VERY FREQUENTLY",
    )
    assert res1["recommended_tier"] == "HOT"
    assert res1["priority_score"] == 5.0
    assert res1["safeguard_applied"] is False
    print(f"  [OK] Tier: {res1['recommended_tier']}, Score: {res1['priority_score']}, Safeguard: {res1['safeguard_applied']}")

    # Test 2: VERY IMPORTANT + ALMOST NEVER -> COOL (3.0, safeguard active)
    print("\n[2] Testing VERY IMPORTANT + ALMOST NEVER (Minimum COOL safeguard)...")
    res2 = calculate_personalized_recommendation(
        importance="VERY IMPORTANT",
        expected_usage="ALMOST NEVER",
    )
    assert res2["recommended_tier"] == "COOL"
    assert res2["priority_score"] == 3.0
    assert res2["safeguard_applied"] is True
    print(f"  [OK] Tier: {res2['recommended_tier']}, Score: {res2['priority_score']}, Safeguard: {res2['safeguard_applied']}")

    # Test 3: IMPORTANT + FREQUENTLY -> HOT (4.0)
    print("\n[3] Testing IMPORTANT + FREQUENTLY...")
    res3 = calculate_personalized_recommendation(
        importance="IMPORTANT",
        expected_usage="FREQUENTLY",
    )
    assert res3["recommended_tier"] == "HOT"
    assert res3["priority_score"] == 4.0
    assert res3["safeguard_applied"] is False
    print(f"  [OK] Tier: {res3['recommended_tier']}, Score: {res3['priority_score']}, Safeguard: {res3['safeguard_applied']}")

    # Test 4: IMPORTANT + OCCASIONALLY -> COOL (3.5)
    print("\n[4] Testing IMPORTANT + OCCASIONALLY...")
    res4 = calculate_personalized_recommendation(
        importance="IMPORTANT",
        expected_usage="OCCASIONALLY",
    )
    assert res4["recommended_tier"] == "COOL"
    assert res4["priority_score"] == 3.5
    assert res4["safeguard_applied"] is False
    print(f"  [OK] Tier: {res4['recommended_tier']}, Score: {res4['priority_score']}, Safeguard: {res4['safeguard_applied']}")

    # Test 5: LESS IMPORTANT + RARELY -> ARCHIVE (2.0)
    print("\n[5] Testing LESS IMPORTANT + RARELY...")
    res5 = calculate_personalized_recommendation(
        importance="LESS IMPORTANT",
        expected_usage="RARELY",
    )
    assert res5["recommended_tier"] == "ARCHIVE"
    assert res5["priority_score"] == 2.0
    assert res5["safeguard_applied"] is False
    print(f"  [OK] Tier: {res5['recommended_tier']}, Score: {res5['priority_score']}, Safeguard: {res5['safeguard_applied']}")

    # Test 6: LEAST IMPORTANT + ALMOST NEVER -> ARCHIVE (1.0)
    print("\n[6] Testing LEAST IMPORTANT + ALMOST NEVER...")
    res6 = calculate_personalized_recommendation(
        importance="LEAST IMPORTANT",
        expected_usage="ALMOST NEVER",
    )
    assert res6["recommended_tier"] == "ARCHIVE"
    assert res6["priority_score"] == 1.0
    assert res6["safeguard_applied"] is False
    print(f"  [OK] Tier: {res6['recommended_tier']}, Score: {res6['priority_score']}, Safeguard: {res6['safeguard_applied']}")

    # Test 7: Exhaustive Safeguard Verification: VERY IMPORTANT files NEVER ARCHIVE
    print("\n[7] Exhaustive Safeguard Verification across ALL usage levels for VERY IMPORTANT...")
    for usage_key in USAGE_SCORES:
        res = calculate_personalized_recommendation(
            importance="VERY IMPORTANT",
            expected_usage=usage_key,
        )
        assert res["recommended_tier"] in ("HOT", "COOL"), f"Failed: {usage_key} yielded {res['recommended_tier']}"
        assert res["recommended_tier"] != "ARCHIVE"
    print("  [OK] Safeguard verified: VERY IMPORTANT is NEVER assigned to ARCHIVE for any usage level.")


def test_personalized_recommendation_integration():
    print("\n==================================================")
    print("FASTAPI API INTEGRATION TESTS")
    print("==================================================")

    with TestClient(app) as client:
        # 1. Health check regression
        print("\n[1] Verifying Backend Health...")
        r_health = client.get("/api/health")
        assert r_health.status_code == 200
        data_health = r_health.json()
        assert data_health["model_loaded"] is True
        assert data_health["total_files"] == 13565
        print(f"  [OK] Health: status={data_health['status']}, model={data_health['model_name']}, files={data_health['total_files']}")

        # 2. POST /api/recommendation/personalized for local uploaded file
        print("\n[2] Testing POST /api/recommendation/personalized (Uploaded Local File)...")
        payload_upload = {
            "importance": "IMPORTANT",
            "expected_usage": "OCCASIONALLY",
            "file_metadata": {
                "name": "annual_financial_report_2025.pdf",
                "size_formatted": "3.8 MB",
                "extension": ".pdf",
                "sha256": "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a"
            }
        }
        r_rec = client.post("/api/recommendation/personalized", json=payload_upload)
        assert r_rec.status_code == 200
        rec_data = r_rec.json()
        assert rec_data["recommended_tier"] == "COOL"
        assert rec_data["priority_score"] == 3.5
        assert rec_data["importance"] == "IMPORTANT"
        assert rec_data["expected_usage"] == "OCCASIONALLY"
        assert rec_data["comparison_with_ml"] is None
        print(f"  [OK] Recommended Tier: {rec_data['recommended_tier']}, Priority Score: {rec_data['priority_score']}/5.0")
        print(f"  [OK] Rationale: {rec_data['reason']}")

        # 3. POST /api/recommendation/personalized with Dataset File ML Comparison (Signals Differ)
        print("\n[3] Testing POST /api/recommendation/personalized with ML Comparison (Signals Differ)...")
        payload_diff = {
            "importance": "VERY IMPORTANT",
            "expected_usage": "ALMOST NEVER",
            "file_metadata": {
                "name": "archive_file_test.bin"
            },
            "ml_prediction": "ARCHIVE",
            "ml_confidence": 0.9998
        }
        r_diff = client.post("/api/recommendation/personalized", json=payload_diff)
        assert r_diff.status_code == 200
        diff_data = r_diff.json()
        assert diff_data["recommended_tier"] == "COOL"  # Safeguard kicked in
        assert diff_data["safeguard_applied"] is True
        assert diff_data["comparison_with_ml"] is not None
        assert diff_data["comparison_with_ml"]["signals_agree"] is False
        assert diff_data["comparison_with_ml"]["ml_predicted_tier"] == "ARCHIVE"
        assert diff_data["comparison_with_ml"]["personalized_recommended_tier"] == "COOL"
        print(f"  [OK] ML Tier: ARCHIVE vs Personalized: COOL -> signals_agree: {diff_data['comparison_with_ml']['signals_agree']}")
        print(f"  [OK] Comparison summary: {diff_data['comparison_with_ml']['summary']}")

        # 4. POST /api/recommendation/personalized with Dataset File ML Comparison (Signals Agree)
        print("\n[4] Testing POST /api/recommendation/personalized with ML Comparison (Signals Agree)...")
        payload_agree = {
            "importance": "VERY IMPORTANT",
            "expected_usage": "VERY FREQUENTLY",
            "file_metadata": {
                "name": "hot_file_test.bin"
            },
            "ml_prediction": "HOT",
            "ml_confidence": 0.9999
        }
        r_agree = client.post("/api/recommendation/personalized", json=payload_agree)
        assert r_agree.status_code == 200
        agree_data = r_agree.json()
        assert agree_data["recommended_tier"] == "HOT"
        assert agree_data["comparison_with_ml"]["signals_agree"] is True
        print(f"  [OK] ML Tier: HOT vs Personalized: HOT -> signals_agree: {agree_data['comparison_with_ml']['signals_agree']}")

        # 5. POST /api/ai/explain-recommendation
        print("\n[5] Testing POST /api/ai/explain-recommendation...")
        payload_explain = {
            "recommendation": diff_data,
            "file_metadata": payload_diff["file_metadata"],
            "ml_prediction": "ARCHIVE",
            "ml_confidence": 0.9998
        }
        r_exp = client.post("/api/ai/explain-recommendation", json=payload_explain)
        assert r_exp.status_code == 200
        exp_data = r_exp.json()
        assert exp_data["status"] == "ok"
        assert len(exp_data["explanation"]) > 100
        assert "COOL" in exp_data["explanation"]
        assert "ARCHIVE" in exp_data["explanation"]
        print(f"  [OK] Provider: {exp_data.get('provider')}")
        print(f"  [OK] Explanation length: {len(exp_data['explanation'])} chars")
        print(f"  [OK] First 120 chars: {exp_data['explanation'][:120]}...")

        # 6. ML Behavioral Model Regression
        print("\n[6] ML Behavioral Prediction Regression (POST /api/predict)...")
        hot_hash = "88c3b57af8192b9fef55be3308daabe6cb96f3a1e0b13cbc743dcc3ec1c0975e"
        r_pred = client.post("/api/predict", json={"filename": hot_hash})
        assert r_pred.status_code == 200
        pred_res = r_pred.json()
        assert pred_res["predicted_tier"] == "HOT"
        assert pred_res["confidence"] > 0.99
        print(f"  [OK] XGBoost predicted {pred_res['predicted_tier']} with {pred_res['confidence']*100:.2f}% confidence.")

    print("\n==================================================")
    print("ALL PERSONALIZED RECOMMENDATION TESTS PASSED (100%)!")
    print("==================================================")


if __name__ == "__main__":
    test_personalized_recommendation_unit()
    test_personalized_recommendation_integration()
