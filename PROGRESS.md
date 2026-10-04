# PROGRESS

## Phase 0 — Setup & UI guardrail ✅
- `.agents/skills/no-ai-look-ui/SKILL.md`: banned list, lab-notebook tokens, quality gate
- `scripts/ui_gate.py`: automated banned-pattern scanner
- venv, pinned `requirements.txt` / `requirements-dev.txt`, git repo

## Phase 1 — Quantum engine ✅
- `backend/bb84/`: alice, eve, channel, bob, sim, protocol, circuits
- Real Qiskit Aer (stabilizer method) measurements; 64 qubits per circuit, one shot
- Noise via an Aer `NoiseModel` on the channel `id` gate; photon loss sampled per photon
- Seeded and reproducible (tested)

## Phase 2 — Post-processing ✅
- Sifting, sampled QBER estimation, abort threshold
- Real Cascade error correction (4 passes, backtracking), with leak accounting
- Toeplitz privacy amplification (m = n(1−h(Q)) − leak − 8)
- SHA-256 verification, one-time-pad demo, Eve's guess of the final key
- Theory: expected QBER, key rate

**Tests:** 25 passed, 99% coverage on `bb84/`.
Statistical checks: mean QBER over 30 seeds is ≈ 25% for every Eve strategy, ≈ 10% for 40% interception, and noise matches theory.

**Next:** Phase 3 API.
