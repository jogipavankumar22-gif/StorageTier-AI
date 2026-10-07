import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Database,
  Files,
  Cpu,
  BarChart3,
  Bot,
  TrendingDown,
  Workflow,
  Info,
  Server,
  Cloud,
  X,
} from 'lucide-react';
import api from '../services/api';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, status: 'Active' },
  { name: 'Dataset Explorer', path: '/dataset', icon: Database, status: 'Active' },
  { name: 'File Explorer', path: '/files', icon: Files, status: 'Active' },
  { name: 'Prediction', path: '/prediction', icon: Cpu, status: 'Active' },
  { name: 'ML Performance', path: '/models', icon: BarChart3, status: 'Active' },
  { name: 'AI Assistant', path: '/ai-assistant', icon: Bot, status: 'Active' },
  { name: 'Optimization', path: '/optimization', icon: TrendingDown, status: 'Active' },
  { name: 'How It Works', path: '/how-it-works', icon: Workflow, status: 'Active' },
  { name: 'About', path: '/about', icon: Info, status: 'Upcoming' },
];

export default function Sidebar({ mobileOpen, setMobileOpen }) {
  const [backendStatus, setBackendStatus] = useState({ online: false, checking: true });

  useEffect(() => {
    let mounted = true;
    api.getHealth()
      .then((res) => {
        if (mounted) {
          setBackendStatus({ online: res.status === 'ok', checking: false, model: res.model_name });
        }
      })
      .catch(() => {
        if (mounted) {
          setBackendStatus({ online: false, checking: false });
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-gray-950/90 border-r border-gray-800/80 px-4 py-5 backdrop-blur-xl">
      <div>
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2 pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/20">
              <Cloud className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white">StorageTier AI</h1>
              <p className="text-[10px] font-medium text-gray-400">Cloud Storage Tier Predictor</p>
            </div>
          </div>
          {setMobileOpen && (
            <button
              onClick={() => setMobileOpen(false)}
              className="rounded-lg p-1 text-gray-400 hover:text-white md:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Project Tag */}
        <div className="mb-4 mx-2 rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2">
          <p className="text-[11px] font-semibold text-blue-400">Data Mining + AI Project</p>
          <p className="text-[10px] text-gray-400">Google Thesios Storage Trace</p>
        </div>

        {/* Navigation List */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen && setMobileOpen(false)}
                className={({ isActive }) =>
                  `group flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm shadow-blue-500/10'
                      : 'text-gray-400 hover:bg-gray-900 hover:text-gray-200 border border-transparent'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                  <span>{item.name}</span>
                </div>
                {item.status === 'Active' ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                ) : (
                  <span className="text-[9px] uppercase tracking-wider text-gray-600 group-hover:text-gray-500">
                    Soon
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Backend Live Status Card in Footer */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-[11px] font-medium text-gray-300">FastAPI Backend</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${
                backendStatus.online ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-red-400'
              }`}
            />
            <span className="text-[10px] font-semibold text-gray-400">
              {backendStatus.checking ? '...' : backendStatus.online ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>
        <p className="mt-1.5 text-[10px] text-gray-500 truncate">
          Port: 8000 • Model: {backendStatus.model || 'XGBoost'}
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 md:block">{sidebarContent}</aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 w-72 max-w-[80vw]">{sidebarContent}</aside>
        </div>
      )}
    </>
  );
}
