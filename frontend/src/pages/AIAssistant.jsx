import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Bot,
  Sparkles,
  Search,
  Send,
  ShieldAlert,
  HelpCircle,
  FileText,
  Loader2,
  CheckCircle2,
  RefreshCw,
  Cpu,
} from 'lucide-react';

import api from '../services/api';
import TierBadge from '../components/TierBadge';
import LoadingState from '../components/LoadingState';


const SAMPLE_FILES = [
  {
    hash: '0000000000000000000000000000000000000000000000000000000000000000',
    label: 'High-Volume Sustained (HOT)',
    expected: 'HOT',
  },
  {
    hash: '0002f1a6665e7bf422a188be4523326194b63068fba4313f86e580a15e6191b7',
    label: 'Balanced Mid-Tier Activity (COOL)',
    expected: 'COOL',
  },
  {
    hash: '0003b57367ba4f3d248b6c0e5a8cb5ad47a5658e4697bf27e05fc8aa107b328a',
    label: 'Dormant Low-Access (ARCHIVE)',
    expected: 'ARCHIVE',
  },
];

const SUGGESTED_QUESTIONS = [
  'Why did the model classify this file as HOT?',
  'What is the difference between HOT, COOL and ARCHIVE?',
  'Why is XGBoost better than the other models?',
  'What are the most important features?',
  'What are the limitations of the dataset?',
  'How does the heuristic labeling work?',
  'Can this system guarantee cloud cost savings?',
  'Explain the project architecture.',
];

