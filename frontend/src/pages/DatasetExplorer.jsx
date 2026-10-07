import React, { useState, useEffect, useMemo } from 'react';
import {
  Database,
  Search,
  Filter,
  Layers,
  Activity,
  Clock,
  FileText,
  AlertTriangle,
  Calendar,
} from 'lucide-react';


import api from '../services/api';
import TierBadge from '../components/TierBadge';
import StatCard from '../components/StatCard';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

// Comprehensive catalog of all 37 engineered features from DATA_DICTIONARY.md
const FEATURE_CATALOG = [
  // 1. File / Identity (2)
  {
    name: 'filename',
    category: 'Identity',
    dataType: 'string',
    role: 'Entity Key',
    desc: 'Unique 64-character SHA-256 cryptographic hash identifying the file in the cluster.',
  },
  {
    name: 'application',
    category: 'Identity',
    dataType: 'string',
    role: 'Workload Context',
    desc: 'Dominant client microservice or application accessing the file (e.g. Spanner, Bigtable, Blobstore).',
  },

  // 2. Access Behavior (13)
  {
    name: 'total_accesses',
    category: 'Access Behavior',
    dataType: 'int64',
    role: 'Top Predictor',
    desc: 'Total number of I/O read and write access events performed on the file during the trace window.',
  },
  {
    name: 'read_count',
    category: 'Access Behavior',
    dataType: 'int64',
    role: 'Volume Metric',
    desc: 'Count of read I/O operations executed against the file.',
  },
  {
    name: 'write_count',
    category: 'Access Behavior',
    dataType: 'int64',
    role: 'Volume Metric',
    desc: 'Count of write, append, or sync I/O operations executed against the file.',
  },
  {
    name: 'read_ratio',
    category: 'Access Behavior',
    dataType: 'float64',
    role: 'Access Pattern',
    desc: 'Proportion of total operations that are reads (read_count / total_accesses, range 0.0–1.0).',
  },
  {
    name: 'unique_access_days',
    category: 'Access Behavior',
    dataType: 'int64',
    role: 'Historical Regularity',
    desc: 'Distinct calendar days on which the file was touched (equals 1 due to 14.36 min trace boundary).',
  },
  {
    name: 'accesses_last_7_days',
    category: 'Access Behavior',
    dataType: 'int64',
    role: 'Temporal Recency',
    desc: 'Accesses within 7 days prior to trace end (equals total_accesses due to 14.36m trace window).',
  },
  {
    name: 'accesses_last_30_days',
    category: 'Access Behavior',
    dataType: 'int64',
    role: 'Temporal Recency',
    desc: 'Accesses within 30 days prior to trace end (equals total_accesses due to 14.36m trace window).',
  },
  {
    name: 'accesses_last_5_min',
    category: 'Access Behavior',
    dataType: 'int64',
    role: 'Top Predictor (Gain)',
    desc: 'Access requests within the final 5 minutes of trace collection. #1 XGBoost feature.',
  },
  {
    name: 'access_frequency',
    category: 'Access Behavior',
    dataType: 'float64',
    role: 'Access Rate',
    desc: 'Operational access rate per second over the active duration of the file.',
  },
  {
    name: 'average_access_interval',
    category: 'Access Behavior',
    dataType: 'float64',
    role: 'Inter-Arrival Time',
    desc: 'Mean time elapsed between consecutive access events in seconds.',
  },
  {
    name: 'median_access_interval',
    category: 'Access Behavior',
    dataType: 'float64',
    role: 'Inter-Arrival Time',
    desc: 'Median time elapsed between consecutive access events in seconds (robust to burst outliers).',
  },
  {
    name: 'days_since_last_access',
    category: 'Access Behavior',
    dataType: 'float64',
    role: 'Top Predictor',
    desc: 'Elapsed inactivity gap between final file access and trace cutoff boundary, in fractional days.',
  },
  {
    name: 'seconds_since_last_access',
    category: 'Access Behavior',
    dataType: 'float64',
    role: 'Recency Metric',
    desc: 'Elapsed inactivity gap between final file access and trace cutoff boundary, in seconds (0.0–851.0s).',
  },

  // 3. Time / Activity (5)
  {
    name: 'first_access_timestamp',
    category: 'Time & Activity',
    dataType: 'string',
    role: 'Temporal Boundary',
    desc: 'UTC timestamp of the earliest recorded I/O request for this file in the trace.',
  },
  {
    name: 'last_access_timestamp',
    category: 'Time & Activity',
    dataType: 'string',
    role: 'Temporal Boundary',
    desc: 'UTC timestamp of the latest recorded I/O request for this file in the trace.',
  },
  {
    name: 'file_age_days',
    category: 'Time & Activity',
    dataType: 'float64',
    role: 'Trace Age',
    desc: 'Elapsed time from first observation to trace cutoff boundary, measured in fractional days.',
  },
  {
    name: 'activity_span_days',
    category: 'Time & Activity',
    dataType: 'float64',
    role: 'Duration Metric',
    desc: 'Time difference between last and first access (last_time - first_time) in fractional days.',
  },
  {
    name: 'activity_span_seconds',
    category: 'Time & Activity',
    dataType: 'float64',
    role: 'Duration Metric',
    desc: 'Time difference between last and first access in seconds. Distinguishes bursts from sustained activity.',
  },

  // 4. I/O Volume & Granularity (7)
  {
    name: 'average_request_io_size',
    category: 'I/O Telemetry',
    dataType: 'float64',
    role: 'Request Granularity',
    desc: 'Mean client request transfer size in bytes across all operations.',
  },
  {
    name: 'median_request_io_size',
    category: 'I/O Telemetry',
    dataType: 'float64',
    role: 'Request Granularity',
    desc: 'Median client request transfer size in bytes (unaffected by extreme large-block outliers).',
  },
  {
    name: 'total_request_io_bytes',
    category: 'I/O Telemetry',
    dataType: 'int64',
    role: 'Throughput Volume',
    desc: 'Cumulative sum of client request I/O bytes transferred for the file.',
  },
  {
    name: 'average_response_io_size',
    category: 'I/O Telemetry',
    dataType: 'float64',
    role: 'Response Payload',
    desc: 'Mean response payload transfer size in bytes returned by storage servers.',
  },
  {
    name: 'total_response_io_bytes',
    category: 'I/O Telemetry',
    dataType: 'int64',
    role: 'Response Payload',
    desc: 'Cumulative sum of response payload bytes returned for the file.',
  },
  {
    name: 'average_disk_io_size',
    category: 'I/O Telemetry',
    dataType: 'float64',
    role: 'Physical Media',
    desc: 'Mean physical block I/O size written or read on physical backing storage drives.',
  },
  {
    name: 'total_disk_io_bytes',
    category: 'I/O Telemetry',
    dataType: 'int64',
    role: 'Physical Media',
    desc: 'Cumulative physical backend storage bytes transferred (disk reads and writes).',
  },

  // 5. Cache Performance (4)
  {
    name: 'cache_hit_count',
    category: 'Cache Performance',
    dataType: 'int64',
    role: 'Memory Serving',
    desc: 'Number of requests served directly from memory or flash cache without disk retrieval.',
  },
  {
    name: 'cache_miss_count',
    category: 'Cache Performance',
    dataType: 'int64',
    role: 'Cold Misses',
    desc: 'Number of requests requiring physical disk retrieval due to cache misses.',
  },
  {
    name: 'cache_hit_ratio',
    category: 'Cache Performance',
    dataType: 'float64',
    role: 'Cache Hotness',
    desc: 'Proportion of requests satisfied from cache (cache_hit_count / total_accesses, range 0.0–1.0).',
  },
  {
    name: 'flash_cache_ratio',
    category: 'Cache Performance',
    dataType: 'float64',
    role: 'Flash Tiering',
    desc: 'Proportion of cache hits satisfied specifically by SSD/Flash tiers versus DRAM.',
  },

  // 6. Context & QoS (3)
  {
    name: 'dominant_io_zone',
    category: 'Infrastructure & QoS',
    dataType: 'string',
    role: 'Cluster Partition',
    desc: 'Modal cluster zone assignment (WARM: 94.7%, COLD: 5.0%, UNKNOWN: 0.3%). Excluded from model training to prevent target bias.',
  },
  {
    name: 'dominant_service_class',
    category: 'Infrastructure & QoS',
    dataType: 'string',
    role: 'QoS Priority',
    desc: 'Modal QoS service tier assigned to requests (e.g. latency-critical vs batch throughput).',
  },
  {
    name: 'dominant_redundancy_type',
    category: 'Infrastructure & QoS',
    dataType: 'string',
    role: 'Fault Tolerance',
    desc: 'Modal replication or erasure-coding scheme protecting data blocks (e.g. 3x replication vs Reed-Solomon).',
  },

  // 7. Size Proxy & Label (3)
  {
    name: 'estimated_file_size_bytes_proxy',
    category: 'Size & Target',
    dataType: 'float64',
    role: 'Size Proxy',
    desc: 'Empirical lower-bound proxy: max observed file offset + request size. True size unobservable in I/O traces.',
  },
  {
    name: 'activity_score',
    category: 'Size & Target',
    dataType: 'float64',
    role: 'Composite Index',
    desc: 'Continuous Composite Storage Activity Index (S_i in [0, 1]) combining access, recency, span, and caching. Excluded from training.',
  },
  {
    name: 'storage_tier',
    category: 'Size & Target',
    dataType: 'string',
    role: 'Supervised Target',
    desc: 'Target class label: HOT (S >= 0.6027), COOL (0.4061 < S < 0.6027), or ARCHIVE (S <= 0.4061).',
  },
];

