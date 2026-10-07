# Stage 2 Validation Report: Feature Engineering & Target Label Design

**Project:** Intelligent Cloud Storage Tier Predictor Using Machine Learning  
**Raw Dataset:** `data/raw/thesios_storage_trace.csv` (Google Thesios Storage Trace)  
**Processed Dataset:** `data/processed/file_level_features.csv`  
**Data Dictionary:** `data/processed/DATA_DICTIONARY.md`  
**Methodology:** `data/processed/TIER_LABELING_METHODOLOGY.md`  
**Execution Date:** October 2026  
**Status:** Stage 2 Complete — File-Level Dataset & Target Labels Ready for ML Modeling  

---

## 1. Executive Summary & Core Metrics

Stage 2 successfully transformed the granular, event-level Google Thesios storage trace into a robust, 100% clean, file-level machine learning dataset.

| Metric | Raw Trace | Processed File-Level Dataset |
| :--- | :--- | :--- |
| **Record Count** | 168,590 I/O access events | **13,565 unique file entities** |
| **Number of Columns** | 17 raw telemetry fields | **37 engineered features** |
| **Missing Values** | 0 missing values (100% complete) | **0 missing values (100% complete)** |
| **Duplicate Records** | 0 duplicate rows | **0 duplicate rows (unique filename key)** |
| **Observation Window** | 861.38 seconds (14.36 minutes) | Aggregated over entire 861.38s trace |
| **Creation Span Covered** | 902.55 days (2.47 years) | Preserved per file (`file_age_days`) |
| **Target Variable** | None (Raw cluster `io_zone` is biased) | **`storage_tier` (`HOT`, `COOL`, `ARCHIVE`)** |
| **Class Balance** | N/A | **33.34% HOT / 33.34% COOL / 33.33% ARCHIVE** |

---

## 2. File-Level Aggregation Pipeline

The aggregation script (`src/data/create_file_dataset.py`) read the immutable raw CSV `data/raw/thesios_storage_trace.csv` and grouped records by `filename`.

### Generated Features Overview (37 Total Features)

```
IDENTIFICATION (2):
├── filename (Unique 64-character SHA-256 string)
└── application (Dominant client workload, e.g. spanner, bigtable, blobstore)

ACCESS VOLUME & COUNTS (9):
├── total_accesses (Count of all I/O events per file: 1 to 4,210)
├── read_count (Total READ operations per file)
├── write_count (Total WRITE operations per file)
├── read_ratio (reads / total_accesses: 0.0 to 1.0)
├── unique_access_days (Distinct calendar days accessed: 1 day in trace)
├── accesses_last_7_days (Accesses within last 7 days of trace cutoff: = total_accesses)
├── accesses_last_30_days (Accesses within last 30 days of trace cutoff: = total_accesses)
├── accesses_last_5_min (Accesses in the final 300 seconds of the trace)
└── access_frequency (Request rate normalized to req/min: 0.0697 to 293.25)

TEMPORAL INTERVALS & RECENCY (6):
├── average_access_interval (Mean consecutive request gap in seconds: 0.0s for N=1)
├── median_access_interval (Median consecutive request gap in seconds)
├── days_since_last_access (Time elapsed to trace end in fractional days: 0 to 0.00997d)
├── seconds_since_last_access (Time elapsed to trace end in seconds: 0 to 861.28s)
├── first_access_timestamp (Unix epoch time of first observed request)
└── last_access_timestamp (Unix epoch time of last observed request)

FILE AGE & LIFETIME (3):
├── file_age_days (Calendar days elapsed from creation c_time: 0.000016 to 902.55d)
├── activity_span_days (Time span between first and last request in days)
└── activity_span_seconds (Time span between first and last request in seconds: 0 to 860.12s)

I/O VOLUME & TRANSFER SIZE (7):
├── average_request_io_size (Mean request payload size in bytes)
├── median_request_io_size (Median request payload size in bytes)
├── total_request_io_bytes (Cumulative bytes requested: 50 B to 109.3 MB)
├── average_response_io_size (Mean response payload returned to client in bytes)
├── total_response_io_bytes (Cumulative bytes returned to client in bytes)
├── average_disk_io_size (Mean physical disk media transfer size in bytes)
└── total_disk_io_bytes (Cumulative bytes transferred to physical disk media)

CACHE PERFORMANCE (4):
├── cache_hit_count (Number of read requests served from DRAM cache)
├── cache_miss_count (Number of read requests that missed cache)
├── cache_hit_ratio (cache_hits / total_reads: 0.0 to 1.0)
└── flash_cache_ratio (Proportion of requests served from SSD flash tier)

STORAGE INFRASTRUCTURE & QOS (3):
├── dominant_io_zone (Predominant cluster zone: WARM, COLD, UNKNOWN)
├── dominant_service_class (QoS profile: THROUGHPUT_ORIENTED, LATENCY_SENSITIVE, OTHER)
└── dominant_redundancy_type (Data protection: REPLICATED vs ERASURE_CODED)

FILE SIZE PROXY (1):
└── estimated_file_size_bytes_proxy (max(file_offset + request_size): 72 B to 67.2 MB)

TARGET LABEL & CONTINUOUS INDEX (2):
├── activity_score (Multi-criteria continuous score: 0.0908 to 0.9660)
└── storage_tier (Categorical Target Label: HOT, COOL, ARCHIVE)
```

