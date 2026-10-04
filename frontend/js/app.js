/**
 * BB84 Quantum Research Workbench — Application Controller.
 * Manages simulation lifecycle, real-time animation, postprocessing inspection,
 * history, and empirical experiment suites.
 */

import { runSimulation, fetchStep, runSweep, runCompare, fetchCircuit, fetchHistory, getPdfUrl } from './api.js';
import { ChannelVisualizer } from './channel.js';
import { MeasurementLedger } from './ledger.js';
import { renderSweepChart, renderCompareChart } from './charts.js';

class AppController {
  constructor() {
    this.currentData = null;
    this.isStepping = false;
    this.stepIndex = 1;
    this.keysMasked = true;

    this.initElements();
    this.initModules();
    this.bindEvents();
    this.loadHistory();

    // Run clean baseline preset on load
    this.applyPreset('clean');
    this.executeSimulation();
  }

  initElements() {
    // Controls
    this.qubitsInput = document.getElementById('input-qubits');
    this.qubitsVal = document.getElementById('val-qubits');
    this.eveToggle = document.getElementById('toggle-eve');
    this.eveFractionInput = document.getElementById('input-eve-fraction');
    this.eveFractionVal = document.getElementById('val-eve-fraction');
    this.eveStrategySelect = document.getElementById('select-eve-strategy');
    this.noiseDepolInput = document.getElementById('input-noise-depol');
    this.noiseDepolVal = document.getElementById('val-noise-depol');
    this.noiseLossInput = document.getElementById('input-noise-loss');
    this.noiseLossVal = document.getElementById('val-noise-loss');
    this.sampleFractionInput = document.getElementById('input-sample-fraction');
    this.sampleFractionVal = document.getElementById('val-sample-fraction');
    this.messageInput = document.getElementById('input-message');
    this.fastModeCheckbox = document.getElementById('checkbox-fast-mode');

    // Action buttons
    this.btnRun = document.getElementById('btn-run');
    this.btnStep = document.getElementById('btn-step');
    this.btnReset = document.getElementById('btn-reset');
    this.btnExportPdf = document.getElementById('btn-export-pdf');
    this.btnExportJson = document.getElementById('btn-export-json');
    this.btnExportCsv = document.getElementById('btn-export-csv');

    // Pipeline / Metrics
    this.metricRaw = document.getElementById('metric-raw');
    this.metricMatched = document.getElementById('metric-matched');
    this.metricTest = document.getElementById('metric-test');
    this.metricQber = document.getElementById('metric-qber');
    this.metricFinal = document.getElementById('metric-final');
    this.verdictBanner = document.getElementById('verdict-banner');
    this.verdictTitle = document.getElementById('verdict-title');
    this.verdictReason = document.getElementById('verdict-reason');

    // Keys and OTP
    this.keyRawAlice = document.getElementById('key-raw-alice');
    this.keyRawBob = document.getElementById('key-raw-bob');
    this.keyMask = document.getElementById('key-mask');
    this.keySifted = document.getElementById('key-sifted');
    this.keyFinalAlice = document.getElementById('key-final-alice');
    this.keyFinalBob = document.getElementById('key-final-bob');
    this.btnToggleMask = document.getElementById('btn-toggle-mask');
    this.otpSection = document.getElementById('otp-section');
    this.otpPlaintext = document.getElementById('otp-plaintext');
    this.otpCipher = document.getElementById('otp-cipher');
    this.otpDecrypted = document.getElementById('otp-decrypted');

    // Inspector Drawer
    this.drawer = document.getElementById('circuit-drawer');
    this.drawerContent = document.getElementById('drawer-content');
    this.btnCloseDrawer = document.getElementById('btn-close-drawer');

    // History and Sweeps
    this.historyList = document.getElementById('history-list');
    this.btnRunSweep = document.getElementById('btn-run-sweep');
    this.sweepChartContainer = document.getElementById('sweep-chart-container');
    this.btnRunCompare = document.getElementById('btn-run-compare');
    this.compareChartContainer = document.getElementById('compare-chart-container');
  }

  initModules() {
    this.visualizer = new ChannelVisualizer({
      container: document.getElementById('channel-stage'),
      photonEl: document.getElementById('photon-glyph'),
      eveTapBox: document.getElementById('eve-tap-box'),
      aliceStatusEl: document.getElementById('alice-status-bar'),
      bobStatusEl: document.getElementById('bob-status-bar'),
      eveStatusEl: document.getElementById('eve-status-bar'),
    });

    this.ledger = new MeasurementLedger({
      tableBody: document.getElementById('ledger-tbody'),
      filterSelect: document.getElementById('ledger-filter'),
      onSelectQubit: q => this.openInspector(q),
    });
  }

