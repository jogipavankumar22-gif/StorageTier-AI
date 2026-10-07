import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Cpu,
  Search,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  ShieldAlert,
  UploadCloud,
  FileText,
  File,
  AlertCircle,
  Calendar,
  Hash,
  HardDrive,
  Sliders,
  HelpCircle,
  X,
} from 'lucide-react';

import api from '../services/api';
import TierBadge from '../components/TierBadge';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

// Pre-curated sample files from the dataset for quick 1-click live testing
const SAMPLE_FILES = [
  {
    name: 'Sample HOT File',
    filename: '88c3b57af8192b9fef55be3308daabe6cb96f3a1e0b13cbc743dcc3ec1c0975e',
    expectedTier: 'HOT',
    desc: '4,210 total accesses, 95.46% cache hit ratio',
  },
  {
    name: 'Sample COOL File',
    filename: '342d5c43aba0a62da0969a4685808ac4980e199bffb35a1ede7fe995a1267b48',
    expectedTier: 'COOL',
    desc: 'Occasional access pattern, moderate intervals',
  },
  {
    name: 'Sample ARCHIVE File',
    filename: 'ff17f7c93e56f5ebd99e2951c7c7978ca965a2ed5b77eb6f926cf17d6236d282',
    expectedTier: 'ARCHIVE',
    desc: 'Infrequent accesses, extended inactive idle span',
  },
];

// Importance options for Question 1
const IMPORTANCE_OPTIONS = [
  {
    value: 'VERY IMPORTANT',
    label: 'Very Important',
    score: 5,
    desc: 'Mission-critical, primary or irreplaceable data',
  },
  {
    value: 'IMPORTANT',
    label: 'Important',
    score: 4,
    desc: 'Valuable operational asset, regular dependency',
  },
  {
    value: 'MODERATELY USEFUL',
    label: 'Moderately Useful',
    score: 3,
    desc: 'Standard reference or working document',
  },
  {
    value: 'LESS IMPORTANT',
    label: 'Less Important',
    score: 2,
    desc: 'Secondary data, easily reproducible',
  },
  {
    value: 'LEAST IMPORTANT',
    label: 'Least Important',
    score: 1,
    desc: 'Temporary log, scratch, or disposable file',
  },
];

// Expected usage options for Question 2
const USAGE_OPTIONS = [
  {
    value: 'VERY FREQUENTLY',
    label: 'Very Frequently',
    score: 5,
    desc: 'Multiple times daily, active continuous pipeline',
  },
  {
    value: 'FREQUENTLY',
    label: 'Frequently',
    score: 4,
    desc: 'Several times per week, ongoing project use',
  },
  {
    value: 'OCCASIONALLY',
    label: 'Occasionally',
    score: 3,
    desc: 'A few times monthly, periodic reference',
  },
  {
    value: 'RARELY',
    label: 'Rarely',
    score: 2,
    desc: 'Once every few months, compliance archive',
  },
  {
    value: 'ALMOST NEVER',
    label: 'Almost Never',
    score: 1,
    desc: 'Emergency backup, cold long-term retention',
  },
];