---

## 3. Investigation Findings: File Size and File Type

### 3.1 File Size Investigation
* **Question:** Can actual file size be reliably calculated from `file_offset`, `request_io_size_bytes`, `response_io_size_bytes`, and `disk_io_size_bytes`?
* **Finding:** In storage block/chunk access traces, file size **cannot be definitively known in its entirety** without filesystem inode stat metadata. If a 100 MB file only has its first 5 MB accessed during the trace, the remaining 95 MB is unobservable.
* **Engineering Solution:** We do **NOT fabricate** synthetic sizes. Instead, we compute an honest, mathematically sound **lower-bound proxy**:
  $$\text{estimated\_file\_size\_bytes\_proxy} = \max_{j \in \text{File}}(\text{file\_offset}_j + \text{request\_io\_size\_bytes}_j)$$
  Across all 13,565 files, this ranges from **72 bytes** to **67,239,936 bytes (~64.12 MB)** with a median of **6,303,744 bytes (~6.01 MB)**. It is explicitly named and documented as a proxy feature.

### 3.2 File Type Investigation
* **Question:** Does the dataset contain an actual file extension/type?
* **Finding:** Zero out of 168,590 rows and zero out of 13,565 unique filenames contain an extension dot (`.`). All filenames are 64-character SHA-256 hexadecimal hash digests.
* **Formal Statement:**
  > **"File type is not reliably available from the current trace."**
* **Engineering Action:** We strictly **refuse to fabricate fake PDF, JPG, MP4, or TXT extensions**. Workload context is legitimately represented via the `application` column (`spanner`, `bigtable`, `blobstore`, and anonymized enterprise service hashes).

---

## 4. Target Labeling Methodology & Class Distribution

### 4.1 Ground-Truth Design Principles
1. **Never use raw `io_zone` as the target:** The raw trace contains `io_zone` (`WARM` 94.7%, `COLD` 5.0%, `UNKNOWN` 0.3%). Using this would introduce severe circular bias and 95% class imbalance.
2. **Transparent Multi-Criteria Scoring:** Combines four orthogonal access dimensions:
   * **Access Volume (40%):** Percentile rank of `total_accesses`
   * **Recency Decay (30%):** Inverted percentile rank of `seconds_since_last_access`
   * **Duration Span (15%):** Percentile rank of `activity_span_seconds`
   * **Caching Factor (15%):** Percentile rank of `cache_hit_ratio`
3. **Data-Driven Tertile Cutoffs:**
   * $\tau_1 = \mathbf{0.4061}$ (33.33rd percentile)
   * $\tau_2 = \mathbf{0.6027}$ (66.67th percentile)

### 4.2 Class Distribution Report

```
┌────────────────────────────────────────────────────────────────────────┐
│                        STORAGE TIER DISTRIBUTION                       │
├─────────────┬─────────────┬──────────────┬─────────────────────────────┤
│ Tier Name   │ File Count  │ Percentage   │ Storage Policy Semantics    │
├─────────────┼─────────────┼──────────────┼─────────────────────────────┤
│ 🔥 HOT      │    4,522    │    33.34%    │ High IOPS, SSD/NVMe, Memory │
│ 🌤️ COOL     │    4,522    │    33.34%    │ Infrequent access, EC parity│
│ ❄️ ARCHIVE  │    4,521    │    33.33%    │ High density, deep storage  │
├─────────────┼─────────────┼──────────────┼─────────────────────────────┤
│ TOTAL       │   13,565    │   100.00%    │ Zero Class Imbalance (1:1:1)│
└─────────────┴─────────────┴──────────────┴─────────────────────────────┘
```

### 4.3 Behavioral Separation Across Tiers

The three classes exhibit distinctly separated physical access behavior:

