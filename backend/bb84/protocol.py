"""Full BB84 protocol orchestration.

Order of operations (each step uses the shared seeded RNG so a seed replays a
run exactly):

1. Alice draws bits and bases.
2. Eve decides which qubits to intercept and in which basis (optional).
3. The channel decides which photons are lost (optional).
4. Bob draws bases.
5. Eve measures intercepted qubits on Aer, then re-prepares them.
6. Bob measures what arrives on Aer, through the noisy channel.
7. Sifting, QBER estimation, abort decision.
8. Error correction, privacy amplification, verification, OTP demo.
"""
from __future__ import annotations

import secrets
import time
from dataclasses import asdict, dataclass, field

import numpy as np
import qiskit
import qiskit_aer

from . import alice as A
from . import bob as B
from . import eve as E
from . import postprocess as P
from . import theory as T
from .channel import NoiseConfig, build_noise_model, sample_loss
from .eve import EveConfig
from .sim import BACKEND_NAME, METHOD, SHOTS

MAX_QUBITS = 10_000
PA_SAFETY_BITS = 8


@dataclass(frozen=True)
class SimConfig:
    n_qubits: int = 256
    seed: int | None = None
    eve: EveConfig = field(default_factory=EveConfig)
    noise: NoiseConfig = field(default_factory=NoiseConfig)
    sample_fraction: float = 0.25
    qber_threshold: float = 0.11
    message: str = ""


def _verdict(est: P.Estimate, threshold: float, final_ok: bool | None, final_len: int) -> dict:
    if est.qber is None:
        return {
            "status": "insufficient",
            "title": "Cannot estimate disturbance",
            "reason": "No sifted bits were sacrificed for testing, so the error rate is unknown. "
            "Alice and Bob must not trust this key.",
        }
    pct = f"{est.qber * 100:.1f}%"
    thr = f"{threshold * 100:.0f}%"
    if est.qber > threshold:
        guess = min(1.0, est.qber / 0.25)
        return {
            "status": "aborted",
            "title": "Possible eavesdropping — key aborted",
            "reason": f"QBER {pct} is above the {thr} threshold. If every error came from an "
            f"intercept-resend attack, Eve intercepted about {guess * 100:.0f}% of qubits. "
            "Channel noise can also cause this, so Alice and Bob discard the key.",
        }
    if final_len == 0:
        return {
            "status": "no_key",
            "title": "No significant disturbance — but no key left",
            "reason": f"QBER {pct} is below the {thr} threshold, but after error correction and "
            "privacy amplification no secret bits remain. Send more qubits.",
        }
    if final_ok is False:
        return {
            "status": "verify_failed",
            "title": "Verification failed — key discarded",
            "reason": "Error correction left residual mismatches, so the final key hashes differ.",
        }
    return {
        "status": "accepted",
        "title": "No significant disturbance detected — key accepted",
        "reason": f"QBER {pct} is within the {thr} threshold. This shows the detection principle; "
        "it is not a guarantee of absolute security.",
    }


