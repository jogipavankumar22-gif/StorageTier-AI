"""
Step 3 Verification & Integration Test Script
Tests File Explorer endpoints and live XGBoost prediction using FastAPI TestClient.
"""

import sys
import urllib.request
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).parent))

from fastapi.testclient import TestClient
from backend.main import app


def test_step3():
    with TestClient(app) as client:
        print('=== 1. Testing GET /api/files pagination ===')
        r1 = client.get('/api/files?page=1&page_size=10')
        assert r1.status_code == 200
        f1 = r1.json()
        print('Total files:', f1['total'], 'Returned:', len(f1['files']), 'Total pages:', f1['total_pages'])
        assert f1['total'] == 13565
        assert len(f1['files']) == 10

        print('\n=== 2. Testing Filename Search ===')
        search_hash = '88c3b57af8'
        r2 = client.get(f'/api/files?search={search_hash}')
        assert r2.status_code == 200
        f2 = r2.json()
        print('Search matches:', f2['total'])
        assert f2['total'] >= 1
        sample_hash = f2['files'][0]['filename']
        print('Found filename:', sample_hash)

        print('\n=== 3. Testing Tier Filters ===')
        hot_res = client.get('/api/files?tier=HOT').json()
        cool_res = client.get('/api/files?tier=COOL').json()
        arch_res = client.get('/api/files?tier=ARCHIVE').json()
        print(f'HOT total: {hot_res["total"]}, COOL total: {cool_res["total"]}, ARCHIVE total: {arch_res["total"]}')
        assert hot_res['total'] == 4522
        assert cool_res['total'] == 4522
        assert arch_res['total'] == 4521

        print('\n=== 4. Testing GET /api/files/{filename} full 37-feature record ===')
        r_det = client.get(f'/api/files/{sample_hash}')
        assert r_det.status_code == 200
        detail = r_det.json()
        print('File:', detail['filename'][:20], '...')
        print('Tier:', detail['storage_tier'])
        print('Total accesses:', detail['total_accesses'])
        print('Accesses last 5 min:', detail['accesses_last_5_min'])
        print('Cache hit ratio:', detail['cache_hit_ratio'])
        print('Estimated size proxy:', detail['estimated_file_size_bytes_proxy'])
        print('Total keys in record:', len(detail))
        assert len(detail) >= 35

        print('\n=== 5. Testing POST /api/predict on HOT Sample ===')
        r_hot = client.post('/api/predict', json={'filename': '88c3b57af8192b9fef55be3308daabe6cb96f3a1e0b13cbc743dcc3ec1c0975e'})
        assert r_hot.status_code == 200
        p_hot = r_hot.json()
        print('HOT sample predicted tier:', p_hot['predicted_tier'], 'Confidence:', p_hot['confidence'])
        print('Class probabilities:', p_hot['class_probabilities'])
        assert p_hot['predicted_tier'] == 'HOT'

        print('\n=== 6. Testing POST /api/predict on ARCHIVE Sample ===')
        r_arch = client.post('/api/predict', json={'filename': 'ff17f7c93e56f5ebd99e2951c7c7978ca965a2ed5b77eb6f926cf17d6236d282'})
        assert r_arch.status_code == 200
        p_arch = r_arch.json()
        print('ARCHIVE sample predicted tier:', p_arch['predicted_tier'], 'Confidence:', p_arch['confidence'])
        print('Class probabilities:', p_arch['class_probabilities'])
        assert p_arch['predicted_tier'] == 'ARCHIVE'

        print('\n=== 7. Checking Optional Live Frontend Dev Server ===')
        try:
            with urllib.request.urlopen('http://127.0.0.1:5173/files', timeout=1) as resp:
                print('Frontend /files HTTP Status:', resp.status)
        except Exception:
            print('  (Live Vite dev server not currently running on :5173 - skipped live page request)')

        print('\n>>> ALL STEP 3 TESTS PASSED PERFECTLY! <<<')


if __name__ == '__main__':
    test_step3()
