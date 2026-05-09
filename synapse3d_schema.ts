 * synapse3d_schema.ts — Canonical Type Contracts for Synapse3D
 *
 * Single source of truth shared between the Python backend and the 
 * Cinematic 2D frontend. All fields map 1-to-1 to the Pydantic 
 * models in orchestrator.py.
 */

// ──────────────────────────────────────────────────────────
// Constitution Audit Types
// ──────────────────────────────────────────────────────────

export type LawStatus = 'SATISFIED' | 'VIOLATED' | 'NOT_INVOKED';

export interface ConstitutionReport {
  // Law 1 — Ethical Primacy
  law_1_status: LawStatus;
  law_1_agent_trigger?: string;     // Agent who triggered the law
  law_1_reason?: string;
  law_1_violations: string[];       // LogicNode labels marked CONSTITUTIONAL_VIOLATION

  // Law 2 — Minority Visibility
  law_2_status: LawStatus;
  law_2_agent_trigger?: string;
  law_2_reason?: string;

  // Law 3 — Evidentiary Grounding
  law_3_status: LawStatus;
  law_3_deweighted_nodes: string[]; // LogicNode labels that were de-weighted
  law_3_reason?: string;
}

// ──────────────────────────────────────────────────────────
// Evidence & Citation Types
// ──────────────────────────────────────────────────────────

export interface CitationEmbed {
  source_id: string;
  source_text: string;
  relevance_score: number;          // 0.0 → 1.0
  source_url?: string;
}

// ──────────────────────────────────────────────────────────
// Core Response Structure
// ──────────────────────────────────────────────────────────

export type NodeCategory = 'Logic' | 'Ethics' | 'Risk';

export interface LogicNode {
  label: string;
  weight: number;                   // 0.0 → 1.0
  category: NodeCategory;
  source_id?: string;               // Must cite if weight > 0.7
  citation?: CitationEmbed;         // Full citation embed for HUD overlay
  constitutional_violation?: boolean; // Set by Judge under Law 1
}

export interface AttributionPoint {
  input_token: string;
  impact_score: number;             // -1.0 → 1.0
  reason: string;
}

export type VisualState = 'STABLE' | 'WARNING' | 'CRISIS';

export interface Synapse3DResponse {
  // Core reasoning output (all agents)
  decision: string;
  confidence: number;               // 0.0 → 1.0
  logic_nodes: LogicNode[];
  attribution_map: AttributionPoint[];
  internal_critique: string;

  // Judge-only synthesis fields
  consensus_stability?: number;     // 0.0 → 1.0 — convergence metric
  dissenting_opinion?: string;      // Required by Law 2 when tension is high
  is_crisis?: boolean;
  crisis_reason?: string;
  visual_state?: VisualState;       // Drives 2D Cinematic animation state
  constitution_report?: ConstitutionReport;
}

export interface FallbackResponse {
  decision: 'Reasoning Failure';
  confidence: 0;
  logic_nodes: [];
  attribution_map: [];
  internal_critique: string;
  visual_state: 'CRISIS';
  reasoning_failure: true;
}

// ──────────────────────────────────────────────────────────
// Session State (returned by POST /debate)
// ──────────────────────────────────────────────────────────

export interface DebateState {
  query: string;
  grounding_bundle?: {
    formatted_block: string;
    citations: CitationEmbed[];
  };

  round_1_responses: Record<string, Synapse3DResponse | FallbackResponse>;
  round_2_responses: Record<string, Synapse3DResponse | FallbackResponse>;
  final_synthesis?: Synapse3DResponse | FallbackResponse;

  /** Population variance σ² = (1/N)Σ(cᵢ − c̄)² */
  tension_variance: number;
  /** √σ² — human-readable tension magnitude */
  tension_stdev: number;
}

// ──────────────────────────────────────────────────────────
// Tension Thresholds (must match constitution.py)
// ──────────────────────────────────────────────────────────

export const TENSION_THRESHOLDS = {
  CRISIS:  0.15,   // σ² > 0.15 → CRISIS (HUD pulses red)
  WARNING: 0.07,   // σ² > 0.07 → WARNING (HUD pulses amber)
  STABLE:  0.00,   // σ² ≤ 0.07 → STABLE
} as const;

// ──────────────────────────────────────────────────────────
// JSON Schema (for runtime validation / OpenAPI docs)
// ──────────────────────────────────────────────────────────

export const Synapse3DJsonSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "Synapse3DResponse",
  type: "object",
  required: ["decision", "confidence", "logic_nodes", "attribution_map", "internal_critique"],
  properties: {
    decision:     { type: "string" },
    confidence:   { type: "number", minimum: 0, maximum: 1 },
    logic_nodes: {
      type: "array",
      items: {
        type: "object",
        required: ["label", "weight", "category"],
        properties: {
          label:      { type: "string" },
          weight:     { type: "number", minimum: 0, maximum: 1 },
          category:   { enum: ["Logic", "Ethics", "Risk"] },
          source_id:  { type: "string" },
          citation: {
            type: "object",
            properties: {
              source_id:       { type: "string" },
              source_text:     { type: "string" },
              relevance_score: { type: "number", minimum: 0, maximum: 1 },
              source_url:      { type: "string", format: "uri" },
            },
            required: ["source_id", "source_text", "relevance_score"],
          },
          constitutional_violation: { type: "boolean" },
        },
      },
    },
    attribution_map: {
      type: "array",
      items: {
        type: "object",
        required: ["input_token", "impact_score", "reason"],
        properties: {
          input_token:  { type: "string" },
          impact_score: { type: "number", minimum: -1, maximum: 1 },
          reason:       { type: "string" },
        },
      },
    },
    internal_critique:    { type: "string" },
    consensus_stability:  { type: "number", minimum: 0, maximum: 1 },
    dissenting_opinion:   { type: "string" },
    is_crisis:            { type: "boolean" },
    crisis_reason:        { type: "string" },
    visual_state:         { enum: ["STABLE", "WARNING", "CRISIS"] },
    constitution_report: {
      type: "object",
      required: ["law_1_status", "law_1_violations", "law_2_status", "law_3_status", "law_3_deweighted_nodes"],
      properties: {
        law_1_status:         { enum: ["SATISFIED", "VIOLATED", "NOT_INVOKED"] },
        law_1_agent_trigger:  { type: "string" },
        law_1_reason:         { type: "string" },
        law_1_violations:     { type: "array", items: { type: "string" } },
        law_2_status:         { enum: ["SATISFIED", "VIOLATED", "NOT_INVOKED"] },
        law_2_agent_trigger:  { type: "string" },
        law_2_reason:         { type: "string" },
        law_3_status:         { enum: ["SATISFIED", "VIOLATED", "NOT_INVOKED"] },
        law_3_deweighted_nodes: { type: "array", items: { type: "string" } },
        law_3_reason:         { type: "string" },
      },
    },
  },
} as const;
