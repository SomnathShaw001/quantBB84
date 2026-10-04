# MASTER PROMPT — BB84 Quantum Key Distribution Simulator

> Copy everything below the line and give it to the build agent.

---

You are building a complete, production-quality project: **BB84 Quantum Key Distribution Simulator** (Python + Qiskit). It simulates the Alice–Bob key exchange and detects an eavesdropper (Eve) through the disturbance caused by quantum measurement. The final product is **one interactive web page** backed by a Python API, deployed on **Zoho Catalyst** (you have access to it).

Work **phase by phase**. Do not skip phases. After each phase:
1. Check every item in that phase's **Exit criteria**.
2. Commit with the message `phase-N: <summary>`.
3. Add a section to `PROGRESS.md` covering what you built, what you tested, any known issues, and the next step.
4. Keep going to the next phase. **Stop and ask me only** before the first production deploy (Phase 9), or if something is blocked.

---

## PHASE 0 — Project setup and the UI guardrail skill

### 0.1 Create the workspace skill (do this first)
Create `.agents/skills/no-ai-look-ui/SKILL.md` with YAML frontmatter (`name: no-ai-look-ui`, plus a `description` saying it must be used for any HTML/CSS/JS/UI work in this repo). If the global `anti-ai-slop-ui` skill is available, read it and follow it as well. Your skill adds project-specific rules on top. Its content must enforce the following:

**BANNED (zero tolerance unless I approve):**
- Glassmorphism, frosted panels, `backdrop-filter: blur`, translucent cards
- Blue/purple/indigo/violet/cyan/magenta as primary or accent colours. No purple-to-blue gradients.
- Neon glow, `box-shadow` glows, text glow, "cyber" or "quantum" sparkle effects
- Dark-navy or black "space" backgrounds with particles, starfields, aurora, blobs, or mesh gradients
- Gradient text in headings
- A centred hero, then a subtitle, then 2 CTAs, then 3 feature cards, then a CTA layout
- Bento grids used as decoration, or a row of identical equal-weight cards
- Emoji used as icons
- Large border-radius on everything (max radius is 4px, except where a function needs it)
- Hover-lift animation on every card, or scroll-reveal on every section
- Inter, Geist, or Poppins chosen because they are the default
- Phrases like "Unlock the power of quantum", "Revolutionary", or "Next-gen"
- AI sparkle icons, fake testimonials, fake statistics, fake partner logos, or a giant marketing hero
- Wrapping every section in a rounded rectangle, or decorative cards with no data in them
- Any visual effect with no purpose. Every effect must explain the simulation.

**REQUIRED visual direction: "Physics Lab Notebook / Research Instrument"**
- Background: warm off-white paper (e.g. `#F4F1EA`), ink near-black text (`#1B1B1B`), with a subtle graph-paper grid only on the channel/workbench area
- Colour is used **only to encode meaning**, never as decoration:
  - Rectilinear basis (+) = graphite/ink
  - Diagonal basis (×) = ochre (`#B7791F`)
  - Eve / error / abort = vermilion (`#C2410C`)
  - Match / secure / kept bit = deep green (`#2F6B3A`)
- Type: a serif for headings (e.g. *Source Serif 4* or *Fraunces*), a humanist sans for body (e.g. *IBM Plex Sans*), and a monospace for bits, bases, and data (e.g. *IBM Plex Mono* or *JetBrains Mono*)
- Thin 1px rules, ruled tables, figure captions ("Fig. 2 — QBER vs interception rate"), margin notes, and numbered sections, as in a lab report
- Layout: an asymmetric **workbench**, with the control panel on the left, the large channel visual in the centre, and the live data ledger on the right. It must be a dense, information-first instrument, not a marketing page.
- Motion is **functional only**: photon pulses travelling the channel, a basis-mismatch flash, bits sliding into the sifted key. Respect `prefers-reduced-motion`.

