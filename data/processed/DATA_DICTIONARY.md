# Data Dictionary: File-Level Storage Tier Features

**Project:** Intelligent Cloud Storage Tier Predictor Using Machine Learning  
**Dataset:** `data/processed/file_level_features.csv`  
**Parent Trace:** `data/raw/thesios_storage_trace.csv` (Google Thesios Storage Trace)  
**Row Count:** 13,565 rows (Exactly 1 row per unique file)  
**Total Features:** 37 features (34 input/descriptive features + 1 proxy size + 1 activity score + 1 target tier)  
**Completeness:** 100.00% (0 missing values across all columns)  

---

## 1. Feature Categories Overview

| Category | Count | Features |
| :--- | :---: | :--- |
| **Identification** | 2 | `filename`, `application` |
| **Access Frequency & Counts** | 9 | `total_accesses`, `read_count`, `write_count`, `read_ratio`, `unique_access_days`, `accesses_last_7_days`, `accesses_last_30_days`, `accesses_last_5_min`, `access_frequency` |
| **Access Temporal Intervals** | 6 | `average_access_interval`, `median_access_interval`, `days_since_last_access`, `seconds_since_last_access`, `first_access_timestamp`, `last_access_timestamp` |
| **File Age & Lifetime Span** | 3 | `file_age_days`, `activity_span_days`, `activity_span_seconds` |
| **I/O Volume & Granularity** | 7 | `average_request_io_size`, `median_request_io_size`, `total_request_io_bytes`, `average_response_io_size`, `total_response_io_bytes`, `average_disk_io_size`, `total_disk_io_bytes` |
| **Cache Performance** | 4 | `cache_hit_count`, `cache_miss_count`, `cache_hit_ratio`, `flash_cache_ratio` |
| **Storage Infrastructure & QoS** | 3 | `dominant_io_zone`, `dominant_service_class`, `dominant_redundancy_type` |
| **File Size Proxy** | 1 | `estimated_file_size_bytes_proxy` |
| **Target Label & Composite Index** | 2 | `activity_score`, `storage_tier` |

---

## 2. Detailed Feature Specifications

### 2.1 Identification Features

#### `filename`
* **Meaning:** The unique anonymized cryptographic identifier for each logical file in the storage cluster.
* **Data Type:** `string` (64-character SHA-256 hexadecimal string).
* **Mathematical Calculation:** Primary group key: $\text{GROUP BY } \text{filename}$.
* **Source Column:** `filename`.
* **Utility for Tier Prediction:** Acts as the primary entity identifier for tracking, evaluation, and record retrieval. (Excluded from model feature training to prevent overfitting on entity keys).
* **Derivation Status:** **Direct (Primary Entity Key)**.

#### `application`
* **Meaning:** The dominant client application or internal Google service responsible for accessing the file.
* **Data Type:** `string` (Categorical: `spanner`, `bigtable`, `blobstore`, or 64-char service hash).
* **Mathematical Calculation:** $\text{Mode}(\text{application})$ per file.
* **Source Column:** `application`.
* **Utility for Tier Prediction:** Workload context strongly influences access regularity (e.g., Spanner database files have high transaction frequency, whereas batch analytics exhibit periodic bursts).
* **Derivation Status:** **Derived (Mode Aggregation)**.

---

### 2.2 Access Features

#### `total_accesses`
* **Meaning:** Total number of I/O access operations performed on the file during the observation window.
* **Data Type:** `int64`.
* **Mathematical Calculation:** $N_i = \sum_{j \in \text{File}_i} 1$.
* **Source Column:** Row count per file.
* **Utility for Tier Prediction:** Fundamental indicator of file hotness. Hot files receive high request volume, while Cold/Archive files have 1–2 touches.
* **Derivation Status:** **Derived (Count Aggregation)**.

#### `read_count`
* **Meaning:** Number of read I/O requests executed against the file.
* **Data Type:** `int64`.
* **Mathematical Calculation:** $\sum_{j \in \text{File}_i} \mathbb{I}(\text{op\_type}_j = \text{'READ'})$.
* **Source Column:** `op_type`.
* **Utility for Tier Prediction:** Read-heavy files are prime candidates for caching tiers (Hot/Cool), whereas write-only files may be temporary ingest logs.
* **Derivation Status:** **Derived (Conditional Sum)**.

#### `write_count`
* **Meaning:** Number of write/append/sync I/O requests executed against the file.
* **Data Type:** `int64`.
* **Mathematical Calculation:** $\sum_{j \in \text{File}_i} \mathbb{I}(\text{op\_type}_j = \text{'WRITE'})$.
* **Source Column:** `op_type`.
* **Utility for Tier Prediction:** Captures data generation and modification patterns. Write-once files often transition quickly to Cool or Archive.
* **Derivation Status:** **Derived (Conditional Sum)**.

