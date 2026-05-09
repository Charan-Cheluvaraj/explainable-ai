/**
 * useCognitionStore.ts — The Nervous System of Synapse3D
 *
 * Single source of truth for all cognitive states flowing from the Parliament
 * backend into the 3D visual layer. Designed for high-frequency updates
 * without triggering unnecessary React re-renders via selective subscriptions.
 */

import { create } from 'zustand';

// ─────────────────────────────────────────────────────────────
// Core Type Definitions
// ─────────────────────────────────────────────────────────────

export type AgentStatus = 'idle' | 'thinking' | 'speaking' | 'dissenting';
export type VisualState = 'STABLE' | 'WARNING' | 'CRISIS';

export type ConstitutionLaw =
  | 'LAW_1_ETHICAL_PRIMACY'
  | 'LAW_2_MINORITY_VISIBILITY'
  | 'LAW_3_EVIDENTIARY_GROUNDING';

/** A single reasoning node in the 3D force-graph */
export interface LogicNode {
  id: string;
  label: string;
  agent: 'technocrat' | 'humanist' | 'inquisitor' | 'judge';
  weight: number;           // 0.0–1.0 — drives node scale in 3D
  confidence: number;       // 0.0–1.0 — drives glow intensity
  hasViolation: boolean;    // triggers geometry corruption shader
  sourceId?: string;        // citation anchor
  group?: number;           // force-graph cluster group
}

/** A directed edge between two reasoning nodes */
export interface ReasoningEdge {
  source: string;           // LogicNode.id
  target: string;
  strength: number;         // 0.0–1.0 — drives edge width/opacity
  type: 'supports' | 'contradicts' | 'cites';
}

/** The full graph passed to r3f-forcegraph */
export interface CognitionGraph {
  nodes: LogicNode[];
  edges: ReasoningEdge[];
}

/** Per-agent state bag */
export interface AgentState {
  technocrat: AgentStatus;
  humanist: AgentStatus;
  inquisitor: AgentStatus;
}

/** Constitutional violation record from the Judge */
export interface ConstitutionViolation {
  law: ConstitutionLaw;
  nodeId: string;
  nodeLabel: string;
  penaltyApplied: number;
}

/** Semantic attribution map mapping node ID to query words and impact */
export interface AttributionScore {
  word: string;
  impact: number; // 0.0 to 1.0
}
export type AttributionMap = Record<string, AttributionScore[]>;

/** Dissenting opinion preserved by Law 2 */
export interface DissenterRecord {
  agent: 'technocrat' | 'humanist' | 'inquisitor';
  dissent: string;
  confidence: number;
}

// ─────────────────────────────────────────────────────────────
// Tension Thresholds (mirrored from synapse3d_schema.ts)
// ─────────────────────────────────────────────────────────────

export const TENSION_THRESHOLDS = {
  CRISIS: 0.15,
  WARNING: 0.07,
} as const;

// ─────────────────────────────────────────────────────────────
// Store Shape
// ─────────────────────────────────────────────────────────────

interface CognitionStore {
  // ── Agent States ──────────────────────────────────────────
  agents: AgentState;

  // ── Core Tension Metric ───────────────────────────────────
  /** Population variance σ² of agent confidence levels. Range: 0.0–1.0 */
  tensionVariance: number;

  /** Derived visual mode driven by tensionVariance thresholds */
  visualState: VisualState;

  // ── Graph Data ────────────────────────────────────────────
  /** Nodes + edges for the 3D force-graph renderer */
  cognitionGraph: CognitionGraph;

  // ── Constitutional Layer ──────────────────────────────────
  /** Laws currently being invoked by the Sovereign Judge */
  activeConstitutionLaws: ConstitutionLaw[];
  violations: ConstitutionViolation[];
  dissenters: DissenterRecord[];

  // ── XAI & Attribution ─────────────────────────────────────
  hoveredNodeId: string | null;
  attributionMap: AttributionMap;

  // ── Debate Lifecycle ──────────────────────────────────────
  round: 0 | 1 | 2 | 3;
  isDebating: boolean;
  lastQuery: string;

  // ── Camera / Theatre.js control ───────────────────────────
  /** When CRISIS, the camera locks onto the conflicting agents */
  cameraTarget: 'center' | 'technocrat' | 'humanist' | 'inquisitor' | 'judge';

  // ── Actions ───────────────────────────────────────────────
  setAgentStatus: (agent: keyof AgentState, status: AgentStatus) => void;
  setTensionVariance: (sigma2: number) => void;
  setCognitionGraph: (graph: CognitionGraph) => void;
  setActiveConstitutionLaws: (laws: ConstitutionLaw[]) => void;
  addViolation: (v: ConstitutionViolation) => void;
  addDissenter: (d: DissenterRecord) => void;
  setRound: (round: 0 | 1 | 2 | 3) => void;
  startDebate: (query: string) => void;
  endDebate: () => void;
  setCameraTarget: (target: CognitionStore['cameraTarget']) => void;

