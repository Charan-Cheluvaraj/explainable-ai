"""
orchestrator.py — Synapse3D Parliament Execution Engine (Stateful Edition).

Manages the full 3+1 debate lifecycle:
  Phase 0  : Backboard.io knowledge grounding (persistent memory)
  Round 1  : Parallel independent generation  (3× Llama 3.2 via Ollama)
  Round 2  : Adversarial critique / Brawl     (3× Llama 3.2 via Ollama)
  Round 3  : Constitutional synthesis          (Groq / Llama 3.3 70B)

Stateful Persistence: Agent stances are written to Backboard.io after each round,
so every follow-up query has access to the full parliament history.
"""

from __future__ import annotations
import asyncio
import json
import os
from typing import Any, List, Literal, Dict, Optional, Union
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from groq import AsyncGroq
import ollama

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

from fastapi.responses import FileResponse

@app.get("/health")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}

@app.get("/mock_registry.json")
async def get_mock_registry():
    return FileResponse("public/mock_registry.json")

groq_client   = AsyncGroq(api_key=os.environ.get("GROQ_API_KEY", "REPLACE_ME"))
memory_svc    = MemoryService()

OLLAMA_MODEL = "llama3.2"
GROQ_MODEL   = "llama-3.3-70b-versatile"

# ─────────────────────────────────────────────────────────────
# 2. Pydantic Schemas
# ─────────────────────────────────────────────────────────────

class CitationEmbed(BaseModel):
    """Structured citation attached directly to a LogicNode."""
    source_id: str
    source_text: str = ""
    relevance_score: float = 1.0
    source_url: Optional[str] = None


class LogicNode(BaseModel):
    label: str
    weight: float
    category: Literal["Logic", "Ethics", "Risk"]
    source_id: Optional[str] = None
    citation: Optional[CitationEmbed] = None
    constitutional_violation: bool = False


class AttributionPoint(BaseModel):
    input_token: str
    impact_score: float
    reason: str


class Synapse3DResponse(BaseModel):
    decision: str
    confidence: float
    logic_nodes: List[LogicNode]
    attribution_map: List[AttributionPoint] = []
    internal_critique: str = ""

    # Judge-only fields (optional on sub-agent outputs)
    consensus_stability: float = 0.0
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


def _extract_json_object(text: str) -> str:
    """
    Extract the first JSON object from a model response, trimming markdown fences
    when providers wrap otherwise valid JSON in code blocks.
    """
    candidate = text.strip()
    if candidate.startswith("```"):
        lines = candidate.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        candidate = "\n".join(lines).strip()

    start = candidate.find("{")
    end = candidate.rfind("}")
    if start == -1 or end == -1 or end < start:
        raise ValueError("Model response did not contain a JSON object.")
    return candidate[start : end + 1]


def _normalize_category(raw: Any) -> Literal["Logic", "Ethics", "Risk"]:
    value = str(raw or "Logic").strip().lower()
    if "ethic" in value or "human" in value:
        return "Ethics"
    if "risk" in value or "threat" in value or "security" in value:
        return "Risk"
    return "Logic"


def _normalize_logic_nodes(nodes: Any) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    if not isinstance(nodes, list):
        return normalized

    for idx, node in enumerate(nodes, start=1):
        if not isinstance(node, dict):
            continue

        citation_raw = node.get("citation") or {}
        source_id = (
            node.get("source_id")
            or node.get("source")
            or citation_raw.get("source_id")
            or citation_raw.get("source")
        )
        citation = None
        if source_id:
            citation = {
                "source_id": source_id,
                "source_text": citation_raw.get("source_text") or citation_raw.get("quote") or citation_raw.get("summary") or "",
                "relevance_score": float(citation_raw.get("relevance_score", 1.0) or 1.0),
                "source_url": citation_raw.get("source_url"),
            }

        normalized.append(
            {
                "label": node.get("label") or node.get("claim") or node.get("description") or f"Logic Node {idx}",
                "weight": float(node.get("weight", 0.5) or 0.5),
                "category": _normalize_category(node.get("category") or node.get("type") or node.get("domain")),
                "source_id": source_id,
                "citation": citation,
                "constitutional_violation": bool(
                    node.get("constitutional_violation")
                    or node.get("constitution_violation")
                    or node.get("flagged")
                    or False
                ),
            }
        )
    return normalized