#### `read_ratio`
* **Meaning:** Proportion of total accesses that are read operations.
* **Data Type:** `float64` (Range: `[0.0, 1.0]`).
* **Mathematical Calculation:** $\frac{\text{read\_count}}{\text{total\_accesses}}$.
* **Source Column:** `op_type`.
* **Utility for Tier Prediction:** Normalized metric separating read-intensive serving files from write-heavy append-only logs.
* **Derivation Status:** **Derived (Ratio)**.

#### `unique_access_days`
* **Meaning:** Number of distinct calendar days on which the file was accessed.
* **Data Type:** `int64`.
* **Mathematical Calculation:** $|\{\text{date}(t_j) : j \in \text{File}_i\}|$.
* **Source Column:** `start_time`.
* **Trace Characteristic:** For this 14.36-minute high-resolution trace snapshot on 2024-01-15, all accesses occurred within a single calendar day ($\text{unique\_access\_days} = 1$ for all files).
* **Utility for Tier Prediction:** Standard enterprise access regularity metric; retained in schema for longitudinal compatibility.
* **Derivation Status:** **Derived (Distinct Date Count)**.

#### `accesses_last_7_days`
* **Meaning:** Number of access requests occurring within 7 days prior to trace observation cutoff ($T_{\text{end}}$).
* **Data Type:** `int64`.
* **Mathematical Calculation:** $\sum_{j \in \text{File}_i} \mathbb{I}(t_j \ge T_{\text{end}} - 7 \times 86400)$.
* **Trace Characteristic:** Since total trace duration is 861.38 seconds ($0.00997 \text{ days} \ll 7 \text{ days}$), all observed trace requests fall within the 7-day window ($\text{accesses\_last\_7\_days} = \text{total\_accesses}$).
* **Utility for Tier Prediction:** Measures weekly recency in production cloud storage policies.
* **Derivation Status:** **Derived (Temporal Window Sum)**.

#### `accesses_last_30_days`
* **Meaning:** Number of access requests occurring within 30 days prior to trace observation cutoff ($T_{\text{end}}$).
* **Data Type:** `int64`.
* **Mathematical Calculation:** $\sum_{j \in \text{File}_i} \mathbb{I}(t_j \ge T_{\text{end}} - 30 \times 86400)$.
* **Trace Characteristic:** Equal to `total_accesses` because the trace observation window is fully contained within 30 days.
* **Utility for Tier Prediction:** Standard monthly active-access metric for tier lifecycle management (e.g., AWS S3 30-day infrequent access rules).
* **Derivation Status:** **Derived (Temporal Window Sum)**.

#### `accesses_last_5_min`
* **Meaning:** Number of access requests occurring in the final 5 minutes ($300 \text{ seconds}$) of the trace window.
* **Data Type:** `int64`.
* **Mathematical Calculation:** $\sum_{j \in \text{File}_i} \mathbb{I}(t_j \ge T_{\text{end}} - 300.0)$.
* **Source Column:** `start_time`.
* **Utility for Tier Prediction:** Provides intra-trace fine-grained recency, identifying files actively accessed right up to trace termination.
* **Derivation Status:** **Derived (Sub-window Sum)**.

#### `access_frequency`
* **Meaning:** Rate of access operations per minute across the observation window.
* **Data Type:** `float64` (requests / minute).
* **Mathematical Calculation:** $\frac{\text{total\_accesses}}{\Delta T_{\text{trace (min)}}} = \frac{\text{total\_accesses}}{14.3564}$.
* **Source Column:** `start_time`.
* **Utility for Tier Prediction:** Primary operational velocity metric directly distinguishing Hot, Cool, and Archive workloads.
* **Derivation Status:** **Derived (Rate Normalization)**.

---

### 2.3 Temporal Interval Features

#### `average_access_interval`
* **Meaning:** Mean inter-arrival time in seconds between consecutive access events for the file.
* **Data Type:** `float64` (seconds).
* **Mathematical Calculation:** For $N > 1$: $\frac{1}{N - 1}\sum_{k=1}^{N-1} (t_{k+1} - t_k) = \frac{t_{\text{last}} - t_{\text{first}}}{N - 1}$. For $N = 1$: $0.0$ (documented sentinel for single-access files).
* **Source Column:** `start_time` (sorted).
* **Utility for Tier Prediction:** Rapid intervals (milliseconds) indicate high-velocity Hot files; wide intervals indicate intermittent Cool access.
* **Derivation Status:** **Derived (Sequential Difference Mean)**.