const CATEGORIES = [
  'All',
  'Identity',
  'Access Behavior',
  'Time & Activity',
  'I/O Telemetry',
  'Cache Performance',
  'Infrastructure & QoS',
  'Size & Target',
];

export default function DatasetExplorer() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Feature catalog filtering
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let mounted = true;
    api.getDatasetSummary()
      .then((data) => {
        if (mounted) {
          setSummary(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err.message || 'Failed to load dataset summary');
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Filtered feature catalog
  const filteredFeatures = useMemo(() => {
    return FEATURE_CATALOG.filter((feat) => {
      const matchesCategory =
        selectedCategory === 'All' || feat.category === selectedCategory;
      const matchesQuery =
        !searchQuery ||
        feat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        feat.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        feat.role.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [selectedCategory, searchQuery]);

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <LoadingState message="Loading dataset metadata and feature catalog..." />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="p-6 md:p-8">
        <ErrorState
          title="Failed to Load Dataset Explorer"
          message={error || 'Unable to retrieve dataset summary from backend.'}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 md:p-8">
      {/* 1. Page Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-white">Google Thesios Dataset Explorer</h2>
        <p className="text-xs text-gray-400">
          Exploration of raw trace dimensions, aggregation pipeline, and comprehensive 37-feature data dictionary
        </p>
      </div>

      {/* 2. Dataset Overview Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          title="Trace Duration"
          value="14.36 min"
          subtitle="861.38 seconds"
          icon={Clock}
          color="cyan"
        />
        <StatCard
          title="Raw Access Events"
          value={summary.raw_rows.toLocaleString()}
          subtitle="91.8k Reads • 76.7k Writes"
          icon={Activity}
          color="blue"
        />
        <StatCard
          title="Unique Files"
          value={summary.unique_files.toLocaleString()}
          subtitle="100% complete records"
          icon={FileText}
          color="emerald"
        />
        <StatCard
          title="Engineered Features"
          value={summary.number_of_features.toString()}
          subtitle="37 telemetry dimensions"
          icon={Layers}
          color="purple"
        />
        <StatCard
          title="Applications"
          value={(summary.applications?.length || 76).toString()}
          subtitle="Unique services logged"
          icon={Database}
          color="amber"
        />
        <StatCard
          title="Trace Date"
          value="2024-01-15"
          subtitle="UTC operational window"
          icon={Calendar}
          color="blue"
        />
      </div>

      {/* 3. Class Balance Cards */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 backdrop-blur-md space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Supervised Target Class Balance</h3>
            <p className="text-xs text-gray-400">
              Heuristic Composite Activity Index tertile thresholds establish an exactly balanced distribution
            </p>
          </div>
          <span className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-400 self-start sm:self-center">
            Perfect Class Balance (~1:1:1)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-center">
            <TierBadge tier="HOT" size="md" />
            <p className="mt-2 text-2xl font-bold text-white">
              {(summary.tier_distribution?.HOT || 4522).toLocaleString()}
            </p>
            <p className="text-xs text-gray-400">33.34% of files • Activity score S ≥ 0.6027</p>
          </div>
          <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4 text-center">
            <TierBadge tier="COOL" size="md" />
            <p className="mt-2 text-2xl font-bold text-white">
              {(summary.tier_distribution?.COOL || 4522).toLocaleString()}
            </p>
            <p className="text-xs text-gray-400">33.34% of files • 0.4061 &lt; S &lt; 0.6027</p>
          </div>
          <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-4 text-center">
            <TierBadge tier="ARCHIVE" size="md" />
            <p className="mt-2 text-2xl font-bold text-white">
              {(summary.tier_distribution?.ARCHIVE || 4521).toLocaleString()}
            </p>
            <p className="text-xs text-gray-400">33.33% of files • Activity score S ≤ 0.4061</p>
          </div>
        </div>
      </div>

      {/* 4. Complete 37-Feature Catalog Table */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 backdrop-blur-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-400" />
              Engineered Feature Catalog ({FEATURE_CATALOG.length} Features)
            </h3>
            <p className="text-xs text-gray-400">
              Complete dictionary of features generated by the file-level aggregation pipeline
            </p>
          </div>

          {/* Search bar within catalog */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-500" />
            <input
              type="text"
              placeholder="Search feature by name, role, or desc..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-800 bg-gray-950 py-1.5 pl-8 pr-3 text-xs text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-gray-800/80 pt-3">
          <span className="text-xs text-gray-400 mr-1 flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" /> Group:
          </span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Catalog Table */}
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-800 bg-gray-950/80 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              <tr>
                <th className="py-2.5 px-3">Feature Name</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-2">Type</th>
                <th className="py-2.5 px-3">Role / Importance</th>
                <th className="py-2.5 px-4">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {filteredFeatures.map((feat) => (
                <tr key={feat.name} className="hover:bg-gray-850/50 transition">
                  <td className="py-2.5 px-3 font-mono font-semibold text-blue-300">
                    {feat.name}
                  </td>
                  <td className="py-2.5 px-3 text-gray-400 whitespace-nowrap">
                    <span className="rounded bg-gray-800 px-2 py-0.5 text-[10px]">
                      {feat.category}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 font-mono text-[11px] text-gray-500">
                    {feat.dataType}
                  </td>
                  <td className="py-2.5 px-3 text-gray-300 whitespace-nowrap">
                    <span
                      className={`font-medium ${
                        feat.role.includes('Top')
                          ? 'text-amber-400 font-bold'
                          : feat.role.includes('Target')
                          ? 'text-purple-400'
                          : 'text-gray-300'
                      }`}
                    >
                      {feat.role}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-gray-300 leading-relaxed">
                    {feat.desc}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Prominent Academic Research Limitations (Exact 10 Points) */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 backdrop-blur-md space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-amber-300">
            Mandatory Academic Research Limitations & Disclosures
          </h3>
        </div>
        <p className="text-xs text-gray-300 leading-relaxed">
          In the interest of scientific rigor and academic honesty, the following constraints of the
          Google Thesios storage dataset and experimental methodology must be explicitly acknowledged:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg border border-gray-800/80 bg-gray-950/80 p-3 space-y-1">
            <p className="font-semibold text-amber-300">1. I/O Access Event Stream</p>
            <p className="text-gray-400">
              The raw dataset consists of low-level access trace logs rather than static filesystem catalog rows.
            </p>
          </div>

          <div className="rounded-lg border border-gray-800/80 bg-gray-950/80 p-3 space-y-1">
            <p className="font-semibold text-amber-300">2. Event Aggregation Pipeline</p>
            <p className="text-gray-400">
              Raw access events were grouped by SHA-256 hash to engineer single file-level feature vectors.
            </p>
          </div>

          <div className="rounded-lg border border-gray-800/80 bg-gray-950/80 p-3 space-y-1">
            <p className="font-semibold text-amber-300">3. Anonymized Filenames & Extensions</p>
            <p className="text-gray-400">
              Filenames are cryptographic SHA-256 hashes; actual file types, extensions (.jpg, .parquet), and paths are unobservable.
            </p>
          </div>

          <div className="rounded-lg border border-gray-800/80 bg-gray-950/80 p-3 space-y-1">
            <p className="font-semibold text-amber-300">4. File Size is a Proxy</p>
            <p className="text-gray-400">
              File size is estimated as max observed offset + request size, representing an empirical lower-bound proxy.
            </p>
          </div>

          <div className="rounded-lg border border-gray-800/80 bg-gray-950/80 p-3 space-y-1">
            <p className="font-semibold text-amber-300">5. 14.36-Minute Observation Window</p>
            <p className="text-gray-400">
              The source trace window is 861.38 seconds on a single operational day (2024-01-15).
            </p>
          </div>

          <div className="rounded-lg border border-gray-800/80 bg-gray-950/80 p-3 space-y-1">
            <p className="font-semibold text-amber-300">6. Long-Term Features Equivalence</p>
            <p className="text-gray-400">
              accesses_last_7_days and accesses_last_30_days equal total_accesses and do not represent true multi-week production history.
            </p>
          </div>

          <div className="rounded-lg border border-gray-800/80 bg-gray-950/80 p-3 space-y-1">
            <p className="font-semibold text-amber-300">7. Heuristic Pseudo-Labels</p>
            <p className="text-gray-400">
              HOT, COOL, and ARCHIVE are algorithmic pseudo-labels generated from the Composite Storage Activity Index.
            </p>
          </div>

          <div className="rounded-lg border border-gray-800/80 bg-gray-950/80 p-3 space-y-1">
            <p className="font-semibold text-amber-300">8. No Vendor Ground-Truth</p>
            <p className="text-gray-400">
              Labels were not pre-assigned or provided by Google Cloud Storage or any commercial storage tiering SLA.
            </p>
          </div>

          <div className="rounded-lg border border-gray-800/80 bg-gray-950/80 p-3 space-y-1">
            <p className="font-semibold text-amber-300">9. Approximation of Policy</p>
            <p className="text-gray-400">
              The ML models learn to approximate and generalize the multi-factor access behavior tiering policy.
            </p>
          </div>

          <div className="rounded-lg border border-gray-800/80 bg-gray-950/80 p-3 space-y-1">
            <p className="font-semibold text-amber-300">10. No Monetary Savings Claim</p>
            <p className="text-gray-400">
              The project demonstrates lifecycle optimization opportunities, not verified monetary savings on cloud billing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
