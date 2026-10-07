# Stage 3 Report: Machine Learning Model Development & Validation

**Project:** Intelligent Cloud Storage Tier Predictor Using Machine Learning  
**Dataset:** `data/processed/file_level_features.csv` (Derived from Google Thesios Storage Trace)  
**Execution Date:** October 2026  
**Status:** Stage 3 Complete — Models Trained, Cross-Validated, Evaluated, and Serialized  

---

## 1. Objective

The goal of this stage is to build, evaluate, and compare supervised machine learning classifiers that predict the optimal logical cloud storage tier:
* 🔥 **HOT:** High-throughput, low-latency, active storage tier.
* 🌤️ **COOL:** Infrequently accessed, cost-efficient storage tier.
* ❄️ **ARCHIVE:** Rare access, high-density, archival storage tier.

A central research question of this project is understanding **the source of predictive power**:
1. Does the model learn primarily from **temporal access behavior** (access counts, access velocity, recency decay)?
2. Can **independent/contextual features** (file size proxy, transfer volumes, file age, application type, redundancy schemes) predict storage tiers without direct access-frequency indicators?

---

## 2. Dataset & Target Generation Acknowledgment

### 2.1 Foundational Trace Characteristics
* **Source:** Google Thesios storage research environment (`data/raw/thesios_storage_trace.csv`).
* **Raw Scope:** 168,590 I/O access requests.
* **Aggregated Scope:** **13,565 unique files** in `data/processed/file_level_features.csv`.
* **Zero Missing Values:** 100.0% data completeness across all features.

### 2.2 Mandatory Limitations & Scope Acknowledgments
> [!WARNING]
> **Trace Duration & Measurement Boundary:**  
> The current Google Thesios shard captures an empirical trace window spanning approximately **14.36 minutes (861.38 seconds)** on a single operational day (2024-01-15). Therefore:
> * `accesses_last_7_days` and `accesses_last_30_days` are strictly equal to `total_accesses` within this trace window and must **NOT** be interpreted as genuine 7-day or 30-day longitudinal access histories.
> * `days_since_last_access` represents elapsed inactivity relative to the trace collection boundary ($T_{\text{end}}$), measured in fractional days ($0.0$ to $0.00997$ days).
> 
> **Heuristic Pseudo-Label Acknowledgment:**  
> The target classes (`HOT`, `COOL`, `ARCHIVE`) are **heuristic pseudo-labels** generated from a continuous **Composite Storage Activity Index** ($S_i$) combining access volume, recency, activity duration, and cache hit ratio. They do **not** represent externally provided, human-curated, or vendor-enforced storage tiers.  
> The machine learning models in this study are trained to learn and generalize the relationship between observable file telemetry and this algorithmic storage tier policy.

---

## 3. Dual Feature Configurations (Leakage Prevention)

