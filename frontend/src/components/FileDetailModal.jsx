import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Copy,
  Check,
  Cpu,
  FileText,
  Activity,
  HardDrive,
  Zap,
  Clock,
  Database,
} from 'lucide-react';
import TierBadge from './TierBadge';
import api from '../services/api';

export default function FileDetailModal({ filename, isOpen, onClose }) {
  const navigate = useNavigate();
  const [fileData, setFileData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !filename) return;

    let mounted = true;
    setLoading(true);
    setError(null);

    api.getFileDetail(filename)
      .then((data) => {
        if (mounted) {
          setFileData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err.message || 'Failed to load file details');
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, filename]);

  if (!isOpen) return null;

  const copyFilename = () => {
    if (!filename) return;
    navigator.clipboard.writeText(filename);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatBytes = (bytes) => {
    if (bytes === null || bytes === undefined) return 'N/A';
    const num = Number(bytes);
    if (isNaN(num) || num === 0) return '0 B';
    const gb = num / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = num / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    const kb = num / 1024;
    if (kb >= 1) return `${kb.toFixed(2)} KB`;
    return `${num.toLocaleString()} B`;
  };

  const handlePredictClick = () => {
    onClose();
    navigate(`/prediction?file=${encodeURIComponent(filename)}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-gray-800 bg-gray-950 shadow-2xl shadow-black/80">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-500/10 p-2 text-blue-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">File Feature Record</h3>
              <p className="text-xs text-gray-400">37 Engineered Behavioral & I/O Features</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePredictClick}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-500 active:scale-95"
            >
              <Cpu className="h-3.5 w-3.5" />
              <span>Predict Tier</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white transition"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex h-64 flex-col items-center justify-center text-center">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              <p className="mt-3 text-xs text-gray-400">Loading complete file record...</p>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center text-xs text-red-300">
              {error}
            </div>
          ) : fileData ? (
            <>
              {/* Filename banner */}
              <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500">
                      SHA-256 Filename
                    </p>
                    <p className="font-mono text-xs font-semibold text-blue-300 break-all select-all">
                      {fileData.filename}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                    <button
                      onClick={copyFilename}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-700 bg-gray-800 px-2.5 py-1 text-xs text-gray-300 hover:bg-gray-700 hover:text-white transition"
                      title="Copy full SHA-256 hash"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                    <TierBadge tier={fileData.storage_tier} size="md" />
                  </div>
                </div>
              </div>

              {/* 1. File Information Section */}
              <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-800 pb-1.5">
                  <Database className="h-3.5 w-3.5 text-blue-400" />
                  1. File & Storage Metadata
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="rounded-lg border border-gray-800/80 bg-gray-900/40 p-3">
                    <p className="text-gray-500 text-[11px]">Application</p>
                    <p className="font-mono font-medium text-gray-200 mt-0.5 truncate" title={fileData.application}>
                      {fileData.application || 'N/A'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-800/80 bg-gray-900/40 p-3">
                    <p className="text-gray-500 text-[11px]">Storage Tier</p>
                    <p className="font-semibold text-white mt-0.5">{fileData.storage_tier}</p>
                  </div>
                  <div className="rounded-lg border border-gray-800/80 bg-gray-900/40 p-3">
                    <p className="text-gray-500 text-[11px]">Estimated Size (Proxy)</p>
                    <p className="font-semibold text-emerald-400 mt-0.5">
                      {formatBytes(fileData.estimated_file_size_bytes_proxy)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-800/80 bg-gray-900/40 p-3">
                    <p className="text-gray-500 text-[11px]">Dominant Service Class</p>
                    <p className="font-medium text-gray-200 mt-0.5">{fileData.dominant_service_class || 'N/A'}</p>
                  </div>
                  <div className="rounded-lg border border-gray-800/80 bg-gray-900/40 p-3">
                    <p className="text-gray-500 text-[11px]">Dominant Redundancy</p>
                    <p className="font-medium text-gray-200 mt-0.5">{fileData.dominant_redundancy_type || 'N/A'}</p>
                  </div>
                  <div className="rounded-lg border border-gray-800/80 bg-gray-900/40 p-3">
                    <p className="text-gray-500 text-[11px]">Dominant I/O Zone</p>
                    <p className="font-medium text-cyan-400 mt-0.5">{fileData.dominant_io_zone || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* 2. Access Behavior Section */}
              <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-800 pb-1.5">
                  <Activity className="h-3.5 w-3.5 text-amber-400" />
                  2. Access Behavior
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="rounded-lg border border-gray-800/80 bg-gray-900/40 p-3">
                    <p className="text-gray-500 text-[11px]">Total Accesses</p>
                    <p className="font-bold text-white text-sm mt-0.5">
                      {fileData.total_accesses?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-800/80 bg-gray-900/40 p-3">
                    <p className="text-gray-500 text-[11px]">Accesses (Last 5 Min)</p>
                    <p className="font-bold text-amber-400 text-sm mt-0.5">
                      {fileData.accesses_last_5_min?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-800/80 bg-gray-900/40 p-3">
                    <p className="text-gray-500 text-[11px]">Read Count</p>
                    <p className="font-medium text-gray-200 mt-0.5">{fileData.read_count?.toLocaleString() || 0}</p>
                  </div>
                  <div className="rounded-lg border border-gray-800/80 bg-gray-900/40 p-3">
                    <p className="text-gray-500 text-[11px]">Write Count</p>
                    <p className="font-medium text-gray-200 mt-0.5">{fileData.write_count?.toLocaleString() || 0}</p>
                  </div>
                  <div className="rounded-lg border border-gray-800/80 bg-gray-900/40 p-3">
                    <p className="text-gray-500 text-[11px]">Read Ratio</p>
                    <p className="font-medium text-cyan-400 mt-0.5">
                      {((fileData.read_ratio || 0) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-800/80 bg-gray-900/40 p-3">
                    <p className="text-gray-500 text-[11px]">Access Frequency</p>
                    <p className="font-medium text-gray-200 mt-0.5">
                      {fileData.access_frequency ? `${Number(fileData.access_frequency).toFixed(2)}/s` : '0/s'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-800/80 bg-gray-900/40 p-3">
                    <p className="text-gray-500 text-[11px]">Avg Access Interval</p>
                    <p className="font-medium text-gray-200 mt-0.5">
                      {fileData.average_access_interval ? `${Number(fileData.average_access_interval).toFixed(2)}s` : '0s'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-800/80 bg-gray-900/40 p-3">
                    <p className="text-gray-500 text-[11px]">Days Since Last Access</p>
                    <p className="font-medium text-gray-200 mt-0.5">
                      {fileData.days_since_last_access !== null ? `${Number(fileData.days_since_last_access).toFixed(4)} d` : '0 d'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. I/O Metrics Section */}
              <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-800 pb-1.5">
                  <HardDrive className="h-3.5 w-3.5 text-cyan-400" />
                  3. I/O Metrics
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="rounded-lg border border-gray-800/80 bg-gray-900/40 p-3">
                    <p className="text-gray-500 text-[11px]">Avg Request I/O Size</p>
                    <p className="font-medium text-gray-200 mt-0.5">{formatBytes(fileData.average_request_io_size)}</p>
                  </div>
                  <div className="rounded-lg border border-gray-800/80 bg-gray-900/40 p-3">
                    <p className="text-gray-500 text-[11px]">Total Request I/O</p>
                    <p className="font-medium text-gray-200 mt-0.5">{formatBytes(fileData.total_request_io_bytes)}</p>
                  </div>
                  <div className="rounded-lg border border-gray-800/80 bg-gray-900/40 p-3">
                    <p className="text-gray-500 text-[11px]">Avg Disk I/O Size</p>
                    <p className="font-medium text-gray-200 mt-0.5">{formatBytes(fileData.average_disk_io_size)}</p>
                  </div>
                  <div className="rounded-lg border border-gray-800/80 bg-gray-900/40 p-3">
                    <p className="text-gray-500 text-[11px]">Total Disk I/O</p>
                    <p className="font-medium text-gray-200 mt-0.5">{formatBytes(fileData.total_disk_io_bytes)}</p>
                  </div>
                </div>
              </div>

              {/* 4. Cache Metrics Section */}
              <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-800 pb-1.5">
                  <Zap className="h-3.5 w-3.5 text-emerald-400" />
                  4. Cache Performance
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="rounded-lg border border-gray-800/80 bg-gray-900/40 p-3">
                    <p className="text-gray-500 text-[11px]">Cache Hit Count</p>
                    <p className="font-semibold text-emerald-400 mt-0.5">
                      {fileData.cache_hit_count?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-800/80 bg-gray-900/40 p-3">
                    <p className="text-gray-500 text-[11px]">Cache Miss Count</p>
                    <p className="font-medium text-gray-400 mt-0.5">
                      {fileData.cache_miss_count?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-800/80 bg-gray-900/40 p-3">
                    <p className="text-gray-500 text-[11px]">Cache Hit Ratio</p>
                    <p className="font-semibold text-emerald-400 mt-0.5">
                      {((fileData.cache_hit_ratio || 0) * 100).toFixed(2)}%
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-800/80 bg-gray-900/40 p-3">
                    <p className="text-gray-500 text-[11px]">Flash Cache Ratio</p>
                    <p className="font-medium text-gray-200 mt-0.5">
                      {((fileData.flash_cache_ratio || 0) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* 5. Activity & Timestamps */}
              <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-800 pb-1.5">
                  <Clock className="h-3.5 w-3.5 text-purple-400" />
                  5. Activity Span & Timestamps
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="rounded-lg border border-gray-800/80 bg-gray-900/40 p-3">
                    <p className="text-gray-500 text-[11px]">Activity Score</p>
                    <p className="font-semibold text-purple-400 mt-0.5">
                      {fileData.activity_score !== null ? Number(fileData.activity_score).toFixed(4) : 'N/A'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-800/80 bg-gray-900/40 p-3">
                    <p className="text-gray-500 text-[11px]">Activity Span</p>
                    <p className="font-medium text-gray-200 mt-0.5">
                      {fileData.activity_span_seconds !== null ? `${Number(fileData.activity_span_seconds).toFixed(1)}s` : '0s'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-800/80 bg-gray-900/40 p-3">
                    <p className="text-gray-500 text-[11px]">First Access</p>
                    <p className="font-mono text-gray-300 mt-0.5 truncate" title={fileData.first_access_timestamp}>
                      {fileData.first_access_timestamp || 'N/A'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-800/80 bg-gray-900/40 p-3">
                    <p className="text-gray-500 text-[11px]">Last Access</p>
                    <p className="font-mono text-gray-300 mt-0.5 truncate" title={fileData.last_access_timestamp}>
                      {fileData.last_access_timestamp || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-800 px-6 py-3.5 bg-gray-950/80 text-xs">
          <span className="text-gray-500">Google Thesios Storage I/O Trace Dataset (2024-01-15)</span>
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-800 bg-gray-900 px-4 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
