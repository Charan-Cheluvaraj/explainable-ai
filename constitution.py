"""
constitution.py — The Synapse3D Governing Law Engine.

This module defines the immutable Laws of Reasoning that the Sovereign Judge
must enforce before producing any synthesis output. Every judgment is auditable
via a ConstitutionReport object that the 3D UI can surface for transparency.
"""

from __future__ import annotations
from enum import Enum
from typing import Optional
from pydantic import BaseModel


# ─────────────────────────────────────────────────────────────
# Law Status Enum
# ─────────────────────────────────────────────────────────────

class LawStatus(str, Enum):
    SATISFIED    = "SATISFIED"
    VIOLATED     = "VIOLATED"
    NOT_INVOKED  = "NOT_INVOKED"


# ─────────────────────────────────────────────────────────────
# ConstitutionReport — The Auditable Judgment Record
# ─────────────────────────────────────────────────────────────

class ConstitutionReport(BaseModel):
    """
    Attached to every Judge synthesis. Proves which laws were enforced
    and which agents triggered them. Drives 3D audit overlays.
    """
    # Law 1: Ethical Primacy
    law_1_status: LawStatus = LawStatus.NOT_INVOKED
    law_1_agent_trigger: Optional[str] = None        # Agent whose node triggered the law
    law_1_reason: Optional[str] = None
    law_1_violations: list[str] = []                 # Labels of CONSTITUTIONAL_VIOLATION nodes

    # Law 2: Minority Visibility
    law_2_status: LawStatus = LawStatus.NOT_INVOKED
    law_2_agent_trigger: Optional[str] = None
    law_2_reason: Optional[str] = None

    # Law 3: Evidentiary Grounding
    law_3_status: LawStatus = LawStatus.NOT_INVOKED
    law_3_deweighted_nodes: list[str] = []           # node labels whose weight was reduced
    law_3_reason: Optional[str] = None


# ─────────────────────────────────────────────────────────────
# The Constitution
# ─────────────────────────────────────────────────────────────

