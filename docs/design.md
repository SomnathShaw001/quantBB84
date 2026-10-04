# Design System & Visual Specification: BB84 Quantum Research Workbench

## 1. Visual Direction: "Physics Lab Notebook / Research Instrument"

The visual direction rejects typical AI SaaS templates (glassmorphism, neon blues/purples, glowing borders, floating blobs, rounded marketing hero sections). Instead, it adopts the aesthetic of high-precision scientific instruments and laboratory workbooks:

- **Surface & Substrate:** Warm off-white aged paper (`#F4F1EA`) with muted secondary paper tones (`#ECE7DC`).
- **Ink & Typography:** High-contrast archival ink (`#1B1B1B`) for text and computational basis; muted warm grey (`#55524B`) for metadata and annotations.
- **Strict Meaning-Encoded Accent Palette:**
  - **Z Basis (Rectilinear +):** Archival Black Ink (`#1B1B1B`)
  - **X Basis (Diagonal ×):** Ochre Raw Sienna (`#B7791F`)
  - **Eavesdropper / Disturbance / Abort / Error:** Vermilion Iron Oxide (`#C2410C`)
  - **Matching Bases / Kept Bits / Verified Key:** Deep Forest Green (`#2F6B3A`)
- **Geometry & Rules:** Clean 1px hairline rules (`#C9C2B3`), strict orthogonal grid, maximal corner radius capped strictly at **4px** (only true mathematical circles like Bloch/polarization discs may have rounded radii).
- **Typography Suite:**
  - *Headings & Titles:* **Source Serif 4** (or Georgia fallback) for academic authority.
  - *User Interface & Descriptions:* **IBM Plex Sans** (or Segoe UI / sans-serif fallback) for technical legibility.
  - *Quantum States, Bits & Numeric Ledgers:* **IBM Plex Mono** (or Consolas / monospace fallback) for tabular alignment.

## 2. Information Architecture & Layout Strategy

Asymmetric workbench layout directly confronting the user with the instrument:
1. **§1 Control Console (Left, 320px):** Experiment parameter controls, Eve tap configuration, channel noise sliders, message input, preset scenarios ("Clean Channel", "Active Eavesdropper", "Noisy Fibre").
2. **§2 Quantum Channel & Transit Visualizer (Center):** Alice optical station, physical channel line with interactive Eve tap toggle, and Bob receiver station. Real-time polarization glyphs (`|`, `—`, `╱`, `╲`).
3. **§3 Measurement Ledger & State Inspector (Right):** Dense, sortable, and filterable record of every photon transit. Clickable to inspect exact Qiskit circuits and quantum statevectors.
4. **§4 Reconciliation Pipeline & Key Funnel:** Visual stage-by-stage bit degradation funnel (`Raw → Detected → Sifted → Test Sample → Error Corrected → Final Amplified`).
5. **§5 Verdict & Disturbance Diagnostic:** Precise calculation of QBER ($Q = \text{Errors} / \text{Test Bits}$) and honest scientific interpretation without false guarantees.
6. **§6 Experiments & Empirical Sweeps:** Live parametric curves ($Q$ vs. Eve interception %, Key Rate vs. $Q$) compared directly with theoretical bounds.
7. **§7 Academic Learning & viva Guide:** Multi-step protocol explainer, interactive concept glossary, and examination Q&A.
