/**
 * Scientific SVG Chart Generator.
 * Implements high-precision data visualizations for parameter sweeps and batch comparisons.
 * Strict adherence to Physics Lab Notebook aesthetic: crisp rules, precise ticks, semantic colours.
 */

export function renderSweepChart(container, data) {
  const points = data.points || [];
  if (points.length === 0) {
    container.innerHTML = '<div style="padding:40px; text-align:center; color:var(--color-ink-tertiary);">No sweep data available.</div>';
    return;
  }

  const width = 640;
  const height = 300;
  const padLeft = 50;
  const padRight = 30;
  const padTop = 30;
  const padBottom = 40;

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  // Max X and Y
  const maxX = points[points.length - 1].param_value || 1.0;
  const maxY = 0.50; // QBER up to 50%

  const scaleX = val => padLeft + (val / maxX) * plotW;
  const scaleY = val => padTop + plotH - (Math.min(val, maxY) / maxY) * plotH;

  // Grid lines
  let gridSvg = '';
  for (let y = 0; y <= 0.5; y += 0.1) {
    const py = scaleY(y);
    gridSvg += `
      <line x1="${padLeft}" y1="${py}" x2="${width - padRight}" y2="${py}" stroke="var(--color-rule-faint)" stroke-width="1" />
      <text x="${padLeft - 8}" y="${py + 3}" text-anchor="end" font-family="var(--font-mono)" font-size="10" fill="var(--color-ink-tertiary)">${(y * 100).toFixed(0)}%</text>
    `;
  }

  // Threshold Line (11%)
  const thrY = scaleY(data.threshold || 0.11);
  const thrLine = `
    <line x1="${padLeft}" y1="${thrY}" x2="${width - padRight}" y2="${thrY}" stroke="var(--color-eve)" stroke-dasharray="4 4" stroke-width="1.5" />
    <text x="${width - padRight - 5}" y="${thrY - 6}" text-anchor="end" font-family="var(--font-mono)" font-size="10" fill="var(--color-eve)">Threshold: 11%</text>
  `;

  // Theory curve (dashed Ochre)
  let theoryPath = '';
  points.forEach((p, idx) => {
    const px = scaleX(p.param_value);
    const py = scaleY(p.theory_qber);
    theoryPath += `${idx === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)} `;
  });

  // Simulated Points & Line (Solid Ink)
  let simPath = '';
  let dotsSvg = '';
  points.forEach((p, idx) => {
    const px = scaleX(p.param_value);
    const py = scaleY(p.simulated_qber);
    simPath += `${idx === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)} `;
    const dotColor = p.simulated_qber > 0.11 ? 'var(--color-eve)' : 'var(--color-match)';
    dotsSvg += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3.5" fill="${dotColor}" stroke="var(--color-ink)" stroke-width="1" />`;
  });

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" style="width:100%; height:auto; display:block;">
      ${gridSvg}
      <line x1="${padLeft}" y1="${padTop + plotH}" x2="${width - padRight}" y2="${padTop + plotH}" stroke="var(--color-ink)" stroke-width="1.5" />
      <line x1="${padLeft}" y1="${padTop}" x2="${padLeft}" y2="${padTop + plotH}" stroke="var(--color-ink)" stroke-width="1.5" />
      ${thrLine}
      <path d="${theoryPath}" fill="none" stroke="var(--color-basis-x)" stroke-dasharray="5 3" stroke-width="2" />
      <path d="${simPath}" fill="none" stroke="var(--color-ink)" stroke-width="1.5" />
      ${dotsSvg}
      <text x="${width / 2}" y="${height - 8}" text-anchor="middle" font-family="var(--font-mono)" font-size="11" fill="var(--color-ink)">Interception Fraction (0.0 to 1.0)</text>
      <text x="14" y="${height / 2}" text-anchor="middle" transform="rotate(-90 14,${height / 2})" font-family="var(--font-mono)" font-size="11" fill="var(--color-ink)">QBER (%)</text>
    </svg>
    <div class="chart-caption">
      <b>Fig. 2 — Empirical QBER vs. Interception Fraction.</b> Solid black dots represent simulated points from real Aer measurements. Dashed ochre curve shows theoretical expectation (Q = 0.25 × fraction). Dashed red line shows 11% abort limit.
    </div>
  `;
}

export function renderCompareChart(container, data) {
  const offSeries = data.eve_off || [];
  const onSeries = data.eve_on || [];
  if (offSeries.length === 0) return;

  const width = 640;
  const height = 240;
  const padLeft = 45;
  const padRight = 30;
  const padTop = 25;
  const padBottom = 35;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const nRuns = offSeries.length;
  const scaleX = runIdx => padLeft + (runIdx / (nRuns - 1)) * plotW;
  const scaleY = val => padTop + plotH - (Math.min(val, 0.4) / 0.4) * plotH;

  let offPoints = '';
  let onPoints = '';

  offSeries.forEach((item, idx) => {
    const px = scaleX(idx);
    const py = scaleY(item.qber || 0);
    offPoints += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="4" fill="var(--color-match)" stroke="var(--color-ink)" stroke-width="1" />`;
  });

  onSeries.forEach((item, idx) => {
    const px = scaleX(idx);
    const py = scaleY(item.qber || 0);
    onPoints += `<rect x="${(px - 3.5).toFixed(1)}" y="${(py - 3.5).toFixed(1)}" width="7" height="7" fill="var(--color-eve)" stroke="var(--color-ink)" stroke-width="1" />`;
  });

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" style="width:100%; height:auto; display:block;">
      <line x1="${padLeft}" y1="${padTop + plotH}" x2="${width - padRight}" y2="${padTop + plotH}" stroke="var(--color-ink)" stroke-width="1" />
      <line x1="${padLeft}" y1="${padTop}" x2="${padLeft}" y2="${padTop + plotH}" stroke="var(--color-ink)" stroke-width="1" />
      ${offPoints}
      ${onPoints}
      <text x="${width / 2}" y="${height - 6}" text-anchor="middle" font-family="var(--font-mono)" font-size="10" fill="var(--color-ink)">Run Index (1 to ${nRuns})</text>
      <text x="12" y="${height / 2}" text-anchor="middle" transform="rotate(-90 12,${height / 2})" font-family="var(--font-mono)" font-size="10" fill="var(--color-ink)">QBER (%)</text>
    </svg>
    <div class="chart-caption">
      <b>Fig. 3 — Parallel Batch Comparison.</b> Green circles: Clean channel (Eve OFF, QBER ≈ 0%). Red squares: Intercept-resend active (Eve ON, QBER elevated).
    </div>
  `;
}

/**
 * 2D Polarization Statevector Dial SVG.
 * Demonstrates state projection onto measurement basis axes.
 */
export function renderPolarizationDial(container, aliceState, bobBasis, eveBasis = null) {
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const r = 62;

  const angles = {
    '|0⟩': 0,
    '|1⟩': 90,
    '|+⟩': 45,
    '|−⟩': 135,
  };
  const deg = angles[aliceState] !== undefined ? angles[aliceState] : 0;
  const rad = (deg * Math.PI) / 180;
  const x = cx + r * Math.cos(rad);
  const y = cy - r * Math.sin(rad);

  // Bob measurement axes
  let bobAxes = '';
  if (bobBasis === 'Z') {
    bobAxes = `
      <line x1="${cx - r - 8}" y1="${cy}" x2="${cx + r + 8}" y2="${cy}" stroke="var(--color-ink)" stroke-width="1" stroke-dasharray="2 2" />
      <line x1="${cx}" y1="${cy - r - 8}" x2="${cx}" y2="${cy + r + 8}" stroke="var(--color-ink)" stroke-width="1" stroke-dasharray="2 2" />
      <text x="${cx + r + 10}" y="${cy + 3}" font-family="var(--font-mono)" font-size="9" fill="var(--color-ink)">|0⟩</text>
      <text x="${cx}" y="${cy - r - 6}" text-anchor="middle" font-family="var(--font-mono)" font-size="9" fill="var(--color-ink)">|1⟩</text>
    `;
  } else {
    const diag = (r + 8) * Math.SQRT1_2;
    bobAxes = `
      <line x1="${cx - diag}" y1="${cy + diag}" x2="${cx + diag}" y2="${cy - diag}" stroke="var(--color-basis-x)" stroke-width="1.2" stroke-dasharray="3 3" />
      <line x1="${cx - diag}" y1="${cy - diag}" x2="${cx + diag}" y2="${cy + diag}" stroke="var(--color-basis-x)" stroke-width="1.2" stroke-dasharray="3 3" />
      <text x="${cx + diag + 8}" y="${cy - diag}" font-family="var(--font-mono)" font-size="9" fill="var(--color-basis-x)">|+⟩</text>
      <text x="${cx - diag - 12}" y="${cy - diag}" font-family="var(--font-mono)" font-size="9" fill="var(--color-basis-x)">|−⟩</text>
    `;
  }

  let eveIndicator = '';
  if (eveBasis) {
    eveIndicator = `<div style="font-family:var(--font-mono); font-size:10px; color:var(--color-eve); margin-top:2px;">Eve tapped in ${eveBasis} basis</div>`;
  }

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; align-items:center; background:var(--color-paper-secondary); border:var(--border-rule); border-radius:var(--radius-sm); padding:10px; margin-bottom:12px;">
      <div style="font-family:var(--font-mono); font-size:10px; text-transform:uppercase; color:var(--color-ink-secondary); margin-bottom:4px; font-weight:700;">
        2D Polarization State Projection
      </div>
      <svg viewBox="0 0 ${size} ${size}" style="width:${size}px; height:${size}px;">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--color-rule)" stroke-width="1" />
        <circle cx="${cx}" cy="${cy}" r="2" fill="var(--color-ink)" />
        ${bobAxes}
        <!-- State Vector Arrow -->
        <line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--color-ink)" stroke-width="2.5" />
        <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="var(--color-match)" stroke="var(--color-ink)" stroke-width="1" />
      </svg>
      <div style="font-family:var(--font-mono); font-size:11px; margin-top:4px; text-align:center;">
        State: <b>${aliceState} (${deg}°)</b> | Basis: <b>${bobBasis}</b>
      </div>
      ${eveIndicator}
    </div>
  `;
}

