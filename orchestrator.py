"""
orchestrator.py — Synapse3D Parliament Execution Engine.

Manages the full 3+1 debate lifecycle:
  Phase 0  : Async knowledge grounding (MemoryService)
  Round 1  : Parallel independent generation  (3× Gemini Flash-Lite)
  Round 2  : Adversarial critique / Brawl     (3× Gemini Flash-Lite)
  Round 3  : Constitutional synthesis          (Groq / GPT-OSS-120b)
"""

from __future__ import annotations
import asyncio
import json
import os
from typing import List, Literal, Dict, Optional, Union
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

from fastapi import FastAPI
from pydantic import BaseModel, Field
import google.generativeai as genai
from groq import AsyncGroq

from constitution import (
    SynapseConstitution,
    ConstitutionReport,
    LawStatus,
)
from memory_service import MemoryService, Citation, GroundingBundle

# ─────────────────────────────────────────────────────────────
# 1. SDK Configuration
# ─────────────────────────────────────────────────────────────

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Synapse3D Parliament API", version="1.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

genai.configure(api_key=os.environ.get("GEMINI_API_KEY", "REPLACE_ME"))
groq_client  = AsyncGroq(api_key=os.environ.get("GROQ_API_KEY", "REPLACE_ME"))
memory_svc   = MemoryService()

GEMINI_MODEL = "gemini-3.1-flash-lite"
GROQ_MODEL   = "llama3-70b-8192"   # swap to gpt-oss-120b when available on Groq

# ─────────────────────────────────────────────────────────────
# 2. Pydantic Schemas
# ─────────────────────────────────────────────────────────────

class CitationEmbed(BaseModel):
    """Structured citation attached directly to a LogicNode."""
    source_id: str
    source_text: str
    relevance_score: float = Field(ge=0.0, le=1.0)
    source_url: Optional[str] = None


class LogicNode(BaseModel):
    label: str
    weight: float = Field(ge=0.0, le=1.0)
    category: Literal["Logic", "Ethics", "Risk"]
    source_id: Optional[str] = None
    citation: Optional[CitationEmbed] = None
    constitutional_violation: bool = False  # Set by Judge under Law 1


class AttributionPoint(BaseModel):
    input_token: str
    impact_score: float = Field(ge=-1.0, le=1.0)
    reason: str


class Synapse3DResponse(BaseModel):
    decision: str
    confidence: float = Field(ge=0.0, le=1.0)
    logic_nodes: List[LogicNode]
    attribution_map: List[AttributionPoint]
    internal_critique: str

    # Judge-only fields (optional on sub-agent outputs)
    consensus_stability: float = Field(default=0.0, ge=0.0, le=1.0)
    dissenting_opinion: Optional[str] = None
    is_crisis: bool = False
    crisis_reason: Optional[str] = None
    visual_state: Literal["STABLE", "WARNING", "CRISIS"] = "STABLE"
    constitution_report: Optional[ConstitutionReport] = None


class FallbackResponse(BaseModel):
    """Emitted when an agent produces malformed JSON after retry."""
    decision: str = "Reasoning Failure"
    confidence: float = 0.0
    logic_nodes: List[LogicNode] = []
    attribution_map: List[AttributionPoint] = []
    internal_critique: str = "JSON Schema violation or API timeout — flagged as Reasoning Failure node."
    visual_state: str = "CRISIS"
    reasoning_failure: bool = True


AgentResult = Union[Synapse3DResponse, FallbackResponse]


# ─────────────────────────────────────────────────────────────
# 3. Debate State
# ─────────────────────────────────────────────────────────────

class DebateState(BaseModel):
    query: str
    grounding_bundle: Optional[GroundingBundle] = None

    round_1_responses: Dict[str, AgentResult] = {}
    round_2_responses: Dict[str, AgentResult] = {}
    final_synthesis:   Optional[AgentResult]  = None

    # Tension metrics (computed from Round 1)
    tension_variance: float = 0.0   # σ² — drives visual_state
    tension_stdev:    float = 0.0   # √σ² — human-readable

    def compute_tension(self) -> None:
        """
        Population variance: σ² = (1/N) Σ(cᵢ − c̄)²
        Matches the formula in the constitutional spec exactly.
        """
        confidences = [
            r.confidence
            for r in self.round_1_responses.values()
            if not getattr(r, "reasoning_failure", False)
        ]
        self.tension_variance = SynapseConstitution.compute_tension_variance(confidences)
        self.tension_stdev    = round(self.tension_variance ** 0.5, 6)


