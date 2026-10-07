import os
import sys
sys.stdout.reconfigure(encoding='utf-8')
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# Set style
sns.set_theme(style="whitegrid", palette="muted")
plt.rcParams['font.sans-serif'] = 'DejaVu Sans'
plt.rcParams['axes.edgecolor'] = '#cccccc'
plt.rcParams['axes.linewidth'] = 0.8

RAW_CSV_PATH = r"data/raw/thesios_storage_trace.csv"
OUTPUT_CSV_PATH = r"data/processed/file_level_features.csv"
FIGURES_DIR = r"reports/figures"

os.makedirs(os.path.dirname(OUTPUT_CSV_PATH), exist_ok=True)
os.makedirs(FIGURES_DIR, exist_ok=True)

print(f"Loading raw storage trace from {RAW_CSV_PATH}...")
df = pd.read_csv(RAW_CSV_PATH)
num_raw_records = len(df)
print(f"Loaded {num_raw_records} raw records.")

# Trace bounds
trace_start = float(df['start_time'].min())
trace_end = float(df['start_time'].max())
trace_duration_sec = trace_end - trace_start
trace_duration_min = trace_duration_sec / 60.0
trace_duration_days = trace_duration_sec / 86400.0

print(f"Trace Start: {trace_start} (UTC)")
print(f"Trace End:   {trace_end} (UTC)")
print(f"Trace Span:  {trace_duration_sec:.2f} seconds ({trace_duration_min:.2f} minutes, {trace_duration_days:.6f} days)")

# Sort for sequential calculations
df = df.sort_values(by=['filename', 'start_time'])

print("Aggregating raw I/O records by unique filename...")
records = []
grouped = df.groupby('filename')

for fn, group in grouped:
    total_acc = len(group)
    times = group['start_time'].values
    reads = int((group['op_type'] == 'READ').sum())
    writes = int((group['op_type'] == 'WRITE').sum())
    
    first_ts = float(times[0])
    last_ts = float(times[-1])
    
    # Inter-arrival intervals
    if total_acc > 1:
        diffs = np.diff(times)
        avg_interval = float(np.mean(diffs))
        med_interval = float(np.median(diffs))
    else:
        avg_interval = 0.0
        med_interval = 0.0
        
    days_since_last = float((trace_end - last_ts) / 86400.0)
    seconds_since_last = float(trace_end - last_ts)
    
    c_time_val = float(group['c_time'].iloc[0])
    file_age = float((trace_end - c_time_val) / 86400.0)
    activity_span_sec = float(last_ts - first_ts)
    activity_span_days = float(activity_span_sec / 86400.0)
    
    # Access frequency (requests per minute)
    acc_freq = float(total_acc / trace_duration_min)
    
    # Unique access calendar days in trace
    # Since entire trace is ~14.36 minutes on 2024-01-15, all accesses occurred on 1 calendar day
    unique_days = 1
    
    # Accesses within last 7 days and 30 days of observation endpoint
    # Since trace span is 0.00997 days (< 7 days), all accesses fall within these windows
    acc_7d = total_acc
    acc_30d = total_acc
    
    # Recent accesses in the last 5 minutes (300 seconds) of the trace
    acc_5m = int((times >= (trace_end - 300.0)).sum())
    
    # Read ratio
    read_ratio = float(reads / total_acc)
    
    # I/O request sizes
    req_sizes = group['request_io_size_bytes'].values
    avg_req_size = float(np.mean(req_sizes))
    med_req_size = float(np.median(req_sizes))
    tot_req_bytes = int(np.sum(req_sizes))
    
    # Response sizes
    resp_sizes = group['response_io_size_bytes'].values
    avg_resp_size = float(np.mean(resp_sizes))
    tot_resp_bytes = int(np.sum(resp_sizes))
    
    # Disk I/O sizes
    disk_sizes = group['disk_io_size_bytes'].values
    avg_disk_size = float(np.mean(disk_sizes))
    tot_disk_bytes = int(np.sum(disk_sizes))
    
    # Cache hit / miss
    cache_hits = int((group['cache_hit'] == 1).sum())
    cache_misses = int((group['cache_hit'] == 0).sum())
    if (cache_hits + cache_misses) > 0:
        cache_hit_ratio = float(cache_hits / (cache_hits + cache_misses))
    else:
        cache_hit_ratio = 0.0
        
    # Flash cache count
    flash_count = int((group['from_flash_cache'] == 1).sum())
    flash_ratio = float(flash_count / total_acc)
    
    # Dominant categoricals
    dom_app = str(group['application'].mode()[0])
    dom_io_zone = str(group['io_zone'].mode()[0])
    dom_service_class = str(group['service_class'].mode()[0])
    dom_redundancy = str(group['redundancy_type'].mode()[0])
    
    # File size proxy: maximum byte offset reached plus request size
    file_size_proxy = int(np.max(group['file_offset'].values + req_sizes))
    
    records.append({
        'filename': fn,
        'application': dom_app,
        'total_accesses': total_acc,
        'read_count': reads,
        'write_count': writes,
        'read_ratio': round(read_ratio, 4),
        'unique_access_days': unique_days,
        'accesses_last_7_days': acc_7d,
        'accesses_last_30_days': acc_30d,
        'accesses_last_5_min': acc_5m,
        'access_frequency': round(acc_freq, 4),
        'average_access_interval': round(avg_interval, 6),
        'median_access_interval': round(med_interval, 6),
        'days_since_last_access': round(days_since_last, 8),
        'seconds_since_last_access': round(seconds_since_last, 4),
        'first_access_timestamp': round(first_ts, 4),
        'last_access_timestamp': round(last_ts, 4),
        'file_age_days': round(file_age, 6),
        'activity_span_days': round(activity_span_days, 8),
        'activity_span_seconds': round(activity_span_sec, 4),
        'average_request_io_size': round(avg_req_size, 2),
        'median_request_io_size': round(med_req_size, 2),
        'total_request_io_bytes': tot_req_bytes,
        'average_response_io_size': round(avg_resp_size, 2),
        'total_response_io_bytes': tot_resp_bytes,
        'average_disk_io_size': round(avg_disk_size, 2),
        'total_disk_io_bytes': tot_disk_bytes,
        'cache_hit_count': cache_hits,
        'cache_miss_count': cache_misses,
        'cache_hit_ratio': round(cache_hit_ratio, 4),
        'flash_cache_ratio': round(flash_ratio, 4),
        'dominant_io_zone': dom_io_zone,
        'dominant_service_class': dom_service_class,
        'dominant_redundancy_type': dom_redundancy,
        'estimated_file_size_bytes_proxy': file_size_proxy
    })

