# Ground-Truth Tier Labeling Methodology

**Project:** Intelligent Cloud Storage Tier Predictor Using Machine Learning  
**Dataset:** `data/processed/file_level_features.csv`  
**Target Variable:** `storage_tier` (`HOT`, `COOL`, `ARCHIVE`)  

---

## 1. Why Logical Storage Tiers (Hot / Cool / Archive) Are Needed

Modern hyperscale cloud storage platforms (such as Google Cloud Storage, Amazon AWS S3, and Microsoft Azure Blob Storage) operate under distinct economic and operational constraints:

1. **Storage Cost vs. Access Cost Tradeoff:**
   * **Hot Tiers (Standard / Multi-Regional):** Highest storage price per GB-month, lowest per-request retrieval costs. Designed for active, low-latency, high-IOPS applications.
   * **Cool Tiers (Infrequent Access / Nearline):** Substantially lower storage price per GB-month, moderate data retrieval fees, and a 30-day minimum storage commitment. Designed for backup, periodic analytics, and operational data accessed less than once a month.
   * **Archive Tiers (Coldline / Glacier / Archive):** Rock-bottom storage cost per GB-month (up to 80–90% cheaper than Hot), higher egress/retrieval penalty, longer retrieval latency (minutes to hours in deep archive), and 90-to-365-day retention requirements.

2. **The Autonomous Tiering Problem:**
   * In raw production storage systems (like Google Thesios / Colossus), storage traces log millions of low-level I/O requests without explicit pre-assigned labels. System operators cannot manually tag millions of files. An autonomous machine learning system must classify files into their optimal cost-performance tier based on observable access telemetry.

> [!IMPORTANT]
> The raw column `io_zone` (`WARM` 94.7%, `COLD` 5.0%, `UNKNOWN` 0.3%) in the trace represents an existing cluster partition assignment rather than an optimal predictive tiering label. Using `io_zone` directly would introduce severe class imbalance (>94% majority class) and strong target circularity. Therefore, an objective, multi-factor, behavioral ground-truth labeling methodology is required.

---

## 2. Multi-Criteria Behavioral Features Determining Each Tier

