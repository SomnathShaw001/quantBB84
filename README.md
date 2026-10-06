# BB84 Quantum Key Distribution Simulator & Research Workbench

An authoritative, full-stack quantum cryptography laboratory and interactive research instrument modeling the **Bennett-Brassard 1984 (BB84)** Quantum Key Distribution protocol. Backed by **IBM Qiskit Aer** (Clifford stabilizer simulation), this workbench implements the complete quantum physical layer, noisy fibre transmission, Eve intercept-resend eavesdropping, 4-pass Cascade error correction with backtracking, Toeplitz universal hashing privacy amplification, and an OTP Vernam cipher demonstration.

Built strictly under the **Physics Lab Notebook / Research Instrument** design direction (zero AI slop, no glow/gradients, high-density scientific typography, meaning-encoded palettes).

---


## Theoretical Foundations

### 1. Quantum State Preparation & Transmission (Bennett & Brassard, 1984)
Alice generates independent uniform random bits $b_A \in \{0, 1\}$ and bases $a \in \{Z, X\}$. Photons are prepared into non-orthogonal quantum states:
- **Rectilinear ($Z$, $+$):** $0 \rightarrow |0\rangle$, $1 \rightarrow |1\rangle$
- **Diagonal ($X$, $\times$):** $0 \rightarrow |+\rangle = \frac{|0\rangle + |1\rangle}{\sqrt{2}}$, $1 \rightarrow |-\rangle = \frac{|0\rangle - |1\rangle}{\sqrt{2}}$

### 2. The No-Cloning Theorem & Eve's Disturbance (Wootters & Zurek, 1982)
An unknown quantum state cannot be cloned identically. When an eavesdropper (**Eve**) intercepts a flying qubit:
1. Eve must measure in an independently chosen basis $e \in \{Z, X\}$.
2. Because Eve does not know Alice's basis, Eve chooses the wrong basis 50% of the time: $P(\text{mismatch}) = 0.5$.
3. Matching basis $\rightarrow$ state preserved, measurement deterministic ($0\%$ error).
4. Mismatched basis $\rightarrow$ state collapses onto Eve's basis. When Bob subsequently measures in Alice's basis, Bob experiences a 50% probability of error.
5. Overall expected Quantum Bit Error Rate (QBER) on sifted qubits under 100% interception:
   $$Q = 0.5 \times 0\% + 0.5 \times 50\% = 25\%$$

### 3. Shor-Preskill Asymptotic Security Bound
The distillable secret key fraction $R(Q)$ under one-way classical postprocessing is bounded by:
$$R(Q) = \max\left(0, 1 - 2 h_2(Q)\right)$$
where $h_2(p) = -p \log_2(p) - (1-p) \log_2(1-p)$ is the binary Shannon entropy.
- When $h_2(Q) = 0.5$, solving numerically yields **$Q_{\text{crit}} \approx 11.0\%$**.
- Above $11.0\%$, the mutual information between Alice and Bob drops below the mutual information between Alice and Eve ($I(A:B) < I(A:E)$), making information-theoretic privacy amplification impossible. The protocol unconditionally **ABORTS**.

---

## Architectural Highlights

### 1. Authoritative IBM Qiskit Aer Engine
- Simulates Pauli eigenstates using `AerSimulator(method="stabilizer")`, running over **2,000 qubits/sec**.
- No client-side pseudo-quantum approximations: every measurement outcome, projection collapse, and circuit is computed authoritatively in Python.
- Physical noise modeling: Pauli depolarizing noise, bit-flip channel noise, and Poisson/binomial photon loss.

### 2. Complete Postprocessing Pipeline
- **Sifting:** Compares public bases; discards mismatches (~50% retention).
- **Parameter Estimation:** Sacrifices a random $k$-bit sample to empirically measure $Q = \text{errors} / k$.
- **True 4-Pass Cascade Error Correction:** Multi-pass binary parity search with recursive bidirectional backtracking to eliminate even-parity error pairs.
- **Privacy Amplification:** Toeplitz universal hash matrix multiplication compressing the corrected key by:
  $$m = n(1 - h_2(Q)) - \text{leakage}_{\text{Cascade}} - s$$
  eliminating Eve's Renyi information.
- **One-Time-Pad Vernam Cipher:** Demonstrates mathematical perfect secrecy by encrypting user plaintext with the distilled key.

---



## Repository Structure

