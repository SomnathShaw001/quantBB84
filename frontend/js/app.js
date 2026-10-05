/**
 * BB84 Quantum Research Workbench — Application Controller.
 * Manages simulation lifecycle, real-time animation, postprocessing inspection,
 * history, empirical experiment suites, and SPA hash routing.
 */

import {
  runSimulation,
  fetchStep,
  runSweep,
  runCompare,
  fetchCircuit,
  fetchHistory,
  fetchSingleSimulation,
  getPdfUrl
} from './api.js';
import { ChannelVisualizer } from './channel.js';
import { MeasurementLedger } from './ledger.js';
import {
  renderSweepChart,
  renderCompareChart,
  renderPolarizationDial,
  renderKeyRateChart
} from './charts.js';

class AppController {
  constructor() {
    this.currentData = null;
    this.isStepping = false;
    this.stepIndex = 1;
    this.keysMasked = true;
    this.keyRateRendered = false;

    this.initElements();
    this.initModules();
    this.bindEvents();
    this.initRouter();
    this.loadHistory();

    // Read deep-linking params from URL if present
    const hasCustomParams = this.readUrlParams();
    if (!hasCustomParams) {
      this.applyPreset('clean');
    }
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

    // Breadcrumb and share link
    this.breadcrumbCurrentSection = document.getElementById('breadcrumb-current-section');
    this.btnCopyShareUrl = document.getElementById('btn-copy-share-url');

    // Pipeline / Metrics
    this.metricRaw = document.getElementById('metric-raw');
    this.metricMatched = document.getElementById('metric-matched');
    this.metricTest = document.getElementById('metric-test');
    this.metricQber = document.getElementById('metric-qber');
    this.metricFinal = document.getElementById('metric-final');
    this.verdictBanner = document.getElementById('verdict-banner');
    this.verdictTitle = document.getElementById('verdict-title');
    this.verdictReason = document.getElementById('verdict-reason');

    // Mathematical Derivation Pipeline Bar
    this.mathRaw = document.getElementById('math-raw');
    this.mathSifted = document.getElementById('math-sifted');
    this.mathTest = document.getElementById('math-test');
    this.mathQber = document.getElementById('math-qber');
    this.mathLeak = document.getElementById('math-leak');
    this.mathFinal = document.getElementById('math-final');

    // Keys and OTP
    this.keyRawAlice = document.getElementById('key-raw-alice');
    this.keyRawBob = document.getElementById('key-raw-bob');
    this.keyMask = document.getElementById('key-mask');
    this.keySifted = document.getElementById('key-sifted');
    this.keyFinalAlice = document.getElementById('key-final-alice');
    this.keyFinalBob = document.getElementById('key-final-bob');
    this.badgeRawAlice = document.getElementById('badge-raw-alice');
    this.badgeRawBob = document.getElementById('badge-raw-bob');
    this.badgeMask = document.getElementById('badge-mask');
    this.badgeSifted = document.getElementById('badge-sifted');
    this.badgeFinalKey = document.getElementById('badge-final-key');
    this.finalKeyNote = document.getElementById('final-key-verdict-note');
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
    this.keyRateChartContainer = document.getElementById('keyrate-chart-container');
    this.btnRenderKeyRate = document.getElementById('btn-render-keyrate');
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

  initRouter() {
    const handleRoute = () => {
      const hash = window.location.hash || '#/workbench';
      this.navigateTo(hash, false);
    };

    window.addEventListener('hashchange', handleRoute);
    handleRoute();
  }

  navigateTo(hash, updateHistory = true) {
    const routes = {
      '#/workbench': { target: 'tab-workbench', breadcrumb: '§ 1. WORKBENCH & OPTICAL TRANSIT' },
      '#/experiments': { target: 'tab-experiments', breadcrumb: '§ 2. EMPIRICAL SWEEPS & KEY RATES' },
      '#/protocol': { target: 'tab-learn', breadcrumb: '§ 3. PROTOCOL ARCHITECTURE & LEARN' },
      '#/viva': { target: 'tab-viva', breadcrumb: '§ 4. EXAMINATION VIVA & LIMITATIONS' },
    };

    const routeKey = Object.keys(routes).find(r => hash.startsWith(r)) || '#/workbench';
    const route = routes[routeKey];

    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      if (btn.dataset.route === routeKey) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    document.querySelectorAll('.tab-section').forEach(sec => sec.style.display = 'none');
    const targetEl = document.getElementById(route.target);
    if (targetEl) targetEl.style.display = 'block';

    if (this.breadcrumbCurrentSection) {
      this.breadcrumbCurrentSection.textContent = route.breadcrumb;
    }

    if (updateHistory && window.location.hash !== routeKey) {
      window.location.hash = routeKey;
    }

    if (routeKey === '#/experiments') {
      this.renderKeyRate();
    }
  }

  renderKeyRate() {
    if (this.keyRateChartContainer && !this.keyRateRendered) {
      renderKeyRateChart(this.keyRateChartContainer);
      this.keyRateRendered = true;
    }
  }

  readUrlParams() {
    const params = new URLSearchParams(window.location.search);
    let found = false;
    if (params.has('n')) {
      const n = parseInt(params.get('n'), 10);
      if (!isNaN(n)) {
        this.qubitsInput.value = n;
        this.qubitsVal.textContent = n;
        found = true;
      }
    }
    if (params.has('eve')) {
      const active = params.get('eve') === '1' || params.get('eve') === 'true';
      this.eveToggle.checked = active;
      this.visualizer.setEveTapVisibility(active);
      found = true;
    }
    if (params.has('fraction')) {
      const frac = parseFloat(params.get('fraction'));
      if (!isNaN(frac)) {
        this.eveFractionInput.value = frac;
        this.eveFractionVal.textContent = `${Math.round(frac * 100)}%`;
        found = true;
      }
    }
    if (params.has('strategy')) {
      this.eveStrategySelect.value = params.get('strategy');
      found = true;
    }
    if (params.has('depol')) {
      const depol = parseFloat(params.get('depol'));
      if (!isNaN(depol)) {
        this.noiseDepolInput.value = depol;
        this.noiseDepolVal.textContent = `${Math.round(depol * 100)}%`;
        found = true;
      }
    }
    if (params.has('loss')) {
      const loss = parseFloat(params.get('loss'));
      if (!isNaN(loss)) {
        this.noiseLossInput.value = loss;
        this.noiseLossVal.textContent = `${Math.round(loss * 100)}%`;
        found = true;
      }
    }
    if (params.has('sample')) {
      const sample = parseFloat(params.get('sample'));
      if (!isNaN(sample)) {
        this.sampleFractionInput.value = sample;
        this.sampleFractionVal.textContent = `${Math.round(sample * 100)}%`;
        found = true;
      }
    }
    if (params.has('msg')) {
      this.messageInput.value = params.get('msg');
      found = true;
    }
    return found;
  }

  copyShareableUrl() {
    const cfg = this.getConfig();
    const params = new URLSearchParams();
    params.set('n', cfg.n_qubits);
    params.set('eve', cfg.eve.enabled ? '1' : '0');
    params.set('fraction', cfg.eve.fraction);
    params.set('strategy', cfg.eve.strategy);
    if (cfg.noise.depolarizing > 0) params.set('depol', cfg.noise.depolarizing);
    if (cfg.noise.loss > 0) params.set('loss', cfg.noise.loss);
    if (cfg.sample_fraction !== 0.25) params.set('sample', cfg.sample_fraction);
    if (cfg.message) params.set('msg', cfg.message);

    const hash = window.location.hash || '#/workbench';
    const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}${hash}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        if (this.btnCopyShareUrl) {
          const orig = this.btnCopyShareUrl.textContent;
          this.btnCopyShareUrl.textContent = '✓ Copied!';
          setTimeout(() => { this.btnCopyShareUrl.textContent = orig; }, 2000);
        }
      }).catch(() => {
        prompt('Copy experiment URL:', shareUrl);
      });
    } else {
      prompt('Copy experiment URL:', shareUrl);
    }
  }

  applyCaseStudy(caseName) {
    if (caseName === 'innocent') {
      this.qubitsInput.value = 256;
      this.eveToggle.checked = false;
      this.eveFractionInput.value = 0.0;
      this.noiseDepolInput.value = 0.0;
      this.noiseLossInput.value = 0.0;
      this.sampleFractionInput.value = 0.25;
    } else if (caseName === 'textbook') {
      this.qubitsInput.value = 256;
      this.eveToggle.checked = true;
      this.eveFractionInput.value = 1.0;
      this.eveStrategySelect.value = 'random';
      this.noiseDepolInput.value = 0.0;
      this.noiseLossInput.value = 0.0;
      this.sampleFractionInput.value = 0.25;
    } else if (caseName === 'stealth') {
      this.qubitsInput.value = 256;
      this.eveToggle.checked = true;
      this.eveFractionInput.value = 0.10;
      this.eveStrategySelect.value = 'random';
      this.noiseDepolInput.value = 0.0;
      this.noiseLossInput.value = 0.0;
      this.sampleFractionInput.value = 0.25;
    } else if (caseName === 'boundary') {
      this.qubitsInput.value = 256;
      this.eveToggle.checked = true;
      this.eveFractionInput.value = 0.44; // ~11% QBER on basis matches
      this.eveStrategySelect.value = 'random';
      this.noiseDepolInput.value = 0.0;
      this.noiseLossInput.value = 0.0;
      this.sampleFractionInput.value = 0.25;
    }

    this.qubitsVal.textContent = this.qubitsInput.value;
    this.eveFractionVal.textContent = `${Math.round(this.eveFractionInput.value * 100)}%`;
    this.noiseDepolVal.textContent = `${Math.round(this.noiseDepolInput.value * 100)}%`;
    this.noiseLossVal.textContent = `${Math.round(this.noiseLossInput.value * 100)}%`;
    this.sampleFractionVal.textContent = `${Math.round(this.sampleFractionInput.value * 100)}%`;
    this.visualizer.setEveTapVisibility(this.eveToggle.checked);
    this.navigateTo('#/workbench');
    this.executeSimulation();
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

    // Share URL
    if (this.btnCopyShareUrl) {
      this.btnCopyShareUrl.addEventListener('click', () => this.copyShareableUrl());
    }

    // Presets
    document.querySelectorAll('.preset-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.applyPreset(chip.dataset.preset);
        this.executeSimulation();
      });
    });

    // Examiner Case Studies
    document.querySelectorAll('.case-study-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.applyCaseStudy(btn.dataset.case);
      });
    });

    // Navigation Tabs (triggers SPA routing)
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const route = btn.dataset.route || '#/workbench';
        this.navigateTo(route, true);
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
    if (this.btnRenderKeyRate) {
      this.btnRenderKeyRate.addEventListener('click', () => {
        this.keyRateRendered = false;
        this.renderKeyRate();
      });
    }

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
    if (this.mathRaw) this.mathRaw.textContent = '—';
    if (this.mathSifted) this.mathSifted.textContent = '—';
    if (this.mathTest) this.mathTest.textContent = '—';
    if (this.mathQber) this.mathQber.textContent = '—';
    if (this.mathLeak) this.mathLeak.textContent = '—';
    if (this.mathFinal) this.mathFinal.textContent = '—';
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

    // Update Live Mathematical Derivation Pipeline Bar
    if (this.mathRaw) this.mathRaw.textContent = s.raw;
    if (this.mathSifted) this.mathSifted.textContent = s.matched;
    if (this.mathTest) this.mathTest.textContent = s.test;
    if (this.mathQber) this.mathQber.textContent = q.value !== null ? `${(q.value * 100).toFixed(1)}%` : '—';
    if (this.mathLeak) {
      const leak = this.currentData.postprocess?.cascade?.leakage_bits ?? 0;
      this.mathLeak.textContent = `${leak} bits`;
    }
    if (this.mathFinal) this.mathFinal.textContent = `${s.final} bits`;
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
    const stages = this.currentData.stages;
    const verdict = this.currentData.verdict;

    // Format in 8-bit groups for readability and clean line-wrapping
    const formatChunked = (str) => {
      if (!str) return '—';
      const masked = this.keysMasked ? str.replace(/[0-9]/g, '●') : str;
      return masked.match(/.{1,8}/g)?.join(' ') || masked;
    };

    this.keyRawAlice.textContent = formatChunked(k.alice_raw);
    this.keyRawBob.textContent = formatChunked(k.bob_raw);
    this.keyMask.textContent = k.basis_mask ? (k.basis_mask.match(/.{1,8}/g)?.join(' ') || k.basis_mask) : '—';
    this.keySifted.textContent = formatChunked(k.sifted_alice);

    const isAccepted = verdict.status === 'accepted';
    const finalLen = stages.final || 0;

    if (this.badgeRawAlice) this.badgeRawAlice.textContent = `${stages.raw} BITS`;
    if (this.badgeRawBob) this.badgeRawBob.textContent = `${stages.detected} DETECTED`;
    if (this.badgeMask) this.badgeMask.textContent = `${stages.matched} MATCHING BASES`;
    if (this.badgeSifted) this.badgeSifted.textContent = `${stages.matched} SIFTED BITS`;

    if (isAccepted && finalLen > 0) {
      this.keyFinalAlice.textContent = formatChunked(k.final_alice);
      this.keyFinalBob.textContent = formatChunked(k.final_bob);
      this.keyFinalAlice.style.color = 'var(--color-match)';
      this.keyFinalBob.style.color = 'var(--color-match)';
      if (this.badgeFinalKey) {
        this.badgeFinalKey.textContent = `${finalLen} BITS DISTILLED (MATCH)`;
        this.badgeFinalKey.className = 'stream-badge final-badge mono';
      }
      if (this.finalKeyNote) {
        const hashPreview = k.hash_alice ? k.hash_alice.substring(0, 16) : '';
        this.finalKeyNote.innerHTML = `<b>✓ Cryptographic Verification Passed:</b> Identical SHA-256 Hashes (<span class="mono">${hashPreview}...</span>)`;
        this.finalKeyNote.style.color = 'var(--color-match)';
      }
    } else {
      const abortReason = verdict.status === 'aborted' ? '[ABORTED — POSSIBLE EAVESDROPPING DETECTED]' : '[NO USABLE KEY DISTILLED]';
      this.keyFinalAlice.textContent = abortReason;
      this.keyFinalBob.textContent = abortReason;
      this.keyFinalAlice.style.color = 'var(--color-eve)';
      this.keyFinalBob.style.color = 'var(--color-eve)';
      if (this.badgeFinalKey) {
        this.badgeFinalKey.textContent = `0 BITS (${verdict.status.toUpperCase()})`;
        this.badgeFinalKey.className = 'stream-badge mono';
      }
      if (this.finalKeyNote) {
        this.finalKeyNote.textContent = 'Protocol aborted or key depleted during privacy amplification.';
        this.finalKeyNote.style.color = 'var(--color-eve)';
      }
    }

    if (this.currentData.message && isAccepted) {
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
        <div id="polarization-dial-mount"></div>
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

      // Mount polarization statevector dial
      const dialMount = document.getElementById('polarization-dial-mount');
      if (dialMount) {
        renderPolarizationDial(dialMount, data.alice.state, data.bob.basis, data.eve ? data.eve.basis : null);
      }
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
          try {
            const res = await fetchSingleSimulation(item.id);
            this.currentData = res;
            this.ledger.setData(res.qubits);
            this.renderMetrics();
            this.renderVerdict();
            this.renderKeys();
          } catch (err) {
            console.error('Failed to load historic run', err);
          }
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
