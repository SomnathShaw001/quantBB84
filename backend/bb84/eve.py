"""Eve: intercept-resend eavesdropping.

For every intercepted qubit Eve
1. picks a measurement basis (random, always Z, or always X),
2. measures Alice's qubit in that basis (a real Aer measurement),
3. re-prepares a fresh qubit encoding her result in *her* basis,
4. forwards it to Bob.

When Eve's basis differs from Alice's, her result is random and the qubit she
forwards is in the wrong basis, so Bob (if his basis matches Alice's) sees an
error with probability 1/2. Averaged over bases this gives the famous
QBER = 25% for full interception.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

import numpy as np

from . import alice as A
from .sim import run_one_shot

Strategy = Literal["random", "always_Z", "always_X"]


@dataclass(frozen=True)
class EveConfig:
    enabled: bool = False
    fraction: float = 1.0
    strategy: Strategy = "random"


def choose(n: int, cfg: EveConfig, rng: np.random.Generator) -> tuple[np.ndarray, np.ndarray]:
    """Return (intercepted mask, Eve bases). Bases are -1 where not intercepted."""
    if not cfg.enabled or cfg.fraction <= 0:
        return np.zeros(n, dtype=bool), np.full(n, -1, dtype=np.int8)
    intercepted = rng.random(n) < cfg.fraction
    if cfg.strategy == "always_Z":
        bases = np.full(n, A.Z, dtype=np.int8)
    elif cfg.strategy == "always_X":
        bases = np.full(n, A.X, dtype=np.int8)
    else:
        bases = rng.integers(0, 2, n, dtype=np.int8)
    bases = np.where(intercepted, bases, -1).astype(np.int8)
    return intercepted, bases


def measure(
    a_bits: np.ndarray,
    a_bases: np.ndarray,
    intercepted: np.ndarray,
    e_bases: np.ndarray,
    seed: int,
) -> np.ndarray:
    """Eve measures the intercepted qubits. Returns bits (-1 where not intercepted)."""
    idx = np.flatnonzero(intercepted)
    out = np.full(len(a_bits), -1, dtype=np.int8)
    if len(idx) == 0:
        return out

    def build(qc, q, k):
        i = idx[k]
        A.prepare(qc, q, int(a_bits[i]), int(a_bases[i]))
        if e_bases[i] == A.X:
            qc.h(q)  # rotate X basis onto Z for measurement

    out[idx] = run_one_shot(len(idx), build, seed)
    return out
