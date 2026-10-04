/**
 * BB84 Measurement Ledger Component.
 * Ruled data table with sort, filter, and qubit selection for circuit inspection.
 */

export class MeasurementLedger {
  constructor({ tableBody, filterSelect, onSelectQubit }) {
    this.tableBody = tableBody;
    this.filterSelect = filterSelect;
    this.onSelectQubit = onSelectQubit;
    this.qubits = [];
    this.filteredQubits = [];
    this.sortCol = 'i';
    this.sortAsc = true;
    this.selectedIdx = null;

    if (this.filterSelect) {
      this.filterSelect.addEventListener('change', () => this.applyFilter());
    }
  }

  setData(qubits) {
    this.qubits = qubits || [];
    this.applyFilter();
  }

  applyFilter() {
    const filter = this.filterSelect ? this.filterSelect.value : 'all';
    if (filter === 'all') {
      this.filteredQubits = [...this.qubits];
    } else if (filter === 'keep') {
      this.filteredQubits = this.qubits.filter(q => q.match);
    } else if (filter === 'discard') {
      this.filteredQubits = this.qubits.filter(q => !q.match && !q.lost);
    } else if (filter === 'error') {
      this.filteredQubits = this.qubits.filter(q => q.error);
    } else if (filter === 'test') {
      this.filteredQubits = this.qubits.filter(q => q.role === 'test');
    } else if (filter === 'eve') {
      this.filteredQubits = this.qubits.filter(q => q.eve);
    } else if (filter === 'lost') {
      this.filteredQubits = this.qubits.filter(q => q.lost);
    }
    this.applySort();
  }

  sortBy(col) {
    if (this.sortCol === col) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortCol = col;
      this.sortAsc = true;
    }
    this.applySort();
  }

  applySort() {
    const col = this.sortCol;
    const factor = this.sortAsc ? 1 : -1;

    this.filteredQubits.sort((a, b) => {
      let va = a[col];
      let vb = b[col];
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      if (va < vb) return -1 * factor;
      if (va > vb) return 1 * factor;
      return 0;
    });

    this.render();
  }

  render() {
    this.tableBody.innerHTML = '';
    const slice = this.filteredQubits.slice(0, 150); // limit DOM nodes for speed

    if (slice.length === 0) {
      this.tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:16px; color:var(--color-ink-tertiary);">No records match active filter.</td></tr>`;
      return;
    }

    const fragment = document.createDocumentFragment();

    slice.forEach(q => {
      const tr = document.createElement('tr');
      if (this.selectedIdx === q.i) {
        tr.classList.add('selected');
      }

      let resBadge = '';
      if (q.lost) {
        resBadge = `<span class="badge-discard">LOST</span>`;
      } else if (q.error) {
        resBadge = `<span class="badge-error">✕ ERROR</span>`;
      } else if (q.match) {
        resBadge = `<span class="badge-keep">✓ KEEP</span>`;
      } else {
        resBadge = `<span class="badge-discard">— DISCARD</span>`;
      }

      const eveInfo = q.eve ? `${q.e_basis}:${q.e_bit}` : '—';
      const bobBit = q.lost ? '·' : q.b_bit;

      tr.innerHTML = `
        <td style="font-weight:600;">${q.i}</td>
        <td>${q.a_bit}</td>
        <td><span class="state-chip ${q.a_basis === 'Z' ? 'state-z' : 'state-x'}">${q.a_basis}</span></td>
        <td>${q.state}</td>
        <td style="${q.eve ? 'color:var(--color-eve); font-weight:600;' : ''}">${eveInfo}</td>
        <td><span class="state-chip ${q.b_basis === 'Z' ? 'state-z' : 'state-x'}">${q.b_basis}</span></td>
        <td>${bobBit}</td>
        <td>${resBadge}</td>
        <td style="text-transform:uppercase; font-size:10px; color:var(--color-ink-secondary);">${q.role}</td>
      `;

      tr.addEventListener('click', () => {
        this.selectedIdx = q.i;
        this.render();
        if (this.onSelectQubit) this.onSelectQubit(q);
      });

      fragment.appendChild(tr);
    });

    this.tableBody.appendChild(fragment);
  }
}