def _normalize_attribution_map(attribution_map: Any, query: str) -> list[dict[str, Any]]:
    if isinstance(attribution_map, list):
        normalized = []
        for point in attribution_map:
            if not isinstance(point, dict):
                continue
            normalized.append(
                {
                    "input_token": point.get("input_token") or point.get("token") or point.get("word") or query,
                    "impact_score": float(point.get("impact_score", point.get("impact", 0.5)) or 0.5),
                    "reason": point.get("reason") or point.get("rationale") or "Model-supplied attribution.",
                }
            )
        if normalized:
            return normalized

    return [
        {
            "input_token": query.strip() or "query",
            "impact_score": 1.0,
            "reason": "Fallback attribution generated because the model omitted attribution_map.",
        }
    ]


def _normalize_response_payload(payload: dict[str, Any], query: str, persona_name: str) -> dict[str, Any]:
    decision = (
        payload.get("decision")
        or payload.get("final_decision")
        or payload.get("final_answer")
        or payload.get("answer")
        or payload.get("recommendation")
        or payload.get("verdict")
        or payload.get("ruling")
        or payload.get("final_synthesis")
        or payload.get("synthesis")
        or payload.get("resolution")
        or payload.get("stance")
        or payload.get("position")
        or payload.get("summary")
        or payload.get("conclusion")
        or "Reasoning Failure"
    )
    confidence = payload.get("confidence", payload.get("confidence_score", 0.0)) or 0.0
    visual_state = str(payload.get("visual_state") or ("CRISIS" if payload.get("is_crisis") else "STABLE")).upper()
    if visual_state not in {"STABLE", "WARNING", "CRISIS"}:
        visual_state = "STABLE"

    return {
        "decision": decision,
        "confidence": float(confidence),
        "logic_nodes": _normalize_logic_nodes(payload.get("logic_nodes")),
        "attribution_map": _normalize_attribution_map(payload.get("attribution_map"), query),
        "internal_critique": payload.get("internal_critique") or payload.get("self_critique") or payload.get("critique") or f"{persona_name} critique unavailable.",
        "consensus_stability": float(payload.get("consensus_stability", payload.get("stability_score", 0.0)) or 0.0),
        "dissenting_opinion": payload.get("dissenting_opinion"),
        "is_crisis": bool(payload.get("is_crisis", visual_state == "CRISIS")),
        "crisis_reason": payload.get("crisis_reason"),
        "visual_state": visual_state,
        "constitution_report": payload.get("constitution_report"),
    }


def _parse_synapse_response(text: str, query: str, persona_name: str) -> Synapse3DResponse:
    payload = json.loads(_extract_json_object(text))
    if not isinstance(payload, dict):
        raise ValueError("Model response was not a JSON object.")
    return Synapse3DResponse.model_validate(_normalize_response_payload(payload, query, persona_name))


def _is_quota_error(exc: Exception) -> bool:
    message = str(exc).lower()
    return "quota exceeded" in message or "rate limit" in message or "429" in message


def _derive_consensus_summary(state: "DebateState") -> str:
    """
    Build a readable final answer when the judge returns structural metadata
    but omits a user-facing synthesis string.
    """
    candidate_responses = list(state.round_2_responses.values()) or list(state.round_1_responses.values())
    usable_decisions = [
        res.decision.strip()
        for res in candidate_responses
        if getattr(res, "decision", "").strip() and getattr(res, "decision", "").strip() != "Reasoning Failure"
    ]

    if not usable_decisions:
        return "The parliament completed deliberation, but the final answer text was missing from the model output."

    lead = usable_decisions[0]
    if len(usable_decisions) == 1:
        return lead

    supporting = usable_decisions[1:3]
    summary = f"{lead}\n\nSupporting perspectives:\n- " + "\n- ".join(supporting)
    return summary


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

    # Backboard memory depth (how many facts were retrieved from persistent memory)
    memory_depth: int = 0

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

async def call_ollama_agent(
    persona_name: str,
    system_prompt: str,
    user_prompt: str,
) -> AgentResult:
    """
    Fires a structured-output request to the local Ollama instance.
    Uses Llama 3.2 to generate responses in Synapse3D JSON format.
    """
    try:
        # We use the JSON schema from your Pydantic model to force structured output
        # Using loop.run_in_executor to avoid blocking the event loop with synchronous ollama.chat
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: ollama.chat(
                model=OLLAMA_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                format=Synapse3DResponse.model_json_schema(),
                options={
                    "temperature": 0.4,
                    "num_ctx": 4096
                }
            )
        )
        
        content = response['message']['content']
        return Synapse3DResponse.model_validate_json(content)
        
    except Exception as exc:
        print(f"  [X] [{persona_name}] Local reasoning failure: {exc}")
        return FallbackResponse()