export default function AIAssistant() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('explain'); // 'explain' or 'chat'

  // Mode 1: Prediction Explanation State
  const [fileInput, setFileInput] = useState('');
  const [predicting, setPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);
  const [explaining, setExplaining] = useState(false);
  const [explanationResult, setExplanationResult] = useState(null);
  const [explainError, setExplainError] = useState(null);

  // Mode 2: Chat Assistant State
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: "Hello! I am the research and explanation assistant for the **Intelligent Cloud Storage Tier Predictor**.\n\nI can explain XGBoost tier predictions, discuss dataset characteristics (Google Thesios trace), clarify our 37 engineered features, or detail the heuristic labeling methodology.\n\n*Remember: The XGBoost machine learning model is the authoritative decision maker; I provide advisory explanations.*",
      time: 'Just now',
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef(null);

  // Mode 1: Step B - Request Generative AI Explanation
  const handleRequestExplanation = async (pred) => {
    if (!pred) return;
    setExplaining(true);
    setExplanationResult(null);

    try {
      const explanation = await api.explainPrediction({
        filename: pred.filename,
        predicted_tier: pred.predicted_tier,
        confidence: pred.confidence,
        class_probabilities: pred.class_probabilities,
        relevant_features: pred.relevant_features,
        important_model_features: [
          { feature: 'accesses_last_5_min', importance: 0.3377 },
          { feature: 'total_accesses', importance: 0.0815 },
          { feature: 'days_since_last_access', importance: 0.0766 },
        ],
      });
      setExplanationResult(explanation);
    } catch {
      setExplanationResult({
        explanation:
          'AI explanation is currently unavailable. The authoritative ML prediction remains fully valid.\n\n' +
          '• Predicted Tier: ' + pred.predicted_tier + ' (' + (pred.confidence * 100).toFixed(2) + '% confidence)\n' +
          '• Note: Machine Learning is the primary decision-maker.',
        provider: 'offline-fallback',
      });
    } finally {
      setExplaining(false);
    }
  };

  // Mode 1: Step A - Run XGBoost ML Prediction
  const handleRunPrediction = async (hashToPredict) => {
    const targetHash = (hashToPredict || fileInput).trim();
    if (!targetHash) return;

    setPredicting(true);
    setPredictionResult(null);
    setExplanationResult(null);
    setExplainError(null);

    try {
      const pred = await api.predictTier({ filename: targetHash });
      setPredictionResult(pred);
      setPredicting(false);

      // Automatically request AI explanation once ML prediction completes
      handleRequestExplanation(pred);
    } catch (err) {
      setPredicting(false);
      setExplainError(err.message || 'Failed to predict storage tier for this file.');
    }
  };

  // Auto-fill from query param if available (e.g. ?file=...)
  useEffect(() => {
    const fileParam = searchParams.get('file');
    if (fileParam) {
      setFileInput(fileParam);
      handleRunPrediction(fileParam);
    }
  }, [searchParams]);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    if (activeTab === 'chat' && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  // Mode 2: Send Chat Message
  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || chatLoading) return;

    const userMsg = {
      sender: 'user',
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setChatLoading(true);

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

      const res = await api.chatAI({
        message: query,
        history: historyPayload,
      });

      const aiMsg = {
        sender: 'ai',
        text: res.reply || 'No response generated.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: res.provider,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const errorMsg = {
        sender: 'ai',
        text:
          'AI Assistant response is currently unavailable. Please verify backend connectivity. ' +
          'All project datasets and ML models remain active.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6 md:p-8">
      {/* 1. Page Header & Core Architecture Principle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Bot className="h-5 w-5 text-purple-400" />
            AI Storage Research & Explanation Assistant
          </h2>
          <p className="text-xs text-gray-400">
            Advisory layer powered by Generative AI to interpret XGBoost predictions and explore storage research
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-lg border border-gray-800 bg-gray-900 p-1 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('explain')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors ${
              activeTab === 'explain'
                ? 'bg-purple-600 text-white font-semibold'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Explain File Prediction
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors ${
              activeTab === 'chat'
                ? 'bg-purple-600 text-white font-semibold'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Project AI Assistant
          </button>
        </div>
      </div>

      {/* 2. Core Architecture Rule Banner */}
      <div className="rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-950/30 via-gray-900/40 to-blue-950/30 p-4 backdrop-blur-md space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-400 shrink-0" />
            <span className="text-xs font-black uppercase tracking-wider text-purple-300">
              Core Architecture Principle: Machine Learning decides. Generative AI explains.
            </span>
          </div>
          <span className="rounded bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
            XGBoost Champion: 97.83% Test Accuracy
          </span>
        </div>
        <p className="text-xs text-gray-300 leading-relaxed">
          The <strong>XGBoost classifier</strong> is the sole authoritative decision-maker for storage-tier classification.
          Generative AI acts strictly as an advisory and educational layer; it <strong>never</strong> overrides, alters, or invents an ML prediction.
        </p>
        <div className="flex flex-wrap items-center gap-4 text-[11px] text-gray-400 pt-1">
          <span className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="h-3 w-3" /> ML Decision Authority
          </span>
          <span className="flex items-center gap-1 text-purple-400">
            <CheckCircle2 className="h-3 w-3" /> Advisory AI Explanations
          </span>
          <span className="flex items-center gap-1 text-cyan-400">
            <CheckCircle2 className="h-3 w-3" /> No Fake Dollar Calculations
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: EXPLAIN PREDICTION                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'explain' && (
        <div className="space-y-6">
          {/* File Selection Card */}
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 backdrop-blur-md space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-400" />
                Select File for Authoritative ML Prediction & AI Explanation
              </h3>
              <p className="text-xs text-gray-400">
                Choose a verified sample file or paste any 64-character SHA-256 hash from the dataset
              </p>
            </div>

            {/* Quick Sample Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {SAMPLE_FILES.map((sample) => (
                <button
                  key={sample.hash}
                  onClick={() => {
                    setFileInput(sample.hash);
                    handleRunPrediction(sample.hash);
                  }}
                  className={`flex flex-col text-left rounded-lg border p-3 transition-colors ${
                    fileInput === sample.hash
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-gray-800 bg-gray-950/60 hover:border-gray-700 hover:bg-gray-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-white">{sample.label}</span>
                    <TierBadge tier={sample.expected} size="sm" />
                  </div>
                  <span className="mt-1 font-mono text-[10px] text-gray-400 truncate">
                    {sample.hash.slice(0, 16)}...
                  </span>
                </button>
              ))}
            </div>

            {/* Manual Hash Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleRunPrediction();
              }}
              className="flex flex-col sm:flex-row gap-2 pt-2"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={fileInput}
                  onChange={(e) => setFileInput(e.target.value)}
                  placeholder="Paste SHA-256 file hash..."
                  className="w-full rounded-lg border border-gray-800 bg-gray-950 py-2.5 pl-10 pr-4 text-xs font-mono text-gray-200 placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={predicting || !fileInput.trim()}
                className="flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-xs font-medium text-white hover:bg-purple-500 disabled:opacity-50 transition-colors"
              >
                {predicting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Predicting...
                  </>
                ) : (
                  <>
                    <Cpu className="h-4 w-4" />
                    Predict & Explain
                  </>
                )}
              </button>
            </form>

            {explainError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                {explainError}
              </div>
            )}
          </div>

          {/* Section 1: ML Model Result (PROMINENTLY DISPLAYED FIRST) */}
          {predictionResult && (
            <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6 backdrop-blur-md space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                    Step 1: Authoritative Machine Learning Prediction
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-gray-400 truncate max-w-xs">
                  {predictionResult.filename}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-lg border border-gray-800 bg-gray-950 p-4 space-y-1">
                  <p className="text-[10px] uppercase font-bold text-gray-400">Decision Outcome</p>
                  <div className="flex items-center gap-3 pt-1">
                    <TierBadge tier={predictionResult.predicted_tier} size="lg" />
                    <span className="text-xl font-black text-white">
                      {(predictionResult.confidence * 100).toFixed(2)}%
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 pt-1">
                    Model: {predictionResult.model_name || 'XGBoost'}
                  </p>
                </div>

                <div className="rounded-lg border border-gray-800 bg-gray-950 p-4 space-y-2 md:col-span-2">
                  <p className="text-[10px] uppercase font-bold text-gray-400">Class Probabilities</p>
                  <div className="space-y-1.5 text-xs">
                    {Object.entries(predictionResult.class_probabilities || {}).map(([tier, prob]) => (
                      <div key={tier} className="space-y-0.5">
                        <div className="flex justify-between text-[11px]">
                          <span className="font-semibold text-gray-300">{tier}</span>
                          <span className="font-mono text-gray-400">{(prob * 100).toFixed(2)}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-gray-800 overflow-hidden">
                          <div
                            className={`h-full ${
                              tier === 'HOT'
                                ? 'bg-amber-500'
                                : tier === 'COOL'
                                ? 'bg-cyan-500'
                                : 'bg-purple-500'
                            }`}
                            style={{ width: `${Math.max(prob * 100, 2)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Observed Feature Values Grid */}
              <div className="rounded-lg border border-gray-800 bg-gray-950/80 p-4 space-y-2">
                <p className="text-[10px] uppercase font-bold text-gray-400">Observed File Telemetry</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-gray-500">Total Accesses:</span>
                    <p className="font-mono font-semibold text-white">
                      {predictionResult.relevant_features?.total_accesses ?? 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500">Last 5 Min Accesses:</span>
                    <p className="font-mono font-semibold text-emerald-400">
                      {predictionResult.relevant_features?.accesses_last_5_min ?? 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500">Inactivity Gap:</span>
                    <p className="font-mono font-semibold text-cyan-400">
                      {predictionResult.relevant_features?.seconds_since_last_access !== undefined
                        ? `${predictionResult.relevant_features.seconds_since_last_access}s`
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500">Cache Hit Ratio:</span>
                    <p className="font-mono font-semibold text-purple-400">
                      {predictionResult.relevant_features?.cache_hit_ratio !== undefined
                        ? `${(predictionResult.relevant_features.cache_hit_ratio * 100).toFixed(1)}%`
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: AI Explanation (DISPLAYED SECOND, GROUNDED IN STEP 1) */}
          {explaining && (
            <div className="rounded-xl border border-purple-500/30 bg-gray-900/50 p-6 backdrop-blur-md">
              <LoadingState message="Generating grounded AI explanation based on XGBoost prediction..." />
            </div>
          )}

          {explanationResult && !explaining && (
            <div className="rounded-xl border border-purple-500/30 bg-gray-900/50 p-6 backdrop-blur-md space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-purple-300">
                    Step 2: Generative AI Advisory Explanation
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-[10px] font-semibold text-purple-400">
                    Provider: {explanationResult.provider || 'AI Layer'}
                  </span>
                  <button
                    onClick={() => handleRequestExplanation(predictionResult)}
                    className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                    title="Regenerate explanation"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Formatted Markdown-like Explanation Text */}
              <div className="rounded-lg border border-gray-800 bg-gray-950 p-4 text-xs text-gray-300 leading-relaxed space-y-3 font-sans">
                {explanationResult.explanation.split('\n\n').map((paragraph, idx) => {
                  if (paragraph.startsWith('### ') || paragraph.startsWith('1. ') || paragraph.startsWith('2. ') || paragraph.startsWith('3. ') || paragraph.startsWith('4. ')) {
                    return (
                      <div key={idx} className="font-semibold text-white text-xs pt-1 border-b border-gray-850 pb-1">
                        {paragraph.replace(/###\s*/, '')}
                      </div>
                    );
                  }
                  return (
                    <p key={idx} className="text-gray-300">
                      {paragraph}
                    </p>
                  );
                })}
              </div>

              {/* Required Advisory Disclaimer */}
              <div className="rounded-lg border border-gray-800/80 bg-gray-950/80 p-3 text-[11px] text-gray-400 space-y-1">
                <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Advisory Disclaimer
                </div>
                <p>
                  {explanationResult.advisory_disclaimer ||
                    'AI-generated explanations are advisory. Storage-tier predictions are produced by the trained XGBoost model.'}
                </p>
                <p className="text-gray-500 text-[10px]">
                  AI does not modify or override ML predictions. Actual cost savings depend on cloud-provider pricing and policies.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PROJECT AI ASSISTANT (CHAT INTERFACE)                              */}
      {/* ========================================================================= */}
      {activeTab === 'chat' && (
        <div className="space-y-4">
          {/* Suggested Starter Questions */}
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 backdrop-blur-md space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <HelpCircle className="h-3.5 w-3.5 text-purple-400" />
              Suggested Research Questions
            </span>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(q)}
                  disabled={chatLoading}
                  className="rounded-full border border-gray-800 bg-gray-950 px-3 py-1 text-xs text-gray-300 hover:border-purple-500/50 hover:bg-purple-500/10 hover:text-white transition-colors text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Messages Container */}
          <div className="h-[480px] overflow-y-auto rounded-xl border border-gray-800 bg-gray-900/40 p-4 space-y-4 backdrop-blur-md">
            {messages.map((msg, index) => {
              const isAi = msg.sender === 'ai';
              return (
                <div
                  key={index}
                  className={`flex gap-3 ${isAi ? 'justify-start' : 'justify-end'}`}
                >
                  {isAi && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-600/20 border border-purple-500/30 text-purple-300 mt-0.5">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-2xl rounded-xl p-3.5 text-xs leading-relaxed ${
                      isAi
                        ? 'border border-gray-800 bg-gray-950/90 text-gray-200'
                        : 'bg-purple-600 text-white font-medium'
                    }`}
                  >
                    <div className="whitespace-pre-line space-y-1">
                      {msg.text}
                    </div>
                    <div
                      className={`mt-1.5 flex items-center justify-between text-[10px] ${
                        isAi ? 'text-gray-500' : 'text-purple-200'
                      }`}
                    >
                      <span>{msg.time}</span>
                      {isAi && msg.provider && (
                        <span className="font-mono text-[9px] uppercase text-purple-400">
                          {msg.provider}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {chatLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-600/20 border border-purple-500/30 text-purple-300">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-xl border border-gray-800 bg-gray-950/90 p-3 text-xs text-gray-400 flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-400" />
                  Analyzing research context...
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Chat Input Field */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask about the Google Thesios trace, XGBoost model, or heuristic pseudo-labels..."
              className="flex-1 rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-xs text-gray-200 placeholder-gray-500 focus:border-purple-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={chatLoading || !inputMessage.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-5 py-3 text-xs font-semibold text-white hover:bg-purple-500 disabled:opacity-50 transition-colors"
            >
              <Send className="h-3.5 w-3.5" />
              Send
            </button>
          </form>

          {/* AI Disclaimers */}
          <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-3 text-center text-[11px] text-gray-400">
            "AI-generated explanations are advisory. Storage-tier predictions are produced by the trained XGBoost model." • "AI does not modify or override ML predictions."
          </div>
        </div>
      )}
    </div>
  );
}
