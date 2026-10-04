/**
 * BB84 Lab API Client module.
 * Communicates with the FastAPI backend using standard fetch and JSON schemas.
 */

const API_BASE = '/api';

export async function runSimulation(config) {
  const res = await fetch(`${API_BASE}/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Simulation execution failed');
  }
  return res.json();
}

export async function fetchStep(config, stepIdx) {
  const res = await fetch(`${API_BASE}/step?step_idx=${stepIdx}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error('Failed to fetch step');
  return res.json();
}

export async function runSweep(config) {
  const res = await fetch(`${API_BASE}/sweep`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error('Parameter sweep failed');
  return res.json();
}

export async function runCompare(config) {
  const res = await fetch(`${API_BASE}/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error('Batch comparison failed');
  return res.json();
}

export async function fetchCircuit(simId, qubitIdx) {
  const res = await fetch(`${API_BASE}/circuit/${simId}/${qubitIdx}`);
  if (!res.ok) throw new Error('Failed to inspect circuit');
  return res.json();
}

export async function fetchHistory(limit = 20, offset = 0) {
  const res = await fetch(`${API_BASE}/simulations?limit=${limit}&offset=${offset}`);
  if (!res.ok) throw new Error('Failed to fetch history');
  return res.json();
}

export async function fetchSingleSimulation(simId) {
  const res = await fetch(`${API_BASE}/simulations/${simId}`);
  if (!res.ok) throw new Error('Failed to retrieve experiment');
  return res.json();
}

export function getPdfUrl(simId) {
  return `${API_BASE}/simulations/${simId}/report.pdf`;
}
