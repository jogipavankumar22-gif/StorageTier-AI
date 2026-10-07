import json
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi.testclient import TestClient
from backend.main import app

def run_tests():
    with TestClient(app) as client:
        print("==================== 1. /api/health ====================")
        r1 = client.get("/api/health")
        print(f"Status: {r1.status_code}")
        print(json.dumps(r1.json(), indent=2))
        assert r1.status_code == 200
        assert r1.json()["status"] == "ok"

        print("\n==================== 2. /api/dashboard/summary ====================")
        r2 = client.get("/api/dashboard/summary")
        print(f"Status: {r2.status_code}")
        print(json.dumps(r2.json(), indent=2))
        assert r2.status_code == 200
        assert r2.json()["total_files"] == 13565

        print("\n==================== 3. /api/dashboard/tier-distribution ====================")
        r3 = client.get("/api/dashboard/tier-distribution")
        print(f"Status: {r3.status_code}")
        td = r3.json()
        print("Tiers:", json.dumps(td["tier_distribution"], indent=2))
        print("IO Zones:", json.dumps(td["io_zone_distribution"], indent=2))
        print("Access bins count:", len(td["access_frequency_bins"]))
        print("Cache bins count:", len(td["cache_hit_distribution"]))
        print("App breakdown count:", len(td["application_distribution"]))
        assert r3.status_code == 200

        print("\n==================== 4. /api/files (pagination & search) ====================")
        r4 = client.get("/api/files?page=1&page_size=5&sort_by=total_accesses&sort_desc=true")
        print(f"Status: {r4.status_code}")
        data4 = r4.json()
        print(f"Total: {data4['total']}, Page: {data4['page']}/{data4['total_pages']}, Returned: {len(data4['files'])}")
        sample_file = data4["files"][0]["filename"]
        print(f"Sample filename: {sample_file}")
        assert r4.status_code == 200
        assert len(data4["files"]) == 5

        # Test filtering by tier
        r4_cool = client.get("/api/files?page=1&page_size=3&tier=COOL")
        print(f"Filtered by COOL status: {r4_cool.status_code}, total COOL: {r4_cool.json()['total']}")
        assert r4_cool.status_code == 200
        assert r4_cool.json()["total"] == 4522

        print("\n==================== 5. /api/files/{filename} ====================")
        r5 = client.get(f"/api/files/{sample_file}")
        print(f"Status: {r5.status_code}")
        file_record = r5.json()
        print(f"Filename: {file_record['filename']}")
        print(f"Storage Tier: {file_record['storage_tier']}")
        print(f"Total Accesses: {file_record['total_accesses']}")
        print(f"Cache Hit Ratio: {file_record['cache_hit_ratio']}")
        print(f"File Size Proxy: {file_record['estimated_file_size_bytes_proxy']}")
        assert r5.status_code == 200
        assert file_record["filename"] == sample_file

        print("\n==================== 6. /api/models/performance ====================")
        r6 = client.get("/api/models/performance")
        print(f"Status: {r6.status_code}")
        pdata = r6.json()
        print("Best model:", json.dumps(pdata["best_model"], indent=2))
        print("Models summary:", json.dumps(pdata["models_summary"], indent=2))
        print("Model comparison rows:", len(pdata["model_comparison"]))
        assert r6.status_code == 200
        assert "XGBoost (Best Model)" in pdata["models_summary"]

        print("\n==================== 7. /api/models/feature-importance ====================")
        r7 = client.get("/api/models/feature-importance")
        print(f"Status: {r7.status_code}")
        fi = r7.json()
        print("Top 5 XGBoost features:", json.dumps(fi["xgboost_importance"][:5], indent=2))
        print("Top 5 Permutation features:", json.dumps(fi["permutation_importance"][:5], indent=2))
        assert r7.status_code == 200
        assert len(fi["xgboost_importance"]) > 0

        print("\n==================== 8. /api/dataset/summary ====================")
        r8 = client.get("/api/dataset/summary")
        print(f"Status: {r8.status_code}")
        dsummary = r8.json()
        print(f"Files: {dsummary['unique_files']}, Features: {dsummary['number_of_features']}")
        print("Tier distribution:", json.dumps(dsummary["tier_distribution"], indent=2))
        print("Known limitations count:", len(dsummary["known_limitations"]))
        assert r8.status_code == 200
        assert dsummary["number_of_features"] == 37

        print("\n==================== 9. /api/predict (real inference) ====================")
        r9 = client.post("/api/predict", json={"filename": sample_file})
        print(f"Status: {r9.status_code}")
        pred = r9.json()
        print(f"Predicted Tier: {pred['predicted_tier']}, Confidence: {pred['confidence']}")
        print("Probabilities:", json.dumps(pred["class_probabilities"], indent=2))
        print("Relevant features preview:", json.dumps({k: pred["relevant_features"][k] for k in list(pred["relevant_features"])[:5]}, indent=2))
        assert r9.status_code == 200
        assert pred["predicted_tier"] in ["HOT", "COOL", "ARCHIVE"]

        print("\n==================== 10. /api/optimization/candidates ====================")
        r10 = client.get("/api/optimization/candidates?tier_from=HOT&limit=3")
        print(f"Status: {r10.status_code}")
        opt = r10.json()
        print(f"Category: {opt['category']}")
        print(f"From: {opt['tier_from']} -> To: {opt['suggested_tier']}")
        print("Sample candidate:", json.dumps(opt["candidates"][0], indent=2))
        assert r10.status_code == 200
        assert opt["category"] == "Potential Optimization Opportunities"
        assert len(opt["candidates"]) == 3

        print("\n>>> ALL 10 TESTS PASSED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    run_tests()
