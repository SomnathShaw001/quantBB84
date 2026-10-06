/**
 * BB84 Lab API Client module with Hybrid Fallback Engine.
 * 
 * Supports:
 * 1. Authoritative Python/FastAPI/Qiskit Aer backend (via Zoho Catalyst AppSail or local dev).
 * 2. Automatic client-side mathematical simulation fallback (when deployed on static hosts
 *    such as Zoho Catalyst Slate, GitHub Pages, or when offline).
 * 3. Custom backend endpoint override via `window.CATALYST_API_URL` or URL query `?api=https://...`.
 */

import {
  simulateClientBB84,
  buildCircuitInspect,
  simulateClientSweep,
  simulateClientCompare
} from './client_sim.js';

// Determine initial API base
const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
export const customApiUrl = (typeof window !== 'undefined' && window.CATALYST_API_URL) || (searchParams ? searchParams.get('api') : null);
export let API_BASE = customApiUrl || '/api';

export let activeEngine = 'detecting'; // 'qiskit-aer' | 'client-math'
let lastSimulation = null;

function updateBadge(backendName, statusText, isFallback) {
  if (typeof document === 'undefined') return;
  const labelEl = document.getElementById('header-backend-label');
  const statusEl = document.getElementById('header-backend-status');
  const indicatorEl = document.getElementById('header-backend-indicator');
  if (labelEl) labelEl.textContent = backendName;
  if (statusEl) statusEl.textContent = statusText;
  if (indicatorEl) {
    if (isFallback) {
      indicatorEl.style.backgroundColor = '#d97706';
      indicatorEl.title = 'Running standalone mathematical client engine. Connect an AppSail backend for full Qiskit Aer statevectors.';
    } else {
      indicatorEl.style.backgroundColor = 'var(--color-match, #2ea043)';
      indicatorEl.title = 'Connected to authoritative Qiskit Aer backend.';
    }
  }
}

function saveLocalHistory(sim) {
  try {
    if (!sim || !sim.id) return;
    const historyKey = 'bb84_local_history';
    const list = JSON.parse(localStorage.getItem(historyKey) || '[]');
    const summary = {
      id: sim.id,
      created_at: sim.created_at || (Date.now() / 1000),
      n_qubits: sim.stages ? sim.stages.raw : 256,
      eve_enabled: !!(sim.config && sim.config.eve && sim.config.eve.enabled),
      depolarizing: sim.config && sim.config.noise ? sim.config.noise.depolarizing : 0.0,
      qber: sim.qber ? sim.qber.value : 0.0,
      status: sim.verdict ? sim.verdict.status : 'accepted',
      final_key_len: sim.stages ? sim.stages.final : 0
    };
    if (!list.some(item => item.id === summary.id)) {
      list.unshift(summary);
      localStorage.setItem(historyKey, JSON.stringify(list.slice(0, 50)));
    }
    localStorage.setItem(`bb84_sim_${sim.id}`, JSON.stringify(sim));
  } catch (err) {
    console.debug('Storage limit reached or local storage disabled:', err);
  }
}

function getLocalHistory() {
  try {
    return JSON.parse(localStorage.getItem('bb84_local_history') || '[]');
  } catch {
    return [];
  }
}

export async function runSimulation(config) {
  // Try remote backend if not already determined to be in standalone static mode
  if (activeEngine !== 'client-math') {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${API_BASE}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        activeEngine = 'qiskit-aer';
        updateBadge('QISKIT AER (CLIFFORD)', 'SIMULATION ONLINE', false);
        const data = await res.json();
        lastSimulation = data;
        saveLocalHistory(data);
        return data;
      }
    } catch (err) {
      console.warn('[BB84 Lab] Backend unavailable. Falling back to in-browser mathematical simulation engine:', err.message);
    }
  }

  // Fallback: Client-Side Standalone Simulation
  activeEngine = 'client-math';
  updateBadge('BROWSER ENGINE (BB84 MATH)', 'STATIC SLATE STANDALONE', true);
  const data = simulateClientBB84(config);
  lastSimulation = data;
  saveLocalHistory(data);
  return data;
}

export async function fetchStep(config, stepIdx) {
  if (activeEngine !== 'client-math') {
    try {
      const res = await fetch(`${API_BASE}/step?step_idx=${stepIdx}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn('[BB84 Lab] Step API call failed, using client fallback:', err.message);
    }
  }

  // Fallback: build step from cached simulation or re-run client sim
  if (!lastSimulation || !lastSimulation.qubits || lastSimulation.qubits.length < stepIdx) {
    lastSimulation = simulateClientBB84(config);
  }
  const targetQubit = lastSimulation.qubits[stepIdx - 1] || lastSimulation.qubits[0];
  return {
    step: stepIdx,
    total: config.n_qubits || 256,
    qubit: targetQubit,
    circuit: buildCircuitInspect(targetQubit)
  };
}

export async function runSweep(config) {
  if (activeEngine !== 'client-math') {
    try {
      const res = await fetch(`${API_BASE}/sweep`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn('[BB84 Lab] Sweep API failed, using client fallback:', err.message);
    }
  }
  return simulateClientSweep(config);
}

export async function runCompare(config) {
  if (activeEngine !== 'client-math') {
    try {
      const res = await fetch(`${API_BASE}/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn('[BB84 Lab] Compare API failed, using client fallback:', err.message);
    }
  }
  return simulateClientCompare(config);
}

export async function fetchCircuit(simId, qubitIdx) {
  if (activeEngine !== 'client-math') {
    try {
      const res = await fetch(`${API_BASE}/circuit/${simId}/${qubitIdx}`);
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn('[BB84 Lab] Circuit API failed, using client fallback:', err.message);
    }
  }

  if (lastSimulation && lastSimulation.qubits && lastSimulation.qubits[qubitIdx - 1]) {
    return buildCircuitInspect(lastSimulation.qubits[qubitIdx - 1]);
  }
  try {
    const raw = localStorage.getItem(`bb84_sim_${simId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.qubits && parsed.qubits[qubitIdx - 1]) {
        return buildCircuitInspect(parsed.qubits[qubitIdx - 1]);
      }
    }
  } catch (err) {
    console.debug('Error reading local circuit cache:', err);
  }
  throw new Error('Circuit data unavailable for this qubit index');
}

export async function fetchHistory(limit = 20, offset = 0) {
  if (activeEngine !== 'client-math') {
    try {
      const res = await fetch(`${API_BASE}/simulations?limit=${limit}&offset=${offset}`);
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn('[BB84 Lab] History API failed, using local history:', err.message);
    }
  }

  const items = getLocalHistory();
  return {
    items: items.slice(offset, offset + limit),
    total: items.length
  };
}

export async function fetchSingleSimulation(simId) {
  if (activeEngine !== 'client-math') {
    try {
      const res = await fetch(`${API_BASE}/simulations/${simId}`);
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn('[BB84 Lab] Single simulation API failed, trying local storage:', err.message);
    }
  }

  try {
    const raw = localStorage.getItem(`bb84_sim_${simId}`);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.debug('Error reading local experiment cache:', err);
  }
  throw new Error('Simulation not found in local cache');
}

export function getPdfUrl(simId) {
  if (activeEngine === 'client-math' && !customApiUrl) {
    return null;
  }
  return `${API_BASE}/simulations/${simId}/report.pdf`;
}