#### `median_access_interval`
* **Meaning:** Median inter-arrival time in seconds between consecutive access events for the file.
* **Data Type:** `float64` (seconds).
* **Mathematical Calculation:** $\text{Median}(\{t_{k+1} - t_k\}_{k=1}^{N-1})$. For $N=1$: $0.0$.
* **Source Column:** `start_time` (sorted).
* **Utility for Tier Prediction:** Robust against outliers and burst clusters compared to the mean interval.
* **Derivation Status:** **Derived (Sequential Difference Median)**.

#### `days_since_last_access`
* **Meaning:** Time elapsed in fractional days from the file's latest access to trace observation cutoff ($T_{\text{end}}$).
* **Data Type:** `float64` (days).
* **Mathematical Calculation:** $\frac{T_{\text{end}} - \max(t_j)}{86400.0}$.
* **Source Column:** `start_time`.
* **Utility for Tier Prediction:** Measures inactivity duration / recency decay. Files inactive throughout the window have higher values.
* **Derivation Status:** **Derived (Time Delta)**.

#### `seconds_since_last_access`
* **Meaning:** Time elapsed in seconds from the file's latest access to trace observation cutoff ($T_{\text{end}}$).
* **Data Type:** `float64` (seconds). Range: `[0.0, 861.28]`.
* **Mathematical Calculation:** $T_{\text{end}} - \max(t_j)$.
* **Source Column:** `start_time`.
* **Utility for Tier Prediction:** Native, non-scaled high-resolution recency feature ideal for machine learning algorithms.
* **Derivation Status:** **Derived (Time Delta)**.

#### `first_access_timestamp`
* **Meaning:** Unix epoch timestamp of the first observed access request for the file.
* **Data Type:** `float64` (seconds).
* **Mathematical Calculation:** $\min_{j \in \text{File}_i}(t_j)$.
* **Source Column:** `start_time`.
* **Utility for Tier Prediction:** Establishes the beginning of observed file activity.
* **Derivation Status:** **Derived (Min Aggregation)**.

#### `last_access_timestamp`
* **Meaning:** Unix epoch timestamp of the final observed access request for the file.
* **Data Type:** `float64` (seconds).
* **Mathematical Calculation:** $\max_{j \in \text{File}_i}(t_j)$.
* **Source Column:** `start_time`.
* **Utility for Tier Prediction:** Establishes the termination of observed file activity.
* **Derivation Status:** **Derived (Max Aggregation)**.

---

### 2.4 Age & Activity Span Features

#### `file_age_days`
* **Meaning:** Elapsed calendar time in days between file creation (`c_time`) and trace observation cutoff ($T_{\text{end}}$).
* **Data Type:** `float64` (days). Range: `[0.000016, 902.55]` days (~1.4s to ~2.47 years).
* **Mathematical Calculation:** $\frac{T_{\text{end}} - \text{c\_time}_i}{86400.0}$.
* **Source Column:** `c_time`, `start_time`.
* **Utility for Tier Prediction:** Critical lifecycle indicator. Long-lived files with low access counts are prime candidates for Archive storage.
* **Derivation Status:** **Derived (Creation Delta)**.

#### `activity_span_days`
* **Meaning:** Time duration in fractional days between the first and last recorded access of the file.
* **Data Type:** `float64` (days).
* **Mathematical Calculation:** $\frac{t_{\text{last}} - t_{\text{first}}}{86400.0}$.
* **Source Column:** `start_time`.
* **Utility for Tier Prediction:** Distinguishes transient single-point accesses from sustained multi-session access.
* **Derivation Status:** **Derived (Span Delta)**.

#### `activity_span_seconds`
* **Meaning:** Time duration in seconds between the first and last recorded access of the file.
* **Data Type:** `float64` (seconds). Range: `[0.0, 860.12]`.
* **Mathematical Calculation:** $t_{\text{last}} - t_{\text{first}}$.
* **Source Column:** `start_time`.
* **Utility for Tier Prediction:** High-resolution version of activity span; $0.0$ indicates single-touch or instantaneous burst traffic.
* **Derivation Status:** **Derived (Span Delta)**.

---

### 2.5 I/O Volume Features

#### `average_request_io_size`
* **Meaning:** Mean application request size in bytes.
* **Data Type:** `float64` (bytes).
* **Mathematical Calculation:** $\frac{1}{N}\sum \text{request\_io\_size\_bytes}_j$.
* **Source Column:** `request_io_size_bytes`.
* **Utility for Tier Prediction:** Differentiates fine-grained random transactions (e.g. 4 KB) from bulk sequential streaming transfers.
* **Derivation Status:** **Derived (Mean)**.