Cloud storage tiering decisions fundamentally depend on four complementary dimensions of access telemetry:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                 STORAGE ACTIVITY INDEX (S_i)                            │
├─────────────────────────────────────────────────────────────────────────┤
│ 1. ACCESS VOLUME (40%)  : total_accesses (Request Intensity)            │
│ 2. RECENCY (30%)        : seconds_since_last_access (Inactivity Gap)    │
│ 3. DURATION (15%)       : activity_span_seconds (Sustained vs Burst)    │
│ 4. CACHING (15%)        : cache_hit_ratio (Memory Residency / Hotness)  │
└─────────────────────────────────────────────────────────────────────────┘
```

1. **Access Volume / Frequency (Weight: 40%):**
   * High request counts indicate sustained workload pressure. Files with 10–100+ requests belong in fast-serving tiers, whereas files with 1–2 accesses should not consume expensive flash/memory cache.
2. **Access Recency (Weight: 30%):**
   * Measured via $T_{\text{end}} - \max(t_j)$ (`seconds_since_last_access`). Files accessed seconds before trace end are actively in use, whereas files accessed early in the trace and dormant since are decaying.
3. **Activity Span (Weight: 15%):**
   * Measured via $\max(t_j) - \min(t_j)$ (`activity_span_seconds`). Distinguishes transient one-time bursts (e.g. a single bulk scan spanning 0.05 seconds) from sustained active files spanning hundreds of seconds.
4. **Cache Hit Ratio (Weight: 15%):**
   * For read operations, high cache hit rates indicate that storage caching layers already prioritize this file. Zero cache hits reflect cold reads from physical disk.

---

## 3. Exact Formulas and Mathematical Definitions

### 3.1 Composite Activity Score Formula

For each unique file $i \in \{1, \dots, 13,565\}$, we calculate empirical percentile ranks across the four normalized behavioral components:

$$R_{\text{acc}}(i) = \text{PercentileRank}(\text{total\_accesses}_i)$$

$$R_{\text{rec}}(i) = 1.0 - \text{PercentileRank}(\text{seconds\_since\_last\_access}_i)$$

$$R_{\text{span}}(i) = \text{PercentileRank}(\text{activity\_span\_seconds}_i)$$

$$R_{\text{cache}}(i) = \text{PercentileRank}(\text{cache\_hit\_ratio}_i)$$

The continuous **Composite Storage Activity Index** $S_i \in [0, 1]$ is computed as:

$$S_i = 0.40 \cdot R_{\text{acc}}(i) + 0.30 \cdot R_{\text{rec}}(i) + 0.15 \cdot R_{\text{span}}(i) + 0.15 \cdot R_{\text{cache}}(i)$$

### 3.2 Data-Driven Threshold Selection

To avoid arbitrary numbers, the thresholds $\tau_1$ and $\tau_2$ are derived from the exact empirical tertiles (33.33rd and 66.67th percentiles) of the activity score distribution across the 13,565 files:

$$\tau_1 = \text{Percentile}(S, 33.3333\%) = \mathbf{0.4061}$$

$$\tau_2 = \text{Percentile}(S, 66.6667\%) = \mathbf{0.6027}$$

### 3.3 Rule-Based Decision Function

$$\text{storage\_tier}(i) = \begin{cases}
\mathbf{HOT} & \text{if } S_i \ge 0.6027 \quad (\text{Top 33.33\% Activity Score}) \\
\mathbf{COOL} & \text{if } 0.4061 < S_i < 0.6027 \quad (\text{Middle 33.34\% Activity Score}) \\
\mathbf{ARCHIVE} & \text{if } S_i \le 0.4061 \quad (\text{Bottom 33.33\% Activity Score})
\end{cases}$$

---

## 4. Class Distribution and Operational Validation

The methodology produces an exceptionally balanced and meaningful dataset:

| Storage Tier | File Count | Percentage | Operational Role |
| :--- | :---: | :---: | :--- |
| 🔥 **HOT** | **4,522** | **33.34%** | Fast NVMe / SSD, replicated storage, memory caching enabled |
| 🌤️ **COOL** | **4,522** | **33.34%** | Infrequent access storage, throughput-oriented erasure coding |
| ❄️ **ARCHIVE** | **4,521** | **33.33%** | High-density archival storage, maximum erasure-coded compaction |
| **Total** | **13,565** | **100.00%** | **Perfect Class Balance (~1:1:1)** |

### Profile Verification Across Tiers

Evaluating the actual aggregated features across the generated tiers proves that the three classes exhibit distinct and realistic storage profiles:

| Feature Metric | 🔥 HOT Tier | 🌤️ COOL Tier | ❄️ ARCHIVE Tier |
| :--- | :---: | :---: | :---: |
| **Median Total Accesses** | **16.0 accesses** | **4.0 accesses** | **1.0 access** |
| **Mean Total Accesses** | **27.96 accesses** | **7.76 accesses** | **1.57 accesses** |
| **Median Access Frequency** | **1.114 req/min** | **0.279 req/min** | **0.070 req/min** |
| **Median Seconds Since Last Access** | **221.1 seconds** | **475.4 seconds** | **553.6 seconds** |
| **Median Activity Span** | **4.04 seconds** | **0.06 seconds** | **0.00 seconds** |
| **Mean Activity Span** | **76.72 seconds** | **12.36 seconds** | **0.29 seconds** |
| **Median Cache Hit Ratio** | **0.393 (39.3%)** | **0.364 (36.4%)** | **0.000 (0.0%)** |
| **Median File Age** | **0.04 days** (~58 min) | **0.68 days** (~16.3 hrs) | **1.05 days** (~25.2 hrs) |
| **Mean File Age** | **4.87 days** | **5.03 days** | **8.70 days** |

* **Hot files** are young, repeatedly accessed (up to thousands of times), active seconds before trace conclusion, and exhibit high cache hit rates.
* **Cool files** represent periodic transactional access (median 4 accesses) with moderate recency and intermittent activity.
* **Archive files** are older baseline files with single touches (median 1 access, span 0 s), large inactivity gaps, and zero memory caching.

---

## 5. Methodological Limitations

1. **Short Observation Window (14.36 Minutes):**
   * Real cloud provider policies evaluate access over 30 to 90 days. Because this trace captures a high-resolution 14.36-minute production snapshot, access frequency and recency are observed over minutes rather than months. We incorporate `file_age_days` (which spans 902 days) to preserve real multi-year lifecycle context.
2. **No Inode File Deletion Visibility:**
   * The trace logs active I/O events. Files that were completely unaccessed during the 14.36 minutes do not appear in the trace. All 13,565 files had at least 1 access event during this trace window.
3. **Data Leakage in Rule Generation:**
   * The target label `storage_tier` is derived via deterministic ranking from `total_accesses`, `seconds_since_last_access`, `activity_span_seconds`, and `cache_hit_ratio`.
   * **Rule of Caution:** In ML modeling, the model must be trained to learn the multi-feature interaction and generalize across all 34 features (including I/O sizes, redundancy, service class, and file age). The target label must **not** be treated as externally collected ground truth, but as a calibrated heuristic proxy.

---

## 6. Alignment with Real Cloud-Provider Storage Policies

In enterprise cloud infrastructures, policy engines apply rule-based tiering analogous to our scoring function:

* **AWS S3 Intelligent-Tiering:** Automatically moves objects between Frequent Access (Hot), Infrequent Access (Cool, after 30 days of no access), and Archive Instant Access (Archive, after 90 days of no access).
* **Google Cloud Storage Auto-Class:** Dynamically transitions objects from Standard to Nearline (Cool) and Coldline/Archive based on per-object access frequency and retention age.
* **Azure Blob Lifecycle Management:** Uses blob prefix filters, last-modified date, and last-access time to trigger Cool and Archive transitions.

Our composite ranking mirrors these industry mechanisms by combining **access volume**, **recency decay**, **activity duration**, and **caching effectiveness** into a unified, balanced tiering target.

---

*Methodology documented and verified against `data/processed/file_level_features.csv`.*