```
├── .catalystignore       # Zoho Catalyst deployment ignore list
├── .catalystrc           # Zoho Catalyst project identity configuration
├── .env.example          # Environment variable template
├── .gitignore            # Git exclusion rules
├── app-config.json       # Catalyst AppSail configuration
├── catalyst.json         # Catalyst project component definition
├── Dockerfile            # Production OCI container definition
├── main.py               # Root application entry point for AppSail & Uvicorn
├── requirements.txt      # Core runtime dependencies
├── requirements-dev.txt  # Testing & development dependencies
├── pytest.ini            # Pytest configuration
├── backend/
│   ├── main.py           # FastAPI server & static frontend mount
│   ├── storage.py        # SQLite simulation persistence layer
│   ├── report_pdf.py     # ReportLab publication-grade PDF report compiler
│   ├── api/
│   │   ├── routes.py     # Endpoints (/api/simulate, /api/sweep, /api/circuit, etc.)
│   │   └── schemas.py    # Pydantic validation models
│   ├── bb84/
│   │   ├── alice.py      # Random bit/basis generation & state encoding
│   │   ├── channel.py    # Physical noise, depolarizing & loss models
│   │   ├── eve.py        # Intercept-resend eavesdropping strategies
│   │   ├── bob.py        # Detection & receiver measurement
│   │   ├── sim.py        # Qiskit Aer Clifford stabilizer batch runner
│   │   ├── postprocess.py# Cascade EC, Toeplitz universal hashing, OTP
│   │   ├── theory.py     # Analytical formulas & bound calculations
│   │   └── circuits.py   # Qiskit circuit reconstruction & ASCII exports
│   └── tests/            # Test suite (31 tests, 99% coverage on bb84 engine)
├── frontend/
│   ├── index.html        # SPA workbench markup with route markers
│   ├── css/
│   │   ├── tokens.css    # Scientific design tokens (colors, typography, rules)
│   │   └── workbench.css # Lab layout, ledger, key funnel, charts, print rules
│   └── js/
│       ├── api.js        # Backend HTTP client
│       ├── app.js        # Controller, SPA hash router, deep linking
│       ├── channel.js    # Optical fibre transit & photon animator
│       ├── ledger.js     # Measurement ledger table manager
│       └── charts.js     # SVG charts, polarization dial, Shor-Preskill curve
├── docs/                 # Detailed academic documentation
└── scripts/              # UI design gate & live verification scripts
    ├── ui_gate.py        # Automated Anti-AI Slop design validator
    └── verify_live.py    # Live endpoint test harness
```

---

## Configuration & Environment Variables

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `PORT` | `8000` | Local HTTP server port |
| `X_ZOHO_CATALYST_LISTEN_PORT` | `8000` | Dynamic port injected by Zoho Catalyst AppSail |
| `ENVIRONMENT` | `development` | Runtime environment (`development` or `production`) |
| `PYTHONUNBUFFERED` | `1` | Ensures real-time stdout/stderr logging |
| `DATABASE_PATH` | `simulations.db` | SQLite database file for simulation storage |
| `CORS_ALLOW_ORIGINS` | `*` | Allowed CORS origins (comma-separated) |
| `DEFAULT_N_QUBITS` | `256` | Default qubit transmission count |
| `DEFAULT_QBER_THRESHOLD` | `0.11` | Security abort threshold ($11\%$) |
| `DEFAULT_SAMPLE_FRACTION`| `0.25` | Parameter estimation sacrifice fraction |

---

## Quick Start

### 1. Environment Setup
```bash
# Clone the repository
git clone https://github.com/SomnathShaw001/quantBB84.git
cd quantBB84

# Create and activate Python virtual environment (Python 3.10 - 3.12 recommended)
python -m venv .venv
# On Windows:
.\.venv\Scripts\activate
# On Linux / macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

### 2. Launch Local Server
```bash
python main.py
```
Or with Uvicorn directly:
```bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
Open **[http://localhost:8000](http://localhost:8000)** in your browser.

---

## Running Tests & Design Validation

### 1. Pytest Test Suite
Execute the test suite to verify physical mechanics, stabilizer simulation, error correction, and API endpoints:
```bash
pytest --cov=backend/bb84
```
**Result:** 31 tests passing across Alice, Channel, Eve, Bob, Cascade, Toeplitz, Circuits, and API routes.

### 2. Automated UI Design Gate
To enforce the strict **Physics Lab Notebook / Research Instrument** aesthetic:
```bash
python scripts/ui_gate.py frontend
```
**Result:** `ui_gate: 0 issue(s) in frontend` (validates no purple/blue gradients, no neon glow, no glassmorphism, 1px rules, max 4px border radii).

### 3. Live Endpoint Verification
```bash
python scripts/verify_live.py
```

---

## License & Attribution
Academic and research simulator developed for quantum cryptography instruction. Core quantum stabilizer simulation powered by IBM Qiskit.