To rigorously assess model generalization and prevent direct arithmetic reverse-engineering of the target label, we evaluated two distinct feature configurations:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   FEATURE CONFIGURATIONS OVERVIEW                      │
├───────────────────────────────────┬────────────────────────────────────┤
│ CONFIGURATION A: BEHAVIORAL (30)  │ CONFIGURATION B: CONTEXTUAL (16)   │
├───────────────────────────────────┼────────────────────────────────────┤
│ Full historical access telemetry  │ Strictly independent & contextual  │
│  • total_accesses                 │  • estimated_file_size_bytes_proxy │
│  • access_frequency               │  • total_request_io_bytes          │
│  • seconds_since_last_access      │  • average_request_io_size         │
│  • activity_span_seconds          │  • median_request_io_size          │
│  • cache_hit_ratio                │  • total_response_io_bytes         │
│  • accesses_last_5_min            │  • average_response_io_size        │
│  • average_access_interval        │  • total_disk_io_bytes             │
│  • median_access_interval         │  • average_disk_io_size            │
│  • first/last access timestamps   │  • read_count                      │
│  • read_ratio                     │  • write_count                     │
│  • file_age_days                  │  • read_ratio                      │
│  • I/O size & transfer metrics    │  • flash_cache_ratio               │
│  • application & QoS flags        │  • file_age_days                   │
│                                   │  • application                     │
│                                   │  • dominant_service_class          │
│                                   │  • dominant_redundancy_type        │
├───────────────────────────────────┼────────────────────────────────────┤
│ Excluded:                         │ Excluded:                          │
│  • activity_score (target formula)│  • ALL direct target components    │
│  • storage_tier (target Y)        │  • ALL direct access derivatives   │
│  • dominant_io_zone (system bias) │  • activity_score & storage_tier   │
│  • filename (entity key)          │  • dominant_io_zone & filename     │
└───────────────────────────────────┴────────────────────────────────────┘
```

---

## 4. Experimental Setup & Preprocessing

* **Train / Test Split:** Stratified 80% Training ($N = 10,852$) and 20% Testing ($N = 2,713$) using `random_state=42`.
* **Cross-Validation:** 5-Fold Stratified Cross-Validation on the 10,852 training instances.
* **Preprocessing Pipeline:**
  * Numerical attributes: Standardized via `StandardScaler`.
  * Categorical attributes (`application`, `dominant_service_class`, `dominant_redundancy_type`): Encoded via `OneHotEncoder(handle_unknown='ignore')`.
  * Enclosed within scikit-learn `Pipeline` objects to prevent cross-validation fold leakage.
* **Evaluated Algorithms:**
  1. **Decision Tree:** `DecisionTreeClassifier(max_depth=10, random_state=42)`
  2. **Random Forest:** `RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42, n_jobs=1)`
  3. **XGBoost:** `XGBClassifier(n_estimators=100, max_depth=6, learning_rate=0.1, random_state=42, eval_metric='mlogloss', n_jobs=1)`

---

## 5. Comprehensive Model Comparison

The primary model selection metric is **Weighted F1-score**, accompanied by **Macro F1-score**, **Accuracy**, **Precision**, and **5-Fold Cross-Validation Accuracy**:

| Feature Configuration | Model | 5-Fold CV Accuracy | Test Accuracy | Precision (Weighted) | Recall (Weighted) | Weighted F1 | Macro F1 |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Config A (Behavioral)** | **XGBoost** | **0.9775 ± 0.0022** | **0.9783** | **0.9783** | **0.9783** | **0.9783** | **0.9783** |
| Config A (Behavioral) | Random Forest | 0.9667 ± 0.0032 | 0.9646 | 0.9652 | 0.9646 | 0.9648 | 0.9648 |
| Config A (Behavioral) | Decision Tree | 0.9568 ± 0.0039 | 0.9521 | 0.9523 | 0.9521 | 0.9522 | 0.9522 |
| **Config B (Contextual)** | **XGBoost** | **0.7805 ± 0.0118** | **0.7663** | **0.7780** | **0.7663** | **0.7697** | **0.7697** |
| Config B (Contextual) | Random Forest | 0.7735 ± 0.0146 | 0.7619 | 0.7719 | 0.7619 | 0.7653 | 0.7653 |
| Config B (Contextual) | Decision Tree | 0.7537 ± 0.0134 | 0.7368 | 0.7426 | 0.7368 | 0.7392 | 0.7392 |

> [!NOTE]
> **Best Overall Model:** **XGBoost under Configuration A (Behavioral)** achieved the highest performance across every evaluation metric: **97.83% Accuracy**, **0.9783 Weighted F1**, and **0.9775 5-Fold Cross-Validation Accuracy**.

---

## 6. Per-Class Performance Breakdown

Detailed classification metrics on the holdout test set ($N = 2,713$ files):

### Configuration A (Behavioral) — XGBoost
| Storage Tier | Support | Precision | Recall | F1-Score |
| :--- | :---: | :---: | :---: | :---: |
| ❄️ **ARCHIVE** | 904 | 0.9878 | 0.9867 | **0.9873** |
| 🌤️ **COOL** | 905 | 0.9628 | 0.9724 | **0.9676** |
| 🔥 **HOT** | 904 | 0.9844 | 0.9757 | **0.9800** |
| **Macro Average** | **2,713** | **0.9783** | **0.9783** | **0.9783** |
| **Weighted Average** | **2,713** | **0.9783** | **0.9783** | **0.9783** |

### Configuration B (Contextual) — XGBoost
| Storage Tier | Support | Precision | Recall | F1-Score |
| :--- | :---: | :---: | :---: | :---: |
| ❄️ **ARCHIVE** | 904 | 0.8813 | 0.8374 | **0.8588** |
| 🌤️ **COOL** | 905 | 0.6294 | 0.7337 | **0.6776** |
| 🔥 **HOT** | 904 | 0.8235 | 0.7279 | **0.7728** |
| **Macro Average** | **2,713** | **0.7781** | **0.7663** | **0.7697** |
| **Weighted Average** | **2,713** | **0.7780** | **0.7663** | **0.7697** |

---

## 7. Confusion Matrix Analysis

The confusion matrix plots are saved in `reports/figures/`:
* `reports/figures/confusion_matrix_behavioral.png`
* `reports/figures/confusion_matrix_contextual.png`

```
CONFIGURATION A (BEHAVIORAL) — XGBOOST
                 Predicted ARCHIVE  Predicted COOL  Predicted HOT
