import React, { useState, useEffect } from 'react';
import {
  TrendingDown,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Info,
  X,
} from 'lucide-react';


import api from '../services/api';
import TierBadge from '../components/TierBadge';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

export default function StorageOptimization() {
  const [activeTab, setActiveTab] = useState('HOT'); // 'HOT' (HOT->COOL) or 'COOL' (COOL->ARCHIVE)
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal for AI Optimization Explanation
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [explaining, setExplaining] = useState(false);
  const [explanationData, setExplanationData] = useState(null);
  const [explainError, setExplainError] = useState(null);

  // Fetch candidates from backend
  const fetchCandidates = async (tier) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getOptimizationCandidates({
        tierFrom: tier,
        limit: 25,
      });
      setCandidates(data.candidates || []);
    } catch (err) {
      setError(err.message || 'Failed to retrieve optimization candidates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates(activeTab);
  }, [activeTab]);

  // Request AI Explanation for a candidate
  const handleExplainCandidate = async (candidate) => {
    setSelectedCandidate(candidate);
    setExplaining(true);
    setExplanationData(null);
    setExplainError(null);

    try {
      const res = await api.explainOptimization(candidate);
      setExplanationData(res);
    } catch (err) {
      setExplainError(
        'AI explanation service is currently unavailable. Candidate data remains accurate and valid.'
      );
    } finally {
      setExplaining(false);
    }
  };

  return (
    <div className="space-y-6 p-6 md:p-8">
      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-cyan-400" />
            Storage Lifecycle Optimization Opportunities
          </h2>
          <p className="text-xs text-gray-400">
            Algorithmic identification of dormant files eligible for storage tier demotion based on empirical access gaps
          </p>
        </div>

        <button
          onClick={() => fetchCandidates(activeTab)}
          className="flex items-center gap-1.5 rounded-lg border border-gray-800 bg-gray-900 px-3.5 py-1.5 text-xs text-gray-300 hover:bg-gray-850 hover:text-white transition-colors self-start md:self-auto"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh Candidates
        </button>
      </div>

      {/* 2. Mandatory No-Fake-Savings & Academic Integrity Banner */}
      <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/30 via-gray-900/40 to-blue-950/30 p-5 backdrop-blur-md space-y-2">
        <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs uppercase tracking-wider">
          <ShieldAlert className="h-4 w-4" />
          Potential Optimization Opportunity — Academic Honesty Notice
        </div>
        <p className="text-xs text-gray-200 leading-relaxed font-medium">
          Actual cost savings depend on cloud-provider pricing, storage policies, migration frequency, retrieval costs, and workload behavior.
        </p>
        <p className="text-xs text-gray-400 leading-relaxed">
          The suggestions below represent model-based lifecycle transitions derived from observed inactivity within the 14.36-minute trace window.
          <strong> No monetary savings ($ or ₹) are fabricated or guaranteed.</strong> The ML model remains the authoritative classifier; Generative AI provides advisory explanations.
        </p>
      </div>

      {/* 3. Transition Strategy Selector (Tabs) */}
      <div className="flex rounded-xl border border-gray-800 bg-gray-900/60 p-1.5 max-w-md">
        <button
          onClick={() => setActiveTab('HOT')}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-colors ${
            activeTab === 'HOT'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          HOT → COOL Candidates
        </button>
        <button
          onClick={() => setActiveTab('COOL')}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-colors ${
            activeTab === 'COOL'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          COOL → ARCHIVE Candidates
        </button>
      </div>

      {/* 4. Candidate Overview Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
          <span className="text-[10px] uppercase font-bold text-gray-400">Identified Candidates</span>
          <p className="text-2xl font-black text-white mt-1">{candidates.length}</p>
          <p className="text-[11px] text-gray-500">Sorted by inactivity gap descending</p>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
          <span className="text-[10px] uppercase font-bold text-gray-400">Target Transition</span>
          <div className="flex items-center gap-2 mt-1">
            <TierBadge tier={activeTab} size="sm" />
            <ArrowRight className="h-3.5 w-3.5 text-gray-500" />
            <TierBadge tier={activeTab === 'HOT' ? 'COOL' : 'ARCHIVE'} size="sm" />
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Lifecycle demotion policy</p>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
          <span className="text-[10px] uppercase font-bold text-gray-400">Demotion Criterion</span>
          <p className="text-xs font-semibold text-gray-200 mt-1">
            {activeTab === 'HOT'
              ? 'High idle interval relative to HOT peers'
              : 'Infrequent touches & cold idle interval'}
          </p>
          <p className="text-[11px] text-gray-500">Trace window inactivity</p>
        </div>
      </div>

      {/* 5. Candidates Table */}
      {loading ? (
        <LoadingState message="Scanning dataset for lifecycle optimization candidates..." />
      ) : error ? (
        <ErrorState
          title="Error Loading Candidates"
          message={error}
          onRetry={() => fetchCandidates(activeTab)}
        />
      ) : candidates.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-8 text-center text-xs text-gray-400">
          No candidates found matching the criteria.
        </div>
      ) : (
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 backdrop-blur-md overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">
                {activeTab === 'HOT' ? 'HOT → COOL Demotion Candidates' : 'COOL → ARCHIVE Demotion Candidates'}
              </h3>
              <p className="text-xs text-gray-400">
                Real files exhibiting dormancy patterns within the observation window
              </p>
            </div>
            <span className="text-xs font-mono text-gray-500">{candidates.length} candidates loaded</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-800 bg-gray-950/80 text-[10px] font-semibold uppercase text-gray-400">
                <tr>
                  <th className="py-3 px-4">Filename (SHA-256)</th>
                  <th className="py-3 px-3">Current</th>
                  <th className="py-3 px-3">Suggested</th>
                  <th className="py-3 px-3 text-right">Inactivity Gap</th>
                  <th className="py-3 px-3 text-right">Total Accesses</th>
                  <th className="py-3 px-3 text-right">Cache Hit Ratio</th>
                  <th className="py-3 px-3 text-right">Est. Size (KB)</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-mono text-[11px]">
                {candidates.map((file, idx) => (
                  <tr key={idx} className="hover:bg-gray-850/50 transition-colors">
                    <td className="py-3 px-4 text-gray-300 font-mono">
                      <span title={file.filename}>
                        {file.filename.slice(0, 18)}...{file.filename.slice(-6)}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <TierBadge tier={file.current_tier} size="sm" />
                    </td>
                    <td className="py-3 px-3">
                      <TierBadge tier={file.suggested_tier} size="sm" />
                    </td>
                    <td className="py-3 px-3 text-right text-cyan-400 font-semibold">
                      {file.seconds_since_last_access !== undefined
                        ? `${file.seconds_since_last_access}s`
                        : `${file.days_since_last_access}d`}
                    </td>
                    <td className="py-3 px-3 text-right text-gray-300">
                      {file.total_accesses.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right text-gray-400">
                      {(file.cache_hit_ratio * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 text-right text-gray-400">
                      {((file.estimated_file_size_bytes_proxy || 0) / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleExplainCandidate(file)}
                        className="inline-flex items-center gap-1 rounded bg-purple-600/20 border border-purple-500/30 px-2.5 py-1 text-[10px] font-semibold text-purple-300 hover:bg-purple-600/30 transition-colors"
                      >
                        <Sparkles className="h-3 w-3" />
                        Explain Opportunity
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. AI Explanation Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">
                  AI Optimization Opportunity Explanation
                </h3>
              </div>
              <button
                onClick={() => setSelectedCandidate(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Candidate Metadata Summary */}
            <div className="rounded-xl border border-gray-800 bg-gray-950 p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-gray-400">File Identifier</span>
                <span className="font-mono text-gray-300 truncate max-w-sm">
                  {selectedCandidate.filename}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-gray-850">
                <span className="text-[10px] uppercase font-bold text-gray-400">Transition Path</span>
                <div className="flex items-center gap-2">
                  <TierBadge tier={selectedCandidate.current_tier} size="sm" />
                  <ArrowRight className="h-3 w-3 text-gray-500" />
                  <TierBadge tier={selectedCandidate.suggested_tier} size="sm" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-850 text-[11px]">
                <div>
                  <span className="text-gray-500 text-[10px]">Inactivity Gap:</span>
                  <p className="font-mono font-bold text-cyan-400">
                    {selectedCandidate.seconds_since_last_access}s
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px]">Total Accesses:</span>
                  <p className="font-mono font-bold text-white">
                    {selectedCandidate.total_accesses}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px]">Cache Hit Ratio:</span>
                  <p className="font-mono font-bold text-purple-400">
                    {(selectedCandidate.cache_hit_ratio * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            {/* AI Explanation Content */}
            {explaining ? (
              <div className="py-8">
                <LoadingState message="Generating grounded lifecycle explanation..." />
              </div>
            ) : explainError ? (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-300">
                {explainError}
              </div>
            ) : explanationData ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 text-xs leading-relaxed text-gray-200 space-y-2 whitespace-pre-line font-sans">
                  {explanationData.explanation}
                </div>

                <div className="rounded-lg border border-gray-800 bg-gray-950 p-3 text-[11px] text-gray-400 space-y-1">
                  <div className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                    <Info className="h-3.5 w-3.5" />
                    Advisory Lifecycle Guidance
                  </div>
                  <p>
                    {explanationData.disclaimer ||
                      'Potential Optimization Opportunity. Actual cost savings depend on cloud-provider pricing, storage policies, migration frequency, retrieval costs, and workload behavior.'}
                  </p>
                </div>
              </div>
            ) : null}

            {/* Modal Footer */}
            <div className="flex justify-end pt-2 border-t border-gray-800">
              <button
                onClick={() => setSelectedCandidate(null)}
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