#### `median_request_io_size`
* **Meaning:** Median application request size in bytes.
* **Data Type:** `float64` (bytes).
* **Mathematical Calculation:** $\text{Median}(\text{request\_io\_size\_bytes}_j)$.
* **Source Column:** `request_io_size_bytes`.
* **Utility for Tier Prediction:** Robust against outlier header flush operations ($0\text{ bytes}$).
* **Derivation Status:** **Derived (Median)**.

#### `total_request_io_bytes`
* **Meaning:** Cumulative payload requested across all operations for the file.
* **Data Type:** `int64` (bytes). Range: `[50, 109,347,018]` bytes (~50 B to ~109.3 MB).
* **Mathematical Calculation:** $\sum \text{request\_io\_size\_bytes}_j$.
* **Source Column:** `request_io_size_bytes`.
* **Utility for Tier Prediction:** Measures bandwidth footprint and I/O consumption impact.
* **Derivation Status:** **Derived (Sum)**.

#### `average_response_io_size`
* **Meaning:** Mean response payload transferred back to the client application.
* **Data Type:** `float64` (bytes).
* **Mathematical Calculation:** $\frac{1}{N}\sum \text{response\_io\_size\_bytes}_j$.
* **Source Column:** `response_io_size_bytes`.
* **Utility for Tier Prediction:** Reflects outbound egress bandwidth per operation.
* **Derivation Status:** **Derived (Mean)**.

#### `total_response_io_bytes`
* **Meaning:** Cumulative response payload returned to the client application.
* **Data Type:** `int64` (bytes).
* **Mathematical Calculation:** $\sum \text{response\_io\_size\_bytes}_j$.
* **Source Column:** `response_io_size_bytes`.
* **Utility for Tier Prediction:** Directly correlates with data retrieval volume.
* **Derivation Status:** **Derived (Sum)**.

#### `average_disk_io_size`
* **Meaning:** Mean payload transferred to/from physical underlying disk media.
* **Data Type:** `float64` (bytes).
* **Mathematical Calculation:** $\frac{1}{N}\sum \text{disk\_io\_size\_bytes}_j$.
* **Source Column:** `disk_io_size_bytes`.
* **Utility for Tier Prediction:** Measures physical spindle / media wear and load.
* **Derivation Status:** **Derived (Mean)**.

#### `total_disk_io_bytes`
* **Meaning:** Cumulative payload transferred to physical storage media.
* **Data Type:** `int64` (bytes).
* **Mathematical Calculation:** $\sum \text{disk\_io\_size\_bytes}_j$.
* **Source Column:** `disk_io_size_bytes`.
* **Utility for Tier Prediction:** Physical media bandwidth consumed.
* **Derivation Status:** **Derived (Sum)**.

---

### 2.6 Cache Features

#### `cache_hit_count`
* **Meaning:** Number of read requests served directly from DRAM/in-memory cache.
* **Data Type:** `int64`.
* **Mathematical Calculation:** $\sum \mathbb{I}(\text{cache\_hit}_j = 1)$.
* **Source Column:** `cache_hit`.
* **Utility for Tier Prediction:** Confirms memory residency and active operational caching.
* **Derivation Status:** **Derived (Conditional Sum)**.

#### `cache_miss_count`
* **Meaning:** Number of read requests that missed cache and fetched data from backing media.
* **Data Type:** `int64`.
* **Mathematical Calculation:** $\sum \mathbb{I}(\text{cache\_hit}_j = 0)$.
* **Source Column:** `cache_hit`.
* **Utility for Tier Prediction:** Measures backing tier access penalty.
* **Derivation Status:** **Derived (Conditional Sum)**.

#### `cache_hit_ratio`
* **Meaning:** Ratio of read cache hits to total read operations.
* **Data Type:** `float64` (Range: `[0.0, 1.0]`).
* **Mathematical Calculation:** $\frac{\text{cache\_hit\_count}}{\text{cache\_hit\_count} + \text{cache\_miss\_count}}$ (0.0 for files with 0 reads).
* **Source Column:** `cache_hit`, `op_type`.
* **Utility for Tier Prediction:** Direct signal of file hotness in multi-tiered storage hierarchies.
* **Derivation Status:** **Derived (Ratio)**.

