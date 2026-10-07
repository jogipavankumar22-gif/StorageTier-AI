# Raw Dataset Guide: Google Thesios Storage Trace

## 📁 Source & Overview
This directory is the designated location for the raw storage I/O trace dataset used in this project:
- **Dataset Source:** Google Research Thesios I/O Traces
- **Expected Filename:** `thesios_storage_trace.csv`
- **Expected Location:** `data/raw/thesios_storage_trace.csv`
- **File Size:** ~41.5 MB (41,543,814 bytes)
- **Record Count:** ~168,590 access and I/O event rows
- **Time Scope:** Single-day capture on **2024-01-15** covering **861.38 seconds (~14.36 minutes)** of active high-resolution distributed storage telemetry across 76 enterprise storage applications.

---

## 🚫 Why the Raw CSV is Excluded from Git
To adhere to best practices for repository maintenance and avoid bloating the Git history with large binary/CSV trace dumps:
1. The raw file `thesios_storage_trace.csv` is explicitly excluded in `.gitignore` (`data/raw/*.csv`).
2. GitHub imposes file and push performance recommendations; large trace dumps should be fetched on demand.
3. **The processed dataset is already included:** The engineered, aggregated file-level feature matrix is tracked in the repository at:
   ```
   data/processed/file_level_features.csv
   ```
   This pre-computed dataset contains all **13,565 unique files** and **37 engineered behavioral features**, allowing you to immediately run the FastAPI backend, React frontend, and model inference pipelines **without** needing to re-parse or re-aggregate the raw 41.5 MB trace.

---

## 📥 How to Obtain and Setup the Raw Dataset
If you wish to re-run the end-to-end data pipeline from scratch (`src/data/create_file_dataset.py`):
1. Obtain the official Google Research Thesios storage trace CSV.
2. Place the file directly in this folder:
   ```
   data/raw/thesios_storage_trace.csv
   ```
3. Run the feature engineering pipeline:
   ```powershell
   python src/data/create_file_dataset.py
   ```
   This will regenerate `data/processed/file_level_features.csv` and output all statistical summaries.