def run_simulation(cfg: SimConfig) -> dict:
    """Run one complete BB84 exchange and return a JSON-serialisable result."""
    if not 1 <= cfg.n_qubits <= MAX_QUBITS:
        raise ValueError(f"n_qubits must be between 1 and {MAX_QUBITS}")
    t0 = time.perf_counter()
    seed = cfg.seed if cfg.seed is not None else secrets.randbelow(2**31)
    rng = np.random.default_rng(seed)
    n = cfg.n_qubits

    # 1-4: random choices
    a_bits, a_bases = A.generate(n, rng)
    intercepted, e_bases = E.choose(n, cfg.eve, rng)
    lost = sample_loss(n, cfg.noise, rng)
    b_bases = B.choose_bases(n, rng)
    eve_seed, bob_seed = (int(x) for x in rng.integers(0, 2**31, 2))

    # 5: Eve measures (Aer) and re-prepares in her basis
    e_bits = E.measure(a_bits, a_bases, intercepted, e_bases, eve_seed)
    src_bits = np.where(intercepted, e_bits, a_bits).astype(np.int8)
    src_bases = np.where(intercepted, e_bases, a_bases).astype(np.int8)

    # 6: Bob measures (Aer, with channel noise)
    b_bits = B.measure(src_bits, src_bases, b_bases, bob_seed, build_noise_model(cfg.noise))
    detected = ~lost

    # 7: sifting and estimation
    sifted = P.sift(a_bases, b_bases, detected)
    est = P.estimate(sifted, a_bits, b_bits, cfg.sample_fraction, rng)
    aborted = est.qber is None or est.qber > cfg.qber_threshold

    a_key = a_bits[est.key_idx]
    b_key = b_bits[est.key_idx]
    key_errors = int(np.count_nonzero(a_key != b_key))

    # 8: error correction + privacy amplification
    ec = None
    pa = None
    final_a = final_b = np.zeros(0, dtype=np.int8)
    final_ok: bool | None = None
    eve_final_match = None
    if not aborted and len(a_key):
        ec = P.cascade(a_key, b_key, est.qber, rng)
        m = P.final_length(len(a_key), est.qber, ec.leaked, PA_SAFETY_BITS)
        seed_bits = rng.integers(0, 2, len(a_key) + max(m, 1) - 1, dtype=np.int8)
        final_a = P.toeplitz_hash(a_key, m, seed_bits)
        final_b = P.toeplitz_hash(ec.corrected, m, seed_bits)
        final_ok = bool(np.array_equal(final_a, final_b))
        # Eve's best guess of the pre-hash key: her own result where she intercepted,
        # a coin flip elsewhere. Hash it with the (public) Toeplitz seed.
        guess = np.where(intercepted[est.key_idx], e_bits[est.key_idx],
                         rng.integers(0, 2, len(a_key), dtype=np.int8)).astype(np.int8)
        eve_final = P.toeplitz_hash(guess, m, seed_bits)
        if m:
            eve_final_match = float(np.mean(eve_final == final_a))
        pa = {
            "n_in": int(len(a_key)),
            "m_out": int(m),
            "h2_qber": P.h2(est.qber),
            "leaked_ec": int(ec.leaked),
            "safety_bits": PA_SAFETY_BITS,
            "formula": "m = n·(1 − h(Q)) − leak_EC − safety",
        }

    verdict = _verdict(est, cfg.qber_threshold, final_ok, len(final_a))
    accepted = verdict["status"] == "accepted"

    # Per-qubit ledger
    role = np.full(n, "discard", dtype=object)
    role[lost] = "lost"
    role[est.test_idx] = "test"
    role[est.key_idx] = "key"
    matched = detected & (a_bases == b_bases)
    records = []
    for i in range(n):
        records.append({
            "i": i + 1,
            "a_bit": int(a_bits[i]),
            "a_basis": A.BASIS_NAME[int(a_bases[i])],
            "state": A.STATE_NAME[(int(a_bits[i]), int(a_bases[i]))],
            "eve": bool(intercepted[i]),
            "e_basis": A.BASIS_NAME[int(e_bases[i])] if intercepted[i] else None,
            "e_bit": int(e_bits[i]) if intercepted[i] else None,
            "lost": bool(lost[i]),
            "b_basis": A.BASIS_NAME[int(b_bases[i])],
            "b_bit": None if lost[i] else int(b_bits[i]),
            "match": bool(matched[i]),
            "error": bool(matched[i] and a_bits[i] != b_bits[i]),
            "role": role[i],
        })

    mask = "".join(
        ("1" if a_bits[i] else "0") if matched[i] else "-" for i in range(n)
    )
    key_known = int(np.count_nonzero(intercepted[est.key_idx] & (e_bits[est.key_idx] == a_key)))

    result = {
        "seed": int(seed),
        "config": {
            "n_qubits": n,
            "eve": asdict(cfg.eve),
            "noise": asdict(cfg.noise),
            "sample_fraction": cfg.sample_fraction,
            "qber_threshold": cfg.qber_threshold,
            "message": cfg.message,
        },
        "backend": {
            "name": BACKEND_NAME,
            "method": METHOD,
            "shots": SHOTS,
            "qiskit": qiskit.__version__,
            "qiskit_aer": qiskit_aer.__version__,
            "eve_seed": eve_seed,
            "bob_seed": bob_seed,
        },
        "stages": {
            "raw": n,
            "lost": int(lost.sum()),
            "detected": int(detected.sum()),
            "matched": int(len(sifted)),
            "discarded": int(n - len(sifted)),
            "test": int(est.compared),
            "key_before_ec": int(len(a_key)),
            "corrected": int(len(a_key)) if ec else 0,
            "final": int(len(final_a)),
        },
        "qber": {
            "compared": est.compared,
            "errors": est.errors,
            "value": est.qber,
            "threshold": cfg.qber_threshold,
            "formula": f"{est.errors} / {est.compared}" if est.compared else "— / 0",
            "actual_key_errors": key_errors,
        },
        "verdict": verdict,
        "keys": {
            "alice_raw": P.bits_to_str(a_bits),
            "bob_raw": "".join("·" if lost[i] else str(int(b_bits[i])) for i in range(n)),
            "basis_mask": mask,
            "sifted_alice": P.bits_to_str(a_bits[sifted]),
            "sifted_bob": P.bits_to_str(b_bits[sifted]),
            "key_alice": P.bits_to_str(a_key),
            "key_bob": P.bits_to_str(b_key),
            "corrected_bob": P.bits_to_str(ec.corrected) if ec else "",
            "final_alice": P.bits_to_str(final_a),
            "final_bob": P.bits_to_str(final_b),
            "hash_alice": P.sha256_bits(final_a) if len(final_a) else None,
            "hash_bob": P.sha256_bits(final_b) if len(final_b) else None,
            "final_match": final_ok,
            "label": "Educational simulation output — not for production cryptography.",
        },
        "error_correction": None if ec is None else {
            "method": "Cascade (4 passes, with backtracking)",
            "leaked": ec.leaked,
            "corrections": ec.corrections,
            "residual_errors": int(np.count_nonzero(ec.corrected != a_key)),
            "passes": ec.passes,
        },
        "privacy_amplification": pa,
        "eve_stats": {
            "intercepted": int(intercepted.sum()),
            "key_bits": int(len(a_key)),
            "key_bits_known": key_known,
            "final_guess_match": eve_final_match,
            "estimated_fraction": None if est.qber is None else min(1.0, est.qber / 0.25),
        },
        "theory": {
            "expected_qber": T.expected_qber(cfg.eve, cfg.noise),
            "expected_matched": T.expected_sifted_fraction(cfg.noise) * n,
            "key_rate": T.key_rate(est.qber) if est.qber is not None else None,
        },
        "message": P.otp(cfg.message, final_a) if (cfg.message and accepted) else None,
        "qubits": records,
    }
    result["timing_ms"] = round((time.perf_counter() - t0) * 1000, 1)
    return result