  bindEvents() {
    // Slider live value tracking
    this.qubitsInput.addEventListener('input', () => this.qubitsVal.textContent = this.qubitsInput.value);
    this.eveFractionInput.addEventListener('input', () => this.eveFractionVal.textContent = `${Math.round(this.eveFractionInput.value * 100)}%`);
    this.noiseDepolInput.addEventListener('input', () => this.noiseDepolVal.textContent = `${Math.round(this.noiseDepolInput.value * 100)}%`);
    this.noiseLossInput.addEventListener('input', () => this.noiseLossVal.textContent = `${Math.round(this.noiseLossInput.value * 100)}%`);
    this.sampleFractionInput.addEventListener('input', () => this.sampleFractionVal.textContent = `${Math.round(this.sampleFractionInput.value * 100)}%`);

    this.eveToggle.addEventListener('change', () => {
      const active = this.eveToggle.checked;
      this.visualizer.setEveTapVisibility(active);
    });

    // Run actions
    this.btnRun.addEventListener('click', () => this.executeSimulation());
    this.btnStep.addEventListener('click', () => this.executeStep());
    this.btnReset.addEventListener('click', () => this.resetSimulation());

    // Presets
    document.querySelectorAll('.preset-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.applyPreset(chip.dataset.preset);
        this.executeSimulation();
      });
    });

    // Tabs
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-section').forEach(sec => sec.style.display = 'none');
        btn.classList.add('active');
        const target = document.getElementById(btn.dataset.target);
        if (target) target.style.display = 'block';
      });
    });

    // Exports
    this.btnExportPdf.addEventListener('click', () => {
      if (this.currentData && this.currentData.id) {
        window.open(getPdfUrl(this.currentData.id), '_blank');
      }
    });

    this.btnExportJson.addEventListener('click', () => this.exportJson());
    this.btnExportCsv.addEventListener('click', () => this.exportCsv());

    // Drawer close
    this.btnCloseDrawer.addEventListener('click', () => this.closeInspector());
    this.drawer.addEventListener('click', (e) => {
      if (e.target === this.drawer) this.closeInspector();
    });

    // Toggle key reveal
    this.btnToggleMask.addEventListener('click', () => {
      this.keysMasked = !this.keysMasked;
      this.btnToggleMask.textContent = this.keysMasked ? 'Reveal Key Values' : 'Mask Key Values';
      this.renderKeys();
    });

    // Experiments
    this.btnRunSweep.addEventListener('click', () => this.executeSweep());
    this.btnRunCompare.addEventListener('click', () => this.executeCompare());

    // Table sorting
    document.querySelectorAll('.data-table th').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.col;
        if (col) this.ledger.sortBy(col);
      });
    });
  }

  getConfig() {
    return {
      n_qubits: parseInt(this.qubitsInput.value, 10),
      eve: {
        enabled: this.eveToggle.checked,
        fraction: parseFloat(this.eveFractionInput.value),
        strategy: this.eveStrategySelect.value,
      },
      noise: {
        depolarizing: parseFloat(this.noiseDepolInput.value),
        bitflip: 0.0,
        loss: parseFloat(this.noiseLossInput.value),
      },
      sample_fraction: parseFloat(this.sampleFractionInput.value),
      qber_threshold: 0.11,
      message: this.messageInput.value,
      save: true,
    };
  }

  applyPreset(name) {
    if (name === 'clean') {
      this.eveToggle.checked = false;
      this.noiseDepolInput.value = 0.0;
      this.noiseLossInput.value = 0.0;
    } else if (name === 'full_eve') {
      this.eveToggle.checked = true;
      this.eveFractionInput.value = 1.0;
      this.noiseDepolInput.value = 0.0;
      this.noiseLossInput.value = 0.0;
    } else if (name === 'noisy') {
      this.eveToggle.checked = false;
      this.noiseDepolInput.value = 0.08;
      this.noiseLossInput.value = 0.15;
    } else if (name === 'stealth_eve') {
      this.eveToggle.checked = true;
      this.eveFractionInput.value = 0.10;
      this.noiseDepolInput.value = 0.0;
      this.noiseLossInput.value = 0.0;
    }
    this.eveFractionVal.textContent = `${Math.round(this.eveFractionInput.value * 100)}%`;
    this.noiseDepolVal.textContent = `${Math.round(this.noiseDepolInput.value * 100)}%`;
    this.noiseLossVal.textContent = `${Math.round(this.noiseLossInput.value * 100)}%`;
    this.visualizer.setEveTapVisibility(this.eveToggle.checked);
  }

  async executeSimulation() {
    this.btnRun.disabled = true;
    this.btnRun.textContent = 'SIMULATING...';
    try {
      const cfg = this.getConfig();
      const res = await runSimulation(cfg);
      this.currentData = res;

      // Update Ledger
      this.ledger.setData(res.qubits);

      // Animate first 3 qubits if fast mode is off
      const fast = this.fastModeCheckbox.checked;
      if (!fast && res.qubits.length > 0) {
        for (let i = 0; i < Math.min(3, res.qubits.length); i++) {
          await this.visualizer.animateTransit(res.qubits[i], false);
        }
      } else if (res.qubits.length > 0) {
        this.visualizer.updateLiveState(res.qubits[0]);
      }

      this.renderMetrics();
      this.renderVerdict();
      this.renderKeys();
      this.loadHistory();
    } catch (err) {
      alert(`Simulation Error: ${err.message}`);
    } finally {
      this.btnRun.disabled = false;
      this.btnRun.textContent = 'RUN SIMULATION';
    }
  }

  async executeStep() {
    const cfg = this.getConfig();
    try {
      const res = await fetchStep(cfg, this.stepIndex);
      await this.visualizer.animateTransit(res.qubit, false);
      this.openInspector(res.qubit, res.circuit_inspect);
      this.stepIndex = (this.stepIndex % cfg.n_qubits) + 1;
    } catch (err) {
      alert(`Step Error: ${err.message}`);
    }
  }

  resetSimulation() {
    this.stepIndex = 1;
    this.currentData = null;
    this.ledger.setData([]);
    this.metricRaw.textContent = '0';
    this.metricMatched.textContent = '0';
    this.metricTest.textContent = '0';
    this.metricQber.textContent = '0.0%';
    this.metricFinal.textContent = '0';
    this.verdictBanner.className = 'verdict-banner';
    this.verdictTitle.textContent = 'READY TO COMMENCE EXPERIMENT';
    this.verdictReason.textContent = 'Configure laboratory parameters and trigger RUN SIMULATION.';
  }

  renderMetrics() {
    if (!this.currentData) return;
    const s = this.currentData.stages;
    const q = this.currentData.qber;

    this.metricRaw.textContent = s.raw;
    this.metricMatched.textContent = s.matched;
    this.metricTest.textContent = s.test;
    this.metricQber.textContent = q.value !== null ? `${(q.value * 100).toFixed(1)}%` : '—';
    this.metricFinal.textContent = s.final;
  }

  renderVerdict() {
    if (!this.currentData) return;
    const v = this.currentData.verdict;
    this.verdictBanner.className = `verdict-banner ${v.status}`;
    this.verdictTitle.textContent = v.title;
    this.verdictReason.textContent = v.reason;
  }

  renderKeys() {
    if (!this.currentData) return;
    const k = this.currentData.keys;

    const maskStr = str => this.keysMasked ? str.replace(/[0-9]/g, '●') : str;

    this.keyRawAlice.textContent = maskStr(k.alice_raw);
    this.keyRawBob.textContent = maskStr(k.bob_raw);
    this.keyMask.textContent = k.basis_mask;
    this.keySifted.textContent = maskStr(k.sifted_alice);
    this.keyFinalAlice.textContent = maskStr(k.final_alice || '[NONE — ABORTED]');
    this.keyFinalBob.textContent = maskStr(k.final_bob || '[NONE — ABORTED]');

    if (this.currentData.message) {
      this.otpSection.style.display = 'block';
      this.otpPlaintext.textContent = this.currentData.message.plaintext;
      this.otpCipher.textContent = this.currentData.message.cipher_hex;
      this.otpDecrypted.textContent = this.currentData.message.decrypted;
    } else {
      this.otpSection.style.display = 'none';
    }
  }

  async openInspector(qubit, preloadedCircuit = null) {
    this.drawer.style.display = 'flex';
    this.drawerContent.innerHTML = '<div style="padding:20px; font-family:var(--font-mono);">Inspecting Qiskit Circuit...</div>';

    try {
      const data = preloadedCircuit || await fetchCircuit(this.currentData.id, qubit.i);
      this.drawerContent.innerHTML = `
        <div>
          <span style="font-family:var(--font-mono); font-size:11px; text-transform:uppercase; color:var(--color-ink-secondary);">Qubit #${data.i} Analysis</span>
          <h2>Alice Preparation & Quantum State</h2>
          <p style="font-size:13px; color:var(--color-ink-secondary); margin-bottom:8px;">Encoded bit ${qubit.a_bit} into basis ${qubit.a_basis} yielding quantum state <b>${data.alice.state}</b> (${data.alice.angle}° on polarization plane).</p>
          <div class="circuit-display">${data.alice.circuit}</div>
        </div>

        ${data.eve ? `
          <div style="border-top:var(--border-rule); padding-top:12px;">
            <span style="font-family:var(--font-mono); font-size:11px; text-transform:uppercase; color:var(--color-eve);">Eve Interception Tap</span>
            <h3>Measured & Re-prepared State</h3>
            <p style="font-size:13px; color:var(--color-ink-secondary); margin-bottom:8px;">Eve measured in basis ${data.eve.basis}, measured bit ${data.eve.bit}, and resent state <b>${data.eve.resent_state}</b>.</p>
            <div class="circuit-display">${data.eve.circuit}</div>
          </div>
        ` : ''}

        <div style="border-top:var(--border-rule); padding-top:12px;">
          <span style="font-family:var(--font-mono); font-size:11px; text-transform:uppercase; color:var(--color-ink-secondary);">Bob Receiver Detection</span>
          <h3>Measurement in ${data.bob.basis} Basis</h3>
          <p style="font-size:13px; color:var(--color-ink-secondary); margin-bottom:8px;">Outcome Probabilities: P(0) = ${data.bob.probabilities[0]}, P(1) = ${data.bob.probabilities[1]} → Measured: <b>${data.bob.bit !== null ? data.bob.bit : '[LOST]'}</b></p>
          <div class="circuit-display">${data.bob.circuit}</div>
        </div>
      `;
    } catch (err) {
      this.drawerContent.innerHTML = `<div style="color:var(--color-eve); padding:20px;">Failed to inspect circuit: ${err.message}</div>`;
    }
  }

  closeInspector() {
    this.drawer.style.display = 'none';
  }

  async loadHistory() {
    try {
      const list = await fetchHistory(10, 0);
      this.historyList.innerHTML = '';
      list.forEach(item => {
        const div = document.createElement('div');
        div.style.cssText = 'padding:6px 8px; border-bottom:var(--border-rule-faint); font-family:var(--font-mono); font-size:11px; display:flex; justify-content:space-between; align-items:center; cursor:pointer;';
        const qberStr = item.qber !== null && item.qber >= 0 ? `${(item.qber * 100).toFixed(1)}%` : '—';
        const eveTag = item.eve_enabled ? `<span style="color:var(--color-eve);">EVE ${Math.round(item.eve_fraction*100)}%</span>` : '<span style="color:var(--color-match);">CLEAN</span>';
        div.innerHTML = `
          <div>
            <b>${item.id}</b> | N=${item.n_qubits} | ${eveTag}
          </div>
          <div>
            QBER: <b>${qberStr}</b>
          </div>
        `;
        div.addEventListener('click', async () => {
          const res = await fetch(`${API_BASE}/simulations/${item.id}`).then(r => r.json());
          this.currentData = res;
          this.ledger.setData(res.qubits);
          this.renderMetrics();
          this.renderVerdict();
          this.renderKeys();
        });
        this.historyList.appendChild(div);
      });
    } catch (e) {
      console.warn('History load failed', e);
    }
  }

  async executeSweep() {
    this.btnRunSweep.disabled = true;
    this.btnRunSweep.textContent = 'COMPUTING SWEEP...';
    try {
      const sweepData = await runSweep({
        parameter: 'eve_fraction',
        points: 9,
        repeats: 2,
        n_qubits: 400,
        seed: 12,
      });
      renderSweepChart(this.sweepChartContainer, sweepData);
    } catch (e) {
      alert(`Sweep failed: ${e.message}`);
    } finally {
      this.btnRunSweep.disabled = false;
      this.btnRunSweep.textContent = 'RUN EMPIRICAL SWEEP';
    }
  }

  async executeCompare() {
    this.btnRunCompare.disabled = true;
    this.btnRunCompare.textContent = 'RUNNING BATCH...';
    try {
      const compData = await runCompare({
        runs: 10,
        n_qubits: 300,
        eve_fraction: 1.0,
        seed: 88,
      });
      renderCompareChart(this.compareChartContainer, compData);
    } catch (e) {
      alert(`Comparison failed: ${e.message}`);
    } finally {
      this.btnRunCompare.disabled = false;
      this.btnRunCompare.textContent = 'RUN PARALLEL BATCHES';
    }
  }

  exportJson() {
    if (!this.currentData) return;
    const blob = new Blob([JSON.stringify(this.currentData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bb84_simulation_${this.currentData.id}.json`;
    a.click();
  }

  exportCsv() {
    if (!this.currentData) return;
    const headers = ['#', 'Alice_Bit', 'Alice_Basis', 'State', 'Eve_Tap', 'Eve_Basis', 'Eve_Bit', 'Bob_Basis', 'Bob_Bit', 'Match', 'Error', 'Role'];
    const rows = this.currentData.qubits.map(q => [
      q.i, q.a_bit, q.a_basis, q.state, q.eve ? 1 : 0, q.e_basis || '', q.e_bit !== null ? q.e_bit : '',
      q.b_basis, q.lost ? 'LOST' : q.b_bit, q.match ? 1 : 0, q.error ? 1 : 0, q.role
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bb84_qubits_${this.currentData.id}.csv`;
    a.click();
  }
}

// Instantiate on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.bb84App = new AppController();
});