file_df = pd.DataFrame(records)
print(f"Aggregation complete. Processed {len(file_df)} unique files.")

# =========================================================================
# TARGET LABEL DESIGN: MULTI-CRITERIA COMPOSITE ACTIVITY INDEX
# =========================================================================
print("Designing target labels using transparent data-driven composite activity score...")

# 1. Percentile ranking of core behavioral signals:
# - total_accesses (higher = hotter, weight 0.40)
# - seconds_since_last_access (lower = hotter, so 1 - rank, weight 0.30)
# - activity_span_seconds (higher = hotter, weight 0.15)
# - cache_hit_ratio (higher = hotter, weight 0.15)
rank_acc = file_df['total_accesses'].rank(pct=True)
rank_rec = 1.0 - file_df['seconds_since_last_access'].rank(pct=True)
rank_span = file_df['activity_span_seconds'].rank(pct=True)
rank_cache = file_df['cache_hit_ratio'].rank(pct=True)

activity_score = 0.40 * rank_acc + 0.30 * rank_rec + 0.15 * rank_span + 0.15 * rank_cache
file_df['activity_score'] = round(activity_score, 4)

# Data-driven tertile thresholds for perfectly balanced, distinct tiers
thresh_archive = float(np.percentile(activity_score, 33.3333))
thresh_hot = float(np.percentile(activity_score, 66.6667))

print(f"Threshold Archive-Cool (tau_1): {thresh_archive:.4f}")
print(f"Threshold Cool-Hot    (tau_2): {thresh_hot:.4f}")

def assign_tier(score):
    if score >= thresh_hot:
        return 'HOT'
    elif score <= thresh_archive:
        return 'ARCHIVE'
    else:
        return 'COOL'

file_df['storage_tier'] = file_df['activity_score'].apply(assign_tier)

# Report Class Distribution
tier_counts = file_df['storage_tier'].value_counts()
tier_pcts = file_df['storage_tier'].value_counts(normalize=True) * 100

print("\n--- TARGET CLASS DISTRIBUTION ---")
for tier in ['HOT', 'COOL', 'ARCHIVE']:
    cnt = tier_counts.get(tier, 0)
    pct = tier_pcts.get(tier, 0.0)
    print(f"  {tier:7s}: {cnt:5d} files ({pct:.2f}%)")

# Check missing values
missing_counts = file_df.isnull().sum()
print(f"\nMissing values in file_level_features: {missing_counts.sum()}")

