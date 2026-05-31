# FEYNMAN

A browser-based toolkit for drawing Feynman diagrams and computing scattering amplitudes step by step. No installation required — open either HTML file directly in a browser.

---

## Files

### `feynman_editor.html` — Diagram Editor

An interactive canvas for drawing Feynman diagrams from scratch.

**Drawing tools**
- Place vertices (dot, cross, circle, blob, or invisible styles)
- Draw particle lines: Fermion, Photon, Gluon, Scalar, Ghost
- Each line type renders with its correct physics notation (wavy photon, curly gluon, dashed scalar, dotted ghost, arrowed fermion)
- Self-loops supported on any line type

**Editing**
- Select, move, and drag individual vertices or groups (box-select)
- Drag the bezier control point on any line to curve it
- Double-click a vertex or line to set its momentum/particle label
- Reverse arrow direction on fermion/ghost lines
- Undo (Ctrl+Z), up to 80 steps
- Pan and zoom the canvas

**Theory vertex library**
- Built-in templates: QED vertex, QCD quark-gluon vertex, QCD 3-gluon vertex, φ⁴ vertex
- Save any connected component as a reusable template
- Stamp templates onto the canvas with 90° rotation support

**Feynman Rules panel**
- Configure propagator expressions for each particle type (display text + LaTeX)
- Configure external leg rules (fermion in/out, photon, gluon, scalar, ghost)
- Add named vertex rules matched by vertex label
- Set the loop measure
- Click **iM ▶** to auto-generate the amplitude expression from the current diagram
- **Copy LaTeX** copies the amplitude in LaTeX format
- **→ Stepper** exports the amplitude directly to the Step Solver

**Export**
- Export diagram as PNG

**Keyboard shortcuts**

| Key | Action |
|-----|--------|
| Q | Select |
| M | Move (pan) |
| V | Vertex |
| F / P / G / S / H | Fermion / Photon / Gluon / Scalar / Ghost |
| X | Delete tool |
| Del | Remove selected |
| Ctrl+Z | Undo |
| Space | Rotate stamp 90° |
| Esc | Cancel current action |

---

### `amplitude_stepper.html` — Step-by-Step Amplitude Solver

Takes a QFT scattering amplitude expression and walks through the full trace algebra step by step to a final Mandelstam result.

**Supported expression types**
- **Double trace** — e.g. `(e4/s2) * Tr[p1 gm p2 gn] * Tr[p3 gm p4 gn]`
- **Internal contraction** — e.g. `Tr[p1 gm p2 gm]`
- **Two-momentum trace** — e.g. `Tr[p1 p2]`
- **Single 4-element trace** — e.g. `Tr[p1 gm p2 gn]`
- **Spinor bilinear** — e.g. `(e2/s) * ubar(p3) gm u(p1)`
- **Editor import** — paste the full `iM =` output from the diagram editor

**Physics covered**
- 4-element trace identity: Tr[p̸_A γ^μ p̸_B γ^ν] = 4(A^μB^ν + A^νB^μ − g^μν A·B)
- Double-trace contraction master formula: 32[(A·C)(B·D) + (A·D)(B·C)]
- Massive fermion traces with (p̸ + m) propagator insertions — odd-gamma terms automatically zero'd
- Gamma algebra contraction: γ^μ p̸ γ_μ = −2p̸ (d=4)
- Spin completeness: Σ u ū = p̸ + m
- Mandelstam substitution (4-point 2→2 massless: p₁, p₂ in; p₃, p₄ out)
- Index error detection — catches same Lorentz index appearing twice inside one trace

**Built-in examples**
- e⁺e⁻ → μ⁺μ⁻ (massless and massive)
- e⁻μ⁻ → e⁻μ⁻ (t-channel)
- Compton scattering (s-channel)
- QCD t-channel
- Scalar trace, internal contraction, spinor bilinear

**Other features**
- Unicode input normalisation — accepts γ^μ, p̸, subscript numerals, ×, ÷
- **Copy LaTeX** button copies the final result as LaTeX
- **Import from Editor** button pulls the last diagram exported from `feynman_editor.html` via `localStorage`
- Ctrl+Enter to solve

---

## Workflow

1. Open `feynman_editor.html` and draw your diagram
2. Set your Feynman rules in the panel, click **iM ▶** to build the amplitude
3. Click **→ Stepper** to send it to `amplitude_stepper.html`
4. The stepper identifies the topology and walks through every algebra step to the final result
