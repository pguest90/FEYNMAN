# QFT Toolkit — User Manual

Two files. Open both in your browser. No setup required.

---

## The Two Files

| File | What it does |
|---|---|
| `feynman_editor.html` | Draw Feynman diagrams, generate amplitude iM — also has an automatic diagram generator (work in progress, see below) |
| `amplitude_stepper.html` | Take an amplitude, compute \|M\|² step by step |

---

## Drawing a Diagram

### The canvas

Open `feynman_editor.html`. The dark canvas is where you draw. Tools are on the left. Properties appear on the right when you select something.

### Drawing convention

**Time flows left to right** (Griffiths convention). Put incoming particles on the left, outgoing on the right.

```
  p₁ →——[V₁]——————[V₂]——→ p₃
             \    /
              (γ*)          ← propagator
             /    \
  p₂ →——[V₃]——————[V₄]——→ p₄

  LEFT = initial state      RIGHT = final state
```

### Step by step

1. **Place vertices** — press `V`, click the canvas. Every interaction point is a vertex.

2. **Connect with particle lines** — select a line type, click vertex A then vertex B:
   - `F` — Fermion (solid arrow) — electrons, quarks, neutrinos
   - `P` — Photon (wavy) — photons, W/Z bosons
   - `G` — Gluon (curly) — gluons
   - `S` — Scalar (dashed) — Higgs, scalars
   - `H` — Ghost (dotted arrow) — Faddeev-Popov ghosts

3. **Mark external legs** — external stubs (the short lines at the edges) need style **Invisible**. Click the stub vertex → Properties → Style → Invisible.

4. **Label vertices** — double-click a vertex to name it. The name determines the Feynman rule:
   - `e` — QED (iQeγ^μ)
   - `q` — QCD quark-gluon (ig_s T^a γ^μ)
   - `lW` — W-lepton charged current
   - `Zf` — Z-fermion neutral current
   - `Hf` — Yukawa H-ff coupling
   - `HWW`, `HZZ` — Higgs-gauge bosons
   - `WWγ`, `WWZ` — triple gauge boson
   - (Leave blank to use auto-detection by leg types)

5. **Antiparticle lines** — select the fermion line → Properties → check **Reverse arrow**. This switches spinors from u/ū to v/v̄.

### Quick templates

Use **Theory Vertices** in the left panel to stamp pre-built vertices. Press `Space` while stamping to rotate 90°.

### Useful shortcuts

| Key | Action |
|---|---|
| `Q` | Select/move |
| `V` / `F` / `P` / `G` / `S` | Tools |
| `Del` | Delete selected |
| `Ctrl+Z` | Undo |
| `0` | Reset view |
| `Ctrl+C` / `Ctrl+V` | Copy/paste |
| Double-click vertex | Edit label |
| Double-click canvas | New vertex |
| Right-click drag | Pan |

---

## Getting the Amplitude

Click **iM ▶** in the top bar.

The editor reads your diagram and shows the amplitude with every factor labelled:

```
iM =
    iQeγ^μ            ← vertex (e)
  × −ig_μν/s          ← photon prop (p₁+p₂ [s])
  × iQeγ^ν            ← vertex (e)
  × u(p₁,s)           ← fermion ext in (p₁)
  × v̄(p₂,s)           ← fermion ext out (p₂)
  × ū(p₃,s)           ← fermion ext out (p₃)
  × v(p₄,s)           ← fermion ext in (p₄)
```

### What gets labelled automatically

- **Momentum** — assigned from the topology using momentum conservation. Incoming legs (left) get p₁, p₂; outgoing legs (right) get p₃, p₄.
- **Mandelstam variable** — photon propagators are labelled [s], [t], or [u] depending on which legs feed into them.
- **Spinors** — u/ū for normal fermion arrows, v̄/v for reversed (antiparticle) arrows.
- **Lorentz indices** — μ, ν, ρ, ... assigned automatically and tracked through the diagram.

### Momentum labelling

Time flows left to right. Legs are sorted top-to-bottom within each side:

```
  p₁ (top-left)   ──────────────  p₃ (top-right)    ← final state
  p₂ (bot-left)   ──────────────  p₄ (bot-right)    ← final state
  ↑ initial state
```

- **p₁, p₂** = initial state (left side, incoming), p₁ on top
- **p₃, p₄** = final state (right side, outgoing), p₃ on top

### Mandelstam variables

| Label | Definition | Diagram topology |
|---|---|---|
| s | (p₁+p₂)² | Both initial-state legs meet at same vertex (annihilation) |
| t | (p₁−p₃)² | p₁↔p₃: same horizontal line (straight-through) |
| u | (p₁−p₄)² | p₁↔p₄: opposite corners (lines cross) |

**t vs u channel:** draw t-channel with fermion lines going straight through (p₁→p₃ top line, p₂→p₄ bottom line); draw u-channel with lines crossing (p₁→p₄, p₂→p₃). The editor distinguishes them automatically.

---

## Sending to the Step Solver

Click **→ Stepper** (top bar). This saves your amplitude to browser storage.

Open `amplitude_stepper.html` → click **Import from Editor**.

The amplitude loads and solves automatically.

---

## Generating Diagrams Automatically (⚛ Generate) — Work in Progress

> This feature is still being built out. The generator and its physics filters (see below) are working, but it only covers 2→2 processes so far, doesn't compute symmetry factors, and very busy theories at 2 loops can hit a search cap. Treat its output as a helpful starting point, not a final, complete answer.

Instead of drawing a diagram by hand, you can have the editor find every diagram for you from a Lagrangian.

### Switching modes

Click **⚛ Generate** in the top bar. The canvas, sidebar, and properties panel disappear and are replaced by a Lagrangian input panel (the same one used by "Derive Feynman Rules" — you can use the Quick Insert buttons, the field-declaration chips, and the built-in φ³/φ⁴/QED/Yukawa examples exactly as before). Click **✎ Draw** to switch back to the normal canvas at any time.

### Generating

1. Write your Lagrangian and declare its fields, same as for "Derive Feynman Rules".
2. Choose a **loop order**: 0 (tree), 1, or 2.
3. Click **⚛ Generate Diagrams**.

The tool finds every distinct Feynman diagram for a **2-in → 2-out** process in that theory, trying **every combination of the theory's fields** on the four external legs — you don't pick a specific process. For QED, for example, one click produces separate groups for Bhabha, Møller, Compton, and pair production. Diagrams appear as a gallery of small thumbnails, grouped by process, with a tree/1-loop/2-loop badge on each.

### Loading a generated diagram

Click any thumbnail. It switches back to Draw mode with that diagram on the canvas, fully editable — drag vertices, tweak labels, then click **iM ▶** just like a hand-drawn diagram.

### What's excluded, and why

The generator only shows diagrams that actually contribute to the amplitude:
- **No "bubble" diagrams.** Any self-energy-type loop sitting on a line — whether it's an external leg or an internal propagator — is left out. These dress a propagator rather than being a new diagram (they belong to renormalization, not the diagram count), so including them would just clutter the results without adding real information.
- **No duplicate diagrams.** Diagrams that are really the same graph (e.g. under a relabeling of interchangeable internal vertices) are combined into one entry.

If a theory produces more diagrams than the search budget allows (mainly at 2 loops), you'll see a "search truncated, showing a partial set" note under the diagram count.

---

## The Step Solver

### What it can compute

The stepper handles every vertex type from the editor:

| Process type | Example | Handler |
|---|---|---|
| QED two-current | e⁺e⁻→μ⁺μ⁻, Bhabha, Møller | Full traces → Mandelstam |
| QCD two-current | qq→qq | Same + colour factor 2/9 |
| Charged/neutral current | lW, Zf two-current | Chiral γ⁵ coupling noted |
| Compton | γe⁻→γe⁻ | Trace identities per diagram |
| Yukawa 2→2 | ff→ff via Higgs | u/v spinors, helicity suppression |
| H→WW, H→ZZ | HWW, HZZ vertex | Massive pol sum, decay width |
| WW→H→WW | HWW scalar exchange | Metric contraction engine |
| H→ff̄ | Hf Yukawa decay | Decay width formula |
| Z→ff̄ | Zf vector decay | Axial γ⁵ trace, partial width |
| H→HH, φ⁴ | H³, λ contact terms | \|M\|² = coupling² |
| 3g exchange | gg→g→gg | Triple gauge vertex decomposition |
| 4g contact | gg→gg | Quartic gauge colour tensor |
| 1-loop triangle | γγγ fermion loop | Furry's theorem proof |
| General loop | Any 1-loop | Dim-reg, PV reduction, B₀/C₀/D₀ |
| Unknown topology | Any amplitude | Recursive Wick contraction engine |

### Typing amplitudes directly

You can also type amplitudes directly into the input box:

```
Trace format:     (e4/s2) * Tr[p1 gm p2 gn] * Tr[p3 gm p4 gn]
Full iM format:   iM = iQeγ^μ × −ig_μν/s × iQeγ^ν × u(p₁,s) × ...
```

Click **Examples ▾** to see pre-loaded examples for every topology.

### Two-diagram interference

For Bhabha (t+s) or Møller (t+u), click **+ Two Diagrams**:
1. Enter diagram 1 in the top box
2. Enter diagram 2 in the second box
3. Choose the sign: **M₁ − M₂** (fermion exchange) or **M₁ + M₂** (bosonic)

The cross-term 2Re(M₁M₂\*) is computed automatically using the 8-gamma trace identity.

### Reading the output

Each step shows:
- **Identity applied** — the formula used (e.g., Tr[p̸_Aγ^μp̸_Bγ^ν] = 4(A^μB^ν + A^νB^μ − g^μνA·B))
- **Current expression** — the amplitude at this stage
- **Explanation** — why this step is valid and what it means physically

The final card shows the spin-averaged result |M̄|² in terms of Mandelstam variables.

---

## Common Workflows

### Compute e⁺e⁻→μ⁺μ⁻

1. Stamp QED vertex twice, connect with a photon line between them
2. The two upper stubs: mark one as "Reverse arrow" (the positron)
3. Click **iM ▶** → **→ Stepper** → Import from Editor
4. Result: **2e⁴(t²+u²)/s²**

### Compute Bhabha scattering

1. Draw the t-channel diagram → Export to stepper
2. Draw the s-channel diagram → Export to stepper (it saves over the previous)
3. In the stepper: **+ Two Diagrams**, set sign to **M₁ − M₂** (fermion exchange)
4. Enter the t-channel trace in box 1, s-channel trace in box 2
5. Result includes interference term: **−4e⁴u²/(st)**

### Compute H→WW decay width

1. Stamp HWW vertex template, add two photon external stubs (for W bosons)
2. Click **iM ▶** → **→ Stepper** → Import from Editor
3. Result: **Γ = g²m_W²m_H/(16π) × √(1−4m_W²/m_H²) × (2 + (m_H²−2m_W²)²/4m_W⁴)**

### Compute a QCD process (qq→qq)

1. Use two `q` (quark-gluon) vertices, connect with an internal gluon
2. The stepper detects gluon exchange and adds the colour factor automatically
3. Result includes **2/9** colour averaging factor

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "Amplitude is empty" | Make sure external stub vertices have Style = Invisible |
| Propagator shows `?` instead of p₁+p₂ | Momentum routing failed — check all external stubs are connected |
| Same amplitude for t and u channel | Ensure the fermion lines visually cross between vertices for u-channel |
| Stepper shows "not recognised" | Use the → Stepper button from the editor (the comment-line format is always recognised) |
| Spinors are wrong (u instead of v̄) | Check the Reverse arrow flag on antiparticle lines |
| Copy LaTeX does nothing | Build the amplitude first with iM ▶ |

---

## Files in This Folder

| File | Description |
|---|---|
| `feynman_editor.html` | Diagram editor — open this to draw |
| `amplitude_stepper.html` | Step solver — open this to compute |
| `README.md` | Full technical reference |
| `USER_MANUAL.md` | This file |
