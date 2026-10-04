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