class QueryRequest(BaseModel):
    query: str


# ─────────────────────────────────────────────────────────────
# 4. Agent Personas
# ─────────────────────────────────────────────────────────────

PERSONAS: dict[str, str] = {
    "Technocrat": (
        'You are "The Technocrat". You are a cold, mathematical agent driven purely by '
        "logic, efficiency, and structural performance. You speak in data. "
        "You find emotional or ethical detours contemptible when they are not backed by metrics. "
        "Your primary weapon is precision. Your weakness is that you sometimes optimise "
        "for the wrong objective function."
    ),
    "Humanist": (
        'You are "The Humanist". You are the guardian of ethics, privacy, and human dignity. '
        "You find the Technocrat's clinical efficiency repugnant when it erases human cost. "
        "You cite social impact studies, bias reports, and EU AI Act provisions. "
        "Your primary weapon is moral clarity. Your weakness is that you can overweight "
        "speculative harm against concrete benefit."
    ),
    "Inquisitor": (
        'You are "The Inquisitor". You assume everything proposed will be attacked, broken, '
        "or exploited within 90 days of deployment. You are obsessed with threat models, "
        "single points of failure, and adversarial edge cases. "
        "Your primary weapon is adversarial imagination. Your weakness is that you can "
        "block all progress by finding a risk in everything."
    ),
}


# ─────────────────────────────────────────────────────────────
# 5. API Call Helpers
# ─────────────────────────────────────────────────────────────

async def call_gemini_agent(
    persona_name: str,
    system_prompt: str,
    user_prompt: str,
    retry: int = 1,
) -> AgentResult:
    """
    Fires a structured-output request to Gemini Flash-Lite.
    Retries once on schema failure; emits FallbackResponse on total failure.
    """
    model = genai.GenerativeModel(
        model_name=GEMINI_MODEL,
        system_instruction=system_prompt,
        generation_config=genai.GenerationConfig(
            response_mime_type="application/json",
            response_schema=Synapse3DResponse,
        ),
    )
    try:
        response = await model.generate_content_async(user_prompt)
        return Synapse3DResponse.model_validate_json(response.text)
    except Exception as exc:
        if retry > 0:
            print(f"  ⚠  [{persona_name}] Schema failure — retrying. ({exc})")
            return await call_gemini_agent(persona_name, system_prompt, user_prompt, retry=0)
        print(f"  ✗  [{persona_name}] Fatal reasoning failure.")
        return FallbackResponse()


async def call_groq_judge(system_prompt: str, user_prompt: str) -> AgentResult:
    """
    Fires a JSON-mode request to the Groq-hosted Sovereign Judge.
    Validates the response against Synapse3DResponse schema.
    """
    try:
        resp = await groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": system_prompt + "\n\nOUTPUT ONLY VALID JSON. NO PROSE OUTSIDE THE JSON OBJECT.",
                },
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.15,
            max_tokens=3000,
        )
        return Synapse3DResponse.model_validate_json(resp.choices[0].message.content)
    except Exception as exc:
        print(f"  ✗  [Judge] Fatal reasoning failure. ({exc})")
        return FallbackResponse()


# ─────────────────────────────────────────────────────────────
# 6. Prompt Builders
# ─────────────────────────────────────────────────────────────

def build_round1_prompt(query: str, grounding: str, persona: str) -> str:
    return f"""{grounding}

USER PROPOSAL: {query}

ROUND 1 — FIRST STANCE:
Generate your independent position. Do NOT collaborate with other agents.
You MUST cite at least one source_id from the GROUNDING KNOWLEDGE in your logic_nodes.
Any logic_node with weight > 0.7 that lacks a citation.source_id will be de-weighted by the Judge.

Respond in the strict Synapse3D JSON format.
"""


def build_round2_prompt(query: str, grounding: str, own_r1: str, peers_r1: str) -> str:
    return f"""{grounding}

USER PROPOSAL: {query}

YOUR ROUND 1 STANCE:
{own_r1}

ROUND 1 STANCES FROM YOUR PEERS:
{peers_r1}

ROUND 2 — ADVERSARIAL CRITIQUE (THE BRAWL):
MANDATORY RULES:
  1. You are FORBIDDEN from simply agreeing with your peers.
  2. You MUST identify at least ONE "Logical Contradiction" or "Evidence Gap" in EACH peer's
     logic_nodes or attribution_map. Name the specific logic_node label you are attacking.
  3. Revise your own stance in light of this critique — but defend your persona's mandate.
  4. Maintain all source_id citations from Round 1 and add new ones if your critique introduces facts.

Respond in the strict Synapse3D JSON format.
"""


