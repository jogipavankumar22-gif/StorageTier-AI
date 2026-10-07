/**
 * Centralized API Client
 * Communicates with FastAPI backend on http://127.0.0.1:8000
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

async function fetchJson(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      let errorMsg = `Server error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorMsg = errorData.detail;
        }
      } catch {
        // ignore json parse errors for non-json responses
      }
      throw new Error(errorMsg);
    }

    return await response.json();
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error(
        'Backend server is unreachable. Please verify that the FastAPI server is running on http://127.0.0.1:8000.'
      );
    }
    throw err;
  }
}

export const api = {
  // System Health
  getHealth: () => fetchJson('/api/health'),

  // Dashboard Data
  getDashboardSummary: () => fetchJson('/api/dashboard/summary'),
  getDashboardTierDistribution: () => fetchJson('/api/dashboard/tier-distribution'),

  // Files & Exploration
  getFiles: ({ page = 1, pageSize = 50, search = '', tier = '', sortBy = 'total_accesses', sortDesc = true } = {}) => {
    const params = new URLSearchParams();
    if (page) params.append('page', page);
    if (pageSize) params.append('page_size', pageSize);
    if (search) params.append('search', search);
    if (tier) params.append('tier', tier);
    if (sortBy) params.append('sort_by', sortBy);
    if (sortDesc !== undefined) params.append('sort_desc', sortDesc);
    return fetchJson(`/api/files?${params.toString()}`);
  },

  getFileDetail: (filename) => fetchJson(`/api/files/${encodeURIComponent(filename)}`),

  // Model & Performance
  getModelsPerformance: () => fetchJson('/api/models/performance'),
  getFeatureImportance: () => fetchJson('/api/models/feature-importance'),

  // Dataset Info
  getDatasetSummary: () => fetchJson('/api/dataset/summary'),

  // Predictions
  predictTier: (payload) =>
    fetchJson('/api/predict', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Optimization
  getOptimizationCandidates: ({ tierFrom = 'HOT', limit = 20 } = {}) => {
    const params = new URLSearchParams({
      tier_from: tierFrom,
      limit: limit.toString(),
    });
    return fetchJson(`/api/optimization/candidates?${params.toString()}`);
  },

  // Generative AI Layer
  explainPrediction: (payload) =>
    fetchJson('/api/ai/explain', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  explainOptimization: (candidate) =>
    fetchJson('/api/ai/explain-optimization', {
      method: 'POST',
      body: JSON.stringify(candidate),
    }),

  chatAI: ({ message, history = [] }) =>
    fetchJson('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history }),
    }),

  // Personalized Recommendation Layer
  getPersonalizedRecommendation: (payload) =>
    fetchJson('/api/recommendation/personalized', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  explainRecommendation: (payload) =>
    fetchJson('/api/ai/explain-recommendation', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

export default api;
