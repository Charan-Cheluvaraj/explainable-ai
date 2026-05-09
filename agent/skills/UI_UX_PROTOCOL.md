# 🧬 Dynamic Anomaly: Advanced UI/UX Protocol

This document defines the high-fidelity design standards and specialized toolchain for the Synapse3D project. It serves as a persistent loadable instruction set for AI-assisted development.

## 🧬 Core Frameworks & Scaffolding

### Google Stitch
*   **Purpose**: AI-native design canvas for generating high-fidelity UI prototypes and systems.
*   **Usage**: Access via mcp or [Stitch](https://stitch.withgoogle.com/). Relies on a `DESIGN.md` file in the repo root for context.
*   **Integration**: Export code directly into the component architecture.

### Leonxlnx/Taste (Design Tokens)
*   **Purpose**: Specialized design skill for premium tokens (OKLCH colors, tinted neutrals) and "anti-slop" rules.
*   **Install**: `npx skills add Leonxlnx/taste-skill`
*   **Principle**: Avoid browser-default colors; use curated, harmonious palettes.

---

## 🛠️ Layout & Technical Quality

### pbakaus/impeccable
*   **Purpose**: Created by Paul Bakaus (jQuery UI) to diagnose layout jank and enforce sub-pixel rendering accuracy.
*   **Install**: `npx skills add pbakaus/impeccable`
*   **Key Commands**:
    *   `/impeccable craft`: For full "shape-then-build" flows.
    *   `/impeccable polish`: For final layout stabilization passes.

---

## 🌪️ Motion & Interaction

### @fiddle-digital/string-tune
*   **Purpose**: High-performance runtime for scroll-driven and cursor-linked motion.
*   **Install**: `npm install @fiddle-digital/string-tune`
*   **Usage**: Attribute-based system (e.g., `string="progress"`, `string-id="hero"`). Initialize via `StringTune.getInstance()`.

### Emil Kowalski Spring Curves
*   **Philosophy**: Use native CSS transitions with specific cubic-bezier or spring curves for natural feel.
*   **Easing**: `transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)`.

---

## 🎨 Key Skills & Techniques

### Sub-pixel Rendering
*   Enforce layout stability via **Impeccable** to prevent sub-pixel rounding jank (common in complex CSS transforms).

### Magnetic Focus (Spotlight)
*   Implemented via **StringTune**, where elements subtly "pull" toward the cursor or respond to proximity.

### rAF Synchronization
*   All scroll-linked or cursor-based effects must be orchestrated via `requestAnimationFrame` for 60fps+ smoothness and battery efficiency.

---

## 🚀 Future Reference
When initiating any new UI component or refinement:
1.  Verify layout via `/impeccable polish`.
2.  Apply **Taste** design tokens for premium aesthetics.
3.  Inject **StringTune** for cinematic motion where performance is critical.
