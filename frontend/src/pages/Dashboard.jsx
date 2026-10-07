import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Flame,
  CloudSun,
  Snowflake,
  Activity,
  Award,
  AlertCircle,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';

import api from '../services/api';
import StatCard from '../components/StatCard';
import TierBadge from '../components/TierBadge';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

// Distinct colors for storage tiers
const TIER_COLORS = {
  HOT: '#f59e0b',     // Amber / Fire Orange
  COOL: '#06b6d4',    // Cyan / Sky Blue
  ARCHIVE: '#a855f7', // Purple / Violet
};

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [distribution, setDistribution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, distRes] = await Promise.all([
        api.getDashboardSummary(),
        api.getDashboardTierDistribution(),
      ]);
      setSummary(summaryRes);
      setDistribution(distRes);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <LoadingState message="Fetching storage trace analytics from FastAPI..." />
      </div>
    );
  }

  if (error || !summary || !distribution) {
    return (
      <div className="p-6 md:p-8">
        <ErrorState
          title="Failed to Load Dashboard"
          message={error || 'Unable to retrieve real dataset metrics from the backend.'}
          onRetry={fetchDashboardData}
        />
      </div>
    );
  }

  // Format bytes for display
  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  // Pie chart data
  const pieData = distribution.tier_distribution.map((t) => ({
    name: t.tier,
    value: t.count,
    percentage: t.percentage,
    color: TIER_COLORS[t.tier] || '#64748b',
  }));

  // Application chart: Top 6 applications by total count
  const topApps = [...(distribution.application_distribution || [])]
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  return (
    <div className="space-y-6 p-6 md:p-8">
      {/* 1. Academic Research Limitation Notice */}
      <div className="relative overflow-hidden rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div className="space-y-1 text-xs">
            <h4 className="font-semibold text-amber-300">Important Research Limitation Notice</h4>
            <p className="text-gray-300">
              <strong>Dataset limitation:</strong> The source trace covers approximately{' '}
              <strong className="text-white">14.36 minutes (2024-01-15)</strong>. Therefore, long-term access
              features such as 7-day and 30-day access counts cannot represent true long-term behavior.
            </p>
            <p className="text-gray-400">
              <strong>Labeling notice:</strong> HOT / COOL / ARCHIVE labels are heuristic pseudo-labels derived from
              a Composite Storage Activity Index, rather than externally provided cloud-provider ground truth.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Primary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="Total Files"
          value={summary.total_files.toLocaleString()}
          subtitle="Unique files in trace"
          icon={FileText}
          color="blue"
        />
        <StatCard
          title="HOT Files"
          value={summary.hot_count.toLocaleString()}
          subtitle={`${summary.hot_pct}% of total`}
          icon={Flame}
          color="amber"
          badge="High Activity"
        />
        <StatCard
          title="COOL Files"
          value={summary.cool_count.toLocaleString()}
          subtitle={`${summary.cool_pct}% of total`}
          icon={CloudSun}
          color="cyan"
          badge="Occasional"
        />
        <StatCard
          title="ARCHIVE Files"
          value={summary.archive_count.toLocaleString()}
          subtitle={`${summary.archive_pct}% of total`}
          icon={Snowflake}
          color="purple"
          badge="Infrequent"
        />
        <StatCard
          title="Total Accesses"
          value={summary.total_accesses.toLocaleString()}
          subtitle="Trace I/O events"
          icon={Activity}
          color="emerald"
        />
        <StatCard
          title="Model Accuracy"
          value={`${(summary.model_accuracy * 100).toFixed(2)}%`}
          subtitle="Best Model: XGBoost"
          icon={Award}
          color="blue"
          badge="Test Set"
        />
      </div>

      {/* 3. Secondary Metrics Strip */}
      <div className="grid grid-cols-2 gap-3 rounded-xl border border-gray-800 bg-gray-900/40 p-4 backdrop-blur-sm sm:grid-cols-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500">Avg Cache Hit Ratio</p>
          <p className="mt-1 text-base font-bold text-gray-200">
            {(summary.avg_cache_hit_ratio * 100).toFixed(2)}%
          </p>
          <p className="text-[11px] text-gray-400">Across all active files</p>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500">Total Request I/O</p>
          <p className="mt-1 text-base font-bold text-gray-200">{formatBytes(summary.total_request_io_bytes)}</p>
          <p className="text-[11px] text-gray-400">Client storage requests</p>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500">Total Disk I/O</p>
          <p className="mt-1 text-base font-bold text-gray-200">{formatBytes(summary.total_disk_io_bytes)}</p>
          <p className="text-[11px] text-gray-400">Physical backend writes/reads</p>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500">Unique Applications</p>
          <p className="mt-1 text-base font-bold text-gray-200">{summary.unique_applications}</p>
          <p className="text-[11px] text-gray-400">Services logged in trace</p>
        </div>
      </div>

      {/* 4. Visualizations Grid (2x2) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Chart 1: Storage Tier Distribution Donut */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between pb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Storage Tier Distribution</h3>
              <p className="text-xs text-gray-400">Proportion of files categorized per logical tier</p>
            </div>
            <div className="flex items-center gap-2">
              <TierBadge tier="HOT" size="sm" />
              <TierBadge tier="COOL" size="sm" />
              <TierBadge tier="ARCHIVE" size="sm" />
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percentage }) => `${name} (${percentage}%)`}
                  labelLine={false}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} stroke="#111827" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-gray-700 bg-gray-950 p-2.5 shadow-xl text-xs">
                          <p className="font-semibold text-white">{data.name} Tier</p>
                          <p className="text-gray-300">Files: <strong className="text-white">{data.value.toLocaleString()}</strong></p>
                          <p className="text-gray-400">Share: <strong>{data.percentage}%</strong></p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-gray-800/80 pt-3 text-center text-xs">
            <div>
              <span className="text-amber-400 font-semibold">{summary.hot_count.toLocaleString()}</span>
              <p className="text-gray-400">HOT ({summary.hot_pct}%)</p>
            </div>
            <div>
              <span className="text-cyan-400 font-semibold">{summary.cool_count.toLocaleString()}</span>
              <p className="text-gray-400">COOL ({summary.cool_pct}%)</p>
            </div>
            <div>
              <span className="text-purple-400 font-semibold">{summary.archive_count.toLocaleString()}</span>
              <p className="text-gray-400">ARCHIVE ({summary.archive_pct}%)</p>
            </div>
          </div>
        </div>

        {/* Chart 2: Access Frequency Bins */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between pb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Access Frequency Distribution</h3>
              <p className="text-xs text-gray-400">Number of files per access count range</p>
            </div>
            <span className="rounded bg-gray-800 px-2 py-0.5 text-[11px] text-gray-400">I/O Events</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distribution.access_frequency_bins} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="range" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-gray-700 bg-gray-950 p-2.5 shadow-xl text-xs">
                          <p className="font-semibold text-white">{data.range} Accesses</p>
                          <p className="text-blue-400">Files: <strong className="text-white">{data.count.toLocaleString()}</strong></p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-gray-800/80 pt-3 text-xs text-gray-400">
            <span>Skewed towards lower counts (typical long-tail cloud distribution)</span>
            <span className="font-medium text-gray-300">Total: {summary.total_files.toLocaleString()} files</span>
          </div>
        </div>

        {/* Chart 3: Cache Hit Ratio Distribution */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between pb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Cache Hit Ratio Distribution</h3>
              <p className="text-xs text-gray-400">Files grouped by storage cache performance</p>
            </div>
            <span className="rounded bg-gray-800 px-2 py-0.5 text-[11px] text-gray-400">5 Intervals</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distribution.cache_hit_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="range" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-gray-700 bg-gray-950 p-2.5 shadow-xl text-xs">
                          <p className="font-semibold text-white">Hit Ratio: {data.range}</p>
                          <p className="text-cyan-400">Files: <strong className="text-white">{data.count.toLocaleString()}</strong></p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-gray-800/80 pt-3 text-xs text-gray-400">
            <span>Average Cache Hit Ratio: {(summary.avg_cache_hit_ratio * 100).toFixed(2)}%</span>
            <span className="text-cyan-400 font-medium">Flash cache assisted</span>
          </div>
        </div>

        {/* Chart 4: Application Breakdown (Stacked) */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between pb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Top Applications Tier Breakdown</h3>
              <p className="text-xs text-gray-400">Storage tiers across top 6 active applications</p>
            </div>
            <span className="rounded bg-gray-800 px-2 py-0.5 text-[11px] text-gray-400">Stacked Bar</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topApps} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="short_name" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                <YAxis stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-gray-700 bg-gray-950 p-2.5 shadow-xl text-xs space-y-1">
                          <p className="font-semibold text-white truncate max-w-xs">{data.application}</p>
                          <p className="text-amber-400">HOT: <strong>{data.hot}</strong></p>
                          <p className="text-cyan-400">COOL: <strong>{data.cool}</strong></p>
                          <p className="text-purple-400">ARCHIVE: <strong>{data.archive}</strong></p>
                          <p className="border-t border-gray-800 pt-1 text-gray-300">Total: <strong>{data.total}</strong></p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }} />
                <Bar dataKey="hot" name="HOT" stackId="a" fill="#f59e0b" />
                <Bar dataKey="cool" name="COOL" stackId="a" fill="#06b6d4" />
                <Bar dataKey="archive" name="ARCHIVE" stackId="a" fill="#a855f7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-gray-800/80 pt-3 text-xs text-gray-400">
            <span>Distribution demonstrates varied access profiles across microservices</span>
            <span className="font-medium text-gray-300">76 total apps</span>
          </div>
        </div>
      </div>

      {/* 5. Model Highlight & Evaluation Card */}
      <div className="rounded-xl border border-blue-500/30 bg-gradient-to-r from-blue-950/40 via-gray-900/60 to-purple-950/40 p-6 backdrop-blur-md">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-blue-500/20 px-2 py-0.5 text-xs font-semibold text-blue-400 border border-blue-500/30">
                PRODUCTION MODEL
              </span>
              <span className="text-xs text-gray-400">Configuration A (Behavioral)</span>
            </div>
            <h3 className="text-xl font-bold tracking-tight text-white">
              Best Model: XGBoost Classifier
            </h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              Trained on 30 behavioral access features across 10,852 training files and evaluated on 2,713 test files.
              Demonstrates exceptional convergence and macro F1 balance across all three storage tiers.
            </p>
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-[11px] text-blue-300/90">
              <strong>Academic notice:</strong> Performance shown here reflects prediction of the project's
              heuristic storage-tier policy, not externally provided cloud-provider storage-tier ground truth.
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 shrink-0">
            <div className="rounded-lg border border-gray-800 bg-gray-950/80 p-3 text-center">
              <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Test Accuracy</p>
              <p className="mt-1 text-xl font-bold text-emerald-400">97.83%</p>
              <p className="text-[10px] text-gray-500">2,713 test files</p>
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-950/80 p-3 text-center">
              <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">5-Fold CV Mean</p>
              <p className="mt-1 text-xl font-bold text-blue-400">97.75%</p>
              <p className="text-[10px] text-gray-500">± 0.22% std</p>
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-950/80 p-3 text-center col-span-2 sm:col-span-1">
              <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Weighted F1</p>
              <p className="mt-1 text-xl font-bold text-purple-400">0.9783</p>
              <p className="text-[10px] text-gray-500">Balanced tiers</p>
            </div>
          </div>
        </div>
      </div>

      {/* 6. System & Shard Meta Footer Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-800/60 bg-gray-950/40 px-4 py-3 text-xs text-gray-400">
        <div className="flex flex-wrap items-center gap-4">
          <span><strong>Dataset Shard:</strong> Google Thesios Trace</span>
          <span><strong>Trace Date:</strong> {summary.trace_date}</span>
          <span><strong>Observation Window:</strong> {summary.trace_duration_minutes} minutes</span>
          <span><strong>Raw I/O Events:</strong> {summary.total_accesses.toLocaleString()}</span>
        </div>
        <div className="text-[11px] text-gray-500">
          Intelligent Cloud Storage Tier Predictor • College Data Mining & AI Project
        </div>
      </div>
    </div>
  );
}
