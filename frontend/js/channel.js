/**
 * BB84 Quantum Channel & Transit Animation Controller.
 * Provides physical visualization of Alice optical preparation, channel transit,
 * Eve interception tap, and Bob receiver detection.
 */

export class ChannelVisualizer {
  constructor({ container, photonEl, eveTapBox, aliceStatusEl, bobStatusEl, eveStatusEl }) {
    this.container = container;
    this.photonEl = photonEl;
    this.eveTapBox = eveTapBox;
    this.aliceStatusEl = aliceStatusEl;
    this.bobStatusEl = bobStatusEl;
    this.eveStatusEl = eveStatusEl;
    this.animating = false;
  }

  setEveTapVisibility(enabled) {
    if (enabled) {
      this.eveTapBox.classList.add('active');
      this.eveTapBox.style.opacity = '1';
    } else {
      this.eveTapBox.classList.remove('active');
      this.eveTapBox.style.opacity = '0.4';
    }
  }

  updateLiveState(qubit) {
    if (!qubit) return;
    this.aliceStatusEl.textContent = `Bit: ${qubit.a_bit} | Basis: ${qubit.a_basis} (${qubit.state})`;

    if (qubit.eve) {
      this.eveStatusEl.textContent = `INTERCEPTED: Basis ${qubit.e_basis} → Meas: ${qubit.e_bit}`;
      this.eveStatusEl.style.color = 'var(--color-eve)';
    } else {
      this.eveStatusEl.textContent = `TAP IDLE — PASS-THROUGH`;
      this.eveStatusEl.style.color = 'var(--color-ink-tertiary)';
    }

    if (qubit.lost) {
      this.bobStatusEl.textContent = `PHOTON LOST IN TRANSIT`;
      this.bobStatusEl.style.color = 'var(--color-ink-tertiary)';
    } else {
      const matchStr = qubit.match ? 'MATCH' : 'MISMATCH';
      this.bobStatusEl.textContent = `Basis: ${qubit.b_basis} → Meas: ${qubit.b_bit} [${matchStr}]`;
      this.bobStatusEl.style.color = qubit.match ? 'var(--color-match)' : 'var(--color-ink)';
    }
  }

  async animateTransit(qubit, skipAnimation = false) {
    this.updateLiveState(qubit);

    if (skipAnimation) {
      this.photonEl.style.display = 'none';
      return;
    }

    this.photonEl.style.display = 'flex';
    this.photonEl.textContent = this.getGlyph(qubit.state);
    this.photonEl.style.left = '40px';

    // Alice -> Eve tap (or midpoint)
    await this.movePhoton('48%', 120);

    if (qubit.eve) {
      this.eveTapBox.style.backgroundColor = '#FDEDE8';
      await new Promise(r => setTimeout(r, 80));
      this.eveTapBox.style.backgroundColor = '';
    }

    // Midpoint -> Bob
    await this.movePhoton('calc(100% - 60px)', 120);
    this.photonEl.style.display = 'none';
  }

  movePhoton(leftPos, durationMs) {
    return new Promise(resolve => {
      this.photonEl.style.transition = `left ${durationMs}ms ease-out`;
      this.photonEl.style.left = leftPos;
      setTimeout(resolve, durationMs);
    });
  }

  getGlyph(state) {
    switch (state) {
      case '|0⟩': return '│';
      case '|1⟩': return '─';
      case '|+⟩': return '╱';
      case '|−⟩': return '╲';
      default: return '●';
    }
  }
}