  setHoveredNodeId: (id: string | null) => void;

  /** Bulk update from a backend /debate response JSON */
  hydrateFromDebateResponse: (payload: DebateResponsePayload) => void;

  /** Reset all state to idle */
  reset: () => void;
}

// ─────────────────────────────────────────────────────────────
// Backend Response Payload Shape
// ─────────────────────────────────────────────────────────────

export interface DebateResponsePayload {
  tensionVariance: number;
  visualState: VisualState;
  logicNodes: LogicNode[];
  reasoningEdges: ReasoningEdge[];
  activeConstitutionLaws: ConstitutionLaw[];
  violations: ConstitutionViolation[];
  dissenters: DissenterRecord[];
  attributionMap?: AttributionMap;
}

// ─────────────────────────────────────────────────────────────
// Derived: Compute visual state from σ²
// ─────────────────────────────────────────────────────────────

function deriveVisualState(sigma2: number): VisualState {
  if (sigma2 >= TENSION_THRESHOLDS.CRISIS) return 'CRISIS';
  if (sigma2 >= TENSION_THRESHOLDS.WARNING) return 'WARNING';
  return 'STABLE';
}

// ─────────────────────────────────────────────────────────────
// Default / Initial State
// ─────────────────────────────────────────────────────────────

const INITIAL_STATE = {
  agents: {
    technocrat: 'idle' as AgentStatus,
    humanist: 'idle' as AgentStatus,
    inquisitor: 'idle' as AgentStatus,
  },
  tensionVariance: 0,
  visualState: 'STABLE' as VisualState,
  cognitionGraph: { nodes: [], edges: [] },
  activeConstitutionLaws: [] as ConstitutionLaw[],
  violations: [] as ConstitutionViolation[],
  dissenters: [] as DissenterRecord[],
  round: 0 as 0 | 1 | 2 | 3,
  isDebating: false,
  lastQuery: '',
  cameraTarget: 'center' as CognitionStore['cameraTarget'],
  hoveredNodeId: null as string | null,
  attributionMap: {} as AttributionMap,
};

// ─────────────────────────────────────────────────────────────
// Store Implementation
// ─────────────────────────────────────────────────────────────

export const useCognitionStore = create<CognitionStore>((set, get) => ({
  ...INITIAL_STATE,

  setAgentStatus: (agent, status) =>
    set((s) => ({ agents: { ...s.agents, [agent]: status } })),

  setTensionVariance: (sigma2) =>
    set({
      tensionVariance: sigma2,
      visualState: deriveVisualState(sigma2),
      // Auto-lock camera on CRISIS
      cameraTarget: sigma2 >= TENSION_THRESHOLDS.CRISIS ? 'technocrat' : 'center',
    }),

  setCognitionGraph: (graph) => set({ cognitionGraph: graph }),

  setActiveConstitutionLaws: (laws) => set({ activeConstitutionLaws: laws }),

  addViolation: (v) =>
    set((s) => ({ violations: [...s.violations, v] })),

  addDissenter: (d) =>
    set((s) => ({ dissenters: [...s.dissenters, d] })),

  setRound: (round) => set({ round }),

  startDebate: (query) =>
    set({
      isDebating: true,
      lastQuery: query,
      round: 1,
      violations: [],
      dissenters: [],
      agents: {
        technocrat: 'thinking',
        humanist: 'thinking',
        inquisitor: 'thinking',
      },
    }),

  endDebate: () =>
    set({
      isDebating: false,
      round: 3,
      agents: {
        technocrat: 'idle',
        humanist: 'idle',
        inquisitor: 'idle',
      },
    }),

  setCameraTarget: (target) => set({ cameraTarget: target }),

  setHoveredNodeId: (id) => set({ hoveredNodeId: id }),

  hydrateFromDebateResponse: (payload) => {
    const { tensionVariance, visualState, logicNodes, reasoningEdges,
      activeConstitutionLaws, violations, dissenters, attributionMap = {} } = payload;
    set({
      tensionVariance,
      visualState,
      cognitionGraph: { nodes: logicNodes, edges: reasoningEdges },
      activeConstitutionLaws,
      violations,
      dissenters,
      attributionMap,
      cameraTarget: visualState === 'CRISIS' ? 'technocrat' : 'center',
    });
  },

  reset: () => set(INITIAL_STATE),
}));

// ─────────────────────────────────────────────────────────────
// Selector Hooks — avoid full re-renders
// ─────────────────────────────────────────────────────────────

export const useTensionVariance = () =>
  useCognitionStore((s) => s.tensionVariance);

export const useVisualState = () =>
  useCognitionStore((s) => s.visualState);

export const useCognitionGraph = () =>
  useCognitionStore((s) => s.cognitionGraph);

export const useAgents = () =>
  useCognitionStore((s) => s.agents);

export const useViolations = () =>
  useCognitionStore((s) => s.violations);
