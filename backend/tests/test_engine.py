"""Unit and statistical tests for the BB84 engine."""
from __future__ import annotations

import numpy as np
import pytest

from backend.bb84 import EveConfig, NoiseConfig, SimConfig, run_simulation
from backend.bb84 import alice as A
from backend.bb84 import postprocess as P
from backend.bb84 import theory as T
from backend.bb84.circuits import inspect


def run(**kw):
    return run_simulation(SimConfig(**kw))


# ---------------------------------------------------------------- generation
def test_alice_generation_is_balanced():
    rng = np.random.default_rng(0)
    bits, bases = A.generate(20_000, rng)
    assert set(np.unique(bits)) <= {0, 1}
    assert abs(bits.mean() - 0.5) < 0.02
    assert abs(bases.mean() - 0.5) < 0.02


def test_state_encoding_names():
    assert A.STATE_NAME[(0, A.Z)] == "|0⟩"
    assert A.STATE_NAME[(1, A.X)] == "|−⟩"


# ---------------------------------------------------------------- protocol
def test_no_eve_no_noise_has_zero_qber_and_matching_keys():
    r = run(n_qubits=1000, seed=7)
    assert r["qber"]["value"] == 0
    assert r["qber"]["actual_key_errors"] == 0
    assert r["verdict"]["status"] == "accepted"
    assert r["keys"]["final_match"] is True
    assert r["keys"]["final_alice"] == r["keys"]["final_bob"]
    assert r["stages"]["final"] > 0


def test_matched_basis_positions_agree_without_eve():
    r = run(n_qubits=500, seed=3)
    for q in r["qubits"]:
        if q["match"]:
            assert q["a_bit"] == q["b_bit"]


def test_same_seed_is_reproducible():
    cfg = dict(n_qubits=400, seed=99, eve=EveConfig(True, 0.5, "random"),
               noise=NoiseConfig(0.02, 0.01, 0.05))
    a, b = run(**cfg), run(**cfg)
    a.pop("timing_ms"); b.pop("timing_ms")
    assert a == b


def test_full_eve_gives_about_25_percent_on_all_sifted_bits():
    r = run(n_qubits=4000, seed=11, eve=EveConfig(True, 1.0, "random"), sample_fraction=0.5)
    sifted = [q for q in r["qubits"] if q["match"]]
    rate = sum(q["error"] for q in sifted) / len(sifted)
    assert 0.22 < rate < 0.28
    assert r["verdict"]["status"] == "aborted"


@pytest.mark.parametrize("strategy", ["random", "always_Z", "always_X"])
def test_mean_qber_over_many_seeds(strategy):
    vals = [run(n_qubits=600, seed=s, eve=EveConfig(True, 1.0, strategy),
                sample_fraction=0.5)["qber"]["value"] for s in range(30)]
    assert abs(np.mean(vals) - 0.25) < 0.025


def test_partial_eve_scales_qber():
    vals = [run(n_qubits=800, seed=s, eve=EveConfig(True, 0.4), sample_fraction=0.5)["qber"]["value"]
            for s in range(30)]
    assert abs(np.mean(vals) - 0.10) < 0.02


def test_eve_errors_only_where_her_basis_was_wrong():
    r = run(n_qubits=2000, seed=5, eve=EveConfig(True, 1.0))
    for q in r["qubits"]:
        if q["match"] and q["e_basis"] == q["a_basis"]:
            assert not q["error"]


def test_depolarizing_noise_matches_theory():
    noise = NoiseConfig(depolarizing=0.1)
    vals = []
    for s in range(20):
        r = run(n_qubits=1000, seed=s, noise=noise)
        sifted = [q for q in r["qubits"] if q["match"]]
        vals.append(sum(q["error"] for q in sifted) / len(sifted))
    assert abs(np.mean(vals) - T.noise_error(noise)) < 0.01


def test_loss_removes_photons_from_sifting():
    r = run(n_qubits=2000, seed=1, noise=NoiseConfig(loss=0.5))
    assert 900 < r["stages"]["lost"] < 1100
    assert all(not q["match"] for q in r["qubits"] if q["lost"])


def test_zero_sample_is_insufficient():
    r = run(n_qubits=200, seed=1, sample_fraction=0.0)
    assert r["verdict"]["status"] == "insufficient"


def test_single_qubit_runs():
    r = run(n_qubits=1, seed=1)
    assert r["stages"]["raw"] == 1


def test_invalid_size_rejected():
    with pytest.raises(ValueError):
        run(n_qubits=0)


def test_stage_bookkeeping():
    r = run(n_qubits=1000, seed=21)
    s = r["stages"]
    assert s["matched"] == s["test"] + s["key_before_ec"]
    assert s["matched"] + s["discarded"] == s["raw"]
    assert s["final"] <= s["key_before_ec"]


# ---------------------------------------------------------------- post-processing
def test_cascade_corrects_errors():
    rng = np.random.default_rng(0)
    a = rng.integers(0, 2, 2000, dtype=np.int8)
    b = a.copy()
    flip = rng.choice(2000, 60, replace=False)
    b[flip] ^= 1
    res = P.cascade(a, b, 0.03, rng)
    assert np.count_nonzero(res.corrected != a) <= 2
    assert res.leaked > 0


def test_toeplitz_is_linear_and_sized():
    rng = np.random.default_rng(1)
    k1 = rng.integers(0, 2, 100, dtype=np.int8)
    k2 = rng.integers(0, 2, 100, dtype=np.int8)
    seed = rng.integers(0, 2, 100 + 40 - 1, dtype=np.int8)
    h = lambda k: P.toeplitz_hash(k, 40, seed)
    assert len(h(k1)) == 40
    assert np.array_equal(h(k1 ^ k2), h(k1) ^ h(k2))


def test_h2_bounds():
    assert P.h2(0) == 0 and P.h2(1) == 0
    assert P.h2(0.5) == pytest.approx(1.0)


def test_otp_roundtrip_and_truncation():
    key = np.random.default_rng(0).integers(0, 2, 40, dtype=np.int8)
    out = P.otp("hello world", key)
    assert out["encrypted_bytes"] == 5 and out["truncated"]
    assert out["decrypted"] == "hello"


def test_message_demo_only_when_accepted():
    ok = run(n_qubits=2000, seed=2, message="hi")
    assert ok["message"]["decrypted"] == "hi"
    bad = run(n_qubits=2000, seed=2, message="hi", eve=EveConfig(True, 1.0))
    assert bad["message"] is None


def test_eve_guess_of_final_key_is_near_coin_flip():
    r = run(n_qubits=4000, seed=8, eve=EveConfig(True, 0.2), qber_threshold=0.11)
    if r["verdict"]["status"] == "accepted":
        assert 0.35 < r["eve_stats"]["final_guess_match"] < 0.65


# ---------------------------------------------------------------- circuits
def test_inspector_builds_three_circuits():
    r = run(n_qubits=200, seed=4, eve=EveConfig(True, 1.0))
    rec = next(q for q in r["qubits"] if q["eve"])
    view = inspect(rec)
    assert view["alice"]["gates"] is not None
    assert "measure" in view["eve"]["gates"] and "reset" in view["eve"]["gates"]
    assert "id" in view["bob"]["gates"] and "measure" in view["bob"]["gates"]
    assert sum(view["bob"]["probabilities"]) == pytest.approx(1.0)


def test_theory_expected_qber():
    assert T.expected_qber(EveConfig(True, 1.0), NoiseConfig()) == 0.25
    assert T.expected_qber(EveConfig(False), NoiseConfig()) == 0
