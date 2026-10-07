import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingState({ message = 'Loading storage tier analytics...' }) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-gray-800 bg-gray-900/30 p-8 text-center">
      <div className="relative flex items-center justify-center">
        <div className="h-14 w-14 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
        <Loader2 className="absolute h-6 w-6 text-blue-400 animate-pulse" />
      </div>
      <p className="mt-4 text-sm font-medium text-gray-300">{message}</p>
      <p className="mt-1 text-xs text-gray-500">Communicating with FastAPI on http://127.0.0.1:8000</p>
    </div>
  );
}
