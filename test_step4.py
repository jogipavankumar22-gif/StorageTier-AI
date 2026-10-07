"""
Step 4 Verification & Integration Test Script
Using FastAPI TestClient directly for in-memory integration testing.
"""

import os
import sys
import json
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from fastapi.testclient import TestClient
from backend.main import app

def test_step4():
    print("==================================================")
    print("STEP 4 INTEGRATION & DATA VERIFICATION TEST")
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

        # 2. Dataset Summary check
        print("\n[2] Testing GET /api/dataset/summary...")
        r = client.get("/api/dataset/summary")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        ds = r.json()
        print(f"  [OK] Unique files: {ds.get('unique_files')}")
        print(f"  [OK] Raw rows: {ds.get('raw_rows')}")
        print(f"  [OK] Engineered features: {ds.get('number_of_features')}")
        print(f"  [OK] Tier distribution: {ds.get('tier_distribution')}")
        print(f"  [OK] Known limitations count: {len(ds.get('known_limitations', []))}")
        
        assert ds.get('unique_files') == 13565
        assert ds.get('number_of_features') == 37
        assert ds.get('raw_rows') == 168590
        assert ds.get('tier_distribution', {}).get('HOT') == 4522
        assert ds.get('tier_distribution', {}).get('COOL') == 4522
        assert ds.get('tier_distribution', {}).get('ARCHIVE') == 4521
        assert len(ds.get('known_limitations', [])) >= 6

        # 3. Model Performance check
        print("\n[3] Testing GET /api/models/performance...")
        r = client.get("/api/models/performance")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        perf = r.json()
        
        models = perf.get('model_comparison', [])
        print(f"  [OK] Model comparison rows: {len(models)}")
        assert len(models) == 6, f"Expected 6 model comparison rows, got {len(models)}"
        
        # Check XGBoost Behavioral Champion
        xgb_champ = next((m for m in models if m.get('Model') == 'XGBoost' and 'Behavioral' in m.get('Feature Configuration')), None)
        assert xgb_champ is not None, "Champion XGBoost model not found"
        print(f"  [OK] Champion XGBoost test accuracy: {xgb_champ.get('Accuracy') * 100:.2f}%")
        print(f"  [OK] Champion XGBoost weighted F1: {xgb_champ.get('Weighted F1'):.4f}")
        print(f"  [OK] Champion XGBoost CV accuracy: {xgb_champ.get('CV Accuracy (Mean)') * 100:.2f}%")
        assert round(xgb_champ.get('Accuracy') * 100, 2) == 97.83
        
        # Check Random Forest Behavioral
        rf = next((m for m in models if m.get('Model') == 'Random Forest' and 'Behavioral' in m.get('Feature Configuration')), None)
        assert rf is not None
        print(f"  [OK] Random Forest test accuracy: {rf.get('Accuracy') * 100:.2f}%")
        assert round(rf.get('Accuracy') * 100, 2) == 96.46
        
        # Check Decision Tree Behavioral
        dt = next((m for m in models if m.get('Model') == 'Decision Tree' and 'Behavioral' in m.get('Feature Configuration')), None)
        assert dt is not None
        print(f"  [OK] Decision Tree test accuracy: {dt.get('Accuracy') * 100:.2f}%")
        assert round(dt.get('Accuracy') * 100, 2) == 95.21
        
        # Check Contextual XGBoost (Configuration B)
        xgb_ctx = next((m for m in models if m.get('Model') == 'XGBoost' and 'Contextual' in m.get('Feature Configuration')), None)
        assert xgb_ctx is not None
        print(f"  [OK] Contextual XGBoost test accuracy: {xgb_ctx.get('Accuracy') * 100:.2f}%")
        assert round(xgb_ctx.get('Accuracy') * 100, 2) == 76.63

        # 4. Feature Importance check
        print("\n[4] Testing GET /api/models/feature-importance...")
        r = client.get("/api/models/feature-importance")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        imp = r.json()
        
        xgb_imp = imp.get('xgboost_importance', [])
        perm_imp = imp.get('permutation_importance', [])
        print(f"  [OK] XGBoost gain importance features: {len(xgb_imp)}")
        print(f"  [OK] Permutation importance features: {len(perm_imp)}")
        assert len(xgb_imp) > 0
        assert len(perm_imp) > 0
        
        top_gain = xgb_imp[0]
        print(f"  [OK] Top XGBoost feature: {top_gain.get('feature')} ({top_gain.get('importance') * 100:.2f}%)")
        assert top_gain.get('feature') == 'accesses_last_5_min'

        # 5. Figure assets check in frontend/public/figures
        print("\n[5] Testing Static Figures in frontend/public/figures...")
        fig_dir = os.path.join("frontend", "public", "figures")
        required_figures = [
            "confusion_matrix_behavioral.png",
            "confusion_matrix_contextual.png",
            "feature_importance_xgboost.png",
            "feature_importance_random_forest.png"
        ]
        for fig in required_figures:
            path = os.path.join(fig_dir, fig)
            exists = os.path.isfile(path)
            print(f"  [OK] {fig}: {'EXISTS' if exists else 'MISSING'}")
            assert exists, f"Figure missing: {path}"

        # 6. Verify existing routes and endpoints from Steps 1-3
        print("\n[6] Regression Test: Checking Dashboard, File Explorer, and Prediction endpoints...")
        r_dash = client.get("/api/dashboard/summary")
        assert r_dash.status_code == 200
        r_tier = client.get("/api/dashboard/tier-distribution")
        assert r_tier.status_code == 200
        r_files = client.get("/api/files?page=1&limit=5")
        assert r_files.status_code == 200
        sample_file = r_files.json().get('files', [])[0].get('filename')
        r_pred = client.post("/api/predict", json={"filename": sample_file})
        assert r_pred.status_code == 200
        print(f"  [OK] Dashboard, File Explorer, and Prediction APIs all 200 OK.")
        print(f"  [OK] Predicted tier for sample file: {r_pred.json().get('predicted_tier')}")

    print("\n==================================================")
    print("ALL STEP 4 VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("==================================================")
    return True

if __name__ == "__main__":
    success = test_step4()
    sys.exit(0 if success else 1)
