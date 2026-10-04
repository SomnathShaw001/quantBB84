"""Theoretical predictions used to draw reference lines next to simulated data."""
from __future__ import annotations

from .channel import NoiseConfig
from .eve import EveConfig
from .postprocess import h2


def noise_error(noise: NoiseConfig) -> float:
    """Expected error from channel noise on a basis-matched qubit.

    Depolarizing p flips the outcome with probability p/2 in either basis.
    Bit-flip q flips Z-basis outcomes with probability q and leaves X-basis
    states (|+>, |->) unchanged, so it contributes q/2 on average.
    The two are applied in sequence, so their flips combine as independent events.
    """
    d = noise.depolarizing / 2
    f = noise.bitflip / 2
    return d + f - 2 * d * f


def eve_error(eve: EveConfig) -> float:
    """Intercept-resend: 25% error on intercepted, basis-matched qubits.

    This holds for random-basis Eve and also for a fixed-basis Eve, because
    Alice's basis is random (Eve is wrong half the time, then Bob errs half the time).
    """
    if not eve.enabled:
        return 0.0
    return 0.25 * eve.fraction


def expected_qber(eve: EveConfig, noise: NoiseConfig) -> float:
    e, n = eve_error(eve), noise_error(noise)
    return e + n - 2 * e * n


def expected_sifted_fraction(noise: NoiseConfig) -> float:
    """Half the bases match; lost photons never count."""
    return 0.5 * (1 - noise.loss)


def key_rate(qber: float) -> float:
    """Asymptotic secret fraction of the sifted key: r = 1 - 2 h(Q) (Shor–Preskill)."""
    return max(0.0, 1 - 2 * h2(qber))