**Quality gate (must run before finishing any UI phase):**
- Scan CSS/JS for banned items: `grep` for `backdrop-filter`, `blur(`, `linear-gradient` with blue/purple hues, `#6366f1`, `#8b5cf6`, `#3b82f6`, `violet`, `indigo`, `purple`, `neon`, `glow`, and `border-radius` greater than 4px
- Score with an AI-Slop rubric from 0 to 10 (if `anti-ai-slop-ui` exists, use its rubric). If the score is 5 or more, redesign before moving on.
- Ask: "Would a designer instantly say *an AI made this*?" If yes, revise.

### 0.2 Repo structure
```
/backend            FastAPI app + quantum engine
  /bb84             core package (pure Python + Qiskit)
  /api              routes, schemas
  /tests
/frontend           single-page app (HTML + vanilla CSS + vanilla JS modules)
  index.html, /css, /js, /assets
/docs               architecture.md, physics.md, report.md, api.md, database.md, deploy.md, limitations.md
.agents/skills/no-ai-look-ui/SKILL.md
PROGRESS.md, README.md, requirements.txt, app-config.json (Catalyst)
```
- Use a Python venv, pinned `requirements.txt` (`qiskit`, `qiskit-aer`, `fastapi`, `uvicorn`, `pydantic`, `numpy`, `pytest`, `httpx`), plus `.gitignore` and `.editorconfig`.

**Exit criteria:** the skill file exists and is complete, the structure exists, the venv installs, and `git init` is done with the first commit.

---

### 0.3 Blueprint (write before coding)
Write `docs/blueprint.md`. It covers: the product, simulation, frontend, backend and Qiskit-integration architecture; the data flow (UI, then API, then BB84 engine, then Qiskit Aer, then results, then UI); the API design; the UI structure; the testing strategy; and the deployment strategy. Then continue straight into Phase 1. Do not stop at the planning stage.

**Hard rule:** the authoritative BB84 simulation lives in Python/Qiskit. Never move quantum logic into JavaScript to make the visuals easier. The frontend only visualizes real results from the backend.

---

## PHASE 1 — Quantum core engine (`backend/bb84/`)
Write clean, typed, documented, seedable modules:
- `alice.py`: random bits and random bases (`Z`=+, `X`=×). Encode each qubit as a Qiskit `QuantumCircuit` (`X` gate for bit 1, `H` for the diagonal basis).
- `channel.py`: the quantum channel. Optional **noise model** via `qiskit_aer.noise` (depolarizing, bit-flip, and a photon-loss probability) so that natural noise can be told apart from Eve.
- `eve.py`: eavesdropper strategies:
  - `none`
  - `intercept_resend` with a configurable **interception fraction from 0 to 100%**
  - basis strategy: `random`, `always_Z`, `always_X`
  - Eve keeps her own record of the bits she measured, so the UI can later show how much she learned
- `bob.py`: random measurement bases, measuring with `AerSimulator` (batch circuits for speed, one shot each)
- `protocol.py`: orchestrates a full run and returns a fully structured result: per-qubit records (index, alice_bit, alice_basis, eve_intercepted, eve_basis, eve_bit, bob_basis, bob_bit, bases_match, error) plus summary statistics
- It must handle at least 2,000 qubits in a few seconds. Batch the circuits rather than making one simulator call per qubit.
- Seed everything (`numpy` RNG plus Aer `seed_simulator`) so a seed reproduces a run exactly.
- Build **three separate circuits per qubit**, generated from the real run and stored with it: Alice's preparation, Eve's intercept-resend (measure, then re-prepare in her basis), and Bob's measurement. These are what the UI shows. No decorative circuit images.
- The QBER must **emerge from the actual measurements**. Never generate or fake an error percentage.

**Exit criteria:** with no Eve and no noise, QBER = 0. With 100% intercept-resend, QBER ≈ 25% (±3% at n=2000). Same seed means identical output.

