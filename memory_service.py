"""
memory_service.py — The Synapse3D Evidence & Grounding Layer (Backboard.io Edition).

Provides an async retriever that reads/writes to Backboard.io persistent threads,
giving every Synapse3D parliament session a stateful memory.

Architecture:
  • retrieve_context(query)    — reads Backboard thread history → Citation objects
  • post_agent_message(...)    — writes agent stances to the thread after each round
  • _ensure_thread()           — auto-creates a Backboard thread on first run, persists ID

Fallback: If Backboard is unreachable, silently falls back to the built-in mock corpus
so the parliament always runs.
"""

from __future__ import annotations
import asyncio
import json
import os
import re
from pathlib import Path
from typing import List, Optional

import httpx
from pydantic import BaseModel, Field

# ─────────────────────────────────────────────────────────────
# Data Models — Citation Schema
# ─────────────────────────────────────────────────────────────

class Citation(BaseModel):
    """
    Represents one retrieved evidence fragment.
    Attached to logic_nodes so the 3D UI can render source overlays.
    """
    source_id: str                                  # Stable ID for the 3D node link
    source_text: str                                # Verbatim excerpt or summary
    relevance_score: float = Field(ge=0.0, le=1.0) # How well it matches the query
    source_url: Optional[str] = None               # Optional deep link for the UI


class GroundingBundle(BaseModel):
    """
    The full grounding package injected into an agent's Round 1 prompt.
    Contains the formatted text block AND structured citations for validation.
    """
    formatted_block: str
    citations: List[Citation]
    memory_depth: int = 0  # Count of Backboard-retrieved facts (shown in UI)


# ─────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────

BACKBOARD_BASE_URL = "https://app.backboard.io/api"
THREAD_ID_FILE     = Path(__file__).parent / ".backboard_thread_id"


# ─────────────────────────────────────────────────────────────
# Memory Service
# ─────────────────────────────────────────────────────────────