| Characteristic | 🔥 HOT Tier | 🌤️ COOL Tier | ❄️ ARCHIVE Tier |
| :--- | :---: | :---: | :---: |
| **Total Accesses (Median / Mean)** | **16.0 / 27.96** | **4.0 / 7.76** | **1.0 / 1.57** |
| **Access Frequency (Median)** | **1.114 req/min** | **0.279 req/min** | **0.070 req/min** |
| **Inactivity Window (Median)** | **221.1 seconds** | **475.4 seconds** | **553.6 seconds** |
| **Activity Duration (Median)** | **4.04 seconds** | **0.06 seconds** | **0.00 seconds** |
| **Cache Hit Ratio (Median)** | **39.3%** | **36.4%** | **0.0%** |
| **File Age (Median)** | **0.04 days** (~58 min) | **0.68 days** (~16.3 hrs) | **1.05 days** (~25.2 hrs) |

---

## 5. Visual Validation & Distribution Charts

Seven high-resolution (300 DPI) distribution figures have been saved under `reports/figures/`:

1. **`1_access_frequency_distribution.png`**: Shows log-scale request velocity per minute, highlighting the distinct tail separating high-frequency hot files from baseline traffic.
2. **`2_days_since_last_access_distribution.png`**: Displays the inactivity distribution (`seconds_since_last_access`), demonstrating smooth recency decay up to the 861.38-second mark.
3. **`3_total_access_count_distribution.png`**: Log-log histogram showing the classic power-law / Pareto distribution of file touches.
4. **`4_accesses_last_30_days_distribution.png`**: Boxplot contrasting request volumes across the three target tiers.
5. **`5_file_age_distribution.png`**: Log-scale histogram of `file_age_days` from newly generated files (minutes old) up to multi-year archives (902 days).
6. **`6_cache_hit_ratio_distribution.png`**: Shows bimodal caching behavior (un-cached disk reads at 0.0 vs. cached read bursts at 0.5–1.0).
7. **`7_tier_distribution.png`**: Dual bar and pie chart illustrating the balanced 33.3% / 33.3% / 33.3% tier distribution.

---

## 6. Data Leakage & Methodological Considerations

### 6.1 Acknowledgment of Rule-Generated Ground Truth
Because raw enterprise storage traces do not include human labels, the target labels (`HOT`, `COOL`, `ARCHIVE`) are **rule-generated from empirical access behavior**.
* **Risk:** If a model is trained using the exact composite ranking formula components (`total_accesses`, `seconds_since_last_access`, `activity_span_seconds`, `cache_hit_ratio`) without regularization, it may simply learn to reverse-engineer the scoring function rather than discovering underlying workload patterns.
* **Mitigation for ML Modeling (Stage 3):**
  1. The continuous target generator `activity_score` **must be completely removed from model training features**.
  2. The raw cluster assignment `dominant_io_zone` must be removed or evaluated separately to prevent circularity.
  3. The entity key `filename` must be excluded.
  4. Train models on rich multi-dimensional feature subsets (including I/O size profiles, transfer byte volumes, application contexts, redundancy types, and file age) so the model learns realistic predictive associations rather than deterministic arithmetic.

---

## 7. Recommendations for Stage 3 (Machine Learning Modeling)

1. **Feature Matrix Construction:**
   * **Drop from Training:** `filename` (ID), `activity_score` (target source), `dominant_io_zone` (system bias).
   * **Target Column:** `storage_tier` (Categorical: `HOT`, `COOL`, `ARCHIVE`).
   * **Predictor Features:** 32 clean input features.
2. **Preprocessing & Encoding:**
   * One-hot encode or target-encode high-cardinality `application` (76 classes), `dominant_service_class` (3 classes), and `dominant_redundancy_type` (2 classes).
   * Apply robust scaling (`RobustScaler` or log1p transforms) on skewed numerical features (`total_accesses`, `estimated_file_size_bytes_proxy`, `total_request_io_bytes`).
3. **Model Selection & Baselines:**
   * Benchmark multiple algorithms:
     * **Baseline:** Stratified Dummy Classifier & Multinomial Logistic Regression.
     * **Tree Ensembles:** Random Forest Classifier & Extra Trees Classifier.
     * **Gradient Boosters:** LightGBM / XGBoost.
     * **Neural Approach:** Multi-Layer Perceptron (MLP).
4. **Evaluation Strategy:**
   * Stratified 5-Fold Cross-Validation (80% train, 20% holdout test).
   * Report Macro F1-score, Balanced Accuracy, Multiclass ROC-AUC, and Confusion Matrix.

---

*Stage 2 validation report completed and verified against `data/processed/file_level_features.csv`.*