---

## PHASE 2 — Post-processing (the parts most student projects skip)
- **Sifting**: keep only the positions where the bases match
- **Parameter estimation**: publicly sacrifice a configurable sample (e.g. 20–50%) of the sifted key, compute QBER, and **abort** if QBER is above the threshold (default 11%, configurable)
- **Error correction**: a simplified **Cascade** (or block parity with binary search). Record the bits leaked publicly.
- **Privacy amplification**: universal hashing with a **Toeplitz matrix**, compressing by the estimated Eve information plus the leaked bits
- **Key verification**: a hash comparison of Alice's and Bob's final keys
- **Application demo**: encrypt a user message with the final key (one-time-pad XOR), show the ciphertext, and have Bob decrypt it. If the run aborted, show why.
- **Theory module**: expected QBER = interception_fraction × 25% (+ noise), and the key rate formula. These are used to draw theory lines next to the simulated data.
- **Show the working**: every stage returns its numbers so the UI can show the arithmetic. Keep these terms distinct everywhere: raw bits, raw measurements, matching bases, sifted key, test bits, mismatched bits, QBER, corrected key, final key. For example, "Compared bits: 50 · Errors: 8 · QBER = 8 / 50 = 16%".
- **Scientific honesty**: verdict text must never claim "QBER 0% = 100% secure". Use wording like "No significant disturbance detected" or "Possible eavesdropping or channel disturbance detected". Label all keys "Educational simulation output — not for production cryptography."

**Exit criteria:** unit tests cover every stage, the final keys match when there is no Eve, the abort triggers correctly, and the key-length bookkeeping is shown at every stage.

---

## PHASE 3 — API (FastAPI)
Endpoints (Pydantic schemas, validation, sensible limits, CORS, error handling):
- `POST /api/simulate`: the full run, with params n_qubits, seed, eve {enabled, fraction, strategy}, noise {depolarizing, bitflip, loss}, sample_fraction, qber_threshold, message
- `POST /api/step`: a step-by-step session (returns qubit i), for the animated mode
- `POST /api/sweep`: an experiment that sweeps Eve fraction (or noise, or n) and returns QBER and final key length per point, with theory values
- `GET /api/circuit/{session}/{i}`: the Alice, Eve and Bob circuits for qubit i, as text plus a structured gate list (no matplotlib)
- `GET /api/simulations`: the history list (paginated)
- `GET /api/simulations/{id}`, `/{id}/qubits` (supports sort, filter and pagination), and `/{id}/statistics`
- `GET /api/simulations/{id}/report.pdf`: the PDF report
- `GET /api/health`
- **History storage**: save every run (id, timestamp, n_qubits, Eve config, noise, QBER, sifted and final key lengths, verdict, seed, full config) in **Catalyst Data Store** (or Catalyst NoSQL for the per-qubit data). Use a SQLite fallback for local dev behind the same repository interface. Document the schema in `docs/database.md`.
- Security: input validation, rate limiting on simulate and sweep, structured logging, and config via env vars. No secrets in the frontend.
- Serve `/frontend` as static files from the same app, so it is **one deployable**
- Add `docs/api.md` and the auto OpenAPI at `/docs`

**Exit criteria:** pytest + httpx API tests pass, and there is one command to run locally (`uvicorn backend.main:app`).

---

## PHASE 4 — Design system (before any UI code)
Following `no-ai-look-ui`:
- Write `docs/design.md`: the visual direction, a design brief, user (student/examiner/teacher), primary action ("run an exchange and see Eve get caught")
- `frontend/css/tokens.css`: colour (meaning-encoded), type scale, spacing scale (4px base), radius (max 4px), rules/borders, motion durations
- Build a small component sheet (`/frontend/_components.html`, dev only): buttons, segmented controls, sliders, toggle, ruled data table, bit cell (+/× glyph, bit value, state colours), callout/margin note, figure with caption, empty/loading/error states