class MemoryService:
    """
    Async evidence retriever backed by Backboard.io persistent threads.
    Falls back to an in-memory mock corpus if the API is unavailable.
    """

    def __init__(self) -> None:
        self._api_key     = os.environ.get("BACKBOARD_API_KEY", "")
        self._thread_id   : Optional[str] = None
        self._client      : Optional[httpx.AsyncClient] = None

        # Load previously stored thread_id (survives server restarts)
        if THREAD_ID_FILE.exists():
            stored = THREAD_ID_FILE.read_text().strip()
            if stored:
                self._thread_id = stored
                print(f"  [BACKBOARD] Resuming thread: {self._thread_id}")

    # ── Public Interface ──────────────────────────────────────

    async def retrieve_context(self, query: str) -> GroundingBundle:
        """
        Fetches grounding context for the given query.
        Priority: Backboard thread history → mock corpus (fallback).
        """
        if self._api_key:
            try:
                citations = await self._backboard_retrieve(query)
                if citations:
                    print(f"  [BACKBOARD] Retrieved {len(citations)} memory facts.")
                    formatted = self._format_block(citations)
                    return GroundingBundle(
                        formatted_block=formatted,
                        citations=citations,
                        memory_depth=len(citations),
                    )
            except Exception as exc:
                print(f"  [BACKBOARD] Retrieval failed, falling back to corpus. ({exc})")

        # Fallback: local mock corpus
        citations = await self._mock_retrieve(query)
        formatted = self._format_block(citations)
        return GroundingBundle(formatted_block=formatted, citations=citations, memory_depth=0)

    async def post_agent_message(
        self,
        persona_name: str,
        round_name: str,
        decision: str,
        confidence: float,
    ) -> None:
        """
        Posts an agent's stance to the Backboard thread as a user message.
        This is the "Permanent Record" — future queries will see this history.
        """
        if not self._api_key:
            return
        try:
            await self._ensure_thread()
            content = (
                f"[SYNAPSE3D PARLIAMENT — {round_name}]\n"
                f"Agent: {persona_name}\n"
                f"Confidence: {confidence:.2f}\n"
                f"Stance: {decision}"
            )
            await self._post_message(content)
            print(f"  [BACKBOARD] Posted {persona_name} ({round_name}) stance to thread.")
        except Exception as exc:
            print(f"  [BACKBOARD] Failed to post {persona_name} stance. ({exc})")

    async def close(self) -> None:
        """Cleanly close the httpx client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    # ── Backboard API Integration ─────────────────────────────

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=BACKBOARD_BASE_URL,
                headers={
                    "X-API-Key": self._api_key,
                    "Content-Type": "application/json",
                },
                timeout=15.0,
            )
        return self._client

    async def _ensure_thread(self) -> str:
        """
        Returns the active thread_id. Auto-creates one on first call and
        persists it to disk so the same thread survives server restarts.
        """
        if self._thread_id:
            return self._thread_id

        print("  [BACKBOARD] No thread ID found. Creating a new parliament thread...")
        client = self._get_client()
        resp = await client.post(
            "/threads/messages",
            json={
                "content": (
                    "Synapse3D Parliament has been initialized. "
                    "This thread will record all agent stances and judgments for stateful reasoning."
                ),
                "stream": False,
                "memory": "Auto",
            },
        )
        resp.raise_for_status()
        data = resp.json()
        self._thread_id = data.get("thread_id")
        if not self._thread_id:
            raise ValueError(f"Backboard did not return a thread_id. Response: {data}")

        # Persist for future restarts
        THREAD_ID_FILE.write_text(self._thread_id)
        print(f"  [BACKBOARD] New thread created and saved: {self._thread_id}")
        return self._thread_id

    async def _post_message(self, content: str) -> dict:
        """Posts a user message to the active Backboard thread."""
        thread_id = await self._ensure_thread()
        client = self._get_client()
        resp = await client.post(
            "/threads/messages",
            json={
                "content": content,
                "thread_id": thread_id,
                "stream": False,
                "memory": "Auto",
            },
        )
        resp.raise_for_status()
        return resp.json()

    async def _backboard_retrieve(self, query: str) -> List[Citation]:
        """
        Reads the Backboard thread history and maps past agent messages
        to Citation objects for use as grounding knowledge.
        """
        thread_id = await self._ensure_thread()
        client = self._get_client()

        resp = await client.get(f"/threads/{thread_id}")
        resp.raise_for_status()
        data = resp.json()

        messages: list[dict] = data.get("messages", [])
        if not messages:
            return []

        citations: List[Citation] = []
        query_lower = query.lower()

        for msg in messages[-20:]:  # Use most recent 20 messages max
            content: str = msg.get("content", "")
            role: str    = msg.get("role", "")
            msg_id: str  = msg.get("id", f"bb-{len(citations)}")

            if not content or len(content) < 20:
                continue

            # Score relevance by keyword overlap with query
            words       = set(re.findall(r"\w+", query_lower))
            msg_words   = set(re.findall(r"\w+", content.lower()))
            overlap     = len(words & msg_words)
            relevance   = min(0.5 + (overlap * 0.08), 1.0)

            # Label the source
            if "[SYNAPSE3D PARLIAMENT" in content:
                source_id = f"BB-PARLIAMENT-{msg_id}"
                label     = "Synapse3D Parliament Memory"
            elif role == "assistant":
                source_id = f"BB-ASSIST-{msg_id}"
                label     = "Backboard Assistant Memory"
            else:
                source_id = f"BB-USER-{msg_id}"
                label     = "Parliament Session Record"

            citations.append(Citation(
                source_id=source_id,
                source_text=f"[{label}] {content[:400]}",
                relevance_score=round(relevance, 2),
                source_url=f"https://app.backboard.io/threads/{thread_id}",
            ))

        # Sort by relevance, cap at 5
        citations.sort(key=lambda c: c.relevance_score, reverse=True)
        return citations[:5]

    # ── Fallback: Mock Corpus ─────────────────────────────────

    _CORPUS: dict[str, list[Citation]] = {
        "performance": [
            Citation(
                source_id="IEEE-2025-ARCH-001",
                source_text="Sequential bottlenecking in multi-agent LLM systems increases time-to-first-byte by 380–430% compared to parallelised scatter-gather patterns.",
                relevance_score=0.96,
                source_url="https://ieeexplore.ieee.org/document/2025-arch-001"
            ),
            Citation(
                source_id="AWS-WHITEPAPER-2024",
                source_text="Async orchestration with asyncio.gather reduces p99 UI stutter by 4× and enables real-time fractal streaming without blocking the event loop.",
                relevance_score=0.91,
                source_url="https://aws.amazon.com/whitepapers/async-ai-infra"
            ),
        ],
        "ethics": [
            Citation(
                source_id="NIST-AI-RMF-2024",
                source_text="Erasing minority objections from AI consensus models produces systematic bias cascades measurable within 3–5 inference cycles in adversarial benchmarks.",
                relevance_score=0.94,
                source_url="https://www.nist.gov/system/files/documents/2024/ai-rmf"
            ),
            Citation(
                source_id="EU-AI-ACT-2026-ART-13",
                source_text="High-risk AI UI components must expose a quantified uncertainty score and preserve dissenting agent views for end-user auditability (Article 13, EU AI Act 2026).",
                relevance_score=0.92,
                source_url="https://artificialintelligenceact.eu/article/13"
            ),
        ],
        "risk": [
            Citation(
                source_id="OWASP-LLM-TOP10-2025",
                source_text="Prompt-injected consensus herding (LLM07) is the primary vector for silent AI system takeover in multi-agent debate architectures without divergence forcing.",
                relevance_score=0.95,
                source_url="https://owasp.org/www-project-top-10-for-large-language-model-applications"
            ),
            Citation(
                source_id="MIT-CSAIL-SYCOPHANCY-2024",
                source_text="LLMs default to sycophantic agreement in 73% of unconstrained peer-review loops. Explicit disagreement mandates in system prompts reduce this to 18%.",
                relevance_score=0.97,
                source_url="https://arxiv.org/abs/2024.csail.sycophancy"
            ),
        ],
        "general": [
            Citation(
                source_id="ARXIV-MAD-2023",
                source_text="Multi-Agent Debate (Du et al., 2023) improves factual accuracy on MMLU by 12.3% and reduces hallucination rates by 28% compared to single-agent prompting across 4 benchmarks.",
                relevance_score=0.98,
                source_url="https://arxiv.org/abs/2305.14325"
            ),
        ]
    }

    async def _mock_retrieve(self, query: str) -> List[Citation]:
        """Keyword-based mock retrieval. Simulates 200ms network latency."""
        await asyncio.sleep(0.2)
        q = query.lower()
        gathered: List[Citation] = []

        if any(kw in q for kw in ("fast", "performance", "parallel", "latency", "throughput")):
            gathered.extend(self._CORPUS["performance"])
        if any(kw in q for kw in ("safe", "bias", "privacy", "ethics", "human", "fair")):
            gathered.extend(self._CORPUS["ethics"])
        if any(kw in q for kw in ("break", "hack", "risk", "attack", "fail", "vuln")):
            gathered.extend(self._CORPUS["risk"])

        gathered.extend(self._CORPUS["general"])

        seen: set[str] = set()
        unique: List[Citation] = []
        for c in sorted(gathered, key=lambda x: x.relevance_score, reverse=True):
            if c.source_id not in seen:
                seen.add(c.source_id)
                unique.append(c)
            if len(unique) >= 5:
                break
        return unique

    # ── Prompt Formatter ──────────────────────────────────────

    @staticmethod
    def _format_block(citations: List[Citation]) -> str:
        if not citations:
            return "[GROUNDING_KNOWLEDGE]: No relevant evidence retrieved.\n"

        lines = [
            "╔══════════════════════════════════════════════╗",
            "║         [GROUNDING_KNOWLEDGE BLOCK]          ║",
            "║  Cite source_id in logic_nodes or your       ║",
            "║  node weight will be de-weighted by the      ║",
            "║  Judge under Law 3 — Evidentiary Grounding.  ║",
            "╚══════════════════════════════════════════════╝",
        ]
        for c in citations:
            lines.append(
                f"\n[{c.source_id}] (relevance={c.relevance_score:.2f})\n"
                f"  TEXT: {c.source_text}\n"
                f"  URL:  {c.source_url or 'N/A'}"
            )
        lines.append("\n═══ END GROUNDING KNOWLEDGE ═══")
        return "\n".join(lines)