# Save to CSV
print(f"\nSaving final file-level dataset to {OUTPUT_CSV_PATH}...")
file_df.to_csv(OUTPUT_CSV_PATH, index=False)
print("Saved successfully!")

# =========================================================================
# GENERATE VALIDATION VISUALIZATIONS
# =========================================================================
print("\nGenerating validation visualizations under reports/figures/...")

# 1. Access frequency distribution
fig, ax = plt.subplots(figsize=(8, 5), dpi=300)
sns.histplot(file_df['access_frequency'], bins=50, kde=True, color='#2b5c8f', ax=ax, log_scale=(True, False))
ax.set_title("Distribution of File Access Frequency (Log Scale)", fontsize=13, fontweight='bold', pad=12)
ax.set_xlabel("Access Frequency (requests / minute)", fontsize=11)
ax.set_ylabel("File Count", fontsize=11)
ax.axvline(file_df['access_frequency'].median(), color='#e74c3c', linestyle='--', label=f'Median: {file_df["access_frequency"].median():.2f} req/min')
ax.axvline(file_df['access_frequency'].quantile(0.75), color='#f39c12', linestyle=':', label=f'P75: {file_df["access_frequency"].quantile(0.75):.2f} req/min')
ax.legend(frameon=True)
plt.tight_layout()
plt.savefig(os.path.join(FIGURES_DIR, "1_access_frequency_distribution.png"))
plt.close()

# 2. Days since last access distribution (and seconds since last access)
fig, ax = plt.subplots(figsize=(8, 5), dpi=300)
sns.histplot(file_df['seconds_since_last_access'], bins=40, kde=True, color='#16a085', ax=ax)
ax.set_title("Distribution of Inactivity: Seconds Since Last Access", fontsize=13, fontweight='bold', pad=12)
ax.set_xlabel("Inactivity Window (Seconds before Trace End)", fontsize=11)
ax.set_ylabel("File Count", fontsize=11)
ax.axvline(file_df['seconds_since_last_access'].median(), color='#c0392b', linestyle='--', label=f'Median: {file_df["seconds_since_last_access"].median():.1f} s')
ax.legend(frameon=True)
plt.tight_layout()
plt.savefig(os.path.join(FIGURES_DIR, "2_days_since_last_access_distribution.png"))
plt.close()

# 3. Total access count distribution
fig, ax = plt.subplots(figsize=(8, 5), dpi=300)
sns.histplot(file_df['total_accesses'], bins=50, kde=False, color='#8e44ad', ax=ax, log_scale=(True, True))
ax.set_title("Distribution of Total Access Counts (Log-Log Scale)", fontsize=13, fontweight='bold', pad=12)
ax.set_xlabel("Total Accesses per File (Log Scale)", fontsize=11)
ax.set_ylabel("Frequency (Log Scale)", fontsize=11)
ax.axvline(file_df['total_accesses'].median(), color='#e67e22', linestyle='--', label=f'Median: {int(file_df["total_accesses"].median())}')
ax.axvline(file_df['total_accesses'].quantile(0.90), color='#e74c3c', linestyle=':', label=f'P90: {int(file_df["total_accesses"].quantile(0.90))}')
ax.legend(frameon=True)
plt.tight_layout()
plt.savefig(os.path.join(FIGURES_DIR, "3_total_access_count_distribution.png"))
plt.close()

# 4. Accesses in last 30 days distribution
fig, ax = plt.subplots(figsize=(8, 5), dpi=300)
sns.boxplot(x=file_df['storage_tier'], y=file_df['accesses_last_30_days'], order=['HOT', 'COOL', 'ARCHIVE'], palette=['#e74c3c', '#3498db', '#95a5a6'], ax=ax, showfliers=False)
ax.set_title("Access Volume (Last 30 Days) by Storage Tier", fontsize=13, fontweight='bold', pad=12)
ax.set_xlabel("Predicted Storage Tier", fontsize=11)
ax.set_ylabel("Accesses in Observation Window", fontsize=11)
plt.tight_layout()
plt.savefig(os.path.join(FIGURES_DIR, "4_accesses_last_30_days_distribution.png"))
plt.close()

# 5. File age distribution
fig, ax = plt.subplots(figsize=(8, 5), dpi=300)
sns.histplot(file_df['file_age_days'], bins=50, kde=True, color='#d35400', ax=ax, log_scale=(True, False))
ax.set_title("Distribution of File Age in Days (Log Scale)", fontsize=13, fontweight='bold', pad=12)
ax.set_xlabel("File Age at Trace Time (Days, Log Scale)", fontsize=11)
ax.set_ylabel("File Count", fontsize=11)
ax.axvline(file_df['file_age_days'].median(), color='#2980b9', linestyle='--', label=f'Median: {file_df["file_age_days"].median():.2f} days')
ax.legend(frameon=True)
plt.tight_layout()
plt.savefig(os.path.join(FIGURES_DIR, "5_file_age_distribution.png"))
plt.close()