**Exit criteria:** the anti-slop scan is clean, the slop score is 4 or less, and the tokens are used everywhere (no ad-hoc values).

---

## PHASE 5 — The interactive web page (core)
A single page with sections numbered like a lab report.

**§1 Workbench (above the fold, the hero is the instrument itself)**
- Left, the **control panel**: number of qubits, seed, Eve on/off, interception % slider, Eve basis strategy, noise sliders, sample %, QBER threshold, message input, and Run / Step / Reset. It also has presets: "Clean channel", "Full Eve", "Noisy fibre", "Stealthy Eve (10%)".
- Centre, the **channel**: Alice station, then the fibre line, an optional Eve tap (it appears physically on the line when enabled), then the Bob station. Photons are drawn as polarization glyphs (│ ─ ╱ ╲). In step mode, each photon travels the line, Eve's tap flashes vermilion when she measures, and Bob's basis is shown on arrival.
- Right, the **live ledger**: a ruled table of per-qubit rows that fills as qubits arrive, with matches and errors highlighted using meaning colours. It is virtualized or paginated for large n. Its columns are #, Alice bit, Alice basis, encoded state (|0⟩ |1⟩ |+⟩ |−⟩), Eve basis, Eve bit, Bob basis, Bob bit, and result (KEEP / DISCARD / ERROR / TEST). You can **sort** by any column, **filter** by kept, discarded, errors, Eve-intercepted or test bits, and **select** a row to open the inspector.
- Controls also include **number of runs** (batch mode) and a **Skip animation / fast mode** toggle.

Reference wireframe (structure only, styled to the skill):
```
┌──────────────────────────────────────────────────────────────────────┐
│ BB84 LAB — Fig.1 Workbench                    Run #104   seed 42     │
├──────────────┬─────────────────────────────────┬─────────────────────┤
│ EXPERIMENT   │  ALICE ───────┬───────► BOB     │ LEDGER  [sort][filt]│
│ Qubits [100] │               │ (Eve tap)       │ # A  B  St Eve Bob R│
│ Eve [ON] 60% │              EVE                │ 01 0 + |0⟩ —  0 + K │
│ Noise ...    │                                 │ 02 1 × |−⟩ +  0 + D │
│ [RUN][STEP]  │                                 │ 03 0 + |0⟩ ×1 1 + E │
├──────────────┴─────────────────────────────────┴─────────────────────┤
│ RAW 100 → MATCHED 48 → TEST 12 → SIFTED 36 → CORRECTED → FINAL 21    │
│ QBER = 3 / 12 = 25.0%  vs threshold 11%  →  POSSIBLE EAVESDROPPING   │
├──────────────────────────────────────────────────────────────────────┤
│ [§2 Pipeline] [§3 Verdict] [§5 Experiments] [Circuits] [§6 Learn]    │
└──────────────────────────────────────────────────────────────────────┘
```

**§2 Sifting & key pipeline**: a visual funnel of raw, then sifted, then sampled, then corrected, then amplified, then final key, with the bit count at each stage, and the final key shown in mono with copy/export. It shows Alice's raw key aligned above Bob's, then the reconciliation mask (`101---001-01`), then the sifted key, and explains why each bit was discarded. It has a mask/reveal toggle for keys.

**§3 Verdict panel**: QBER large and clear, compared against the threshold line, with a "NO SIGNIFICANT DISTURBANCE — KEY ACCEPTED" or "POSSIBLE EAVESDROPPING — ABORTED" verdict. It gives a plain-language reason ("QBER 24.6% > 11% — an eavesdropper likely intercepted ~100% of qubits"). It shows the estimated Eve interception fraction and how many key bits Eve actually knows (from her record).

**§4 Message demo**: plaintext, then key, then ciphertext, then Bob's decryption, shown as aligned mono rows.

