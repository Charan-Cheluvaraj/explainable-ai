/**
 * useCognitionStore.ts — The Brain of the Parliament
 */

import { create } from 'zustand';
import { conductDebate } from '../api';

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
  internalCritique?: string;
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
  memoryDepth: number;  // How many Backboard facts were retrieved
  expandedAgentId: string | null;
  isPromptVisible: boolean;
  
  // Actions
  enterParliament: () => void;
  startDebate: (query: string) => Promise<void>;
  reset: () => void;
  toggleAgentExpansion: (id: string) => void;
  setPromptVisible: (visible: boolean) => void;
}

const formatSynthesisAnswer = (_query: string, rawAnswer: string): string => {
  return rawAnswer.trim();
};

const INITIAL_STATE = {
  agents: {
    technocrat: { id: 'technocrat', status: 'idle', confidence: 1.0, lastThought: '', internalCritique: '' },
    humanist: { id: 'humanist', status: 'idle', confidence: 1.0, lastThought: '', internalCritique: '' },
    inquisitor: { id: 'inquisitor', status: 'idle', confidence: 1.0, lastThought: '', internalCritique: '' },
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
  memoryDepth: 0,
  expandedAgentId: null,
  isPromptVisible: true,
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
      expandedAgentId: null, // Reset expansion on new debate
      agents: {
        technocrat: { id: 'technocrat', status: 'thinking', confidence: 1.0, lastThought: '', internalCritique: '' },
        humanist: { id: 'humanist', status: 'thinking', confidence: 1.0, lastThought: '', internalCritique: '' },
        inquisitor: { id: 'inquisitor', status: 'thinking', confidence: 1.0, lastThought: '', internalCritique: '' },
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
        synthesisResult: formatSynthesisAnswer(query, synthesis.decision),
        memoryDepth: (response as unknown as { memory_depth?: number }).memory_depth ?? 0,
        agents: {
          technocrat: { 
            id: 'technocrat', 
            status: 'speaking', 
            confidence: response.round_1_responses['Technocrat']?.confidence || 0.8,
            lastThought: response.round_2_responses['Technocrat']?.decision || '',
            internalCritique: response.round_2_responses['Technocrat']?.internal_critique || ''
          },
          humanist: { 
            id: 'humanist', 
            status: 'speaking', 
            confidence: response.round_1_responses['Humanist']?.confidence || 0.8,
            lastThought: response.round_2_responses['Humanist']?.decision || '',
            internalCritique: response.round_2_responses['Humanist']?.internal_critique || ''
          },
          inquisitor: { 
            id: 'inquisitor', 
            status: 'speaking', 
            confidence: response.round_1_responses['Inquisitor']?.confidence || 0.8,
            lastThought: response.round_2_responses['Inquisitor']?.decision || '',
            internalCritique: response.round_2_responses['Inquisitor']?.internal_critique || ''
          },
        },
        violations: (synthesis.constitution_report as { violations: { law: string, agent_id: string, reason: string }[] })?.violations?.map(v => ({
          law: v.law,
          agentId: v.agent_id,
          description: v.reason
        })) || []
      });

    } catch (error) {
      console.error('Debate failed:', error);
      phaseTimers.forEach(clearTimeout);
      const errorMessage = error instanceof Error ? error.message : 'API connection refused or internal server error.';
      set({ 
        isDebating: false, 
        debatePhase: 'reveal',
        visualState: 'CRISIS',
        tensionVariance: 1.0,
        synthesisResult: `ERROR: The Synapse Parliament failed to reach a synthesis. \n\nReason: ${errorMessage}\n\nPlease check that the orchestrator backend is running and API keys are valid.`,
        agents: {
          technocrat: { id: 'technocrat', status: 'idle', confidence: 0, lastThought: '', internalCritique: '' },
          humanist: { id: 'humanist', status: 'idle', confidence: 0, lastThought: '', internalCritique: '' },
          inquisitor: { id: 'inquisitor', status: 'idle', confidence: 0, lastThought: '', internalCritique: '' },
        }
      });
    }
  },

  enterParliament: () => set({ hasEntered: true }),

  reset: () => set(INITIAL_STATE),

  toggleAgentExpansion: (id: string) => {
    set((state) => ({
      expandedAgentId: state.expandedAgentId === id ? null : id
    }));
  },
  
  setPromptVisible: (visible: boolean) => set({ isPromptVisible: visible }),
}));

