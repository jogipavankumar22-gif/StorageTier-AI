import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import {
  Info,
} from 'lucide-react';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import FileExplorer from './pages/FileExplorer';
import FilePrediction from './pages/FilePrediction';
import DatasetExplorer from './pages/DatasetExplorer';
import MLPerformance from './pages/MLPerformance';
import HowItWorks from './pages/HowItWorks';
import AIAssistant from './pages/AIAssistant';
import StorageOptimization from './pages/StorageOptimization';
import PlaceholderPage from './components/PlaceholderPage';

function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Get human-friendly page title based on path
  const getPageTitle = (pathname) => {
    switch (pathname) {
      case '/dashboard':
        return 'Storage Intelligence Dashboard';
      case '/dataset':
        return 'Dataset Explorer';
      case '/files':
        return 'File-Level Explorer';
      case '/prediction':
        return 'File Tier Prediction';
      case '/models':
        return 'ML Model Performance & Evaluation';
      case '/ai-assistant':
        return 'AI Storage Assistant';
      case '/optimization':
        return 'Storage Lifecycle Optimization';
      case '/how-it-works':
        return 'Pipeline & Architecture';
      case '/about':
        return 'About the Research Project';
      default:
        return 'Storage Intelligence Dashboard';
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950 text-gray-100">
      {/* Sidebar Navigation */}
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        <Header
          title={getPageTitle(location.pathname)}
          onMenuToggle={() => setMobileOpen(true)}
          onRefresh={() => window.location.reload()}
        />

        <main className="flex-1 pb-12">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Implemented pages */}
            <Route path="/dataset" element={<DatasetExplorer />} />
            <Route path="/files" element={<FileExplorer />} />
            <Route path="/prediction" element={<FilePrediction />} />
            <Route path="/models" element={<MLPerformance />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/ai-assistant" element={<AIAssistant />} />
            <Route path="/optimization" element={<StorageOptimization />} />

            {/* Future placeholder */}
            <Route
              path="/about"
              element={
                <PlaceholderPage
                  title="About the Project & Research Team"
                  description="Project overview, problem statement, Google Thesios dataset citation, academic methodology, and research limitations disclosure."
                  plannedStage="Final Documentation"
                  icon={Info}
                />
              }
            />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