/**
 * Shor-Preskill Secret Key Rate Curve Chart.
 * Plots R(Q) = max(0, 1 - 2*h(Q)) and marks the critical 11% cutoff.
 */
export function renderKeyRateChart(container) {
  const width = 640;
  const height = 240;
  const padLeft = 45;
  const padRight = 30;
  const padTop = 25;
  const padBottom = 35;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const h2 = p => {
    if (p <= 0 || p >= 1) return 0;
    return -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
  };

  const scaleX = q => padLeft + (q / 0.25) * plotW;
  const scaleY = r => padTop + plotH - (r / 1.0) * plotH;

  let pathD = '';
  for (let q = 0; q <= 0.25; q += 0.005) {
    const rate = Math.max(0, 1 - 2 * h2(q));
    const px = scaleX(q);
    const py = scaleY(rate);
    pathD += `${q === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)} `;
  }

  const cutoffX = scaleX(0.11);
  const cutoffY = scaleY(0);

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" style="width:100%; height:auto; display:block;">
      <line x1="${padLeft}" y1="${padTop + plotH}" x2="${width - padRight}" y2="${padTop + plotH}" stroke="var(--color-ink)" stroke-width="1.5" />
      <line x1="${padLeft}" y1="${padTop}" x2="${padLeft}" y2="${padTop + plotH}" stroke="var(--color-ink)" stroke-width="1.5" />
      
      <!-- Critical 11% line -->
      <line x1="${cutoffX}" y1="${padTop}" x2="${cutoffX}" y2="${padTop + plotH}" stroke="var(--color-eve)" stroke-dasharray="3 3" stroke-width="1.2" />
      <text x="${cutoffX + 4}" y="${padTop + 14}" font-family="var(--font-mono)" font-size="10" fill="var(--color-eve)">Q_crit = 11.0% (R = 0)</text>

      <!-- Curve -->
      <path d="${pathD}" fill="none" stroke="var(--color-match)" stroke-width="2" />
      
      <!-- Axis Labels -->
      <text x="${width / 2}" y="${height - 6}" text-anchor="middle" font-family="var(--font-mono)" font-size="10" fill="var(--color-ink)">Quantum Bit Error Rate QBER (0 to 25%)</text>
      <text x="12" y="${height / 2}" text-anchor="middle" transform="rotate(-90 12,${height / 2})" font-family="var(--font-mono)" font-size="10" fill="var(--color-ink)">Key Rate R(Q)</text>
    </svg>
    <div class="chart-caption">
      <b>Fig. 4 — Shor-Preskill Asymptotic Key Rate $R(Q) = 1 - 2h_2(Q)$.</b> Above the critical 11% threshold, the mutual information $I(A:B) < I(A:E)$, dropping distillable key rate to exactly 0.
    </div>
  `;
}
