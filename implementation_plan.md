# Implementation Plan: Synapse3D - Phase 1: The Brain

Synapse3D is a transparent AI parliament designed to move AI reasoning from a "Black Box" to a "Visible Debate." This phase establishes the core logic, data structures, and personas for the multi-agent system.

## User Review Required

> [!IMPORTANT]
> The Sovereign Judge persona is designed to use `openai/gpt-oss-120b` (via Groq), while sub-agents use `gemini-3.1-flash-lite`. Ensure API access and integration for both providers are planned.

## Proposed Changes

### [NEW] Structural Foundation

We will define the "Laws of Physics" for the AI debate using a strict JSON schema and high-intensity system prompts.

#### [NEW] [synapse3d_schema.ts](file:///d:/nmit%20hack/synapse3d_schema.ts)
Defines the TypeScript interfaces and JSON Schema that all agents must adhere to. This includes fields for 3D visualization fuel (fractal logic nodes, attribution maps, etc.).

#### [NEW] [agent_prompts.md](file:///d:/nmit%20hack/agent_prompts.md)
Contains the system prompts for the four primary roles:
- **The Technocrat**: Logic, efficiency, and performance.
- **The Humanist**: Ethics, society, and privacy.
- **The Inquisitor**: Risk, security, and skepticism.
- **The Sovereign Judge**: The neutral synthesizer and final arbiter.

## Verification Plan

### Automated Tests
- Schema validation: Ensure generated JSON from sample prompts conforms to the schema.
- Persona consistency check: Verify that agents respond within their defined constraints.

### Manual Verification
- Reviewing the "intensity" and "adversarial" nature of the prompts to ensure they will produce meaningful debate.