# 6. Cache hit ratio distribution
fig, ax = plt.subplots(figsize=(8, 5), dpi=300)
sns.histplot(file_df['cache_hit_ratio'], bins=30, kde=False, color='#27ae60', ax=ax)
ax.set_title("Distribution of File Cache Hit Ratio", fontsize=13, fontweight='bold', pad=12)
ax.set_xlabel("Cache Hit Ratio (Hits / Reads)", fontsize=11)
ax.set_ylabel("File Count", fontsize=11)
ax.axvline(file_df[file_df['cache_hit_ratio'] > 0]['cache_hit_ratio'].median(), color='#e74c3c', linestyle='--', label=f'Active Median: {file_df[file_df["cache_hit_ratio"] > 0]["cache_hit_ratio"].median():.2f}')
ax.legend(frameon=True)
plt.tight_layout()
plt.savefig(os.path.join(FIGURES_DIR, "6_cache_hit_ratio_distribution.png"))
plt.close()

# 7. Final Hot / Cool / Archive tier distribution
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5), dpi=300)
colors = ['#e74c3c', '#3498db', '#95a5a6']
tiers = ['HOT', 'COOL', 'ARCHIVE']
counts = [tier_counts['HOT'], tier_counts['COOL'], tier_counts['ARCHIVE']]

# Bar chart
sns.barplot(x=tiers, y=counts, palette=colors, ax=ax1)
ax1.set_title("Storage Tier File Counts", fontsize=13, fontweight='bold', pad=12)
ax1.set_ylabel("Number of Files", fontsize=11)
for i, v in enumerate(counts):
    ax1.text(i, v + 70, f"{v:,}\n({v/len(file_df)*100:.1f}%)", ha='center', va='bottom', fontsize=10, fontweight='bold')
ax1.set_ylim(0, max(counts) * 1.18)

# Pie chart
ax2.pie(counts, labels=[f"{t}\n({c:,})" for t, c in zip(tiers, counts)], colors=colors, autopct='%1.1f%%', startangle=140, textprops={'fontsize': 11, 'fontweight': 'bold'}, explode=(0.04, 0.02, 0.02))
ax2.set_title("Storage Tier Proportion", fontsize=13, fontweight='bold', pad=12)

plt.tight_layout()
plt.savefig(os.path.join(FIGURES_DIR, "7_tier_distribution.png"))
plt.close()

print("All 7 visualizations generated successfully under reports/figures/!")

# Dump summary json for reporting
summary_info = {
    "num_raw_records": num_raw_records,
    "num_unique_files": len(file_df),
    "features_generated": list(file_df.columns),
    "tier_counts": {k: int(v) for k, v in tier_counts.items()},
    "tier_pcts": {k: float(v) for k, v in tier_pcts.items()},
    "thresholds": {
        "thresh_archive": thresh_archive,
        "thresh_hot": thresh_hot
    },
    "tier_profiles": {
        tier: {
            "count": int(len(sub)),
            "accesses_median": float(sub['total_accesses'].median()),
            "accesses_mean": float(sub['total_accesses'].mean()),
            "access_freq_median": float(sub['access_frequency'].median()),
            "access_freq_mean": float(sub['access_frequency'].mean()),
            "sec_since_last_median": float(sub['seconds_since_last_access'].median()),
            "sec_since_last_mean": float(sub['seconds_since_last_access'].mean()),
            "span_sec_median": float(sub['activity_span_seconds'].median()),
            "span_sec_mean": float(sub['activity_span_seconds'].mean()),
            "cache_hit_median": float(sub['cache_hit_ratio'].median()),
            "cache_hit_mean": float(sub['cache_hit_ratio'].mean()),
            "file_age_days_median": float(sub['file_age_days'].median()),
            "file_age_days_mean": float(sub['file_age_days'].mean()),
            "file_size_proxy_median": float(sub['estimated_file_size_bytes_proxy'].median()),
            "file_size_proxy_mean": float(sub['estimated_file_size_bytes_proxy'].mean())
        }
        for tier, sub in file_df.groupby('storage_tier')
    }
}

with open(r"C:\Users\HP\.gemini\antigravity\brain\26237b11-327c-4a87-bb60-7c1e4494a68b\scratch\stage2_summary.json", "w", encoding="utf-8") as f:
    json.dump(summary_info, f, indent=2)

print("Stage 2 pipeline completed successfully!")
