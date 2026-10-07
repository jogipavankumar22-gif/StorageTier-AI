import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, Clock } from 'lucide-react';

export default function PlaceholderPage({ title, description, plannedStage, icon: Icon = Sparkles }) {
  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-800 bg-gray-900/40 p-12 text-center backdrop-blur-md">
        <div className="rounded-2xl bg-blue-500/10 p-4 text-blue-400">
          <Icon className="h-10 w-10" />
        </div>

        <h2 className="mt-5 text-xl font-bold text-white">{title}</h2>
        <p className="mt-2 max-w-md text-sm text-gray-400">{description}</p>

        <div className="mt-6 flex items-center gap-2 rounded-full border border-gray-800 bg-gray-900 px-4 py-1.5 text-xs text-gray-300">
          <Clock className="h-3.5 w-3.5 text-blue-400" />
          <span>Implementation planned for: <strong className="text-white">{plannedStage}</strong></span>
        </div>

        <Link
          to="/dashboard"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