export default function FilePrediction() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFile = searchParams.get('file') || '';

  // Mode Selection: 'dataset' (Mode 1) or 'upload' (Mode 2)
  const [predictionMode, setPredictionMode] = useState('dataset');

  // ==========================================
  // MODE 1: DATASET FILE STATES
  // ==========================================
  const [filenameInput, setFilenameInput] = useState(initialFile);
  const [selectedFilename, setSelectedFilename] = useState(initialFile);
  const [fileDetails, setFileDetails] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [predicting, setPredicting] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Mode 1: Optional Personalized Preference overlay
  const [datasetImportance, setDatasetImportance] = useState('IMPORTANT');
  const [datasetUsage, setDatasetUsage] = useState('FREQUENTLY');
  const [datasetRecResult, setDatasetRecResult] = useState(null);
  const [loadingDatasetRec, setLoadingDatasetRec] = useState(false);

  // ==========================================
  // MODE 2: UPLOAD NEW FILE STATES
  // ==========================================
  const [fileMetadata, setFileMetadata] = useState(null);
  const [isCalculatingHash, setIsCalculatingHash] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [copiedUploadHash, setCopiedUploadHash] = useState(false);
  const fileInputRef = useRef(null);

  // Mode 2: User questionnaire states
  const [userImportance, setUserImportance] = useState('IMPORTANT');
  const [userUsage, setUserUsage] = useState('OCCASIONALLY');
  const [personalizedRec, setPersonalizedRec] = useState(null);
  const [loadingRec, setLoadingRec] = useState(false);

  // AI Explanation Modal State (Used by both modes for personalized recommendations)
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiExplaining, setAiExplaining] = useState(false);
  const [aiExplanationData, setAiExplanationData] = useState(null);
  const [aiExplainError, setAiExplainError] = useState(null);

  // Run prediction pipeline for a given dataset filename
  const executePrediction = useCallback(async (fileHash) => {
    if (!fileHash || !fileHash.trim()) return;
    const cleanHash = fileHash.trim();

    setSelectedFilename(cleanHash);
    setSearchParams({ file: cleanHash });
    setError(null);
    setPrediction(null);
    setDatasetRecResult(null);
    setLoadingFile(true);
    setPredicting(true);

    try {
      // 1. Fetch file's 37-feature record
      const details = await api.getFileDetail(cleanHash);
      setFileDetails(details);
      setLoadingFile(false);

      // 2. Execute live XGBoost prediction via backend
      const predRes = await api.predictTier({ filename: cleanHash });
      setPrediction(predRes);

      // 3. Automatically calculate initial personalized comparison for Dataset File
      api.getPersonalizedRecommendation({
        importance: datasetImportance,
        expected_usage: datasetUsage,
        file_metadata: { name: cleanHash },
        ml_prediction: predRes.predicted_tier,
        ml_confidence: predRes.confidence,
      }).then((rec) => {
        setDatasetRecResult(rec);
      }).catch(() => {});

    } catch (err) {
      setError(err.message || 'Failed to predict storage tier for file');
    } finally {
      setLoadingFile(false);
      setPredicting(false);
    }
  }, [setSearchParams, datasetImportance, datasetUsage]);

  // Execute on mount if initial file is present in URL
  useEffect(() => {
    if (initialFile) {
      executePrediction(initialFile);
    }
  }, [initialFile, executePrediction]);

  // Update Dataset File personalized recommendation when user changes preferences
  const handleUpdateDatasetPreferences = async (newImp, newUse) => {
    setDatasetImportance(newImp);
    setDatasetUsage(newUse);
    if (!prediction) return;

    setLoadingDatasetRec(true);
    try {
      const rec = await api.getPersonalizedRecommendation({
        importance: newImp,
        expected_usage: newUse,
        file_metadata: { name: selectedFilename },
        ml_prediction: prediction.predicted_tier,
        ml_confidence: prediction.confidence,
      });
      setDatasetRecResult(rec);
    } catch (err) {
      console.warn('Failed to calculate dataset recommendation:', err);
    } finally {
      setLoadingDatasetRec(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (filenameInput.trim()) {
      executePrediction(filenameInput.trim());
    }
  };

  const handleSelectSample = (sample) => {
    setFilenameInput(sample.filename);
    executePrediction(sample.filename);
  };

  const copyHash = (hash, setCopiedState) => {
    if (!hash) return;
    navigator.clipboard.writeText(hash);
    setCopiedState(true);
    setTimeout(() => setCopiedState(false), 2000);
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const num = Number(bytes);
    if (isNaN(num)) return '0 B';
    const gb = num / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = num / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    const kb = num / 1024;
    return `${kb.toFixed(1)} KB`;
  };

  // Compute SHA-256 in browser using native Web Crypto API
  const computeFileSHA256 = async (file) => {
    try {
      const buffer = await file.arrayBuffer();
      const digestBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(digestBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch (err) {
      console.warn('Web Crypto SHA-256 calculation failed:', err);
      return 'Calculation unavailable';
    }
  };

  // Process uploaded local file and trigger initial recommendation
  const handleProcessFile = async (file) => {
    if (!file) return;

    setIsCalculatingHash(true);
    setPersonalizedRec(null);

    const ext = file.name.includes('.')
      ? '.' + file.name.split('.').pop().toLowerCase()
      : 'Unknown';

    const lastModDate = file.lastModified
      ? new Date(file.lastModified).toLocaleString()
      : 'Unknown';

    const hash = await computeFileSHA256(file);
    setIsCalculatingHash(false);

    const meta = {
      name: file.name,
      extension: ext,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      sizeFormatted: formatBytes(file.size),
      lastModified: lastModDate,
      sha256: hash,
    };
    setFileMetadata(meta);

    // Compute initial recommendation
    calculateUploadRecommendation(userImportance, userUsage, meta);
  };

  // Calculate recommendation for uploaded file
  const calculateUploadRecommendation = async (imp, use, meta) => {
    const metaToUse = meta || fileMetadata;
    if (!metaToUse) return;

    setLoadingRec(true);
    try {
      const res = await api.getPersonalizedRecommendation({
        importance: imp,
        expected_usage: use,
        file_metadata: metaToUse,
      });
      setPersonalizedRec(res);
    } catch (err) {
      console.warn('Recommendation API failed, using client fallback:', err);
      // Fallback deterministic logic
      const impScores = { 'VERY IMPORTANT': 5, 'IMPORTANT': 4, 'MODERATELY USEFUL': 3, 'LESS IMPORTANT': 2, 'LEAST IMPORTANT': 1 };
      const useScores = { 'VERY FREQUENTLY': 5, 'FREQUENTLY': 4, 'OCCASIONALLY': 3, 'RARELY': 2, 'ALMOST NEVER': 1 };
      const pScore = ((impScores[imp] || 3) + (useScores[use] || 3)) / 2.0;
      let recTier = pScore >= 4.0 ? 'HOT' : pScore >= 3.0 ? 'COOL' : 'ARCHIVE';
      let safeguard = false;
      if (imp === 'VERY IMPORTANT' && recTier === 'ARCHIVE') {
        recTier = 'COOL';
        safeguard = true;
      }
      setPersonalizedRec({
        recommended_tier: recTier,
        importance: imp,
        importance_label: imp,
        expected_usage: use,
        usage_label: use,
        priority_score: pScore,
        safeguard_applied: safeguard,
        reason: `Based on your stated importance (${imp}) and expected usage (${use}), ${recTier} tier is recommended.`,
      });
    } finally {
      setLoadingRec(false);
    }
  };

  const handleImportanceChange = (newImp) => {
    setUserImportance(newImp);
    calculateUploadRecommendation(newImp, userUsage, fileMetadata);
  };

  const handleUsageChange = (newUse) => {
    setUserUsage(newUse);
    calculateUploadRecommendation(userImportance, newUse, fileMetadata);
  };

  // Request AI Explanation for Personalized Recommendation
  const handleExplainRecommendation = async (recData, mlData) => {
    setAiModalOpen(true);
    setAiExplaining(true);
    setAiExplanationData(null);
    setAiExplainError(null);

    try {
      const res = await api.explainRecommendation({
        recommended_tier: recData.recommended_tier,
        importance: recData.importance,
        importance_label: recData.importance_label,
        expected_usage: recData.expected_usage,
        usage_label: recData.usage_label,
        priority_score: recData.priority_score,
        file_metadata: fileMetadata || (fileDetails ? { name: selectedFilename } : null),
        ml_prediction: mlData?.predicted_tier || recData.comparison_with_ml?.ml_predicted_tier,
        ml_confidence: mlData?.confidence || recData.comparison_with_ml?.ml_confidence,
      });
      setAiExplanationData(res);
    } catch {
      setAiExplainError('AI explanation service is currently unavailable. The deterministic recommendation remains fully authoritative.');
    } finally {
      setAiExplaining(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-6 p-6 md:p-8">
      {/* 1. Academic Research & Limitations Notice */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
          <div className="space-y-1 text-xs">
            <h4 className="font-semibold text-blue-300">Architecture Separation Notice</h4>
            <p className="text-gray-300">
              <strong className="text-white">Machine Learning predicts</strong> based on observed historical telemetry from the Thesios trace.
              {' '}<strong className="text-white">Personalized recommendation</strong> uses user-stated importance and expected usage.
              {' '}<strong className="text-white">Generative AI explains</strong> the result but does not make or override the decision.
            </p>
            <p className="text-gray-400">
              The 97.83% accuracy metric applies strictly to the behavioral XGBoost model approximating the heuristic policy,
              not to user preference recommendations or cloud billing savings.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Page Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <Cpu className="h-5 w-5 text-blue-400" />
          File Tier Prediction & Personalized Recommendation
        </h2>
        <p className="text-xs text-gray-400">
          Choose your evaluation path: predict historical trace records with XGBoost, or get a personalized recommendation for newly uploaded local files
        </p>
      </div>

      {/* 3. Prediction Mode Switcher (Two Clearly Separated Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Mode 1 Card: Predict a Dataset File */}
        <button
          type="button"
          onClick={() => setPredictionMode('dataset')}
          className={`flex flex-col text-left rounded-2xl border p-5 transition-all ${
            predictionMode === 'dataset'
              ? 'border-blue-500 bg-gradient-to-br from-blue-950/40 via-gray-900/60 to-gray-950 shadow-lg shadow-blue-500/10'
              : 'border-gray-800 bg-gray-900/40 hover:border-gray-700 hover:bg-gray-900/70'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  predictionMode === 'dataset' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
                }`}
              >
                <Cpu className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Predict a Dataset File</h3>
                <span className="text-[11px] font-medium text-blue-400">
                  ML Behavioral Prediction (XGBoost 97.83%)
                </span>
              </div>
            </div>
            {predictionMode === 'dataset' && (
              <span className="rounded-md bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-300 border border-blue-500/30">
                ACTIVE MODE
              </span>
            )}
          </div>
          <p className="mt-3 text-xs text-gray-300 leading-relaxed">
            Select a file from the Thesios storage trace and predict its storage tier using historical access behavior.
          </p>
        </button>

        {/* Mode 2 Card: Upload a New File */}
        <button
          type="button"
          onClick={() => setPredictionMode('upload')}
          className={`flex flex-col text-left rounded-2xl border p-5 transition-all ${
            predictionMode === 'upload'
              ? 'border-purple-500 bg-gradient-to-br from-purple-950/40 via-gray-900/60 to-gray-950 shadow-lg shadow-purple-500/10'
              : 'border-gray-800 bg-gray-900/40 hover:border-gray-700 hover:bg-gray-900/70'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  predictionMode === 'upload' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'
                }`}
              >
                <UploadCloud className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Upload a New File</h3>
                <span className="text-[11px] font-medium text-purple-400">
                  Personalized Storage Recommendation
                </span>
              </div>
            </div>
            {predictionMode === 'upload' && (
              <span className="rounded-md bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-300 border border-purple-500/30">
                ACTIVE MODE
              </span>
            )}
          </div>
          <p className="mt-3 text-xs text-gray-300 leading-relaxed">
            Upload a file from your computer for a metadata-based assessment and personalized storage tier recommendation.
          </p>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: DATASET FILE WORKFLOW                                            */}
      {/* ========================================================================= */}
      {predictionMode === 'dataset' && (
        <div className="space-y-6">
          {/* File Input & Quick Sample Selector */}
          <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5 backdrop-blur-md space-y-4">
            <form onSubmit={handleSearchSubmit} className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300">
                  Search or select a dataset file:
                </label>
                <span className="text-[11px] text-gray-400">
                  Tip: You can browse all available files in{' '}
                  <Link to="/files" className="text-blue-400 hover:underline inline-flex items-center gap-0.5 font-medium">
                    File Explorer <ArrowRight className="h-2.5 w-2.5" />
                  </Link>
                </span>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Enter or paste 64-character SHA-256 dataset file hash..."
                    value={filenameInput}
                    onChange={(e) => setFilenameInput(e.target.value)}
                    className="w-full rounded-lg border border-gray-800 bg-gray-950 py-2.5 pl-9 pr-4 font-mono text-xs text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={predicting || !filenameInput.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-500 active:scale-95 disabled:opacity-50"
                >
                  {predicting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Cpu className="h-4 w-4" />}
                  <span>{predicting ? 'Predicting...' : 'Run Prediction'}</span>
                </button>
              </div>
            </form>

            {/* Quick Sample Selector Pill Buttons */}
            <div className="space-y-2 border-t border-gray-800/80 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                  Quick Test Samples from Real Dataset:
                </span>
                <Link to="/files" className="text-[11px] text-blue-400 hover:underline flex items-center gap-1">
                  Browse all 13,565 files <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {SAMPLE_FILES.map((sample) => (
                  <button
                    key={sample.filename}
                    type="button"
                    onClick={() => handleSelectSample(sample)}
                    className="flex flex-col items-start rounded-lg border border-gray-800/80 bg-gray-950/70 p-2.5 text-left transition hover:border-blue-500/40 hover:bg-gray-900 group"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-semibold text-gray-200 group-hover:text-blue-300">
                        {sample.name}
                      </span>
                      <TierBadge tier={sample.expectedTier} size="sm" />
                    </div>
                    <p className="mt-1 text-[11px] text-gray-400 leading-tight">{sample.desc}</p>
                    <span className="mt-1 font-mono text-[10px] text-gray-500 truncate w-full">
                      {sample.filename.slice(0, 16)}...
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results Area */}
          {error && (
            <ErrorState
              title="Prediction Execution Error"
              message={error}
              onRetry={() => executePrediction(selectedFilename)}
            />
          )}

          {loadingFile || predicting ? (
            <LoadingState message="Extracting file behavioral features and running XGBoost model..." />
          ) : prediction && fileDetails ? (
            <div className="space-y-6">
              {/* Primary Prediction Result Card */}
              <div className="relative overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-br from-gray-900 via-gray-950 to-gray-900 p-6 shadow-xl backdrop-blur-md">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* Left: Predicted Tier Badge & Confidence */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-blue-500/20 px-2.5 py-0.5 text-xs font-bold text-blue-400 border border-blue-500/30">
                        ML BEHAVIORAL PREDICTION
                      </span>
                      <span className="text-xs text-gray-400">Model: {prediction.model_name}</span>
                    </div>

                    <div className="flex items-center gap-4">
                      <TierBadge tier={prediction.predicted_tier} size="lg" />
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                          Model Confidence
                        </p>
                        <p className="text-2xl font-black text-white">
                          {(prediction.confidence * 100).toFixed(2)}%
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1 font-mono text-xs text-gray-400">
                      <span className="truncate max-w-sm sm:max-w-md">{prediction.filename}</span>
                      <button
                        onClick={() => copyHash(prediction.filename, setCopied)}
                        className="p-1 text-gray-500 hover:text-white transition"
                        title="Copy full SHA-256 hash"
                      >
                        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Right: Class Probability Breakdown */}
                  <div className="w-full lg:w-96 rounded-xl border border-gray-800 bg-gray-950/80 p-4 space-y-3 shrink-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-300">
                      Class Probability Distribution:
                    </p>
                    {Object.entries(prediction.class_probabilities || {}).map(([className, prob]) => {
                      const pct = (prob * 100).toFixed(2);
                      const isWinner = className === prediction.predicted_tier;
                      const barColors = {
                        HOT: 'bg-amber-500',
                        COOL: 'bg-cyan-500',
                        ARCHIVE: 'bg-purple-500',
                      }[className] || 'bg-blue-500';

                      return (
                        <div key={className} className="space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className={`font-semibold ${isWinner ? 'text-white font-bold' : 'text-gray-400'}`}>
                              {className}
                            </span>
                            <span className="font-mono text-gray-300">{pct}%</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
                            <div
                              className={`h-full ${barColors} transition-all duration-500`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Part 6: Optional Personalized Preference Overlay on Dataset File */}
              <div className="rounded-2xl border border-purple-500/30 bg-gray-900/50 p-6 backdrop-blur-md space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Sliders className="h-5 w-5 text-purple-400" />
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        Compare with Personalized Storage Preference
                        {loadingDatasetRec && <RefreshCw className="h-3.5 w-3.5 animate-spin text-purple-400" />}
                      </h3>
                      <p className="text-xs text-gray-400">
                        State your personal importance and expected access frequency to compare user intent against ML behavioral history
                      </p>
                    </div>
                  </div>
                  {datasetRecResult && (
                    <span
                      className={`rounded-md px-2.5 py-1 text-xs font-bold border self-start sm:self-auto ${
                        datasetRecResult.comparison_with_ml?.signals_agree
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {datasetRecResult.comparison_with_ml?.signals_agree ? '✓ Both signals agree' : '⚡ Signals differ'}
                    </span>
                  )}
                </div>

                {/* Preference Selectors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-300 uppercase mb-1.5">
                      1. How important is this dataset file?
                    </label>
                    <select
                      value={datasetImportance}
                      onChange={(e) => handleUpdateDatasetPreferences(e.target.value, datasetUsage)}
                      className="w-full rounded-lg border border-gray-800 bg-gray-950 p-2.5 text-xs text-gray-200 focus:border-purple-500 focus:outline-none font-medium"
                    >
                      {IMPORTANCE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label} ({opt.desc})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-300 uppercase mb-1.5">
                      2. How often do you expect to use it?
                    </label>
                    <select
                      value={datasetUsage}
                      onChange={(e) => handleUpdateDatasetPreferences(datasetImportance, e.target.value)}
                      className="w-full rounded-lg border border-gray-800 bg-gray-950 p-2.5 text-xs text-gray-200 focus:border-purple-500 focus:outline-none font-medium"
                    >
                      {USAGE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label} ({opt.desc})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Comparison Results Card */}
                {datasetRecResult && (
                  <div className="rounded-xl border border-gray-800 bg-gray-950 p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left: Behavioral ML Prediction */}
                      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 space-y-2">
                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                          BEHAVIORAL ML PREDICTION
                        </span>
                        <div className="flex items-center gap-3 pt-1">
                          <TierBadge tier={prediction.predicted_tier} size="md" />
                          <span className="text-xs text-gray-300">
                            {(prediction.confidence * 100).toFixed(2)}% confidence
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 pt-1">
                          Based on: <strong>Historical Thesios access telemetry</strong>
                        </p>
                      </div>

                      {/* Right: Personalized Recommendation */}
                      <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-4 space-y-2">
                        <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                          PERSONALIZED RECOMMENDATION
                        </span>
                        <div className="flex items-center gap-3 pt-1">
                          <TierBadge tier={datasetRecResult.recommended_tier} size="md" />
                          <span className="text-xs text-purple-300 font-bold">
                            Priority Score: {datasetRecResult.priority_score}/5.0
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 pt-1">
                          Based on: <strong>User importance + expected usage</strong>
                        </p>
                      </div>
                    </div>

                    {/* Rationale explanation */}
                    <div className="rounded-lg bg-gray-900/60 p-3 text-xs text-gray-300 leading-relaxed border border-gray-850">
                      <p className="font-semibold text-white mb-1">
                        {datasetRecResult.comparison_with_ml?.signals_agree ? 'Signals Agree:' : 'Signal Differentiation:'}
                      </p>
                      <p>{datasetRecResult.comparison_with_ml?.summary}</p>
                      <p className="text-gray-400 text-[11px] mt-2">
                        "The behavioral model reflects observed historical access behavior, while the personalized recommendation reflects your stated importance and expected usage."
                      </p>
                    </div>

                    {/* AI Explanation Button */}
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => handleExplainRecommendation(datasetRecResult, prediction)}
                        className="flex items-center gap-1.5 rounded-lg bg-purple-600/20 border border-purple-500/30 px-3.5 py-1.5 text-xs font-semibold text-purple-300 hover:bg-purple-600/30 transition-colors"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Explain Comparison with AI
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Key Observed Factors */}
              <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 backdrop-blur-md space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                    Key Observed Factors Associated with this Prediction
                  </h3>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Based on the file's historical access telemetry within the 14.36-minute observation window,
                  the following factual metrics strongly correlate with the{' '}
                  <strong className="text-white">{prediction.predicted_tier}</strong> tier classification:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="rounded-lg border border-gray-800/80 bg-gray-950 p-3">
                    <p className="text-gray-500 text-[11px]">Total Accesses</p>
                    <p className="mt-1 text-base font-bold text-white">
                      {fileDetails.total_accesses?.toLocaleString()}
                    </p>
                    <p className="mt-0.5 text-[10px] text-gray-400">
                      {fileDetails.total_accesses > 50 ? 'High I/O volume in window' : 'Low access volume'}
                    </p>
                  </div>

                  <div className="rounded-lg border border-gray-800/80 bg-gray-950 p-3">
                    <p className="text-gray-500 text-[11px]">Accesses (Last 5 Min)</p>
                    <p className="mt-1 text-base font-bold text-amber-400">
                      {fileDetails.accesses_last_5_min?.toLocaleString()}
                    </p>
                    <p className="mt-0.5 text-[10px] text-gray-400">Top model importance feature (33.77% gain)</p>
                  </div>

                  <div className="rounded-lg border border-gray-800/80 bg-gray-950 p-3">
                    <p className="text-gray-500 text-[11px]">Cache Hit Ratio</p>
                    <p className="mt-1 text-base font-bold text-emerald-400">
                      {((fileDetails.cache_hit_ratio || 0) * 100).toFixed(2)}%
                    </p>
                    <p className="mt-0.5 text-[10px] text-gray-400">
                      {fileDetails.cache_hit_count?.toLocaleString()} hits / {fileDetails.cache_miss_count?.toLocaleString()} misses
                    </p>
                  </div>

                  <div className="rounded-lg border border-gray-800/80 bg-gray-950 p-3">
                    <p className="text-gray-500 text-[11px]">Recency (Inactivity Gap)</p>
                    <p className="mt-1 text-base font-bold text-cyan-400">
                      {Number(fileDetails.seconds_since_last_access).toFixed(1)}s
                    </p>
                    <p className="mt-0.5 text-[10px] text-gray-400">
                      {Number(fileDetails.days_since_last_access).toFixed(4)} fractional days
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Empty State */
            <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-12 text-center backdrop-blur-md">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 mb-4">
                <Cpu className="h-7 w-7" />
              </div>
              <h3 className="text-base font-bold text-white">Select a Dataset File to Run Inference</h3>
              <p className="mt-1 text-xs text-gray-400 max-w-md mx-auto">
                Choose one of the sample files above or paste a valid SHA-256 filename from the File Explorer.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: UPLOAD A NEW FILE WORKFLOW                                       */}
      {/* ========================================================================= */}
      {predictionMode === 'upload' && (
        <div className="space-y-6">
          {/* Upload Dropzone Card */}
          <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6 backdrop-blur-md space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <UploadCloud className="h-4 w-4 text-purple-400" />
                Upload File for Personalized Storage Assessment
              </h3>
              <p className="text-xs text-gray-400">
                Select any local document, image, or archive to inspect client-side metadata and get a personalized storage tier recommendation
              </p>
            </div>

            {/* Drag & Drop Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-gray-800 bg-gray-950/60 hover:border-purple-500/50 hover:bg-gray-950/90'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileInputChange}
                className="hidden"
              />

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-600/20 text-purple-400 mb-3">
                <UploadCloud className="h-6 w-6" />
              </div>

              <p className="text-sm font-semibold text-white">
                Drag & Drop your file here
              </p>
              <p className="mt-1 text-xs text-gray-400">
                or <span className="text-purple-400 hover:underline font-medium">Browse from computer</span>
              </p>
              <p className="mt-3 text-[11px] text-gray-500">
                Supported: PDF, Images (PNG, JPG), Text, Parquet, Zip, CSV, and common data files
              </p>
            </div>

            {isCalculatingHash && (
              <div className="flex items-center justify-center gap-2 text-xs text-purple-400 py-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Computing cryptographic SHA-256 identifier using Web Crypto API...</span>
              </div>
            )}
          </div>

          {/* After Selection: Metadata Display & Questionnaire */}
          {fileMetadata && (
            <div className="space-y-6">
              {/* Card 1: Captured File Metadata */}
              <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6 backdrop-blur-md space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <File className="h-5 w-5 text-purple-400" />
                    <div>
                      <h3 className="text-sm font-bold text-white truncate max-w-sm">
                        {fileMetadata.name}
                      </h3>
                      <span className="text-[11px] text-gray-400">
                        {fileMetadata.sizeFormatted} • {fileMetadata.mimeType}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setFileMetadata(null);
                      setPersonalizedRec(null);
                    }}
                    className="rounded-lg border border-gray-800 bg-gray-950 px-3 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-gray-800 transition-colors self-start sm:self-auto"
                  >
                    Select Different File
                  </button>
                </div>

                {/* Metadata Properties Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="rounded-lg border border-gray-800/80 bg-gray-950 p-3 space-y-1">
                    <span className="text-gray-500 text-[10px] uppercase font-bold flex items-center gap-1">
                      <FileText className="h-3 w-3 text-purple-400" /> File Type & Ext
                    </span>
                    <p className="font-semibold text-white text-sm">{fileMetadata.extension}</p>
                    <p className="text-[10px] text-gray-400 truncate">{fileMetadata.mimeType}</p>
                  </div>

                  <div className="rounded-lg border border-gray-800/80 bg-gray-950 p-3 space-y-1">
                    <span className="text-gray-500 text-[10px] uppercase font-bold flex items-center gap-1">
                      <HardDrive className="h-3 w-3 text-emerald-400" /> File Size
                    </span>
                    <p className="font-semibold text-emerald-400 text-sm">{fileMetadata.sizeFormatted}</p>
                    <p className="text-[10px] text-gray-400 font-mono">
                      {fileMetadata.sizeBytes.toLocaleString()} bytes
                    </p>
                  </div>

                  <div className="rounded-lg border border-gray-800/80 bg-gray-950 p-3 space-y-1">
                    <span className="text-gray-500 text-[10px] uppercase font-bold flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-cyan-400" /> Last Modified
                    </span>
                    <p className="font-semibold text-white text-xs">{fileMetadata.lastModified}</p>
                    <p className="text-[10px] text-gray-400">Local filesystem timestamp</p>
                  </div>

                  <div className="rounded-lg border border-gray-800/80 bg-gray-950 p-3 space-y-1">
                    <span className="text-gray-500 text-[10px] uppercase font-bold flex items-center gap-1">
                      <Hash className="h-3 w-3 text-amber-400" /> SHA-256 Identifier
                    </span>
                    <div className="flex items-center justify-between pt-0.5">
                      <p className="font-mono text-[10px] text-gray-300 truncate max-w-[140px]">
                        {fileMetadata.sha256}
                      </p>
                      <button
                        onClick={() => copyHash(fileMetadata.sha256, setCopiedUploadHash)}
                        className="p-1 text-gray-500 hover:text-white transition shrink-0"
                        title="Copy SHA-256"
                      >
                        {copiedUploadHash ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                    <p className="text-[9px] text-gray-500">Calculated via Web Crypto API</p>
                  </div>
                </div>

                {/* Important SHA-256 Notice */}
                <div className="rounded-lg border border-gray-800/80 bg-gray-950/80 p-3 text-[11px] text-gray-400">
                  <strong className="text-gray-300">Technical Note:</strong> SHA-256 is an entity identifier
                  calculated locally in your browser. It does <strong>not</strong> determine or influence the storage tier.
                </div>
              </div>

              {/* Card 2: Interactive Questionnaire - Tell Us About This File */}
              <div className="rounded-2xl border border-purple-500/30 bg-gray-900/60 p-6 backdrop-blur-md space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-purple-400" />
                    Tell us about this file
                  </h3>
                  <p className="text-xs text-gray-400">
                    Your answers drive the deterministic personalized recommendation engine
                  </p>
                </div>

                {/* Question 1: Importance */}
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-gray-200">
                    Question 1: How important is this file to you?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                    {IMPORTANCE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleImportanceChange(opt.value)}
                        className={`flex flex-col text-left rounded-xl border p-3 transition-all ${
                          userImportance === opt.value
                            ? 'border-purple-500 bg-purple-500/20 text-white shadow-md shadow-purple-500/10'
                            : 'border-gray-800 bg-gray-950/70 text-gray-400 hover:border-gray-700 hover:text-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-bold">{opt.label}</span>
                          <span className="text-[10px] font-mono opacity-60">P{opt.score}</span>
                        </div>
                        <p className="mt-1 text-[10px] text-gray-400 leading-tight">
                          {opt.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Question 2: Expected Usage Frequency */}
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-gray-200">
                    Question 2: How often do you expect to use this file?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                    {USAGE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleUsageChange(opt.value)}
                        className={`flex flex-col text-left rounded-xl border p-3 transition-all ${
                          userUsage === opt.value
                            ? 'border-cyan-500 bg-cyan-500/20 text-white shadow-md shadow-cyan-500/10'
                            : 'border-gray-800 bg-gray-950/70 text-gray-400 hover:border-gray-700 hover:text-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-bold">{opt.label}</span>
                          <span className="text-[10px] font-mono opacity-60">U{opt.score}</span>
                        </div>
                        <p className="mt-1 text-[10px] text-gray-400 leading-tight">
                          {opt.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card 3: Personalized Storage Recommendation Result */}
              {personalizedRec && (
                <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-950/30 via-gray-900/60 to-gray-950 p-6 shadow-xl backdrop-blur-md space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-purple-400" />
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          PERSONALIZED STORAGE RECOMMENDATION
                          {loadingRec && <RefreshCw className="h-3.5 w-3.5 animate-spin text-purple-400" />}
                        </h3>
                        <p className="text-xs text-purple-300">
                          Deterministic policy score based on your stated preferences
                        </p>
                      </div>
                    </div>
                    <span className="rounded-md bg-purple-500/20 border border-purple-500/30 px-2.5 py-1 text-xs font-bold text-purple-300 self-start sm:self-auto">
                      User Preference Policy
                    </span>
                  </div>

                  {/* Recommendation Overview Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="rounded-xl border border-gray-800 bg-gray-950 p-4 text-center sm:text-left space-y-1">
                      <span className="text-[10px] uppercase font-bold text-gray-400">Recommended Tier</span>
                      <div className="pt-1">
                        <TierBadge tier={personalizedRec.recommended_tier} size="lg" />
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-800 bg-gray-950 p-4 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-gray-400">Stated Importance</span>
                      <p className="text-base font-bold text-white pt-1">{personalizedRec.importance_label}</p>
                      <span className="text-[10px] text-gray-500 font-mono">Score: {personalizedRec.importance_score}/5</span>
                    </div>

                    <div className="rounded-xl border border-gray-800 bg-gray-950 p-4 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-gray-400">Expected Usage</span>
                      <p className="text-base font-bold text-white pt-1">{personalizedRec.usage_label}</p>
                      <span className="text-[10px] text-gray-500 font-mono">Score: {personalizedRec.usage_score}/5</span>
                    </div>

                    <div className="rounded-xl border border-gray-800 bg-gray-950 p-4 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-gray-400">Priority Score</span>
                      <p className="text-2xl font-black text-purple-400 pt-0.5">
                        {personalizedRec.priority_score} <span className="text-xs text-gray-500 font-normal">/ 5.0</span>
                      </p>
                      <span className="text-[10px] text-gray-500 font-mono">Avg(Importance, Usage)</span>
                    </div>
                  </div>

                  {/* Safeguard Notice if VERY IMPORTANT triggered */}
                  {personalizedRec.safeguard_applied && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200 flex items-start gap-2.5">
                      <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <strong>Safety Policy Safeguard:</strong> This file was protected from ARCHIVE placement because
                        it was designated as <strong>VERY IMPORTANT</strong>. Even with infrequent access, high-value data
                        is assigned to at least COOL tier to avoid high-latency deep retrieval delays.
                      </div>
                    </div>
                  )}

                  {/* Why this recommendation */}
                  <div className="rounded-xl border border-gray-800 bg-gray-950 p-4 space-y-1 text-xs text-gray-300">
                    <p className="font-semibold text-white">Why this recommendation?</p>
                    <p className="leading-relaxed">{personalizedRec.reason}</p>
                  </div>

                  {/* Explain with AI Button */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                    <span className="text-[11px] text-gray-400">
                      "Personalized recommendation engine decides. Generative AI explains."
                    </span>
                    <button
                      onClick={() => handleExplainRecommendation(personalizedRec)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-500 transition-colors"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Explain Recommendation with AI
                    </button>
                  </div>
                </div>
              )}

              {/* Card 4: Scientific Honesty Notice on Behavioral XGBoost */}
              <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-4 space-y-2 text-xs text-gray-400">
                <div className="flex items-center gap-2 text-gray-300 font-semibold">
                  <AlertCircle className="h-4 w-4 text-gray-400" />
                  Academic Boundary Notice
                </div>
                <p>
                  <strong>Note:</strong> The primary behavioral XGBoost model cannot be applied to a newly uploaded file
                  unless historical access telemetry (I/O event logs, request frequencies, and cache hit ratios) is available.
                  The recommendation above is produced by the project's user-preference policy engine.
                </p>
              </div>

              {/* Card 5: Educational Walkthrough - How Personalized Recommendation Works */}
              <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 backdrop-blur-md space-y-4">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <HelpCircle className="h-4 w-4 text-blue-400" />
                  How the Personalized Recommendation Works
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-gray-950 p-3 border border-gray-850">
                    <p className="text-gray-400 text-[10px] uppercase font-bold">File Metadata</p>
                    <p className="font-semibold text-white mt-1">{fileMetadata.extension} ({fileMetadata.sizeFormatted})</p>
                  </div>
                  <div className="rounded-lg bg-gray-950 p-3 border border-gray-850">
                    <p className="text-gray-400 text-[10px] uppercase font-bold">Importance</p>
                    <p className="font-semibold text-purple-400 mt-1">{userImportance}</p>
                  </div>
                  <div className="rounded-lg bg-gray-950 p-3 border border-gray-850">
                    <p className="text-gray-400 text-[10px] uppercase font-bold">Expected Usage</p>
                    <p className="font-semibold text-cyan-400 mt-1">{userUsage}</p>
                  </div>
                  <div className="rounded-lg bg-gray-950 p-3 border border-gray-850">
                    <p className="text-gray-400 text-[10px] uppercase font-bold">Priority Score</p>
                    <p className="font-bold text-emerald-400 mt-1">{personalizedRec?.priority_score || '3.5'} / 5.0</p>
                  </div>
                  <div className="rounded-lg bg-gray-950 p-3 border border-purple-500/30">
                    <p className="text-purple-300 text-[10px] uppercase font-bold">Tier Outcome</p>
                    <p className="font-bold text-white mt-1">{personalizedRec?.recommended_tier || 'COOL'}</p>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-gray-300 pt-2 border-t border-gray-850">
                  <p className="font-semibold text-white">Policy Decision Rules & Examples:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px] text-gray-300">
                    <div className="rounded bg-gray-950 p-2.5 border border-amber-500/20">
                      <span className="text-amber-400 font-bold">Score 4.0 – 5.0 → HOT</span>
                      <p className="text-[10px] text-gray-400 font-sans mt-0.5">e.g. Very Important + Frequently</p>
                    </div>
                    <div className="rounded bg-gray-950 p-2.5 border border-cyan-500/20">
                      <span className="text-cyan-400 font-bold">Score 3.0 – 3.99 → COOL</span>
                      <p className="text-[10px] text-gray-400 font-sans mt-0.5">e.g. Important + Occasionally</p>
                    </div>
                    <div className="rounded bg-gray-950 p-2.5 border border-purple-500/20">
                      <span className="text-purple-400 font-bold">Score 1.0 – 2.99 → ARCHIVE</span>
                      <p className="text-[10px] text-gray-400 font-sans mt-0.5">e.g. Less Important + Rarely</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-400 pt-1">
                    *Special Override: <strong>VERY IMPORTANT</strong> files enforce a minimum tier of <strong>COOL</strong> (e.g. Very Important + Almost Never → COOL).
                    Unlike the behavioral XGBoost model, this recommendation uses your stated preferences and is not trained on historical data.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Explanation Modal */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">
                  AI Recommendation Advisory Explanation
                </h3>
              </div>
              <button
                onClick={() => setAiModalOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* AI Explanation Content */}
            {aiExplaining ? (
              <div className="py-8">
                <LoadingState message="Generating advisory explanation for personalized recommendation..." />
              </div>
            ) : aiExplainError ? (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-300">
                {aiExplainError}
              </div>
            ) : aiExplanationData ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 text-xs leading-relaxed text-gray-200 space-y-2 whitespace-pre-line font-sans">
                  {aiExplanationData.explanation}
                </div>

                <div className="rounded-lg border border-gray-800 bg-gray-950 p-3 text-[11px] text-gray-400 space-y-1">
                  <div className="flex items-center gap-1.5 text-purple-400 font-semibold">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Advisory Notice
                  </div>
                  <p>
                    {aiExplanationData.advisory_disclaimer ||
                      'Personalized recommendation engine decides. Generative AI explains.'}
                  </p>
                  <p className="text-gray-500 text-[10px]">
                    The AI explains the deterministic recommendation but cannot alter it. Actual cloud costs depend on vendor pricing and workload dynamics.
                  </p>
                </div>
              </div>
            ) : null}

            {/* Modal Footer */}
            <div className="flex justify-end pt-2 border-t border-gray-800">
              <button
                onClick={() => setAiModalOpen(false)}
                className="rounded-lg bg-gray-800 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
