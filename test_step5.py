"""
Step 5 Verification & Integration Test Script
Tests:
1. GET /api/health
2. POST /api/predict (real file)
3. POST /api/ai/explain (ML prediction explanation layer)
4. POST /api/ai/chat (Project-aware research assistant)
5. GET /api/optimization/candidates (HOT->COOL and COOL->ARCHIVE)
6. POST /api/ai/explain-optimization (Optimization candidate explanation)
7. Core Architecture Rule Verification (ML is decision maker, AI does not override)
8. Regression coverage for Steps 1-4
"""

import os
import sys
import json
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from fastapi.testclient import TestClient
from backend.main import app

def test_step5():
    print("==================================================")
    print("STEP 5 INTEGRATION & VERIFICATION TEST")
    print("==================================================")

    with TestClient(app) as client:
        # 1. Health check
        print("\n[1] Testing Backend Health...")
        r = client.get("/api/health")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        health = r.json()
        print(f"  [OK] Health status: {health.get('status')}")
        print(f"  [OK] Model loaded: {health.get('model_loaded')}")
        print(f"  [OK] Total files: {health.get('total_files')}")
        assert health.get('model_loaded') is True
        assert health.get('total_files') == 13565

        # 2. Test Real File Prediction via XGBoost
        print("\n[2] Testing XGBoost Live Prediction...")
        r_files = client.get("/api/files?page=1&page_size=5")
        assert r_files.status_code == 200
        sample_file = r_files.json()["files"][0]["filename"]
        print(f"  [OK] Selected sample file: {sample_file[:24]}...")

        r_pred = client.post("/api/predict", json={"filename": sample_file})
        assert r_pred.status_code == 200, f"Expected 200, got {r_pred.status_code}"
        pred_data = r_pred.json()
        predicted_tier = pred_data.get("predicted_tier")
        confidence = pred_data.get("confidence")
        print(f"  [OK] Authoritative ML Prediction: {predicted_tier} (Confidence: {confidence * 100:.2f}%)")
        print(f"  [OK] Probabilities: {pred_data.get('class_probabilities')}")
        assert predicted_tier in ["HOT", "COOL", "ARCHIVE"]
        assert confidence > 0.0

        # 3. Test POST /api/ai/explain (Advisory layer)
        print("\n[3] Testing POST /api/ai/explain...")
        explain_payload = {
            "filename": pred_data.get("filename"),
            "predicted_tier": predicted_tier,
            "confidence": confidence,
            "class_probabilities": pred_data.get("class_probabilities"),
            "relevant_features": pred_data.get("relevant_features"),
            "important_model_features": [
                {"feature": "accesses_last_5_min", "importance": 0.3377},
                {"feature": "total_accesses", "importance": 0.0815},
                {"feature": "days_since_last_access", "importance": 0.0766},
            ],
        }
        r_exp = client.post("/api/ai/explain", json=explain_payload)
        assert r_exp.status_code == 200, f"Expected 200, got {r_exp.status_code}"
        exp_data = r_exp.json()
        print(f"  [OK] Provider: {exp_data.get('provider')}")
        print(f"  [OK] Returned predicted_tier: {exp_data.get('predicted_tier')}")
        assert exp_data.get("predicted_tier") == predicted_tier, "AI must NOT alter the ML predicted tier"
        assert len(exp_data.get("explanation", "")) > 100, "Explanation text too short"
        assert "advisory" in exp_data.get("advisory_disclaimer", "").lower()
        print(f"  [OK] Explanation snippet: {exp_data.get('explanation')[:120].strip()}...")

        # 4. Test POST /api/ai/chat (Project-aware inquiries)
        print("\n[4] Testing POST /api/ai/chat across research queries...")
        sample_queries = [
            "Why did the model classify this file as HOT?",
            "What is the difference between HOT, COOL and ARCHIVE?",
            "Why is XGBoost better than the other models?",
            "What are the most important features?",
            "What are the limitations of the dataset?",
            "How does the heuristic labeling work?",
            "Can this system guarantee cloud cost savings?",
            "Explain the project architecture.",
        ]
        for query in sample_queries:
            r_chat = client.post("/api/ai/chat", json={"message": query})
            assert r_chat.status_code == 200, f"Chat failed for '{query}': {r_chat.status_code}"
            chat_data = r_chat.json()
            reply = chat_data.get("reply", "")
            assert len(reply) > 50, f"Reply too short for '{query}'"
            print(f"  [OK] Query: '{query[:35]}...' -> Answer length: {len(reply)} chars")

        # 5. Test GET /api/optimization/candidates
        print("\n[5] Testing GET /api/optimization/candidates...")
        r_opt_hot = client.get("/api/optimization/candidates?tier_from=HOT&limit=10")
        assert r_opt_hot.status_code == 200
        hot_data = r_opt_hot.json()
        print(f"  [OK] HOT -> COOL candidates count: {hot_data.get('count')}")
        assert hot_data.get("count") > 0
        assert hot_data.get("suggested_tier") == "COOL"

        r_opt_cool = client.get("/api/optimization/candidates?tier_from=COOL&limit=10")
        assert r_opt_cool.status_code == 200
        cool_data = r_opt_cool.json()
        print(f"  [OK] COOL -> ARCHIVE candidates count: {cool_data.get('count')}")
        assert cool_data.get("count") > 0
        assert cool_data.get("suggested_tier") == "ARCHIVE"

        # Check candidate fields
        sample_cand = hot_data.get("candidates", [])[0]
        required_cand_fields = [
            "filename", "current_tier", "suggested_tier", "total_accesses",
            "seconds_since_last_access", "cache_hit_ratio", "estimated_file_size_bytes_proxy", "reason"
        ]
        for f in required_cand_fields:
            assert f in sample_cand, f"Missing candidate field: {f}"
        print(f"  [OK] Candidate fields verified: {sample_cand.get('filename')[:20]}... -> {sample_cand.get('suggested_tier')}")

        # 6. Test POST /api/ai/explain-optimization
        print("\n[6] Testing POST /api/ai/explain-optimization...")
        r_opt_exp = client.post("/api/ai/explain-optimization", json=sample_cand)
        assert r_opt_exp.status_code == 200
        opt_exp_data = r_opt_exp.json()
        print(f"  [OK] Optimization explanation length: {len(opt_exp_data.get('explanation', ''))} chars")
        print(f"  [OK] Disclaimer: {opt_exp_data.get('disclaimer')}")
        assert "actual cost savings depend" in opt_exp_data.get("disclaimer", "").lower()
        assert opt_exp_data.get("current_tier") == sample_cand.get("current_tier")
        assert opt_exp_data.get("suggested_tier") == sample_cand.get("suggested_tier")

        # 7. Regression check for existing endpoints (Steps 1-4)
        print("\n[7] Regression Test: Checking Dashboard, Dataset, and Model Performance APIs...")
        r_dash = client.get("/api/dashboard/summary")
        assert r_dash.status_code == 200
        assert r_dash.json().get("total_files") == 13565

        r_ds = client.get("/api/dataset/summary")
        assert r_ds.status_code == 200
        assert r_ds.json().get("number_of_features") == 37

        r_perf = client.get("/api/models/performance")
        assert r_perf.status_code == 200
        assert len(r_perf.json().get("model_comparison", [])) == 6

        r_imp = client.get("/api/models/feature-importance")
        assert r_imp.status_code == 200
        assert r_imp.json().get("xgboost_importance", [])[0]["feature"] == "accesses_last_5_min"
        print(f"  [OK] All regression endpoints return 200 OK with authentic Stage 1-4 metrics.")

    print("\n==================================================")
    print("ALL STEP 5 VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("==================================================")
    return True

if __name__ == "__main__":
    success = test_step5()
    sys.exit(0 if success else 1)
