"""
memory_service.py — The Synapse3D Evidence & Grounding Layer.

Provides an asynchronous retriever that fetches evidence citations from a
Vector DB or the Sponsor Memory API. Agents use these to anchor their
logic_nodes in reality, preventing unchecked hallucination.

SWAP POINT: Replace the `_mock_retrieve` method body with a real
Pinecone/ChromaDB/Sponsor API call without touching any other module.
"""

from __future__ import annotations
import asyncio
from typing import List, Optional
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


# ─────────────────────────────────────────────────────────────
# Memory Service
# ─────────────────────────────────────────────────────────────

class MemoryService:
    """
    Async evidence retriever. Acts as a modular bridge to any Vector DB
    or Sponsor Memory API. Swap `_mock_retrieve` for a real client call.
    """

    # ── Simulated Knowledge Corpus ────────────────────────────
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

    # ── Public Interface ──────────────────────────────────────

    async def retrieve_context(self, query: str) -> GroundingBundle:
        """
        Asynchronously retrieves a GroundingBundle for the given query.

        SWAP POINT: Replace `_mock_retrieve` with:
          - `self._pinecone_retrieve(query)` for Pinecone
          - `self._chroma_retrieve(query)` for ChromaDB
          - `self._sponsor_api_retrieve(query)` for the Sponsor Memory API
        """
        citations = await self._mock_retrieve(query)
        formatted = self._format_block(citations)
        return GroundingBundle(formatted_block=formatted, citations=citations)

    # ── Private Retrieval Backend (Stub) ─────────────────────

    async def _mock_retrieve(self, query: str) -> List[Citation]:
        """
        Keyword-based mock retrieval. Simulates 200ms network latency.
        Returns up to 4 citations ranked by relevance_score.
        """
        await asyncio.sleep(0.2)   # Simulate I/O

        q = query.lower()
        gathered: List[Citation] = []

        if any(kw in q for kw in ("fast", "performance", "parallel", "latency", "throughput")):
            gathered.extend(self._CORPUS["performance"])

        if any(kw in q for kw in ("safe", "bias", "privacy", "ethics", "human", "fair")):
            gathered.extend(self._CORPUS["ethics"])

        if any(kw in q for kw in ("break", "hack", "risk", "attack", "fail", "vuln")):
            gathered.extend(self._CORPUS["risk"])

        # Always include the canonical MAD paper as a baseline
        gathered.extend(self._CORPUS["general"])

        # De-duplicate by source_id, sort by relevance descending, cap at 5
        seen: set[str] = set()
        unique: List[Citation] = []
        for c in sorted(gathered, key=lambda x: x.relevance_score, reverse=True):
            if c.source_id not in seen:
                seen.add(c.source_id)
                unique.append(c)
            if len(unique) >= 5:
                break

        return unique

    # ── SWAP POINT: Pinecone ──────────────────────────────────
    # async def _pinecone_retrieve(self, query: str) -> List[Citation]:
    #     import pinecone
    #     index = pinecone.Index("synapse3d-memory")
    #     results = index.query(vector=embed(query), top_k=5, include_metadata=True)
    #     return [Citation(source_id=r.id, source_text=r.metadata["text"],
    #                      relevance_score=r.score) for r in results.matches]

    # ── SWAP POINT: Sponsor Memory API ───────────────────────
    # async def _sponsor_api_retrieve(self, query: str) -> List[Citation]:
    #     import httpx
    #     async with httpx.AsyncClient() as client:
    #         resp = await client.post(SPONSOR_API_URL, json={"query": query})
    #     return [Citation(**item) for item in resp.json()["results"]]

    # ── Prompt Formatter ──────────────────────────────────────

    @staticmethod
    def _format_block(citations: List[Citation]) -> str:
        """
        Formats citations into the strict [GROUNDING_KNOWLEDGE] block
        injected into every agent's Round 1 prompt. The agent is instructed
        to reference these source_ids inside its logic_nodes.
        """
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
