import React from 'react';
import { Flame, CloudSun, Snowflake } from 'lucide-react';

export default function TierBadge({ tier, size = 'md', showIcon = true }) {
  const tierUpper = (tier || '').toUpperCase();

  const configs = {
    HOT: {
      label: 'HOT',
      icon: Flame,
      colors: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      dotColor: 'bg-amber-500',
    },
    COOL: {
      label: 'COOL',
      icon: CloudSun,
      colors: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      dotColor: 'bg-cyan-400',
    },
    ARCHIVE: {
      label: 'ARCHIVE',
      icon: Snowflake,
      colors: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      dotColor: 'bg-purple-400',
    },
  };

  const config = configs[tierUpper] || {
    label: tier || 'UNKNOWN',
    icon: CloudSun,
    colors: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
    dotColor: 'bg-gray-400',
  };

  const IconComponent = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-xs font-medium gap-1.5',
    lg: 'px-3 py-1.5 text-sm font-semibold gap-2',
  }[size] || 'px-2.5 py-1 text-xs gap-1.5';

  return (
    <span
      className={`inline-flex items-center rounded-full border ${config.colors} ${sizeClasses} tracking-wide transition-colors`}
    >
      {showIcon && <IconComponent className={size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />}
      <span>{config.label}</span>
    </span>
  );
}
