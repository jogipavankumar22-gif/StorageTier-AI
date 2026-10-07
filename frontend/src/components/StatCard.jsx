import React from 'react';

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'blue',
  badge,
}) {
  const colorStyles = {
    blue: {
      border: 'border-blue-500/20 hover:border-blue-500/40',
      iconBg: 'bg-blue-500/10 text-blue-400',
      glow: 'from-blue-500/5 to-transparent',
    },
    amber: {
      border: 'border-amber-500/20 hover:border-amber-500/40',
      iconBg: 'bg-amber-500/10 text-amber-400',
      glow: 'from-amber-500/5 to-transparent',
    },
    cyan: {
      border: 'border-cyan-500/20 hover:border-cyan-500/40',
      iconBg: 'bg-cyan-500/10 text-cyan-400',
      glow: 'from-cyan-500/5 to-transparent',
    },
    purple: {
      border: 'border-purple-500/20 hover:border-purple-500/40',
      iconBg: 'bg-purple-500/10 text-purple-400',
      glow: 'from-purple-500/5 to-transparent',
    },
    emerald: {
      border: 'border-emerald-500/20 hover:border-emerald-500/40',
      iconBg: 'bg-emerald-500/10 text-emerald-400',
      glow: 'from-emerald-500/5 to-transparent',
    },
  }[color] || {
    border: 'border-gray-500/20',
    iconBg: 'bg-gray-500/10 text-gray-400',
    glow: 'from-gray-500/5 to-transparent',
  };

  return (
    <div
      className={`relative overflow-hidden rounded-xl border bg-gray-900/60 p-5 backdrop-blur-md transition-all duration-200 ${colorStyles.border}`}
    >
      <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br ${colorStyles.glow} blur-xl`} />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-2xl font-bold tracking-tight text-white">{value}</h3>
            {badge && (
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-xs font-medium text-gray-300">
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
        </div>

        {Icon && (
          <div className={`rounded-lg p-2.5 ${colorStyles.iconBg}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}