**Responsive**: on desktop, the full workbench. On tablet, a condensed version. On mobile, the protocol stacks vertically (Alice, then channel, then Eve, then Bob), and the ledger scrolls horizontally or becomes compact rows. Do not build a fake phone frame.

**Exit criteria:** all controls are wired to the API, there are loading/empty/error states, it works at 1440px, 1024px and 375px, and the anti-slop gate passes.

---

## PHASE 6 — Experiments lab and visualizations
- **§5 Experiments**: run sweeps from the UI and draw charts with hand-written SVG or a light library styled to tokens (no default chart themes):
  - QBER vs Eve interception fraction (simulated points plus the theory line plus the threshold line)
  - Final key length vs n_qubits
  - QBER vs noise level, showing the "noise vs Eve" ambiguity
  - Figure captions and axis labels in the lab-report style
  - QBER per run across a batch of runs, with **WITHOUT EVE vs WITH EVE** shown as two series on the same axes
- **Circuit inspector / Advanced mode**: click any ledger row to open a side drawer that shows the qubit's journey: Alice's preparation (basis, then state), then Eve's measurement and re-preparation (if present), then Bob's measurement, then the result. It shows the **three real circuits** (Alice / Eve / Bob), the gates used, the state on a 2D polarization/Bloch circle, the measurement probabilities, the backend name, the shots and the seed.
- **Compare runs**: pin up to 3 runs side by side (with and without Eve, with noise)
- **Simulation history panel**: a list of past runs (#id, qubits, Eve on/off, QBER, verdict, time). Click one to reopen it fully.
- **Export**:
  - CSV/JSON of the run, PNG/SVG of the charts, and a shareable URL that encodes the params and seed
  - A **professional PDF report**, generated server-side (e.g. ReportLab or WeasyPrint), with the config, protocol steps, results, the QBER working, Eve status, charts, the selected qubit's data and an interpretation, styled to match the lab-notebook look

**Exit criteria:** the charts match the theory within tolerance, the inspector works for any qubit, and export works.

---

## PHASE 7 — Learning layer and polish
- **§6 How BB84 works**: a short, accurate explainer with inline diagrams (no-cloning, measurement disturbance, why 25%, why 11%). Written plainly, with no hype words.
- **Guided tour mode**: 6–8 steps that highlight UI regions and explain them
- **Glossary** (hover terms: basis, QBER, sifting, privacy amplification)
- **Viva/exam Q&A** section (10–15 common questions with answers)
- **Learn BB84 mode**: a 9-step walkthrough (Alice's bits, then Alice's bases, encoding, Bob's bases, measurement, public basis comparison, discarding mismatches, estimating QBER, suspecting Eve). Each step has a simple explanation and a technical one, and each runs on a small live simulation of 8–16 qubits.
- **Concepts section** that clearly separates quantum state, classical bit, basis, measurement, sifted key, QBER, eavesdropping and final key
- **§7 Limitations of this simulator** (also in `docs/limitations.md`): this is an educational simulation. It does not model all real QKD hardware (detector efficiency, dark counts, multi-photon pulses and PNS attacks, real fibre loss), and its results are not production cryptographic guarantees.
- Accessibility: keyboard navigation for all controls, visible focus, ARIA labels, colour is never the only signal (glyphs plus text too), contrast of at least 4.5:1, reduced-motion support
- Performance: lazy-load the experiments section and debounce the sliders. Add an SEO title, meta description, a single `<h1>`, and semantic HTML.

**Exit criteria:** Lighthouse accessibility ≥ 95, there are no console errors, and the anti-slop gate passes.

---

## PHASE 8 — Testing and QA
- Backend: unit, statistical, and API tests, with ≥ 85% coverage on `bb84/`. Test bit and basis generation, encoding, Bob's measurement, reconciliation, sifting, Eve's intercept-resend, QBER, error correction, privacy amplification, history persistence and PDF export.
- Statistical tests must aggregate **many runs** (e.g. 50 seeds) and assert mean and tolerance. Never assert an exact percentage for one finite run (an exact 0% with no Eve and no noise is fine).
- Frontend: a Playwright (or browser-agent) smoke test for each preset, step mode, a sweep, the inspector, and export
- Edge cases: n=1, n=10000 (limit), 0% sample, an all-mismatch seed, an empty message, and a network failure
- Run the final **anti-slop review**: screenshot every section, score it, and fix anything 5 or above
- Write `docs/test-report.md`

---

## PHASE 9 — Deploy to Zoho Catalyst (ask me before the first prod deploy)
- Use the Catalyst skills/MCP if available (`catalyst-appsail`, `catalyst-basics`)
- Deploy as **Catalyst AppSail (Python runtime)**: FastAPI serves both the API and the static frontend. Listen on the `X_ZOHO_CATALYST_LISTEN_PORT` env var.
- Qiskit and qiskit-aer are large. If the managed runtime size or build fails, switch to a **custom Docker AppSail** image (`python:3.11-slim`).
- Add `app-config.json`, the startup command, health check, env vars, and request size/timeout limits
- Deploy to the Development environment first, verify every feature on the live URL, then (after my OK) deploy to Production
- Document the exact deploy steps in `docs/deploy.md`

**Before deploy**: install deps, run all tests, verify that Qiskit imports and runs in the target runtime, verify env vars, verify Data Store tables, and verify the frontend calls the API using relative URLs.

**After deploy (verify on the live URL, not locally)**:
1. Open the app and run a simulation with Eve OFF. QBER should be ≈ 0.
2. Run with Eve ON at 100%. QBER should be ≈ 25% and the verdict should be possible eavesdropping.
3. Test step mode, a sweep, the inspector, history reopen, and the CSV, JSON and PDF exports.
4. Test at desktop, tablet and mobile widths.
5. Check the browser console and the Catalyst server logs. Fix every error and redeploy.

**Never claim deployment succeeded without performing and reporting these checks.**

**Exit criteria:** the public URL works, all features work live, and the cold-start time is noted.

---

## PHASE 10 — Documentation and handoff
- `README.md`: what it is, a screenshot, run locally, deploy, tech stack, project structure
- `docs/physics.md`: the BB84 theory with formulas
- `docs/architecture.md`: a Mermaid diagram of the frontend, API, engine, and Qiskit Aer
- `docs/report.md`: an academic project report (abstract, intro, theory, design, implementation, results with charts, conclusion, future scope, references)
- **Future scope** (design the code so these plug in later, and leave clean interfaces): E91 and B92 protocols, a real IBM Quantum hardware backend (token-gated), decoy-state BB84, finite-key analysis, a multi-user network simulation, and live websocket streaming
- Final `PROGRESS.md` summary plus the live URL

## PHASE 11 — Final quality audit and deliverable
Audit each of these honestly: functionality, quantum correctness, whether Eve really disturbs the run, whether QBER comes from real measurements, interactivity, the design (anti-slop score), performance, error handling, responsiveness, documentation, and production.

Then give me a final report with:
1. The complete feature list
2. The architecture
3. The tech stack
4. How BB84 is implemented
5. How Eve is implemented
6. The QBER method
7. Test results
8. Security considerations
9. The docs created
10. Deployment status
11. The production URL
12. Demo script: a 3-minute walkthrough for an examiner
13. Known limitations
14. Future improvements

---

## Global rules
- Every UI change follows `.agents/skills/no-ai-look-ui/SKILL.md`. No exceptions.
- No placeholder text, lorem ipsum, or fake data. Every number on screen comes from a real simulation.
- The physics must be correct. If unsure, write a test that proves it.
- Keep code modular, typed, and commented where the physics is non-obvious.
- Never commit secrets or tokens.
- Never make scientifically incorrect claims in the UI or docs.
- Begin now with Phase 0. Do not stop after planning.
