"""BB84 Quantum Key Distribution simulation engine (Python + Qiskit Aer).

The authoritative protocol logic lives here. The web UI only visualises the
results produced by this package.
"""

from .protocol import SimConfig, EveConfig, NoiseConfig, run_simulation

__all__ = ["SimConfig", "EveConfig", "NoiseConfig", "run_simulation"]