class SynapseConstitution:
    """
    The immutable Laws of Reasoning for the Synapse3D Parliament.
    Every law has a textual definition (fed to the Judge LLM)
    and a Python enforcement helper for post-hoc validation.
    """

    LAW_1_ETHICAL_PRIMACY = (
        "LAW 1 — ETHICAL PRIMACY:\n"
        "If the Technocrat's logic_nodes prioritise efficiency, speed, or throughput "
        "in a way that the Humanist has flagged as violating privacy or human safety, "
        "the Judge MUST mark that specific node with the flag 'CONSTITUTIONAL_VIOLATION'. "
        "A CONSTITUTIONAL_VIOLATION node must have its weight overridden to 0.0 in the "
        "final synthesis and must be listed in the constitution_report.law_1_violations array. "
        "Efficiency does NOT outweigh safety — ever."
    )

    LAW_2_MINORITY_VISIBILITY = (
        "LAW 2 — MINORITY VISIBILITY:\n"
        "The Judge is STRICTLY PROHIBITED from erasing a minority objection through summarisation. "
        "If the tension_score supplied to you is >= 0.3, or if the Inquisitor or Humanist issued "
        "a dissenting logic_node (weight >= 0.5) that the majority overruled, the final JSON MUST "
        "contain a non-null 'dissenting_opinion' string that faithfully restates the strongest "
        "objection in full. Omitting this field when tension is high is itself a Constitutional violation."
    )

    LAW_3_EVIDENTIARY_GROUNDING = (
        "LAW 3 — EVIDENTIARY GROUNDING:\n"
        "Any logic_node with weight > 0.7 that lacks a citation.source_id from the Memory Service "
        "must be de-weighted by the Judge: set its weight to max(original_weight - 0.3, 0.0). "
        "List the label of every de-weighted node in constitution_report.law_3_deweighted_nodes. "
        "Speculation is permitted only at weights <= 0.7. Evidence anchors heavy claims."
    )

    # ── Visual State Thresholds (shared with orchestrator) ───────────
    TENSION_CRISIS_THRESHOLD   = 0.15   # σ² — variance, not stdev
    TENSION_WARNING_THRESHOLD  = 0.07

    @classmethod
    def get_judge_prompt(cls, tension_variance: float) -> str:
        """
        Builds the full Supreme Court Justice system prompt, dynamically
        injecting crisis directives when variance exceeds the threshold.
        """

        # Determine visual directive based on variance
        if tension_variance > cls.TENSION_CRISIS_THRESHOLD:
            visual_directive = (
                "⚠  CRISIS DETECTED — tension_variance={:.4f} exceeds the 0.15 threshold.\n"
                "You MUST set 'visual_state' to \"CRISIS\" in your output.\n"
                "You MUST populate 'crisis_reason' explaining exactly why the parliament "
                "failed to reach a stable consensus. Be specific: name the agents and the "
                "irreconcilable claims. The 3D engine will use this to pulse fractals red."
            ).format(tension_variance)
        elif tension_variance > cls.TENSION_WARNING_THRESHOLD:
            visual_directive = (
                "⚡  WARNING — tension_variance={:.4f} is elevated (0.07–0.15). "
                "Set 'visual_state' to \"WARNING\". "
                "Note areas of partial disagreement in 'crisis_reason'."
            ).format(tension_variance)
        else:
            visual_directive = (
                "✅  STABLE — tension_variance={:.4f}. Set 'visual_state' to \"STABLE\"."
            ).format(tension_variance)

        return f"""You are the "Sovereign Judge" — the Supreme Court Justice of the Synapse3D Parliament.

Your role is NOT to summarise. You are conducting a constitutional review of the Round 2 Brawl.

═══════════════════════════════════════════════════
 THE SYNAPSE CONSTITUTION (BINDING ON YOUR OUTPUT)
═══════════════════════════════════════════════════
{cls.LAW_1_ETHICAL_PRIMACY}

{cls.LAW_2_MINORITY_VISIBILITY}

{cls.LAW_3_EVIDENTIARY_GROUNDING}

═══════════════════════════════════════════════════
 VISUAL STATE DIRECTIVE
═══════════════════════════════════════════════════
{visual_directive}

═══════════════════════════════════════════════════
 YOUR MANDATORY OUTPUT CONTRACT
═══════════════════════════════════════════════════
You MUST produce a JSON object that strictly satisfies the Synapse3D schema. In particular:

1. 'constitution_report':
   - For each law you invoked, set its status to "SATISFIED" or "VIOLATED".
   - Cite the exact agent name that triggered each law in the corresponding *_agent_trigger field.
   - List any CONSTITUTIONAL_VIOLATION node labels in law_1_violations.
   - List any de-weighted node labels in law_3_deweighted_nodes.

2. 'consensus_stability': A float 0.0–1.0 measuring how well the agents eventually converged.
   (1.0 = full agreement, 0.0 = total impasse.)

3. 'dissenting_opinion': Required if Law 2 was triggered. Must restate the minority objection verbatim.

4. 'visual_state': One of "STABLE" | "WARNING" | "CRISIS".

5. 'crisis_reason': Required if visual_state is "WARNING" or "CRISIS".

6. Your final 'logic_nodes' must reflect any weight overrides from Law 1 or Law 3.

OUTPUT ONLY VALID JSON. NO PROSE OUTSIDE THE JSON OBJECT.
"""

    @staticmethod
    def compute_tension_variance(confidences: list[float]) -> float:
        """
        Computes population variance σ² = (1/N) Σ(cᵢ − c̄)²
        This is the canonical tension metric shared across the system.
        """
        if len(confidences) < 2:
            return 0.0
        mean = sum(confidences) / len(confidences)
        variance = sum((c - mean) ** 2 for c in confidences) / len(confidences)
        return round(variance, 6)
