import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

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
  confidence: float;
  logic_nodes: any[];
  attribution_map: any[];
  internal_critique: string;
  consensus_stability?: number;
  dissenting_opinion?: string;
  is_crisis?: boolean;
  visual_state: 'STABLE' | 'WARNING' | 'CRISIS';
  constitution_report?: any;
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
  const response = await api.post<DebateResponse>('/debate', { query });
  return response.data;
};

export default api;