#### `flash_cache_ratio`
* **Meaning:** Proportion of access requests served from the solid-state flash/SSD cache tier.
* **Data Type:** `float64` (Range: `[0.0, 1.0]`).
* **Mathematical Calculation:** $\frac{\sum \mathbb{I}(\text{from\_flash\_cache}_j = 1)}{\text{total\_accesses}}$.
* **Source Column:** `from_flash_cache`.
* **Utility for Tier Prediction:** Indicates file promotion to fast intermediate flash tiers.
* **Derivation Status:** **Derived (Ratio)**.

---

### 2.7 Storage Infrastructure & QoS Features

#### `dominant_io_zone`
* **Meaning:** The predominant physical storage zone configured in the trace (`WARM`, `COLD`, `UNKNOWN`).
* **Data Type:** `string`.
* **Mathematical Calculation:** $\text{Mode}(\text{io\_zone})$.
* **Source Column:** `io_zone`.
* **Utility for Tier Prediction:** Baseline cluster configuration benchmark. (Excluded from model input to prevent circular bias).
* **Derivation Status:** **Derived (Mode)**.

#### `dominant_service_class`
* **Meaning:** The predominant Quality of Service (QoS) tier requested (`THROUGHPUT_ORIENTED`, `LATENCY_SENSITIVE`, `OTHER`).
* **Data Type:** `string`.
* **Mathematical Calculation:** $\text{Mode}(\text{service\_class})$.
* **Source Column:** `service_class`.
* **Utility for Tier Prediction:** Indicates whether workload demands sub-millisecond response (Hot) or throughput (Cool).
* **Derivation Status:** **Derived (Mode)**.

#### `dominant_redundancy_type`
* **Meaning:** Data protection scheme used (`REPLICATED` vs. `ERASURE_CODED`).
* **Data Type:** `string`.
* **Mathematical Calculation:** $\text{Mode}(\text{redundancy\_type})$.
* **Source Column:** `redundancy_type`.
* **Utility for Tier Prediction:** In cloud storage architectures, replicated files are biased toward Hot tiers for speed, whereas erasure-coded files are optimized for Cool/Archive density.
* **Derivation Status:** **Derived (Mode)**.

---

### 2.8 File Size Proxy Feature

#### `estimated_file_size_bytes_proxy`
* **Meaning:** Empirical lower-bound proxy of actual file size based on maximum touched byte offset plus request size.
* **Data Type:** `int64` (bytes). Range: `[72, 67,239,936]` bytes (~72 B to ~64.12 MB).
* **Mathematical Calculation:** $$\text{File Size Proxy} = \max_{j \in \text{File}_i}(\text{file\_offset}_j + \text{request\_io\_size\_bytes}_j)$$
* **Source Column:** `file_offset`, `request_io_size_bytes`.
* **Utility for Tier Prediction:** Determines storage capacity cost and chunk layout tiering feasibility.
* **Derivation Status:** **Derived Proxy (Lower Bound)**.

---

### 2.9 Composite Activity Index & Target Label

#### `activity_score`
* **Meaning:** Standardized multi-factor continuous activity index combining access volume, recency, duration, and caching.
* **Data Type:** `float64` (Range: `[0.0908, 0.9660]`).
* **Mathematical Calculation:** $$S_i = 0.40 \cdot \text{Rank}(\text{acc}_i) + 0.30 \cdot (1 - \text{Rank}(\text{rec}_i)) + 0.15 \cdot \text{Rank}(\text{span}_i) + 0.15 \cdot \text{Rank}(\text{cache}_i)$$
* **Source Column:** Composite aggregation over 4 behavioral features.
* **Utility for Tier Prediction:** Serves as the transparent ground-truth scoring metric.
* **Derivation Status:** **Derived (Composite Index)**.

#### `storage_tier` *(Target Label)*
* **Meaning:** Logical cloud storage tier assigned to the file based on transparent data-driven rules.
* **Data Type:** `string` (Enum: `HOT`, `COOL`, `ARCHIVE`).
* **Mathematical Calculation:**
  $$\text{storage\_tier} = \begin{cases} \mathbf{HOT} & \text{if } S_i \ge 0.6027 \ (\ge \text{P66.7}) \\ \mathbf{COOL} & \text{if } 0.4061 < S_i < 0.6027 \\ \mathbf{ARCHIVE} & \text{if } S_i \le 0.4061 \ (\le \text{P33.3}) \end{cases}$$
* **Class Distribution:**
  * **HOT:** 4,522 files (33.34%)
  * **COOL:** 4,522 files (33.34%)
  * **ARCHIVE:** 4,521 files (33.33%)
* **Utility for Tier Prediction:** **Ground-Truth Target Variable** for classification models.
* **Derivation Status:** **Target Label (Rule-Generated Ground Truth)**.

---

*Data dictionary verified against `data/processed/file_level_features.csv`.*
