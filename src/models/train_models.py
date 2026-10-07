import os
import sys
sys.stdout.reconfigure(encoding='utf-8')
import json
import numpy as np
import pandas as pd
import joblib
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.base import clone
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_validate
from sklearn.preprocessing import StandardScaler, OneHotEncoder, LabelEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
from sklearn.inspection import permutation_importance
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, classification_report
)

def main():
    sns.set_theme(style="whitegrid", palette="muted")
    plt.rcParams['font.sans-serif'] = 'DejaVu Sans'
    plt.rcParams['axes.edgecolor'] = '#cccccc'
    plt.rcParams['axes.linewidth'] = 0.8

    CSV_PATH = r"data/processed/file_level_features.csv"
    RESULTS_DIR = r"reports/ml_results"
    FIGURES_DIR = r"reports/figures"
    MODELS_DIR = r"models"

    os.makedirs(RESULTS_DIR, exist_ok=True)
    os.makedirs(FIGURES_DIR, exist_ok=True)
    os.makedirs(MODELS_DIR, exist_ok=True)

    print(f"Loading processed dataset from {CSV_PATH}...", flush=True)
    df = pd.read_csv(CSV_PATH)
    num_samples = len(df)
    print(f"Loaded {num_samples} records. Columns: {len(df.columns)}", flush=True)

    # Target
    target_col = 'storage_tier'
    y_raw = df[target_col]
    label_encoder = LabelEncoder()
    y = label_encoder.fit_transform(y_raw)
    classes = list(label_encoder.classes_)
    print(f"Target classes: {classes} (Encoded as {list(range(len(classes)))})", flush=True)

    # Feature Configurations
    exclude_A = {
        'filename', 'activity_score', 'storage_tier', 'dominant_io_zone',
        'unique_access_days', 'accesses_last_7_days', 'accesses_last_30_days'
    }
    features_A = [c for c in df.columns if c not in exclude_A]
    cat_cols_A = ['application', 'dominant_service_class', 'dominant_redundancy_type']
    num_cols_A = [c for c in features_A if c not in cat_cols_A]

    exclude_B = {
        'filename', 'activity_score', 'storage_tier', 'dominant_io_zone',
        'unique_access_days', 'accesses_last_7_days', 'accesses_last_30_days',
        # Direct target components and direct derivatives
        'total_accesses', 'seconds_since_last_access', 'days_since_last_access',
        'activity_span_days', 'activity_span_seconds',
        'cache_hit_ratio', 'cache_hit_count', 'cache_miss_count',
        'access_frequency', 'accesses_last_5_min',
        'average_access_interval', 'median_access_interval',
        'first_access_timestamp', 'last_access_timestamp'
    }
    features_B = [c for c in df.columns if c not in exclude_B]
    cat_cols_B = ['application', 'dominant_service_class', 'dominant_redundancy_type']
    num_cols_B = [c for c in features_B if c not in cat_cols_B]

    print(f"\nConfiguration A (Behavioral) features count: {len(features_A)}", flush=True)
    print(f"  Numerical: {len(num_cols_A)}, Categorical: {len(cat_cols_A)}", flush=True)
    print(f"Configuration B (Contextual) features count: {len(features_B)}", flush=True)
    print(f"  Numerical: {len(num_cols_B)}, Categorical: {len(cat_cols_B)}", flush=True)

    # Stratified 80/20 train/test split
    idx_train, idx_test = train_test_split(
        np.arange(len(df)),
        test_size=0.20,
        random_state=42,
        stratify=y
    )

    print(f"\nTraining set size: {len(idx_train)} samples", flush=True)
    print(f"Testing set size:  {len(idx_test)} samples", flush=True)

    def build_preprocessor(num_cols, cat_cols):
        return ColumnTransformer(
            transformers=[
                ('num', StandardScaler(), num_cols),
                ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), cat_cols)
            ]
        )

    preprocessor_A = build_preprocessor(num_cols_A, cat_cols_A)
    preprocessor_B = build_preprocessor(num_cols_B, cat_cols_B)

    X_A = df[features_A]
    X_B = df[features_B]

    X_train_A, X_test_A = X_A.iloc[idx_train], X_A.iloc[idx_test]
    X_train_B, X_test_B = X_B.iloc[idx_train], X_B.iloc[idx_test]
    y_train, y_test = y[idx_train], y[idx_test]

    base_models = {
        'Decision Tree': DecisionTreeClassifier(max_depth=10, random_state=42),
        'Random Forest': RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42, n_jobs=1),
        'XGBoost': XGBClassifier(n_estimators=100, max_depth=6, learning_rate=0.1, random_state=42, eval_metric='mlogloss', n_jobs=1)
    }

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    all_results = []
    cv_summary = {}
    trained_pipelines = {}
    confusion_matrices = {}
    classification_reports = {}

    for config_name, X_tr, X_te, preproc, feats in [
        ('Configuration A (Behavioral)', X_train_A, X_test_A, preprocessor_A, features_A),
        ('Configuration B (Contextual)', X_train_B, X_test_B, preprocessor_B, features_B)
    ]:
        print(f"\n=======================================================", flush=True)
        print(f"EVALUATING {config_name.upper()}", flush=True)
        print(f"=======================================================", flush=True)
        
        cv_summary[config_name] = {}
        
        for model_name, base_clf in base_models.items():
            print(f"\n--- Training & Cross-Validating: {model_name} ---", flush=True)
            
            clf = clone(base_clf)
            pre = clone(preproc)
            
            pipe = Pipeline(steps=[
                ('preprocessor', pre),
                ('classifier', clf)
            ])
            
            scoring = {'accuracy': 'accuracy', 'f1_weighted': 'f1_weighted', 'f1_macro': 'f1_macro'}
            cv_res = cross_validate(pipe, X_tr, y_train, cv=cv, scoring=scoring, n_jobs=1)
            
            cv_acc_mean = float(np.mean(cv_res['test_accuracy']))
            cv_acc_std = float(np.std(cv_res['test_accuracy']))
            cv_f1_w_mean = float(np.mean(cv_res['test_f1_weighted']))
            cv_f1_w_std = float(np.std(cv_res['test_f1_weighted']))
            cv_f1_m_mean = float(np.mean(cv_res['test_f1_macro']))
            
            print(f"  5-Fold CV Accuracy:    {cv_acc_mean:.4f} (+/- {cv_acc_std:.4f})", flush=True)
            print(f"  5-Fold CV Weighted F1: {cv_f1_w_mean:.4f} (+/- {cv_f1_w_std:.4f})", flush=True)
            
            cv_summary[config_name][model_name] = {
                'cv_accuracy_mean': cv_acc_mean,
                'cv_accuracy_std': cv_acc_std,
                'cv_f1_weighted_mean': cv_f1_w_mean,
                'cv_f1_weighted_std': cv_f1_w_std,
                'cv_f1_macro_mean': cv_f1_m_mean
            }
            
            # Fit on full training set
            pipe.fit(X_tr, y_train)
            trained_pipelines[(config_name, model_name)] = pipe
            
            # Evaluate on test set
            y_pred = pipe.predict(X_te)
            
            acc = float(accuracy_score(y_test, y_pred))
            prec_macro = float(precision_score(y_test, y_pred, average='macro'))
            prec_weighted = float(precision_score(y_test, y_pred, average='weighted'))
            rec_macro = float(recall_score(y_test, y_pred, average='macro'))
            rec_weighted = float(recall_score(y_test, y_pred, average='weighted'))
            f1_w = float(f1_score(y_test, y_pred, average='weighted'))
            f1_m = float(f1_score(y_test, y_pred, average='macro'))
            cm = confusion_matrix(y_test, y_pred).tolist()
            cr = classification_report(y_test, y_pred, target_names=classes, output_dict=True)
            
            confusion_matrices[(config_name, model_name)] = cm
            classification_reports[(config_name, model_name)] = cr
            
            print(f"  Test Accuracy:    {acc:.4f}", flush=True)
            print(f"  Test Weighted F1: {f1_w:.4f}", flush=True)
            print(f"  Test Macro F1:    {f1_m:.4f}", flush=True)
            
            all_results.append({
                'Feature Configuration': config_name,
                'Model': model_name,
                'CV Accuracy (Mean)': round(cv_acc_mean, 4),
                'CV Accuracy (Std)': round(cv_acc_std, 4),
                'CV Weighted F1 (Mean)': round(cv_f1_w_mean, 4),
                'Accuracy': round(acc, 4),
                'Precision (Weighted)': round(prec_weighted, 4),
                'Precision (Macro)': round(prec_macro, 4),
                'Recall (Weighted)': round(rec_weighted, 4),
                'Recall (Macro)': round(rec_macro, 4),
                'Weighted F1': round(f1_w, 4),
                'Macro F1': round(f1_m, 4)
            })

    results_df = pd.DataFrame(all_results)
    print("\n=======================================================", flush=True)
    print("MODEL COMPARISON TABLE", flush=True)
    print("=======================================================", flush=True)
    print(results_df[['Feature Configuration', 'Model', 'Accuracy', 'Precision (Weighted)', 'Recall (Weighted)', 'Weighted F1', 'Macro F1']].to_string(index=False), flush=True)

    comparison_csv = os.path.join(RESULTS_DIR, "model_comparison.csv")
    results_df.to_csv(comparison_csv, index=False)
    print(f"\nSaved comparison table to {comparison_csv}", flush=True)

    with open(os.path.join(RESULTS_DIR, "cv_results.json"), "w", encoding="utf-8") as f:
        json.dump(cv_summary, f, indent=2)

    with open(os.path.join(RESULTS_DIR, "classification_reports.json"), "w", encoding="utf-8") as f:
        json.dump({f"{k[0]} - {k[1]}": v for k, v in classification_reports.items()}, f, indent=2)

    best_row = results_df.sort_values(by='Weighted F1', ascending=False).iloc[0]
    best_config = best_row['Feature Configuration']
    best_model_name = best_row['Model']
    best_f1 = best_row['Weighted F1']
    print(f"\n>>> BEST OVERALL MODEL: {best_model_name} under {best_config} (Weighted F1: {best_f1:.4f})", flush=True)

    best_A_row = results_df[results_df['Feature Configuration'].str.contains('Configuration A')].sort_values(by='Weighted F1', ascending=False).iloc[0]
    best_B_row = results_df[results_df['Feature Configuration'].str.contains('Configuration B')].sort_values(by='Weighted F1', ascending=False).iloc[0]

    # Feature Importance for Configuration A
    print("\nExtracting feature importance for Random Forest and XGBoost under Configuration A...", flush=True)
    rf_pipe_A = trained_pipelines[('Configuration A (Behavioral)', 'Random Forest')]
    xgb_pipe_A = trained_pipelines[('Configuration A (Behavioral)', 'XGBoost')]

    raw_feat_names_A = rf_pipe_A.named_steps['preprocessor'].get_feature_names_out()
    clean_feature_names_A = [f.replace('num__', '').replace('cat__', '') for f in raw_feat_names_A]

    rf_importances_A = rf_pipe_A.named_steps['classifier'].feature_importances_
    xgb_importances_A = xgb_pipe_A.named_steps['classifier'].feature_importances_

    rf_imp_df = pd.DataFrame({'feature': clean_feature_names_A, 'importance': rf_importances_A}).sort_values(by='importance', ascending=False)
    xgb_imp_df = pd.DataFrame({'feature': clean_feature_names_A, 'importance': xgb_importances_A}).sort_values(by='importance', ascending=False)

    print("\nTop 10 Features (Random Forest — Config A):", flush=True)
    for idx, r in rf_imp_df.head(10).iterrows():
        print(f"  {r['feature']:35s}: {r['importance']:.4f}", flush=True)

    print("\nTop 10 Features (XGBoost — Config A):", flush=True)
    for idx, r in xgb_imp_df.head(10).iterrows():
        print(f"  {r['feature']:35s}: {r['importance']:.4f}", flush=True)

    # Plot Random Forest Feature Importance
    fig, ax = plt.subplots(figsize=(10, 6), dpi=300)
    top_rf = rf_imp_df.head(15).sort_values(by='importance', ascending=True)
    ax.barh(top_rf['feature'], top_rf['importance'], color='#2b5c8f')
    ax.set_title("Top 15 Feature Importances — Random Forest (Configuration A)", fontsize=13, fontweight='bold', pad=12)
    ax.set_xlabel("Gini Feature Importance", fontsize=11)
    plt.tight_layout()
    rf_fig_path = os.path.join(FIGURES_DIR, "feature_importance_random_forest.png")
    plt.savefig(rf_fig_path)
    plt.close()
    print(f"Saved Random Forest feature importance to {rf_fig_path}", flush=True)

    # Plot XGBoost Feature Importance
    fig, ax = plt.subplots(figsize=(10, 6), dpi=300)
    top_xgb = xgb_imp_df.head(15).sort_values(by='importance', ascending=True)
    ax.barh(top_xgb['feature'], top_xgb['importance'], color='#d35400')
    ax.set_title("Top 15 Feature Importances — XGBoost (Configuration A)", fontsize=13, fontweight='bold', pad=12)
    ax.set_xlabel("Gain / Split Importance", fontsize=11)
    plt.tight_layout()
    xgb_fig_path = os.path.join(FIGURES_DIR, "feature_importance_xgboost.png")
    plt.savefig(xgb_fig_path)
    plt.close()
    print(f"Saved XGBoost feature importance to {xgb_fig_path}", flush=True)

    # Permutation Importance on Best Model (XGBoost Configuration A)
    print("\nComputing Permutation Importance for Best Model (XGBoost)...", flush=True)
    perm_res = permutation_importance(xgb_pipe_A, X_test_A, y_test, n_repeats=5, random_state=42, n_jobs=1)
    perm_df = pd.DataFrame({
        'feature': features_A,
        'importance_mean': perm_res.importances_mean,
        'importance_std': perm_res.importances_std
    }).sort_values(by='importance_mean', ascending=False)
    
    print("\nTop 10 Permutation Importance (Test Set — XGBoost Config A):", flush=True)
    for idx, r in perm_df.head(10).iterrows():
        print(f"  {r['feature']:30s}: {r['importance_mean']:.4f} (+/- {r['importance_std']:.4f})", flush=True)

    # Confusion Matrices
    print("\nPlotting confusion matrices...", flush=True)
    def plot_cm(cm, title, out_path):
        fig, ax = plt.subplots(figsize=(7, 6), dpi=300)
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=classes, yticklabels=classes, ax=ax, cbar=False, annot_kws={'size': 14, 'fontweight': 'bold'})
        ax.set_title(title, fontsize=13, fontweight='bold', pad=14)
        ax.set_xlabel("Predicted Storage Tier", fontsize=11, fontweight='bold', labelpad=10)
        ax.set_ylabel("True Storage Tier", fontsize=11, fontweight='bold', labelpad=10)
        plt.tight_layout()
        plt.savefig(out_path)
        plt.close()

    cm_A = confusion_matrices[('Configuration A (Behavioral)', best_A_row['Model'])]
    cm_A_path = os.path.join(FIGURES_DIR, "confusion_matrix_behavioral.png")
    plot_cm(cm_A, f"Confusion Matrix: {best_A_row['Model']}\n(Configuration A — Behavioral)", cm_A_path)
    print(f"Saved behavioral confusion matrix to {cm_A_path}", flush=True)

    cm_B = confusion_matrices[('Configuration B (Contextual)', best_B_row['Model'])]
    cm_B_path = os.path.join(FIGURES_DIR, "confusion_matrix_contextual.png")
    plot_cm(cm_B, f"Confusion Matrix: {best_B_row['Model']}\n(Configuration B — Contextual)", cm_B_path)
    print(f"Saved contextual confusion matrix to {cm_B_path}", flush=True)

    # Model Serialization
    print("\nSerializing best model and pipeline...", flush=True)
    best_pipeline = trained_pipelines[(best_config, best_model_name)]

    best_model_path = os.path.join(MODELS_DIR, "best_model.joblib")
    joblib.dump(best_pipeline, best_model_path)
    print(f"Saved best pipeline to {best_model_path}", flush=True)

    preprocessor_path = os.path.join(MODELS_DIR, "preprocessor.joblib")
    joblib.dump(best_pipeline.named_steps['preprocessor'], preprocessor_path)
    print(f"Saved preprocessor to {preprocessor_path}", flush=True)

    label_encoder_path = os.path.join(MODELS_DIR, "label_encoder.joblib")
    joblib.dump(label_encoder, label_encoder_path)

    metadata = {
        "model_name": best_model_name,
        "feature_configuration": best_config,
        "training_date": "2026-10-07",
        "training_samples": int(len(idx_train)),
        "testing_samples": int(len(idx_test)),
        "features_list": features_A if 'Configuration A' in best_config else features_B,
        "class_names": classes,
        "evaluation_metrics": {
            "accuracy": float(best_row['Accuracy']),
            "precision_weighted": float(best_row['Precision (Weighted)']),
            "recall_weighted": float(best_row['Recall (Weighted)']),
            "f1_weighted": float(best_row['Weighted F1']),
            "f1_macro": float(best_row['Macro F1']),
            "cv_accuracy_mean": float(best_row['CV Accuracy (Mean)']),
            "cv_f1_weighted_mean": float(best_row['CV Weighted F1 (Mean)'])
        },
        "random_seed": 42,
        "top_10_features_random_forest": rf_imp_df.head(10).to_dict(orient='records'),
        "top_10_features_xgboost": xgb_imp_df.head(10).to_dict(orient='records'),
        "top_10_permutation_importance": perm_df.head(10).to_dict(orient='records')
    }

    metadata_path = os.path.join(MODELS_DIR, "model_metadata.json")
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved metadata to {metadata_path}", flush=True)

    print("\nSUCCESS: Stage 3 training and validation completed successfully!", flush=True)

if __name__ == '__main__':
    main()