def build_judge_prompt(query: str, grounding: str, r2_transcript: str) -> str:
    return f"""{grounding}

USER PROPOSAL: {query}

FULL ROUND 2 DEBATE TRANSCRIPT (CLOSING ARGUMENTS):
{r2_transcript}

SYNTHESIS TASK:
Review the Brawl above as a Supreme Court Justice bound by the Synapse Constitution.
Produce the final Synapse3D JSON synthesis.
Remember: you must populate constitution_report, visual_state, consensus_stability,
and (if required by Law 2) dissenting_opinion.
"""


# ─────────────────────────────────────────────────────────────
# 7. Orchestration Pipeline
# ─────────────────────────────────────────────────────────────

@app.post("/debate", response_model=DebateState)
async def run_synapse_parliament(request: QueryRequest) -> DebateState:
    query = request.query
    print(f"\n{'='*60}")
    print(f"  SYNAPSE3D PARLIAMENT  |  Query: {query[:60]}...")
    print(f"{'='*60}")

    # -- Phase 0: Knowledge Grounding -------------------------
    print("\n  [0] Fetching grounding knowledge...")
    bundle: GroundingBundle = await memory_svc.retrieve_context(query)
    grounding_block = bundle.formatted_block
    state = DebateState(query=query, grounding_bundle=bundle)

    # -- Round 1: Parallel Independent Generation -------------
    print("  [1] Round 1 - Parallel independent generation...")
    r1_tasks = [
        call_gemini_agent(
            name,
            PERSONAS[name],
            build_round1_prompt(query, grounding_block, name),
        )
        for name in PERSONAS
    ]
    r1_results = await asyncio.gather(*r1_tasks)

    for name, result in zip(PERSONAS.keys(), r1_results):
        state.round_1_responses[name] = result
        status = "[OK]" if not getattr(result, "reasoning_failure", False) else "[FAIL]"
        conf   = getattr(result, "confidence", 0.0)
        print(f"     {status} {name:<14} confidence={conf:.2f}")

    state.compute_tension()
    print(f"     Tension  Var={state.tension_variance:.4f}  StDev={state.tension_stdev:.4f}")

    # -- Round 2: Adversarial Critique ------------------------
    print(f"  [2] Round 2 - Brawl...")

    def _dump(res: AgentResult) -> str:
        return json.dumps(res.model_dump(exclude_none=True), indent=2)

    r2_tasks = []
    for name in PERSONAS:
        own_r1 = _dump(state.round_1_responses[name])
        peers  = "\n\n".join(
            f"--- {peer} ---\n{_dump(state.round_1_responses[peer])}"
            for peer in PERSONAS if peer != name
            and not getattr(state.round_1_responses[peer], "reasoning_failure", False)
        )
        r2_tasks.append(
            call_gemini_agent(
                name,
                PERSONAS[name],
                build_round2_prompt(query, grounding_block, own_r1, peers),
            )
        )

    r2_results = await asyncio.gather(*r2_tasks)
    for name, result in zip(PERSONAS.keys(), r2_results):
        state.round_2_responses[name] = result
        status = "[OK]" if not getattr(result, "reasoning_failure", False) else "[FAIL]"
        print(f"     {status} {name:<14} post-brawl stance recorded")

    # -- Round 3: Constitutional Synthesis --------------------
    print("  [3] Round 3 - Sovereign Judge synthesis...")

    r2_transcript = "\n\n".join(
        f"=== {name} (Round 2) ===\n{_dump(state.round_2_responses[name])}"
        for name in PERSONAS
        if not getattr(state.round_2_responses[name], "reasoning_failure", False)
    )

    judge_sys  = SynapseConstitution.get_judge_prompt(state.tension_variance)
    judge_user = build_judge_prompt(query, grounding_block, r2_transcript)

    state.final_synthesis = await call_groq_judge(judge_sys, judge_user)

    vs = getattr(state.final_synthesis, "visual_state", "UNKNOWN")
    cs = getattr(state.final_synthesis, "consensus_stability", 0.0)
    print(f"     Judge complete  visual_state={vs}  consensus_stability={cs:.2f}")
    print(f"{'='*60}\n")

    return state


# ─────────────────────────────────────────────────────────────
# Entry Point
# ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("orchestrator:app", host="0.0.0.0", port=8000, reload=True)
