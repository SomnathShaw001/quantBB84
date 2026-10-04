# PROGRESS — BB84 Quantum Key Distribution Simulator

## Phase 0 — Setup & UI Guardrail Skill ✅
- Created `.agents/skills/no-ai-look-ui/SKILL.md` enforcing the Physics Lab Notebook aesthetic.
- Banned AI website archetypes (glassmorphism, purple/blue gradients, glow effects, oversized radii).
- Implemented `scripts/ui_gate.py` scanner. Zero violations in frontend.
- Pinned runtime dependencies in `requirements.txt` and dev packages in `requirements-dev.txt`.

## Phase 1 — Quantum Core Engine (`backend/bb84/`) ✅
- Implemented `alice.py`, `channel.py`, `eve.py`, `bob.py`, `sim.py`, `protocol.py`.
- Quantum simulation backed by Qiskit Aer (`AerSimulator(method="stabilizer")`).
- Multi-qubit batching into 64-qubit circuits for sub-second execution across thousands of qubits.
- Physical noise model applying Pauli errors directly to channel `id` gates, plus photon loss sampling.

## Phase 2 — Classical Postprocessing Pipeline ✅
- **Sifting:** Reconciliation of basis choices.
- **Parameter Estimation:** Random sample sacrifice calculating QBER.
- **Cascade Error Correction:** 4-pass multi-layer binary search parity reconciliation with bidirectional backtracking and public leak accounting.
- **Privacy Amplification:** Toeplitz matrix universal hashing ($m \times n$ mod 2 matrix multiplication).
- **Verification & OTP Demo:** Cryptographic SHA-256 verification and Vernam OTP XOR encryption demo.
- **Theory Engine:** Asymptotic Shor-Preskill key rate and theoretical QBER formulas.

## Phase 3 — Backend API & Persistence (`backend/api/`) ✅
- FastAPI asynchronous endpoints: `/api/simulate`, `/api/step`, `/api/sweep`, `/api/compare`, `/api/circuit/:id/:q`, `/api/simulations`, `/api/report.pdf`.
- SQLite storage repository (`backend/storage.py`) with unified interface ready for Zoho Catalyst Data Store.
- Server-side academic PDF report compilation (`backend/report_pdf.py`) via ReportLab.
- Single unified deployment: FastAPI serves API endpoints under `/api` and mounts `frontend/` on `/`.

## Phase 4 — Design System & Tokens (`frontend/css/`) ✅
- `frontend/css/tokens.css` with semantic meaning-encoded palette (`#1B1B1B` Z-basis, `#B7791F` X-basis, `#C2410C` Eve/Error, `#2F6B3A` Match).
- Strict 4px max border-radius.
- Crisp 1px hairline rules and paper substrate tones.
- Passed `ui_gate.py` with 0 issues.

## Phase 5 — Interactive Laboratory Workbench (`frontend/`) ✅
- 3-column asymmetric layout: Control Console (left), Channel Stage & Funnel (center), Live Ledger (right).
- Flying polarization glyph animation along physical optical fiber line.
- Sortable and filterable measurement ledger table.
- Interactive Qiskit Circuit Inspector drawer showing Alice preparation, Eve interception, and Bob detection circuits.
- Stage-by-stage bit degradation funnel (`Raw → Matched → Test → Sifted → Corrected → Final`).
- Verdict diagnostic with plain-language explanation without false security claims.

## Phase 6 — Experiments Suite & Advanced Visualizations ✅
- Empirical sweeps: $Q$ vs. Eve Interception Fraction rendered in clean SVG with theoretical reference lines.
- Parallel batch comparison: Eve OFF vs. Eve ON side-by-side distribution.
- History list with one-click reload of past simulations.
- Multi-format exports: PDF, JSON, and CSV.

## Phase 7 — Educational Layer & Polish ✅
- Multi-step protocol explainer with mathematical state definitions.
- Viva examination guide with 4 fundamental academic defense questions & answers.
- Documented simulator boundaries in `docs/limitations.md`.

## Phase 8 — Testing & Quality Assurance ✅
- 31 automated tests in `backend/tests/` covering unit components, multi-seed statistical convergence, Cascade corrections, API routing, and PDF generation.
- 99% statement coverage on quantum engine.
- Live server verified using `scripts/verify_live.py`.

## Phase 9 — Deployment Preparation (Zoho Catalyst AppSail) ✅
- `app-config.json` configured for AppSail with dynamic `$X_ZOHO_CATALYST_LISTEN_PORT`.
- Containerized Linux `Dockerfile` for custom container AppSail deployment.
- Deployment runbook documented in `docs/deploy.md`.

## Phase 10 — Academic Documentation ✅
- Complete documentation suite created: `README.md`, `docs/physics.md`, `docs/architecture.md`, `docs/design.md`, `docs/database.md`, `docs/deploy.md`, `docs/limitations.md`.
