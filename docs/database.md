# Persistence Schema: SQLite & Zoho Catalyst Data Store

## Table: `simulations`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `VARCHAR(32)` | `PRIMARY KEY` | Unique experiment identifier (e.g., `sim-8fae2ef7`) |
| `created_at` | `FLOAT / DOUBLE` | `NOT NULL` | Epoch timestamp of experiment completion |
| `n_qubits` | `INT` | `NOT NULL` | Total raw qubits transmitted ($N$) |
| `eve_enabled` | `BOOLEAN / INT` | `NOT NULL` | Whether Eve tap was engaged (1/0) |
| `eve_fraction` | `FLOAT` | `NOT NULL` | Interception rate $[0.0, 1.0]$ |
| `noise_depol` | `FLOAT` | `NOT NULL` | Channel depolarizing probability $[0.0, 0.5]$ |
| `noise_bitflip` | `FLOAT` | `NOT NULL` | Channel bit-flip probability $[0.0, 0.5]$ |
| `noise_loss` | `FLOAT` | `NOT NULL` | Photon loss probability $[0.0, 0.95]$ |
| `qber` | `FLOAT` | `NOT NULL` | Measured test sample QBER (or -1.0 if aborted/untested) |
| `status` | `VARCHAR(32)` | `NOT NULL` | Verdict code (`accepted`, `aborted`, `insufficient`) |
| `sifted_len` | `INT` | `NOT NULL` | Total basis-matching detected bits |
| `final_len` | `INT` | `NOT NULL` | Final secret key length in bits |
| `seed` | `BIGINT` | `NOT NULL` | PRNG seed for exact reproducibility |
| `summary_json` | `TEXT` | `NOT NULL` | JSON envelope for lightweight history list queries |
| `data_json` | `TEXT` | `NOT NULL` | Full serializable experiment data including per-qubit records |

## Cloud Adaptation for Zoho Catalyst
When provisioning on Zoho Catalyst, this schema directly maps to:
1. **Catalyst Data Store:** Create table `Simulations` with the column types above.
2. **Catalyst File Store / Stratus (Optional):** For experiments with $N > 10,000$ qubits, `data_json` can be stored as an object file and referenced by `id`.
