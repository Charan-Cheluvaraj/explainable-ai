import axios from 'axios';

// Empty base URL → calls are relative (e.g. /debate)
// Vite dev server proxies /debate → http://localhost:8000
// No CORS issues in development.
const API_BASE_URL = '';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface DebateRequest {
  query: string;
}

export interface AgentResult {
  decision: string;
  confidence: number;
  logic_nodes: unknown[];
  attribution_map: unknown[];
  internal_critique: string;
  consensus_stability?: number;
  dissenting_opinion?: string;
  is_crisis?: boolean;
  visual_state: 'STABLE' | 'WARNING' | 'CRISIS';
  constitution_report?: unknown;
}

export interface DebateResponse {
  query: string;
  round_1_responses: Record<string, AgentResult>;
  round_2_responses: Record<string, AgentResult>;
  final_synthesis: AgentResult;
  tension_variance: number;
  tension_stdev: number;
}

export const conductDebate = async (query: string): Promise<DebateResponse> => {
  const isDemo = import.meta.env.VITE_DEMO_MODE === 'true';

  if (isDemo) {
    console.log('[DEMO MODE] Intercepted request. Fetching from mock_registry.json...');
    const res = await fetch('/mock_registry.json');
    const registry = await res.json();
    
    // Find matching query or fallback to default
    const mockData = registry[query] || registry["default"];
    
    // Simulate thinking time for animations
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Return mock data, overriding query field just in case
    return {
      ...mockData,
      query: query
    };
  }

  const response = await api.post<DebateResponse>('/debate', { query });
  return response.data;
};

export default api;
