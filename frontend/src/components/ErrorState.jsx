import React from 'react';
import { AlertTriangle, RefreshCw, Terminal } from 'lucide-react';

export default function ErrorState({
  title = 'Backend Unavailable',
  message = 'Unable to connect to the FastAPI backend service.',
  onRetry,
}) {
  return (
    <div className="flex min-h-[380px] flex-col items-center justify-center rounded-xl border border-red-500/20 bg-red-500/5 p-8 text-center backdrop-blur-md">
      <div className="rounded-full bg-red-500/10 p-3.5 text-red-400">
        <AlertTriangle className="h-8 w-8" />
      </div>

      <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-gray-400">{message}</p>

      <div className="mt-6 w-full max-w-lg rounded-lg border border-gray-800 bg-gray-950 p-4 text-left font-mono text-xs">
        <div className="flex items-center gap-2 text-gray-400">
          <Terminal className="h-4 w-4 text-blue-400" />
          <span>Start the FastAPI backend with:</span>
        </div>
        <div className="mt-2 select-all rounded bg-gray-900 px-3 py-2 text-blue-300">
          python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
        </div>
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 active:scale-95"
        >
          <RefreshCw className="h-4 w-4" />
          Retry Connection
        </button>
      )}
    </div>
  );
}
