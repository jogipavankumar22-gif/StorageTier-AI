import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  ArrowUp,
  ArrowDown,
  Eye,
  Cpu,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Database,
  RefreshCw,
  X,
} from 'lucide-react';

import api from '../services/api';
import TierBadge from '../components/TierBadge';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import FileDetailModal from '../components/FileDetailModal';

export default function FileExplorer() {
  const navigate = useNavigate();

  // State
  const [files, setFiles] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [sortBy, setSortBy] = useState('total_accesses');
  const [sortDesc, setSortDesc] = useState(true);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Detail Modal state
  const [selectedFile, setSelectedFile] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Copy hash feedback state
  const [copiedHash, setCopiedHash] = useState(null);

  // Fetch paginated files
  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getFiles({
        page,
        pageSize,
        search,
        tier: tierFilter,
        sortBy,
        sortDesc,
      });
      setFiles(res.files || []);
      setTotal(res.total || 0);
      setTotalPages(res.total_pages || 1);
    } catch (err) {
      setError(err.message || 'Failed to load files from backend');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, tierFilter, sortBy, sortDesc]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // Handle search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearch('');
    setPage(1);
  };

  const handleTierChange = (tier) => {
    setTierFilter(tier);
    setPage(1);
  };

  const handleSortChange = (col) => {
    if (sortBy === col) {
      setSortDesc(!sortDesc);
    } else {
      setSortBy(col);
      setSortDesc(true);
    }
    setPage(1);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 1500);
  };

  const formatBytes = (bytes) => {
    if (bytes === null || bytes === undefined) return '0 B';
    const num = Number(bytes);
    if (isNaN(num) || num === 0) return '0 B';
    const gb = num / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = num / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    const kb = num / 1024;
    if (kb >= 1) return `${kb.toFixed(1)} KB`;
    return `${num.toLocaleString()} B`;
  };

  const openDetail = (filename) => {
    setSelectedFile(filename);
    setIsModalOpen(true);
  };

  const navigateToPredict = (filename) => {
    navigate(`/prediction?file=${encodeURIComponent(filename)}`);
  };

  return (
    <div className="space-y-6 p-6 md:p-8">
      {/* Detail Modal */}
      <FileDetailModal
        filename={selectedFile}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Dataset File Explorer</h2>
          <p className="text-xs text-gray-400">
            Server-side paginated exploration across 13,565 unique Google Thesios storage files
          </p>
        </div>

        {/* Total records badge */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="rounded-full border border-gray-800 bg-gray-900 px-3 py-1 text-xs font-semibold text-gray-300">
            Total Files: <strong className="text-blue-400">{total.toLocaleString()}</strong>
          </span>
          <button
            onClick={fetchFiles}
            className="rounded-lg border border-gray-800 bg-gray-900 p-1.5 text-gray-400 hover:text-white transition"
            title="Refresh table"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-gray-800 bg-gray-900/60 p-4 backdrop-blur-md lg:flex-row lg:items-center lg:justify-between">
        {/* Tier filter tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-gray-400 mr-1 flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" /> Tier:
          </span>
          {[
            { label: 'All', value: '' },
            { label: 'HOT', value: 'HOT' },
            { label: 'COOL', value: 'COOL' },
            { label: 'ARCHIVE', value: 'ARCHIVE' },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => handleTierChange(item.value)}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                tierFilter === item.value
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'bg-gray-800/80 text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-500" />
            <input
              type="text"
              placeholder="Search by SHA-256 filename..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-lg border border-gray-800 bg-gray-950 py-1.5 pl-8 pr-8 text-xs text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 top-2 text-gray-500 hover:text-gray-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-500"
          >
            Search
          </button>
        </form>
      </div>

      {/* Main Table Area */}
      {loading ? (
        <LoadingState message="Fetching paginated storage files..." />
      ) : error ? (
        <ErrorState
          title="Error Loading File Records"
          message={error}
          onRetry={fetchFiles}
        />
      ) : files.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-12 text-center text-xs text-gray-400">
          <Database className="mx-auto h-8 w-8 text-gray-600 mb-3" />
          <p className="font-semibold text-gray-300">No matching storage files found</p>
          <p className="mt-1">Try clearing your search query or selecting a different tier filter.</p>
          <button
            onClick={handleClearSearch}
            className="mt-4 rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 transition"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-800 bg-gray-900/40 overflow-hidden backdrop-blur-md">
          {/* Scrollable table container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-800 bg-gray-950/80 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                <tr>
                  <th className="py-3 px-4">Filename (SHA-256)</th>
                  <th className="py-3 px-3">Tier</th>
                  <th className="py-3 px-3">Application</th>
                  <th
                    className="py-3 px-3 cursor-pointer hover:text-white"
                    onClick={() => handleSortChange('total_accesses')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Total Accesses</span>
                      {sortBy === 'total_accesses' &&
                        (sortDesc ? <ArrowDown className="h-3 w-3 text-blue-400" /> : <ArrowUp className="h-3 w-3 text-blue-400" />)}
                    </div>
                  </th>
                  <th
                    className="py-3 px-3 cursor-pointer hover:text-white"
                    onClick={() => handleSortChange('accesses_last_5_min')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Last 5 Min</span>
                      {sortBy === 'accesses_last_5_min' &&
                        (sortDesc ? <ArrowDown className="h-3 w-3 text-blue-400" /> : <ArrowUp className="h-3 w-3 text-blue-400" />)}
                    </div>
                  </th>
                  <th
                    className="py-3 px-3 cursor-pointer hover:text-white"
                    onClick={() => handleSortChange('read_ratio')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Read Ratio</span>
                      {sortBy === 'read_ratio' &&
                        (sortDesc ? <ArrowDown className="h-3 w-3 text-blue-400" /> : <ArrowUp className="h-3 w-3 text-blue-400" />)}
                    </div>
                  </th>
                  <th
                    className="py-3 px-3 cursor-pointer hover:text-white"
                    onClick={() => handleSortChange('cache_hit_ratio')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Cache Hit</span>
                      {sortBy === 'cache_hit_ratio' &&
                        (sortDesc ? <ArrowDown className="h-3 w-3 text-blue-400" /> : <ArrowUp className="h-3 w-3 text-blue-400" />)}
                    </div>
                  </th>
                  <th
                    className="py-3 px-3 cursor-pointer hover:text-white"
                    onClick={() => handleSortChange('days_since_last_access')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Recency</span>
                      {sortBy === 'days_since_last_access' &&
                        (sortDesc ? <ArrowDown className="h-3 w-3 text-blue-400" /> : <ArrowUp className="h-3 w-3 text-blue-400" />)}
                    </div>
                  </th>
                  <th
                    className="py-3 px-3 cursor-pointer hover:text-white"
                    onClick={() => handleSortChange('estimated_file_size_bytes_proxy')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Size (Proxy)</span>
                      {sortBy === 'estimated_file_size_bytes_proxy' &&
                        (sortDesc ? <ArrowDown className="h-3 w-3 text-blue-400" /> : <ArrowUp className="h-3 w-3 text-blue-400" />)}
                    </div>
                  </th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {files.map((file) => {
                  const isCopied = copiedHash === file.filename;
                  const shortHash = file.filename
                    ? `${file.filename.slice(0, 10)}...${file.filename.slice(-6)}`
                    : 'Unknown';

                  return (
                    <tr
                      key={file.filename}
                      className="group transition-colors hover:bg-gray-850/60"
                    >
                      {/* Filename */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="font-mono text-xs font-medium text-blue-300 hover:underline cursor-pointer"
                            onClick={() => openDetail(file.filename)}
                            title={file.filename}
                          >
                            {shortHash}
                          </span>
                          <button
                            onClick={() => copyToClipboard(file.filename)}
                            className="text-gray-500 opacity-0 group-hover:opacity-100 hover:text-gray-200 transition"
                            title="Copy full SHA-256 hash"
                          >
                            {isCopied ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Tier Badge */}
                      <td className="py-3 px-3">
                        <TierBadge tier={file.storage_tier} size="sm" />
                      </td>

                      {/* Application */}
                      <td className="py-3 px-3">
                        <span
                          className="font-mono text-[11px] text-gray-400 truncate max-w-[120px] inline-block"
                          title={file.application}
                        >
                          {file.application ? file.application.slice(0, 14) : 'N/A'}
                        </span>
                      </td>

                      {/* Total Accesses */}
                      <td className="py-3 px-3 font-semibold text-white">
                        {file.total_accesses?.toLocaleString() || 0}
                      </td>

                      {/* Accesses Last 5 Min */}
                      <td className="py-3 px-3 text-amber-400 font-medium">
                        {file.accesses_last_5_min?.toLocaleString() || 0}
                      </td>

                      {/* Read Ratio */}
                      <td className="py-3 px-3 text-gray-300">
                        {file.read_ratio !== null ? `${(file.read_ratio * 100).toFixed(0)}%` : '0%'}
                      </td>

                      {/* Cache Hit Ratio */}
                      <td className="py-3 px-3 text-cyan-400">
                        {file.cache_hit_ratio !== null ? `${(file.cache_hit_ratio * 100).toFixed(1)}%` : '0%'}
                      </td>

                      {/* Days since last access */}
                      <td className="py-3 px-3 text-gray-400">
                        {file.days_since_last_access !== null
                          ? `${Number(file.days_since_last_access).toFixed(4)} d`
                          : '0 d'}
                      </td>

                      {/* File Size */}
                      <td className="py-3 px-3 font-medium text-emerald-400">
                        {formatBytes(file.estimated_file_size_bytes_proxy)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openDetail(file.filename)}
                            className="rounded-lg border border-gray-800 bg-gray-900 px-2 py-1 text-[11px] font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition flex items-center gap-1"
                            title="Inspect complete feature record"
                          >
                            <Eye className="h-3 w-3" />
                            <span>Detail</span>
                          </button>
                          <button
                            onClick={() => navigateToPredict(file.filename)}
                            className="rounded-lg bg-blue-600/90 px-2 py-1 text-[11px] font-semibold text-white hover:bg-blue-500 transition flex items-center gap-1 active:scale-95"
                            title="Run XGBoost tier prediction"
                          >
                            <Cpu className="h-3 w-3" />
                            <span>Predict</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer / Pagination */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-gray-800 bg-gray-950/80 px-4 py-3 text-xs text-gray-400">
            {/* Page Size & Counter */}
            <div className="flex items-center gap-4">
              <span>
                Showing <strong className="text-white">{((page - 1) * pageSize) + 1}</strong> to{' '}
                <strong className="text-white">{Math.min(page * pageSize, total)}</strong> of{' '}
                <strong className="text-white">{total.toLocaleString()}</strong> files
              </span>

              <div className="flex items-center gap-1.5">
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="rounded border border-gray-800 bg-gray-900 px-2 py-1 text-xs text-gray-200 focus:border-blue-500 focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page <= 1}
                className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
                title="First Page"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
                title="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="px-2 font-medium text-gray-200">
                Page <strong className="text-white">{page}</strong> of <strong className="text-white">{totalPages}</strong>
              </span>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
                title="Next Page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages}
                className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
                title="Last Page"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
