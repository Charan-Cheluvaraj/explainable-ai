/**
 * useCognitionStore.ts — The Brain of the Parliament
 */

import { create } from 'zustand';
import { conductDebate } from '../api';
import type { DebateResponse } from '../api';

export type AgentStatus = 'idle' | 'thinking' | 'speaking' | 'dissenting';
export type VisualState = 'STABLE' | 'WARNING' | 'CRISIS';
export type DebatePhase = 'idle' | 'grounding' | 'round1' | 'brawl' | 'synthesis' | 'reveal';

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
  debatePhase: DebatePhase;
  round: number;
  lastQuery: string;
  synthesisResult: string;
  violations: ConstitutionViolation[];
  hasEntered: boolean;
  
  // Actions
  enterParliament: () => void;
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
  debatePhase: 'idle' as DebatePhase,
  round: 0,
  lastQuery: '',
  synthesisResult: '',
  violations: [],
  hasEntered: false,
};

export const useCognitionStore = create<CognitionStore>((set, get) => ({
  ...INITIAL_STATE,

  startDebate: async (query: string) => {
    set({ 
      isDebating: true, 
      lastQuery: query, 
      synthesisResult: '',
      round: 1,
      debatePhase: 'grounding',
      agents: {
        technocrat: { id: 'technocrat', status: 'thinking', confidence: 1.0, lastThought: '' },
        humanist: { id: 'humanist', status: 'thinking', confidence: 1.0, lastThought: '' },
        inquisitor: { id: 'inquisitor', status: 'thinking', confidence: 1.0, lastThought: '' },
      }
    });

    // Simulated Phase progression (Visual only while API fetches)
    const phases: { phase: DebatePhase, delay: number }[] = [
      { phase: 'round1', delay: 2000 },
      { phase: 'brawl', delay: 6000 },
      { phase: 'synthesis', delay: 11000 },
    ];

    const phaseTimers = phases.map(({ phase, delay }) => 
      setTimeout(() => {
        if (get().isDebating) set({ debatePhase: phase });
      }, delay)
    );

    try {
      const response = await conductDebate(query);
      
      // Clear timers and jump to reveal
      phaseTimers.forEach(clearTimeout);
      
      const synthesis = response.final_synthesis;
      
      set({
        isDebating: false,
        debatePhase: 'reveal',
        tensionVariance: response.tension_variance,
        visualState: synthesis.visual_state,
        synthesisResult: synthesis.decision,
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
      phaseTimers.forEach(clearTimeout);
      set({ isDebating: false, debatePhase: 'idle' });
    }
  },

  enterParliament: () => set({ hasEntered: true }),

  reset: () => set(INITIAL_STATE),
}));

