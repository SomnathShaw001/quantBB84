# BB84 Quantum Key Distribution Simulator & Research Workbench

An interactive quantum communication simulator demonstrating the **BB84 Quantum Key Distribution (QKD)** protocol, backed by **Python** and **IBM Qiskit Aer**, with an interactive web workbench adhering strictly to the **Physics Lab Notebook / Research Instrument** design direction.

---

## Key Features

1. **Authoritative Quantum Simulation (Qiskit Aer):**
   - True quantum circuit state preparation ($X$ and $H$ gates), transmission through an optical channel, Eve interception with basis collapse, and Bob receiver measurement.
   - Clifford stabilizer simulation via `AerSimulator(method="stabilizer")`, achieving over 2,000 qubits simulated per second.
   - Physical noise model applying Pauli depolarizing and bit-flip errors directly to transit $I$ gates, plus photon loss sampling.

2. **Complete Cryptographic Postprocessing:**
   - **Sifting:** Retains matching-basis positions (~50%).
   - **Parameter Estimation:** Publicly sacrifices a random test sample to compute Quantum Bit Error Rate (QBER).
   - **Cascade Error Correction:** Four-pass multi-layer binary search parity correction with bidirectional backtracking.
   - **Privacy Amplification:** Toeplitz matrix universal hashing compressing keys by $m = n(1 - h_2(Q)) - \text{leak}_{\text{EC}} - \text{safety}$.
   - **One-Time-Pad Vernam Demo:** Encrypts user plaintext with distilled quantum keys.

3. **Interactive Research Instrument Interface:**
   - Physical channel visualization with flying polarization photon glyphs (`|`, `—`, `╱`, `╲`) and Eve tap illumination.
   - Live sortable and filterable measurement ledger table.
   - Interactive Qiskit Circuit Inspector drawer revealing individual preparation, interception, and detection circuits.
   - Empirical parameter sweeps ($Q$ vs. Eve interception %, Key Rate vs. $Q$) and parallel batch comparative charts rendered in clean SVG.
   - Automated server-side PDF report compilation via ReportLab.
   - Zero AI slop: no purple/blue gradients, no neon glow, no glassmorphism, 1px rules, strictly capped 4px border radii.

---

## Quick Start

### 1. Installation
```bash
python -m venv .venv
.\.venv\Scripts\activate   # Windows (or: source .venv/bin/activate on Linux/macOS)
pip install -r requirements.txt
pip install -r requirements-dev.txt   # Optional for running tests
```

### 2. Run Tests
```bash
pytest --cov=backend/bb84
```
All 31 unit, statistical, and API integration tests pass with 99% coverage.

### 3. Launch Web Workbench
```bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```
Navigate to [http://localhost:8000](http://localhost:8000) in your browser.

---

## Design System & UI Guardrail
This repository includes a strict project-level design gate:
```bash
python scripts/ui_gate.py frontend
```
This script audits all HTML, CSS, and JS against banned design antipatterns (AI purple palettes, glowing text, glassmorphism, oversized border radii), enforcing the Physics Lab Notebook aesthetic.

---

## Project Structure
```
├── backend/
│   ├── bb84/             # Quantum simulation core & postprocessing
│   │   ├── alice.py      # Random bit/basis generation & encoding
│   │   ├── channel.py    # Noise models & photon loss
│   │   ├── eve.py        # Intercept-resend attack logic
│   │   ├── bob.py        # Receiver measurement
│   │   ├── sim.py        # Batched Qiskit Aer stabilizer runner
│   │   ├── postprocess.py# Sifting, Cascade EC, Toeplitz PA, OTP
│   │   ├── theory.py     # Theoretical predictions (QBER, Key Rate)
│   │   └── circuits.py   # Circuit reconstruction for inspector
│   ├── api/              # FastAPI routes & Pydantic schemas
│   ├── storage.py        # Experiment database persistence
│   ├── report_pdf.py     # Server-side ReportLab PDF generator
│   └── main.py           # Application entrypoint
├── frontend/             # Single-page web workbench
│   ├── index.html        # Academic workbench markup
│   ├── css/              # tokens.css & workbench.css
│   └── js/               # api.js, channel.js, ledger.js, charts.js, app.js
├── docs/                 # Academic documentation & guides
│   ├── physics.md        # Mathematical derivations
│   ├── architecture.md   # Mermaid system architecture
│   ├── design.md         # Design system & tokens
│   ├── database.md       # Persistence schema
│   ├── deploy.md         # Zoho Catalyst deployment guide
│   └── limitations.md    # Physical simulator boundaries
├── scripts/              # UI quality gate & verification scripts
└── PROGRESS.md           # Phase-by-phase completion log
```

---

## License & Attribution
Educational research simulator. Simulation logic backed by IBM Qiskit.
