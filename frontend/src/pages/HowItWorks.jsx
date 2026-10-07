import React from 'react';
import {
  Workflow,
  Database,
  Layers,
  Tag,
  Cpu,
  BarChart3,
  Award,
  Zap,
  Bot,
  ShieldAlert,
  Activity,
} from 'lucide-react';


export default function HowItWorks() {
  const steps = [
    {
      num: 1,
      title: 'Raw Google Thesios Storage Trace',
      subtitle: 'Low-Level I/O Event Logging',
      icon: Database,
      badge: '168,590 Events',
      color: 'blue',
      content: (
        <div className="space-y-2 text-xs text-gray-300">
          <p>
            The project starts with empirical cloud storage traces collected from Google's Thesios distributed
            cluster research environment on <strong>2024-01-15</strong> spanning an intensive <strong>14.36-minute</strong> window.
          </p>
          <div className="rounded-lg bg-gray-950 p-2.5 font-mono text-[11px] text-gray-400">
            Raw columns: <code>filename, op_type, file_offset, request_io_size, disk_io_size, cache_hit_count, start_time...</code>
          </div>
        </div>
      ),
    },
    {
      num: 2,
      title: 'Data Aggregation & Grouping',
      subtitle: 'Event-to-File Reduction Pipeline',
      icon: Layers,
      badge: '13,565 Unique Files',
      color: 'cyan',
      content: (
        <div className="space-y-2 text-xs text-gray-300">
          <p>
            Raw I/O access events are grouped by unique 64-character SHA-256 file identifiers:
          </p>
          <div className="rounded-lg bg-gray-950 p-2.5 font-mono text-[11px] text-cyan-300">
            GROUP BY filename → 13,565 single file rows (100% complete, 0 missing values)
          </div>
        </div>
      ),
    },
    {
      num: 3,
      title: 'Multi-Dimensional Feature Engineering',
      subtitle: '37 Telemetry Attributes Generated',
      icon: Activity,
      badge: '37 Features',
      color: 'purple',
      content: (
        <div className="space-y-2 text-xs text-gray-300">
          <p>
            Engineered 37 features across 7 complementary dimensions of storage access behavior:
          </p>
          <div className="grid grid-cols-2 gap-1.5 text-[11px] text-gray-400">
            <span className="rounded bg-gray-950 px-2 py-1">• Access Frequency (9)</span>
            <span className="rounded bg-gray-950 px-2 py-1">• Temporal Intervals (6)</span>
            <span className="rounded bg-gray-950 px-2 py-1">• I/O Volume & Granularity (7)</span>
            <span className="rounded bg-gray-950 px-2 py-1">• Cache & Flash Metrics (4)</span>
          </div>
        </div>
      ),
    },
    {
      num: 4,
      title: 'Heuristic Composite Activity Index & Pseudo-Labeling',
      subtitle: 'Multi-Factor Policy Formulation',
      icon: Tag,
      badge: 'Balanced ~1:1:1',
      color: 'amber',
      content: (
        <div className="space-y-3 text-xs text-gray-300">
          <p>
            Because raw I/O traces lack pre-assigned tier ground-truth, an empirical <strong>Composite Storage Activity Index ($S_i$)</strong> was formulated:
          </p>
          <div className="rounded-lg bg-gray-950 p-3 font-mono text-[11px] text-amber-300 border border-amber-500/20">
            S_i = 0.40·R_access + 0.30·R_recency + 0.15·R_span + 0.15·R_cache
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
            <div className="rounded bg-gray-950 p-2 border border-amber-500/30">
              <span className="text-amber-400 font-bold">HOT (33.34%)</span>
              <p className="text-[10px] text-gray-400">S ≥ 0.6027</p>
            </div>
            <div className="rounded bg-gray-950 p-2 border border-cyan-500/30">
              <span className="text-cyan-400 font-bold">COOL (33.34%)</span>
              <p className="text-[10px] text-gray-400">0.4061 &lt; S &lt; 0.6027</p>
            </div>
            <div className="rounded bg-gray-950 p-2 border border-purple-500/30">
              <span className="text-purple-400 font-bold">ARCHIVE (33.33%)</span>
              <p className="text-[10px] text-gray-400">S ≤ 0.4061</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      num: 5,
      title: 'Supervised ML Model Training',
      subtitle: 'Dual Configuration Leakage Prevention',
      icon: Cpu,
      badge: '3 Algorithms',
      color: 'blue',
      content: (
        <div className="space-y-2 text-xs text-gray-300">
          <p>
            Trained Decision Tree, Random Forest, and XGBoost using standardized scikit-learn pipelines:
          </p>
          <div className="rounded-lg bg-gray-950 p-2.5 text-[11px] text-gray-400 space-y-1">
            <p>• <strong>StandardScaler:</strong> Standardized all continuous numeric features.</p>
            <p>• <strong>OneHotEncoder:</strong> Encoded categorical application and redundancy keys.</p>
            <p>• <strong>Pipeline:</strong> Strictly encapsulated to eliminate cross-validation fold leakage.</p>
          </div>
        </div>
      ),
    },
    {
      num: 6,
      title: 'Cross-Validation & Holdout Evaluation',
      subtitle: 'Rigorous 5-Fold Stratified Validation',
      icon: BarChart3,
      badge: '80 / 20 Split',
      color: 'emerald',
      content: (
        <div className="space-y-2 text-xs text-gray-300">
          <p>
            10,852 training instances were validated via 5-Fold Stratified Cross-Validation (seed: 42),
            followed by final evaluation on 2,713 holdout test files.
          </p>
          <div className="rounded-lg bg-gray-950 p-2 font-mono text-[11px] text-emerald-400 text-center">
            Stratified 5-Fold Mean Accuracy: 97.75% ± 0.22%
          </div>
        </div>
      ),
    },
    {
      num: 7,
      title: 'Champion Model Selection',
      subtitle: 'XGBoost Configuration A Crowned Champion',
      icon: Award,
      badge: '97.83% Accuracy',
      color: 'emerald',
      content: (
        <div className="space-y-2 text-xs text-gray-300">
          <p>
            <strong>XGBoost</strong> outperformed all alternatives across every metric:
          </p>
          <div className="grid grid-cols-2 gap-2 text-center text-[11px]">
            <div className="rounded bg-gray-950 p-2">
              <span className="text-gray-400">Test Accuracy</span>
              <p className="font-bold text-emerald-400 text-sm">97.83%</p>
            </div>
            <div className="rounded bg-gray-950 p-2">
              <span className="text-gray-400">Weighted F1</span>
              <p className="font-bold text-blue-400 text-sm">0.9783</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      num: 8,
      title: 'Live Real-Time Inference Service',
      subtitle: 'FastAPI Production Model Serving',
      icon: Zap,
      badge: 'REST API Active',
      color: 'blue',
      content: (
        <div className="space-y-2 text-xs text-gray-300">
          <p>
            Serialized pipeline (<code>models/best_model.joblib</code>) loaded into memory once on startup
            to serve real-time predictions via <code>POST /api/predict</code> with class confidence probabilities.
          </p>
        </div>
      ),
    },
    {
      num: 9,
      title: 'Generative AI Explanation & Optimization',
      subtitle: 'Future Stage: Multi-Modal Reasoning',
      icon: Bot,
      badge: 'Active Advisory Layer',
      color: 'purple',
      content: (
        <div className="space-y-2 text-xs text-gray-300">
          <p>
            Generative AI explanation and optimization layer: generates human-readable explanations of XGBoost decisions
            and suggests data lifecycle tier transition strategies without overriding the authoritative ML model.
          </p>
          <span className="inline-block rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 text-[10px] font-bold">
            Machine Learning decides. Generative AI explains.
          </span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8 p-6 md:p-8">
      {/* 1. Page Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <Workflow className="h-5 w-5 text-blue-400" />
          System Architecture & Pipeline Walkthrough
        </h2>
        <p className="text-xs text-gray-400">
          Educational 9-step progression from raw Google Thesios I/O traces to real-time machine learning tier predictions
        </p>
      </div>

      {/* 2. Research Integrity Banner */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 backdrop-blur-sm space-y-1 text-xs">
        <div className="flex items-center gap-2 font-semibold text-blue-300">
          <ShieldAlert className="h-4 w-4" />
          Academic Integrity & Methodology Disclosure
        </div>
        <p className="text-gray-300">
          The models evaluate and reproduce the project's multi-criteria heuristic tiering policy formulated
          from observable access telemetry. The 97.83% accuracy demonstrates strong mathematical policy generalization,
          and is not claimed to reflect validation against commercial cloud billing or vendor-provided tier ground truth.
        </p>
      </div>

      {/* 3. Pipeline Stepper Cards (3x3 grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {steps.map((step) => {
          const Icon = step.icon;
          const colorStyles = {
            blue: 'border-blue-500/30 from-blue-500/5 to-transparent text-blue-400',
            cyan: 'border-cyan-500/30 from-cyan-500/5 to-transparent text-cyan-400',
            purple: 'border-purple-500/30 from-purple-500/5 to-transparent text-purple-400',
            amber: 'border-amber-500/30 from-amber-500/5 to-transparent text-amber-400',
            emerald: 'border-emerald-500/30 from-emerald-500/5 to-transparent text-emerald-400',
          }[step.color] || 'border-gray-800 text-gray-400';

          return (
            <div
              key={step.num}
              className={`relative flex flex-col justify-between rounded-xl border bg-gradient-to-b bg-gray-900/60 p-5 backdrop-blur-md transition-all hover:scale-[1.01] ${colorStyles}`}
            >
              <div>
                {/* Step Header */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-800 text-xs font-bold text-white">
                      {step.num}
                    </span>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold text-gray-300">
                    {step.badge}
                  </span>
                </div>

                {/* Step Titles */}
                <div className="mt-3 space-y-0.5">
                  <h3 className="text-sm font-bold text-white">{step.title}</h3>
                  <p className="text-[11px] font-medium text-gray-400">{step.subtitle}</p>
                </div>

                {/* Step Body */}
                <div className="mt-3.5">{step.content}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Detailed Heuristic Policy Deep-Dive Card */}
      <div className="rounded-xl border border-amber-500/30 bg-gray-900/50 p-6 backdrop-blur-md space-y-4">
        <div className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-amber-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-amber-300">
            Heuristic Labeling Methodology Deep-Dive (Stage 2)
          </h3>
        </div>
        <p className="text-xs text-gray-300 leading-relaxed">
          Because raw cluster storage traces do not include predefined storage classes, modern storage engineering
          principles were used to compute empirical percentile ranks across four normalized behavioral dimensions:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="rounded-lg border border-gray-800 bg-gray-950 p-3 text-center">
            <span className="text-amber-400 font-bold text-lg">40%</span>
            <p className="font-semibold text-white mt-1">Access Volume</p>
            <p className="text-[10px] text-gray-400">Request intensity & total touches</p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-950 p-3 text-center">
            <span className="text-cyan-400 font-bold text-lg">30%</span>
            <p className="font-semibold text-white mt-1">Access Recency</p>
            <p className="text-[10px] text-gray-400">Inactivity gap prior to trace end</p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-950 p-3 text-center">
            <span className="text-purple-400 font-bold text-lg">15%</span>
            <p className="font-semibold text-white mt-1">Activity Span</p>
            <p className="text-[10px] text-gray-400">Sustained life versus one-time burst</p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-950 p-3 text-center">
            <span className="text-emerald-400 font-bold text-lg">15%</span>
            <p className="font-semibold text-white mt-1">Cache Hit Ratio</p>
            <p className="text-[10px] text-gray-400">Memory/Flash caching residency</p>
          </div>
        </div>

        <div className="rounded-lg border border-gray-800 bg-gray-950 p-4 text-xs space-y-2">
          <p className="font-semibold text-gray-200">Data-Driven Tertile Cutoffs:</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px]">
            <div className="rounded bg-gray-900 p-2 text-amber-300">
              S ≥ 0.6027 → 🔥 HOT (4,522 files)
            </div>
            <div className="rounded bg-gray-900 p-2 text-cyan-300">
              0.4061 &lt; S &lt; 0.6027 → 🌤️ COOL (4,522 files)
            </div>
            <div className="rounded bg-gray-900 p-2 text-purple-300">
              S ≤ 0.4061 → ❄️ ARCHIVE (4,521 files)
            </div>
          </div>
          <p className="text-[11px] text-gray-400 pt-1">
            Empirical tertiles guarantee equal class distribution (33.33% each), preventing majority class bias during supervised ML training.
          </p>
        </div>
      </div>
    </div>
  );
}
