import React from 'react';
import { Menu, RefreshCw, Clock, ShieldCheck } from 'lucide-react';

export default function Header({ onRefresh, refreshing, onMenuToggle, title = 'Storage Intelligence Dashboard' }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-800/80 bg-gray-950/80 px-6 backdrop-blur-md">
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-900 hover:text-white md:hidden"
            aria-label="Toggle navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight">{title}</h2>
          <p className="text-xs text-gray-400 hidden sm:block">
            Intelligent Cloud Storage Tier Predictor Using Machine Learning
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Trace Window Badge */}
        <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-gray-800 bg-gray-900/60 px-3 py-1 text-xs text-gray-300">
          <Clock className="h-3.5 w-3.5 text-cyan-400" />
          <span>14.36 min Observation Window</span>
        </div>

        {/* Model Accuracy Badge */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs text-blue-300 font-medium">
          <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
          <span>97.83% XGBoost Accuracy</span>
        </div>

        {/* Refresh button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-800 bg-gray-900 px-3 py-1.5 text-xs font-medium text-gray-300 transition hover:bg-gray-800 hover:text-white disabled:opacity-50"
            title="Refresh dashboard metrics"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        )}
      </div>
    </header>
  );
}
