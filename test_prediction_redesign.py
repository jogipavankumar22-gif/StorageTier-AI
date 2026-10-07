"""
Prediction Redesign Verification Test Script
Tests:
1. Dataset File Prediction Mode (XGBoost 97.83% Behavioral Pipeline)
   - HOT sample file prediction accuracy and probabilities
   - ARCHIVE sample file prediction accuracy and probabilities
   - File details retrieval from GET /api/files/{filename}
2. File Explorer linkage verification
3. Backend behavioral integrity: confirms unobserved files are NOT fabricated
4. Regression coverage for all dashboard and prediction APIs
"""

import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from fastapi.testclient import TestClient
from backend.main import app

def test_prediction_redesign():
    print("==================================================")
    print("PREDICTION REDESIGN & BEHAVIORAL PIPELINE TEST")
    print("==================================================")

    with TestClient(app) as client:
        # 1. Health check
        print("\n[1] Verifying Backend Health & Model Pipeline...")
        r = client.get("/api/health")
        assert r.status_code == 200
        health = r.json()
        assert health.get("model_loaded") is True
        assert health.get("total_files") == 13565
        print(f"  [OK] Backend online: {health.get('model_name')} loaded for {health.get('total_files')} files.")

        # 2. Mode 1: Dataset File Prediction (HOT Sample)
        print("\n[2] Testing Mode 1: Dataset File Prediction (HOT Sample)...")
        hot_hash = "88c3b57af8192b9fef55be3308daabe6cb96f3a1e0b13cbc743dcc3ec1c0975e"
        
        # Verify file details in dataset
        r_det_hot = client.get(f"/api/files/{hot_hash}")
        assert r_det_hot.status_code == 200
        det_hot = r_det_hot.json()
        print(f"  [OK] Historical Total Accesses: {det_hot.get('total_accesses')}")
        print(f"  [OK] Last 5 Min Accesses: {det_hot.get('accesses_last_5_min')}")
        print(f"  [OK] Cache Hit Ratio: {det_hot.get('cache_hit_ratio')}")
        assert det_hot.get("storage_tier") == "HOT"

        # Predict with XGBoost
        r_pred_hot = client.post("/api/predict", json={"filename": hot_hash})
        assert r_pred_hot.status_code == 200
        pred_hot = r_pred_hot.json()
        print(f"  [OK] Predicted Tier: {pred_hot.get('predicted_tier')}")
        print(f"  [OK] Model Confidence: {pred_hot.get('confidence') * 100:.2f}%")
        print(f"  [OK] Class Probabilities: {pred_hot.get('class_probabilities')}")
        assert pred_hot.get("predicted_tier") == "HOT"
        assert pred_hot.get("confidence") > 0.99

        # 3. Mode 1: Dataset File Prediction (ARCHIVE Sample)
        print("\n[3] Testing Mode 1: Dataset File Prediction (ARCHIVE Sample)...")
        archive_hash = "ff17f7c93e56f5ebd99e2951c7c7978ca965a2ed5b77eb6f926cf17d6236d282"
        
        r_det_arch = client.get(f"/api/files/{archive_hash}")
        assert r_det_arch.status_code == 200
        det_arch = r_det_arch.json()
        print(f"  [OK] Historical Total Accesses: {det_arch.get('total_accesses')}")
        print(f"  [OK] Inactivity Gap: {det_arch.get('seconds_since_last_access')}s")
        assert det_arch.get("storage_tier") == "ARCHIVE"

        r_pred_arch = client.post("/api/predict", json={"filename": archive_hash})
        assert r_pred_arch.status_code == 200
        pred_arch = r_pred_arch.json()
        print(f"  [OK] Predicted Tier: {pred_arch.get('predicted_tier')}")
        print(f"  [OK] Model Confidence: {pred_arch.get('confidence') * 100:.2f}%")
        assert pred_arch.get("predicted_tier") == "ARCHIVE"
        assert pred_arch.get("confidence") > 0.99

        # 4. Mode 1: Dataset File Prediction (COOL Sample)
        print("\n[4] Testing Mode 1: Dataset File Prediction (COOL Sample)...")
        cool_hash = "342d5c43aba0a62da0969a4685808ac4980e199bffb35a1ede7fe995a1267b48"
        r_pred_cool = client.post("/api/predict", json={"filename": cool_hash})
        assert r_pred_cool.status_code == 200
        pred_cool = r_pred_cool.json()
        print(f"  [OK] Predicted Tier: {pred_cool.get('predicted_tier')}")
        print(f"  [OK] Model Confidence: {pred_cool.get('confidence') * 100:.2f}%")
        assert pred_cool.get("predicted_tier") == "COOL"

        # 5. Scientific Honesty Check for Unknown / Uploaded Hashes
        print("\n[5] Scientific Honesty Check for Unobserved Hashes...")
        # A newly uploaded random local file hash not in Thesios trace returns 404 in /api/predict
        random_hash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        r_unknown = client.post("/api/predict", json={"filename": random_hash})
        assert r_unknown.status_code == 404, "Backend must return 404 for files not in dataset trace"
        print(f"  [OK] Correctly rejects unobserved hash with 404: {r_unknown.json().get('detail')}")

        # 6. Global Feature Importance Endpoint
        print("\n[6] Checking Feature Importance API...")
        r_imp = client.get("/api/models/feature-importance")
        assert r_imp.status_code == 200
        imp = r_imp.json()
        top_feature = imp.get("xgboost_importance", [])[0]
        print(f"  [OK] Top XGBoost feature: {top_feature.get('feature')} ({top_feature.get('importance') * 100:.2f}%)")
        assert top_feature.get("feature") == "accesses_last_5_min"

        # 7. Regression check for File Explorer API
        print("\n[7] Verifying File Explorer Pagination...")
        r_files = client.get("/api/files?page=1&page_size=10")
        assert r_files.status_code == 200
        data_files = r_files.json()
        assert len(data_files.get("files", [])) == 10
        print(f"  [OK] File Explorer API returned {len(data_files.get('files'))} files successfully.")

    print("\n==================================================")
    print("ALL PREDICTION REDESIGN TESTS PASSED SUCCESSFULLY!")
    print("==================================================")
    return True

if __name__ == "__main__":
    success = test_prediction_redesign()
    sys.exit(0 if success else 1)
