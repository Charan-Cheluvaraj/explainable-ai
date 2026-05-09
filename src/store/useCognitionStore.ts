/**
 * useCognitionStore.ts — The Brain of the Parliament
 */

import { create } from 'zustand';
import { conductDebate, DebateResponse } from '../api';

export type AgentStatus = 'idle' | 'thinking' | 'speaking' | 'dissenting';
export type VisualState = 'STABLE' | 'WARNING' | 'CRISIS';

export type ConstitutionLaw =
  | 'LAW_1_ETHICAL_PRIMACY'
  | 'LAW_2_MINORITY_VISIBILITY'
  | 'LAW_3_EVIDENTIARY_GROUNDING';

export interface Agent {
  id: 'technocrat' | 'humanist' | 'inquisitor';
  status: AgentStatus;
  confidence: number;
  lastThought: string;
}

export interface ConstitutionViolation {
  law: string;
  agentId: string;
  description: string;
}

interface CognitionStore {
  agents: Record<Agent['id'], Agent>;
  tensionVariance: number;
  visualState: VisualState;
  isDebating: boolean;
  round: number;
  lastQuery: string;
  violations: ConstitutionViolation[];
  
  // Actions
  startDebate: (query: string) => Promise<void>;
  reset: () => void;
}

const INITIAL_STATE = {
  agents: {
    technocrat: { id: 'technocrat', status: 'idle', confidence: 1.0, lastThought: '' },
    humanist: { id: 'humanist', status: 'idle', confidence: 1.0, lastThought: '' },
    inquisitor: { id: 'inquisitor', status: 'idle', confidence: 1.0, lastThought: '' },
  } as Record<Agent['id'], Agent>,
  tensionVariance: 0,
  visualState: 'STABLE' as VisualState,
  isDebating: false,
  round: 0,
  lastQuery: '',
  violations: [],
};

export const useCognitionStore = create<CognitionStore>((set, get) => ({
  ...INITIAL_STATE,

  startDebate: async (query: string) => {
    set({ 
      isDebating: true, 
      lastQuery: query, 
      round: 1,
      agents: {
        technocrat: { id: 'technocrat', status: 'thinking', confidence: 1.0, lastThought: '' },
        humanist: { id: 'humanist', status: 'thinking', confidence: 1.0, lastThought: '' },
        inquisitor: { id: 'inquisitor', status: 'thinking', confidence: 1.0, lastThought: '' },
      }
    });

    try {
      const response = await conductDebate(query);
      
      // Map backend response to store state
      // Round 1: Initial thoughts
      set({ round: 2 });
      
      // Round 2: Brawl (adversarial)
      set({ round: 3 });

      // Final Synthesis
      const synthesis = response.final_synthesis;
      
      set({
        isDebating: false,
        tensionVariance: response.tension_variance,
        visualState: synthesis.visual_state,
        agents: {
          technocrat: { 
            id: 'technocrat', 
            status: 'speaking', 
            confidence: response.round_1_responses['Technocrat']?.confidence || 0.8,
            lastThought: response.round_2_responses['Technocrat']?.decision || ''
          },
          humanist: { 
            id: 'humanist', 
            status: 'speaking', 
            confidence: response.round_1_responses['Humanist']?.confidence || 0.8,
            lastThought: response.round_2_responses['Humanist']?.decision || ''
          },
          inquisitor: { 
            id: 'inquisitor', 
            status: 'speaking', 
            confidence: response.round_1_responses['Inquisitor']?.confidence || 0.8,
            lastThought: response.round_2_responses['Inquisitor']?.decision || ''
          },
        },
        violations: synthesis.constitution_report?.violations.map((v: any) => ({
          law: v.law,
          agentId: v.agent_id,
          description: v.reason
        })) || []
      });

    } catch (error) {
      console.error('Debate failed:', error);
      set({ isDebating: false });
    }
  },

  reset: () => set(INITIAL_STATE),
}));
