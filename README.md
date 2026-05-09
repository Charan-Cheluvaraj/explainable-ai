# Synapse3D Parliament 🧠⚖️

**Synapse3D** is a transparent, explainable AI parliament system. It moves AI reasoning from a "black box" to a "visible, constitutional debate" where agents are anchored in evidence and constrained by safety laws.

## 🏛️ Architecture: The 3+1 Model

Synapse3D uses a multi-agent adversarial structure governed by a constitutional layer:

1.  **The Technocrat (Gemini 3.1 Flash-Lite)**: Prioritizes logic, efficiency, and engineering performance.
2.  **The Humanist (Gemini 3.1 Flash-Lite)**: Champions ethics, societal impact, and user privacy.
3.  **The Inquisitor (Gemini 3.1 Flash-Lite)**: Focuses on risk, security, and adversarial skepticism.
4.  **The Sovereign Judge (Groq/GPT-OSS)**: The final arbiter who synthesizes the debate and enforces the **Synapse Constitution**.

## ⚖️ The Synapse Constitution

The system is governed by three immutable laws of reasoning:

-   **Law 1: Ethical Primacy** — Safety/Ethics overrides efficiency. Violations are flagged and de-weighted.
-   **Law 2: Minority Visibility** — Dissenting opinions cannot be erased; they must be visible in the final state.
-   **Law 3: Evidentiary Grounding** — All high-confidence logic nodes must be backed by verifiable citations from the **Memory Layer**.

## 🧬 Visualization: 3D Fractal UI

The backend generates a specialized JSON schema (see `synapse3d_schema.ts`) designed to drive 3D fractal visualizations. 
- **Stable State**: Agents are in consensus.
- **Warning State**: Moderate tension variance (σ²).
- **Crisis State**: High tension variance; triggers red pulse animations in the 3D engine.

## 🛠️ Project Structure

- `orchestrator.py`: The high-performance FastAPI engine handling the 3-round lifecycle.
- `constitution.py`: The logic engine enforcing the Laws of Reasoning.
- `memory_service.py`: The asynchronous RAG layer for evidence retrieval.
- `synapse3d_schema.ts`: Canonical data contract for the 3D renderer.
- `agent_prompts.md`: High-intensity system prompts for all agent personas.

## 🚀 Getting Started

1. Set your API keys:
   ```bash
   export GEMINI_API_KEY="your_key"
   export GROQ_API_KEY="your_key"
   ```
2. Install dependencies:
   ```bash
   pip install fastapi pydantic google-generativeai httpx
   ```
3. Run the orchestrator:
   ```bash
   uvicorn orchestrator:app --reload
   ```

---
*Built for the future of Explainable AI (XAI).*
