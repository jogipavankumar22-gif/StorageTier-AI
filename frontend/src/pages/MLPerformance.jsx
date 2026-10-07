import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  ShieldAlert,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

import api from '../services/api';
import TierBadge from '../components/TierBadge';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';


export default function MLPerformance() {
  const [perfData, setPerfData] = useState(null);
  const [importanceData, setImportanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([api.getModelsPerformance(), api.getFeatureImportance()])
      .then(([perfRes, impRes]) => {
        if (mounted) {
          setPerfData(perfRes);
          setImportanceData(impRes);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err.message || 'Failed to load model performance metrics');
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <LoadingState message="Fetching Stage 3 model validation benchmarks..." />
      </div>
    );
  }

  if (error || !perfData || !importanceData) {
    return (
      <div className="p-6 md:p-8">
        <ErrorState
          title="Error Loading Model Metrics"
          message={error || 'Unable to retrieve Stage 3 evaluation data.'}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  // Format feature importance for Recharts horizontal bar chart (top 10)
  const gainChartData = (importanceData.xgboost_importance || [])
    .slice(0, 10)
    .map((item) => {
      const cleanName = item.feature.startsWith('application_')
        ? 'application (OneHot)'
        : item.feature;
      return {
        feature: cleanName,
        importance: Number((item.importance * 100).toFixed(2)),
        rawImportance: item.importance,
      };
    })
    .reverse(); // Reverse for clean top-to-bottom horizontal display

  return (
    <div className="space-y-8 p-6 md:p-8">
      {/* 1. Academic Interpretation & Required Notice */}
      <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-5 backdrop-blur-md space-y-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-blue-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-blue-300">
            Academic Research Interpretation
          </h3>
        </div>
        <p className="text-xs text-gray-200 leading-relaxed font-medium">
          "XGBoost predicts the project's heuristic storage-tier policy derived from observed file-access behavior with 97.83% test accuracy."
        </p>
        <p className="text-xs text-gray-400 leading-relaxed">
          <strong>Mandatory clarification:</strong> The model is highly accurate at reproducing the project's heuristic labeling
          policy because the policy itself is based heavily on observed access behavior. This 97.83% accuracy reflects policy
          conformance and generalization across 2,713 unseen test files, and should <strong>not</strong> be interpreted as validation
          against externally provided cloud-provider billing or production storage-tier ground truth.
        </p>
      </div>

      {/* 2. Page Title & Best Model Banner */}
      <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-gray-900/60 to-blue-950/40 p-6 backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/30">
                CHAMPION MODEL
              </span>
              <span className="text-xs text-gray-400">Configuration A (Behavioral)</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white">
              XGBoost Classifier — Best Model
            </h2>
            <p className="text-xs text-gray-300 leading-relaxed">
              Trained on 10,852 files with 5-fold stratified cross-validation and evaluated on 2,713 holdout test files.
              Correctly predicted <strong>2,654 out of 2,713 test files</strong> across all three balanced tiers.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
            <div className="rounded-lg border border-gray-800 bg-gray-950/80 p-3 text-center">
              <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Test Accuracy</p>
              <p className="mt-1 text-2xl font-black text-emerald-400">97.83%</p>
              <p className="text-[10px] text-gray-500">2,654 / 2,713 correct</p>
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-950/80 p-3 text-center">
              <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Weighted F1</p>
              <p className="mt-1 text-2xl font-black text-blue-400">0.9783</p>
              <p className="text-[10px] text-gray-500">Macro: 0.9783</p>
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-950/80 p-3 text-center">
              <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">5-Fold CV Mean</p>
              <p className="mt-1 text-2xl font-black text-cyan-400">97.75%</p>
              <p className="text-[10px] text-gray-500">± 0.22% std</p>
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-950/80 p-3 text-center">
              <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Holdout Split</p>
              <p className="mt-1 text-2xl font-black text-purple-400">80 / 20</p>
              <p className="text-[10px] text-gray-500">Seed: 42 (Stratified)</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Comprehensive Model Comparison Table */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 backdrop-blur-md space-y-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-400" />
            Stage 3 Model Benchmark Comparison
          </h3>
          <p className="text-xs text-gray-400">
            Evaluation of Decision Tree, Random Forest, and XGBoost across identical stratified splits
          </p>
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-800 bg-gray-950/80 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              <tr>
                <th className="py-3 px-4">Configuration</th>
                <th className="py-3 px-4">Model Algorithm</th>
                <th className="py-3 px-3 text-right">5-Fold CV Accuracy</th>
                <th className="py-3 px-3 text-right">Test Accuracy</th>
                <th className="py-3 px-3 text-right">Precision (W)</th>
                <th className="py-3 px-3 text-right">Recall (W)</th>
                <th className="py-3 px-3 text-right">Weighted F1</th>
                <th className="py-3 px-3 text-right">Macro F1</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {(perfData.model_comparison || []).map((row, idx) => {
                const isBest = row['Model'] === 'XGBoost' && row['Feature Configuration'].includes('Behavioral');
                return (
                  <tr
                    key={idx}
                    className={`transition-colors ${
                      isBest ? 'bg-blue-600/10 font-medium' : 'hover:bg-gray-850/50'
                    }`}
                  >
                    <td className="py-3 px-4 text-gray-300">
                      {row['Feature Configuration']}
                    </td>
                    <td className="py-3 px-4 flex items-center gap-2">
                      <span className={`font-semibold ${isBest ? 'text-white' : 'text-gray-200'}`}>
                        {row['Model']}
                      </span>
                      {isBest && (
                        <span className="rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 text-[9px] font-bold">
                          BEST
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-cyan-400">
                      {(row['CV Accuracy (Mean)'] * 100).toFixed(2)}% ± {(row['CV Accuracy (Std)'] * 100).toFixed(2)}%
                    </td>
                    <td className={`py-3 px-3 text-right font-mono font-bold ${isBest ? 'text-emerald-400 text-sm' : 'text-gray-200'}`}>
                      {(row['Accuracy'] * 100).toFixed(2)}%
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-gray-300">
                      {(row['Precision (Weighted)'] * 100).toFixed(2)}%
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-gray-300">
                      {(row['Recall (Weighted)'] * 100).toFixed(2)}%
                    </td>
                    <td className={`py-3 px-3 text-right font-mono font-bold ${isBest ? 'text-blue-400 text-sm' : 'text-gray-200'}`}>
                      {Number(row['Weighted F1']).toFixed(4)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-gray-400">
                      {Number(row['Macro F1']).toFixed(4)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Per-Class Performance Breakdown (Best Model: XGBoost) */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Per-Class Metrics (XGBoost on Test Set, N = 2,713)
            </h3>
            <p className="text-xs text-gray-400">
              Holdout evaluation metrics demonstrating balanced performance across all three storage tiers
            </p>
          </div>
          <span className="text-xs font-semibold text-emerald-400">Macro F1: 0.9783</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* ARCHIVE Card */}
          <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <TierBadge tier="ARCHIVE" size="md" />
              <span className="text-xs font-mono text-gray-400">Support: 904</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-purple-500/20">
              <div>
                <p className="text-[10px] uppercase text-gray-400">Precision</p>
                <p className="text-base font-bold text-white">98.78%</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-gray-400">Recall</p>
                <p className="text-base font-bold text-white">98.67%</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-purple-300">F1-Score</p>
                <p className="text-base font-bold text-purple-400">0.9873</p>
              </div>
            </div>
          </div>

          {/* COOL Card */}
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <TierBadge tier="COOL" size="md" />
              <span className="text-xs font-mono text-gray-400">Support: 905</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-cyan-500/20">
              <div>
                <p className="text-[10px] uppercase text-gray-400">Precision</p>
                <p className="text-base font-bold text-white">96.28%</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-gray-400">Recall</p>
                <p className="text-base font-bold text-white">97.24%</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-cyan-300">F1-Score</p>
                <p className="text-base font-bold text-cyan-400">0.9676</p>
              </div>
            </div>
          </div>

          {/* HOT Card */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <TierBadge tier="HOT" size="md" />
              <span className="text-xs font-mono text-gray-400">Support: 904</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-amber-500/20">
              <div>
                <p className="text-[10px] uppercase text-gray-400">Precision</p>
                <p className="text-base font-bold text-white">98.44%</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-gray-400">Recall</p>
                <p className="text-base font-bold text-white">97.57%</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-amber-300">F1-Score</p>
                <p className="text-base font-bold text-amber-400">0.9800</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Configuration A vs Configuration B Comparison */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 backdrop-blur-md space-y-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">
            Dual Configuration Experiment: Behavioral vs Contextual
          </h3>
          <p className="text-xs text-gray-400">
            Evaluating the true source of predictive power and preventing target circularity
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="rounded bg-blue-500/20 px-2 py-0.5 text-xs font-bold text-blue-400 border border-blue-500/30">
                CONFIGURATION A: BEHAVIORAL
              </span>
              <span className="text-xs font-bold text-emerald-400">97.83% Accuracy</span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              Includes complete observable historical access telemetry (total accesses, last 5 min activity,
              access intervals, recency decay, and caching performance).
            </p>
            <div className="rounded-lg bg-gray-950 p-3 text-[11px] text-gray-400 space-y-1">
              <p>• Features: <strong>30 engineered variables</strong></p>
              <p>• Role: <strong>Production Predictor Model</strong></p>
              <p>• Finding: <strong>Captures workload dynamics with high precision</strong></p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="rounded bg-gray-800 px-2 py-0.5 text-xs font-bold text-gray-300 border border-gray-700">
                CONFIGURATION B: CONTEXTUAL
              </span>
              <span className="text-xs font-bold text-cyan-400">76.63% Accuracy</span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              Ablation experiment excluding all direct access frequency, recency, and span variables.
              Uses only static attributes (file size proxy, I/O sizes, application type, and QoS flags).
            </p>
            <div className="rounded-lg bg-gray-950 p-3 text-[11px] text-gray-400 space-y-1">
              <p>• Features: <strong>16 independent variables</strong></p>
              <p>• Role: <strong>Leakage-Free Ablation Study</strong></p>
              <p>• Finding: <strong>Performs well above ~33.33% random baseline</strong></p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-800 bg-gray-950 p-4 text-xs text-gray-300 leading-relaxed">
          <strong>Key Research Finding:</strong> Observed file access behavior is substantially more predictive of the
          heuristic storage-tier policy than static and contextual attributes alone. However, the 76.63% accuracy of
          Configuration B proves that static cluster metadata and transfer block patterns still contain meaningful signal
          above random baseline guessing.
        </div>
      </div>

      {/* 6. Feature Importance: Gain vs Permutation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gain Importance Horizontal Bar Chart */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">XGBoost Gain Importance (Top 10)</h3>
              <p className="text-xs text-gray-400">Relative information gain contributed by splits</p>
            </div>
            <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
              Tree Purity
            </span>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={gainChartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 40]}
                  unit="%"
                  stroke="#6b7280"
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                />
                <YAxis
                  type="category"
                  dataKey="feature"
                  stroke="#6b7280"
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                  width={110}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-gray-700 bg-gray-950 p-2.5 text-xs text-gray-200">
                          <p className="font-semibold text-white">{d.feature}</p>
                          <p className="text-blue-400">
                            Gain Weight: <strong className="text-white">{d.importance}%</strong>
                          </p>
                          <p className="text-gray-400 text-[10px]">
                            Raw score: {Number(d.rawImportance).toFixed(4)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="importance" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                  {gainChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === gainChartData.length - 1 ? '#60a5fa' : '#3b82f6'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-[11px] text-gray-500 border-t border-gray-800/80 pt-2">
            <strong>Gain Importance</strong> measures the average improvement in tree branch impurity brought by each feature across all tree estimators.
          </p>
        </div>

        {/* Permutation Importance Table */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Permutation Importance (Test Set)</h3>
              <p className="text-xs text-gray-400">Model test score degradation upon feature shuffle</p>
            </div>
            <span className="rounded bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-400">
              Holdout Robustness
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-800">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-800 bg-gray-950/80 text-[10px] font-semibold uppercase text-gray-400">
                <tr>
                  <th className="py-2.5 px-3">Feature</th>
                  <th className="py-2.5 px-3 text-right">Mean Accuracy Drop</th>
                  <th className="py-2.5 px-3 text-right">Std Dev</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-mono text-[11px]">
                {(importanceData.permutation_importance || []).slice(0, 7).map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-850/50">
                    <td className="py-2.5 px-3 text-gray-300 font-sans font-medium">
                      {item.feature}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                      -{(item.importance_mean * 100).toFixed(2)}%
                    </td>
                    <td className="py-2.5 px-3 text-right text-gray-500">
                      ±{(item.importance_std * 100).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-gray-500 border-t border-gray-800/80 pt-2">
            <strong>Permutation Importance</strong> quantifies the true drop in holdout test accuracy when a feature's values are randomly permuted. Confirms <code>total_accesses</code> and <code>days_since_last_access</code> as the critical behavioral anchors.
          </p>
        </div>
      </div>

      {/* 7. Confusion Matrices Section (Reusing Stage 3 Figures) */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 backdrop-blur-md space-y-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">
            Stage 3 Confusion Matrices (Actual Figures)
          </h3>
          <p className="text-xs text-gray-400">
            Normalized confusion matrices generated during Stage 3 model validation
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Behavioral Matrix */}
          <div className="rounded-xl border border-blue-500/30 bg-gray-950 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">
                Behavioral Configuration (XGBoost)
              </span>
              <span className="rounded bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-300">
                97.83% Test Accuracy
              </span>
            </div>
            <div className="overflow-hidden rounded-lg border border-gray-800 bg-black flex items-center justify-center p-2">
              <img
                src="/figures/confusion_matrix_behavioral.png"
                alt="XGBoost Behavioral Confusion Matrix"
                className="max-h-72 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement.innerHTML =
                    '<p class="text-xs text-gray-500 p-8">Confusion matrix image: reports/figures/confusion_matrix_behavioral.png</p>';
                }}
              />
            </div>
            <p className="text-[11px] text-gray-400">
              Clear diagonal dominance across ARCHIVE (98.67%), COOL (97.24%), and HOT (97.57%) with minimal off-diagonal confusion.
            </p>
          </div>

          {/* Contextual Matrix */}
          <div className="rounded-xl border border-gray-700 bg-gray-950 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-300">
                Contextual Configuration (XGBoost)
              </span>
              <span className="rounded bg-gray-800 px-2 py-0.5 text-[10px] font-bold text-gray-400">
                76.63% Test Accuracy
              </span>
            </div>
            <div className="overflow-hidden rounded-lg border border-gray-800 bg-black flex items-center justify-center p-2">
              <img
                src="/figures/confusion_matrix_contextual.png"
                alt="XGBoost Contextual Confusion Matrix"
                className="max-h-72 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement.innerHTML =
                    '<p class="text-xs text-gray-500 p-8">Confusion matrix image: reports/figures/confusion_matrix_contextual.png</p>';
                }}
              />
            </div>
            <p className="text-[11px] text-gray-400">
              Higher dispersion into adjacent classes when access frequency features are removed, while preserving 76.6% diagonal accuracy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
