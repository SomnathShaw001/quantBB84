"""Classical post-processing: sifting, parameter estimation, error correction,
privacy amplification, verification, and a one-time-pad demo.

All steps operate on the real measurement results produced by Qiskit Aer.
"""
from __future__ import annotations

import hashlib
import math
from dataclasses import dataclass, field

import numpy as np


# --------------------------------------------------------------------------- #
# Sifting and parameter estimation
# --------------------------------------------------------------------------- #
def sift(a_bases: np.ndarray, b_bases: np.ndarray, detected: np.ndarray) -> np.ndarray:
    """Indices where Bob detected the photon and both used the same basis."""
    return np.flatnonzero(detected & (a_bases == b_bases))


@dataclass
class Estimate:
    test_idx: np.ndarray
    key_idx: np.ndarray
    compared: int
    errors: int
    qber: float | None  # None when no bits were sacrificed


def estimate(
    sifted_idx: np.ndarray,
    a_bits: np.ndarray,
    b_bits: np.ndarray,
    sample_fraction: float,
    rng: np.random.Generator,
) -> Estimate:
    """Publicly reveal a random sample of the sifted key and count mismatches."""
    n = len(sifted_idx)
    k = int(round(n * sample_fraction))
    if sample_fraction > 0 and n > 1:
        k = min(max(k, 1), n - 1)  # keep at least one key bit when possible
    k = min(k, n)
    perm = rng.permutation(n)
    test_idx = np.sort(sifted_idx[perm[:k]])
    key_idx = np.sort(sifted_idx[perm[k:]])
    errors = int(np.count_nonzero(a_bits[test_idx] != b_bits[test_idx]))
    qber = errors / k if k else None
    return Estimate(test_idx, key_idx, k, errors, qber)


# --------------------------------------------------------------------------- #
# Error correction — Cascade-style multi-pass BINARY (simplified, no backtracking)
# --------------------------------------------------------------------------- #
@dataclass
class ECResult:
    corrected: np.ndarray
    leaked: int
    corrections: int
    passes: list[dict] = field(default_factory=list)


def _binary(a: np.ndarray, b: np.ndarray, block: np.ndarray) -> tuple[int, int]:
    """Locate one error in ``block`` (odd parity mismatch) by bisection.

    Returns (position, parity bits leaked during the search).
    """
    leaked = 0
    while len(block) > 1:
        half = block[: len(block) // 2]
        leaked += 1
        if a[half].sum() % 2 != b[half].sum() % 2:
            block = half
        else:
            block = block[len(block) // 2 :]
    return int(block[0]), leaked


def cascade(
    a_key: np.ndarray,
    b_key: np.ndarray,
    qber: float,
    rng: np.random.Generator,
    n_passes: int = 4,
) -> ECResult:
    """Cascade error correction (Brassard & Salvail 1993).

    Pass 1 uses block size ~0.73/QBER; each later pass doubles the block size
    over a fresh random permutation. Whenever a bit is corrected, every block
    from earlier passes containing that bit flips parity, so those blocks are
    re-examined (the "cascade"). Each parity Alice reveals is counted as leaked.
    """
    n = len(a_key)
    b = b_key.copy()
    res = ECResult(corrected=b, leaked=0, corrections=0)
    if n == 0:
        return res
    q = max(qber, 0.01)
    k = max(4, min(n, int(round(0.73 / q))))
    layers: list[tuple[np.ndarray, int, np.ndarray]] = []  # (order, block size, inverse)

    def block_of(layer: int, pos: int) -> np.ndarray:
        order, size, inv = layers[layer]
        start = (inv[pos] // size) * size
        return order[start : start + size]

    def odd(block: np.ndarray) -> bool:
        return a_key[block].sum() % 2 != b[block].sum() % 2

    for p in range(n_passes):
        order = np.arange(n) if p == 0 else rng.permutation(n)
        layers.append((order, k, np.argsort(order)))
        fixed = 0
        leaked_before = res.leaked
        queue: list[tuple[int, np.ndarray]] = []
        for s in range(0, n, k):
            block = order[s : s + k]
            res.leaked += 1  # Alice announces this block's parity
            if odd(block):
                queue.append((p, block))
        while queue:
            layer, block = queue.pop()
            if not odd(block):  # parity already known; no new leak
                continue
            pos, leak = _binary(a_key, b, block)
            res.leaked += leak
            b[pos] ^= 1
            fixed += 1
            for other in range(len(layers)):
                if other != layer:
                    blk = block_of(other, pos)
                    if odd(blk):
                        queue.append((other, blk))
        res.corrections += fixed
        res.passes.append(
            {"pass": p + 1, "block_size": int(k), "fixed": fixed, "leaked": res.leaked - leaked_before}
        )
        k = min(n, k * 2)
    res.corrected = b
    return res


# --------------------------------------------------------------------------- #
# Privacy amplification — Toeplitz universal hashing
# --------------------------------------------------------------------------- #
def h2(p: float) -> float:
    """Binary entropy."""
    if p <= 0 or p >= 1:
        return 0.0
    return -p * math.log2(p) - (1 - p) * math.log2(1 - p)


def final_length(n: int, qber: float, leaked: int, safety: int) -> int:
    """Asymptotic BB84 bound: m = n(1 - h(Q)) - leak_EC - safety."""
    return max(0, int(math.floor(n * (1 - h2(qber)) - leaked - safety)))


def toeplitz_hash(key: np.ndarray, m: int, seed_bits: np.ndarray) -> np.ndarray:
    """Multiply ``key`` (length n) by an m x n binary Toeplitz matrix (mod 2)."""
    n = len(key)
    if m == 0 or n == 0:
        return np.zeros(0, dtype=np.int8)
    i = np.arange(m)[:, None]
    j = np.arange(n)[None, :]
    T = seed_bits[i - j + n - 1]
    return ((T.astype(np.int32) @ key.astype(np.int32)) % 2).astype(np.int8)


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def bits_to_str(bits: np.ndarray) -> str:
    return "".join("1" if x else "0" for x in bits)


def sha256_bits(bits: np.ndarray) -> str:
    return hashlib.sha256(bits_to_str(bits).encode()).hexdigest()


def otp(message: str, key: np.ndarray) -> dict:
    """One-time-pad XOR demo. Never reuses key bits; truncates if the key is short."""
    data = message.encode("utf-8")
    usable = min(len(data), len(key) // 8)
    if usable == 0:
        return {
            "plaintext": message,
            "encrypted_bytes": 0,
            "total_bytes": len(data),
            "truncated": len(data) > 0,
            "key_hex": "",
            "cipher_hex": "",
            "decrypted": "",
        }
    key_bytes = np.packbits(key[: usable * 8].astype(np.uint8)).tobytes()
    cipher = bytes(d ^ k for d, k in zip(data[:usable], key_bytes))
    plain = bytes(c ^ k for c, k in zip(cipher, key_bytes))
    return {
        "plaintext": message,
        "encrypted_bytes": usable,
        "total_bytes": len(data),
        "truncated": usable < len(data),
        "key_hex": key_bytes.hex(),
        "cipher_hex": cipher.hex(),
        "decrypted": plain.decode("utf-8", errors="replace"),
    }