async def call_groq_judge(system_prompt: str, user_prompt: str, query: str) -> AgentResult:
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
        content = resp.choices[0].message.content or ""
        return _parse_synapse_response(content, query, "Judge")
    except Exception as exc:
        print(f"  [X] [Judge] Fatal reasoning failure. ({exc})")
        return FallbackResponse()


# ─────────────────────────────────────────────────────────────
# 6. Prompt Builders
# ─────────────────────────────────────────────────────────────

def build_round1_prompt(query: str, grounding: str, persona: str) -> str:
    return f"""=== CURRENT USER PROPOSAL ===
{query}
=============================

{grounding}
(NOTE: The above grounding knowledge contains HISTORICAL context. If it is NOT relevant to the CURRENT USER PROPOSAL, IGNORE IT COMPLETELY.)

ROUND 1 — FIRST STANCE:
Your task is to respond to the CURRENT USER PROPOSAL: "{query}"
Generate your independent position. Do NOT collaborate with other agents.
You MUST cite at least one source_id from the GROUNDING KNOWLEDGE in your logic_nodes, ONLY IF it is relevant.
Any logic_node with weight > 0.7 that lacks a citation.source_id will be de-weighted by the Judge.

Respond in the strict Synapse3D JSON format.
CRITICAL: The "decision" field MUST contain a highly detailed, conversational paragraph explaining your stance on the CURRENT USER PROPOSAL. Do NOT put JSON or metadata inside the "decision" field.
"""


def build_round2_prompt(query: str, grounding: str, own_r1: str, peers_r1: str) -> str:
    return f"""=== CURRENT USER PROPOSAL ===
{query}
=============================

{grounding}
(NOTE: The above grounding knowledge contains HISTORICAL context. If it is NOT relevant to the CURRENT USER PROPOSAL, IGNORE IT COMPLETELY.)

YOUR ROUND 1 STANCE:
{own_r1}

ROUND 1 STANCES FROM YOUR PEERS:
{peers_r1}

ROUND 2 — ADVERSARIAL CRITIQUE (THE BRAWL):
Your task is to debate the CURRENT USER PROPOSAL: "{query}"
MANDATORY RULES:
  1. You are FORBIDDEN from simply agreeing with your peers.
  2. You MUST identify at least ONE "Logical Contradiction" or "Evidence Gap" in EACH peer's
     logic_nodes or attribution_map. Name the specific logic_node label you are attacking.
  3. Revise your own stance in light of this critique — but defend your persona's mandate.
  4. Maintain all source_id citations from Round 1 and add new ones if your critique introduces facts.

Respond in the strict Synapse3D JSON format.
CRITICAL: The "decision" field MUST contain a highly detailed, conversational paragraph explaining your revised stance on the CURRENT USER PROPOSAL. Do NOT put JSON or metadata inside the "decision" field.
"""


def build_judge_prompt(query: str, grounding: str, r2_transcript: str) -> str:
    return f"""=== CURRENT USER PROPOSAL ===
{query}
=============================

{grounding}

FULL ROUND 2 DEBATE TRANSCRIPT (CLOSING ARGUMENTS):
{r2_transcript}

SYNTHESIS TASK:
You are the FINAL ARBITER. Review the Brawl above. 
Your goal is to synthesize an answer to the CURRENT USER PROPOSAL: "{query}"
The sub-agents above are local models and may have hallucinated or focused on the wrong topic.
1. Ensure your answer directly addresses the CURRENT USER PROPOSAL.
2. Use the GROUNDING KNOWLEDGE to identify any factual errors in the transcript.
3. In your "decision" field, provide the definitive, absolute correct answer, rectifying any mistakes made by the agents.
4. Your answer MUST be powerful, clear, and concise.

Remember: you must populate constitution_report, visual_state, consensus_stability,
and (if required by Law 2) dissenting_opinion.

CRITICAL: The "decision" field MUST contain a powerful, concise, and clear synthesis paragraph explaining the final, CORRECTED verdict to the user. Do NOT put JSON or metadata inside the "decision" field.
"""


# ─────────────────────────────────────────────────────────────
# 7. Orchestration Pipeline
# ─────────────────────────────────────────────────────────────