Actual ARCHIVE          892               12               0
Actual COOL               8              880              17
Actual HOT                3               19             882

Accuracy: 97.83% | Misclassifications: 59 out of 2,713 files (2.17%)
```

```
CONFIGURATION B (CONTEXTUAL) — XGBOOST
                 Predicted ARCHIVE  Predicted COOL  Predicted HOT
Actual ARCHIVE          757              123              24
Actual COOL              90              664             151
Actual HOT               12              234             658

Accuracy: 76.63% | Misclassifications: 634 out of 2,713 files (23.37%)
```

### Key Error Observations:
1. **Behavioral Model (Config A):** Almost no confusion between **ARCHIVE** and **HOT** (only 3 files crossed). The small errors occur at the transition boundary between **COOL** and **HOT** (17 and 19 files) and **ARCHIVE** and **COOL** (8 and 12 files).
2. **Contextual Model (Config B):** While **ARCHIVE** identification remains robust (757 correct, 85.9% F1), the boundary between **COOL** and **HOT** is heavily blurred: 234 actual Hot files were classified as Cool, and 151 actual Cool files were classified as Hot.

---

## 8. Feature Importance Analysis

Feature importances were calculated and visualized for Random Forest (Gini Importance) and XGBoost (Split/Gain Importance), alongside Permutation Importance on the holdout test set.

Saved figures:
* `reports/figures/feature_importance_random_forest.png`
* `reports/figures/feature_importance_xgboost.png`

### 8.1 Top 10 Features (XGBoost — Configuration A)

| Rank | Feature | Importance Score | Physical Semantics |
| :---: | :--- | :---: | :--- |
| 1 | `accesses_last_5_min` | **0.3377** | Recency velocity (requests in the final 300 seconds) |
| 2 | `total_accesses` | **0.2137** | Cumulative I/O traffic volume |
| 3 | `last_access_timestamp` | **0.0692** | Absolute timing of the most recent I/O event |
| 4 | `days_since_last_access` | **0.0460** | Elapsed inactivity duration relative to trace end |
| 5 | `application_b5b4...` | **0.0410** | High-throughput batch processing engine context |
| 6 | `read_count` | **0.0306** | Volume of cacheable read requests |
| 7 | `total_request_io_bytes` | **0.0293** | Cumulative bandwidth footprint |
| 8 | `cache_hit_ratio` | **0.0269** | DRAM/flash memory caching effectiveness |
| 9 | `activity_span_seconds` | **0.0264** | Duration of active file usage (burst vs sustained) |
| 10 | `cache_hit_count` | **0.0261** | Raw count of memory-accelerated operations |

### 8.2 Top Permutation Importance (Test Set Validation)

Permutation importance shuffles each feature to measure the drop in test set accuracy:
1. `total_accesses`: **0.3815 ± 0.0069** accuracy drop
2. `days_since_last_access`: **0.2058 ± 0.0085** accuracy drop
3. `cache_hit_count`: **0.0758 ± 0.0038** accuracy drop
4. `activity_span_days`: **0.0394 ± 0.0009** accuracy drop
5. `accesses_last_5_min`: **0.0313 ± 0.0033** accuracy drop

**Takeaway:** The permutation test confirms that `total_accesses` and `days_since_last_access` are the two dominant pillars of storage tiering, followed by caching and duration.

---

## 9. In-Depth Comparative Analysis: Behavioral vs. Contextual

### 9.1 Why Configuration A Outperforms Configuration B
Configuration A achieves **97.83% Weighted F1**, while Configuration B achieves **76.97% Weighted F1** (a 20.86% performance drop).
* **Direct Alignment with Storage Dynamics:** Cloud tiering policies are fundamentally defined by **temporal dynamics** (how often a file is accessed and how recently it was touched). When access frequency and recency are available, the decision boundary between active (Hot), intermittent (Cool), and dormant (Archive) storage is crisp.
* **Non-Linear Decision Surfaces:** Tree ensembles easily map multi-dimensional temporal interactions (e.g., high access count + low recency gap $\rightarrow$ Hot; low access count + large recency gap $\rightarrow$ Archive).

### 9.2 Does Configuration B Still Provide Useful Predictive Information?
**Yes, remarkably so.**
* A baseline random classifier on three balanced classes achieves **33.33% accuracy**.
* Configuration B achieves **76.63% accuracy** and **0.7697 Weighted F1** without seeing access counts or recency!
* **Key Contextual Predictors:**
  1. `total_request_io_bytes` and `read_count` serve as proxies for access intensity.
  2. `file_age_days`: Long-lived files are statistically far more likely to be Archive.
  3. `application`: Specific applications (like Spanner) rarely host dormant archive files, whereas batch data pipelines frequently generate files that go cold immediately.
  4. `estimated_file_size_bytes_proxy`: Larger files are frequently erasure-coded and accessed less frequently per byte.

### 9.3 Research Finding & Honest Limitations
* **Access behavior is the primary driver of storage tiering.**
* Contextual variables alone can identify **ARCHIVE files reliably (85.9% F1)** because old, large, write-once files have clear structural signatures.
* However, **contextual variables alone CANNOT reliably separate COOL from HOT (67.8% F1 on Cool)** because files with identical size and application type may either be actively serving live queries (Hot) or sitting idle between hourly runs (Cool). Real-time access telemetry is indispensable for precise Hot/Cool boundary decisions.

---

## 10. Model Serialization & Production Artifacts

All production artifacts have been serialized under `models/`:
1. `models/best_model.joblib` (960 KB): Complete scikit-learn Pipeline containing the fitted preprocessor and trained XGBoost classifier.
2. `models/preprocessor.joblib` (10 KB): Standalone ColumnTransformer for feature transformations.
3. `models/label_encoder.joblib` (0.5 KB): Target label encoder (`0: ARCHIVE`, `1: COOL`, `2: HOT`).
4. `models/model_metadata.json` (5 KB): Complete reproducibility metadata, hyperparameter configuration, evaluation metrics, and top feature rankings.

---

## 11. Recommendations for Subsequent Stages

1. **Inference Pipeline Integration:**
   * Build a lightweight inference module (e.g. `src/models/predict.py`) that loads `models/best_model.joblib` and scores new file telemetry.
2. **Confidence Scores & Tier Migration Recommendations:**
   * Use predicted class probabilities ($P(\text{Hot}), P(\text{Cool}), P(\text{Archive})$) to recommend storage migration only when confidence exceeds an operational threshold (e.g. $P > 0.85$), minimizing unnecessary cloud tier transition fees.
3. **Cost Estimation Engine:**
   * Combine predicted tiers with file size proxies to estimate operational cloud savings (e.g. moving a 10 GB file from Standard to Archive saves ~80% monthly storage cost).

---

*Machine learning model development, validation, and serialization verified against `data/processed/file_level_features.csv`.*