@app.post("/debate", response_model=DebateState)
async def run_synapse_parliament(request: QueryRequest) -> DebateState:
    try:
        query = request.query
        print(f"\n{'='*60}")
        print(f"  SYNAPSE3D PARLIAMENT  |  Query: {query[:60]}...")
        print(f"{'='*60}")

        # -- Phase 0: Knowledge Grounding -------------------------
        print("  [0] Fetching grounding knowledge from Backboard...")
        bundle: GroundingBundle = await memory_svc.retrieve_context(query)
        grounding_block = bundle.formatted_block
        state = DebateState(query=query, grounding_bundle=bundle, memory_depth=bundle.memory_depth)

        # -- Round 1: Local Parallel Generation -------------
        print("  [1] Round 1 - Local parallel generation (Ollama)...")
        r1_tasks = [
            call_ollama_agent(
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

        # -- Persist Round 1 stances to Backboard ----------------
        print("  [1b] Posting Round 1 stances to Backboard memory...")
        persist_tasks = [
            memory_svc.post_agent_message(
                name,
                "Round 1",
                getattr(state.round_1_responses[name], "decision", "N/A"),
                getattr(state.round_1_responses[name], "confidence", 0.0),
            )
            for name in PERSONAS
            if not getattr(state.round_1_responses[name], "reasoning_failure", False)
        ]
        await asyncio.gather(*persist_tasks)

        state.compute_tension()
        print(f"     Tension  Var={state.tension_variance:.4f}  StDev={state.tension_stdev:.4f}")

        # -- Round 2: Local Adversarial Critique -------------
        print(f"  [2] Round 2 - Local Brawl (Ollama)...")

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
                call_ollama_agent(
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

        if all(getattr(result, "reasoning_failure", False) for result in r2_results):
            print("     [FALLBACK] Round 2 exhausted. Reusing Round 1 for synthesis.")
            state.round_2_responses = dict(state.round_1_responses)

        # -- Persist Round 2 stances to Backboard ----------------
        print("  [2b] Posting Round 2 stances to Backboard memory...")
        persist_r2_tasks = [
            memory_svc.post_agent_message(
                name,
                "Round 2 Brawl",
                getattr(state.round_2_responses[name], "decision", "N/A"),
                getattr(state.round_2_responses[name], "confidence", 0.0),
            )
            for name in PERSONAS
            if not getattr(state.round_2_responses[name], "reasoning_failure", False)
        ]
        await asyncio.gather(*persist_r2_tasks)

        # -- Round 3: Constitutional Synthesis --------------------
        print("  [3] Round 3 - Sovereign Judge synthesis...")

        r2_transcript = "\n\n".join(
            f"=== {name} (Round 2) ===\n{_dump(state.round_2_responses[name])}"
            for name in PERSONAS
            if not getattr(state.round_2_responses[name], "reasoning_failure", False)
        )

        judge_sys  = SynapseConstitution.get_judge_prompt(state.tension_variance)
        judge_user = build_judge_prompt(query, grounding_block, r2_transcript)

        state.final_synthesis = await call_groq_judge(judge_sys, judge_user, query)
        if (
            getattr(state.final_synthesis, "decision", "").strip() == "Reasoning Failure"
            or not getattr(state.final_synthesis, "decision", "").strip()
        ):
            state.final_synthesis.decision = _derive_consensus_summary(state)
        if getattr(state.final_synthesis, "confidence", 0.0) <= 0:
            fallback_confidence = max(
                getattr(state.final_synthesis, "consensus_stability", 0.0),
                0.28,
            )
            state.final_synthesis.confidence = round(fallback_confidence, 2)

        vs = getattr(state.final_synthesis, "visual_state", "UNKNOWN")
        cs = getattr(state.final_synthesis, "consensus_stability", 0.0)
        print(f"     Judge complete  visual_state={vs}  consensus_stability={cs:.2f}")
        print(f"{'='*60}\n")

        return state
    except Exception as exc:
        print(f"  [FATAL] Debate orchestration failed: {exc}")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


from fastapi.staticfiles import StaticFiles

# ─────────────────────────────────────────────────────────────
# Static Files (Frontend Build)
# ─────────────────────────────────────────────────────────────

# Mount the 'dist' directory created by 'npm run build' to serve the UI.
# This should be at the end to avoid intercepting API routes.
if os.path.exists("dist"):
    app.mount("/", StaticFiles(directory="dist", html=True), name="static")

# ─────────────────────────────────────────────────────────────
# Entry Point
# ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "orchestrator:app",
        host="0.0.0.0",
        port=8000,
        reload=os.getenv("UVICORN_RELOAD", "false").lower() == "true",
    )
