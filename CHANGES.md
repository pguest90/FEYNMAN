# Phase 1 findings: confirmed bugs in the current step generator

This file documents physics/logic bugs found while deriving and verifying the
Phase 1 golden-test baseline for `amplitude_stepper.html` (see `test/`). Per
the project plan, Phase 1 does not modify `amplitude_stepper.html` — these are
recorded here so Phase 3+ (the rewrite engine) fixes them rather than
faithfully reproducing them. Each entry gives the correct derivation and
points at the responsible code so it isn't rediscovered from scratch.

All three bugs were confirmed two ways: (a) an internal inconsistency in the
tool's own output (the `expl` text describes an operation the `expr` field
never performs), which is demonstrable without any external reference, and
(b) cross-checked against the standard textbook values already cited in this
repo's own README "Verified Results" table (Griffiths §9.2–9.4).

## Bug 1 — Missing spin-average ÷4 factor (affects every two-current result)

**Symptom:** `eg('ee_mumu')` gives `8e⁴(t²+u²)/s²`. The verified, standard
spin-averaged result (Griffiths §9.2, this repo's own README) is
`2e⁴(t²+u²)/s²` — a factor of 4 too large. The same 4× discrepancy appears in
`emu_emu`, `compton_s`, `qcd`, and both individual `|Mᵢ|²` terms inside
`bhabha`/`moller`.

**Root cause:** `stepsDouble4` (the shared trace-evaluation function behind
all of these) computes the raw double-trace value
`32[(A·C)(B·D)+(A·D)(B·C)]` → `8(...)` after Mandelstam substitution. This
*is* the fully spin-**summed** Σ|M|² (summed over all 4 external fermions'
spin states, via the trace technique's `Σuū=p̸` identity) — never spin-**averaged**.
Physically, the standard `|M̄|²` requires dividing by the initial-spin
multiplicity (2×2=4 for two spin-½ incoming particles).

**This is not just a documentation gap** — the file already says so, twice,
and then doesn't act on it:
- `stepsSquareTwoCurrent` (~line 2814): *"Convention note: result below is
  spin-SUMMED. Divide by 4 for spin-averaged |M̄|²."* — stated, never applied.
- `stepsInterference`'s own "Final result" step (~line 3984):
  *"Spin-averaged: divide |M|² by the initial spin multiplicity product (¼
  for 2→2 QED)."* — again stated in the `expl` field while the adjacent
  `expr` field (labelled `|M̄|²`, the bar notation itself asserting
  "averaged") shows the un-divided value.

**Fix direction for Phase 3:** apply the ¼ factor inside `stepsDouble4`'s
final-result construction (or immediately before it's used), not as a
narrated aside — and stop mislabeling the un-divided value `|M̄|²`.

## Bug 2 — Interference cross-term has the wrong sign (Bhabha, Møller)

**Symptom:** `eg('bhabha')` gives an interference term of `−4e⁴u²/(st)`.
Griffiths §9.4 (and this repo's README): `+2e⁴·2u²/(st) = +4e⁴u²/(st)`. Same
issue in `moller`: tool gives `−4e⁴s²/(tu)`, verified value is `+4e⁴s²/(tu)`.

**Root cause — an internal inconsistency, provable from the tool's own two
computations of the same quantity:**
`stepsInterference`'s `pairSteps(ii,jj)` (~line 3921) correctly derives, step
by step, that `2Re(M₁M₂*) = −4q₃²/(dᵢ·dⱼ)` (the minus comes directly from the
`−32(A·C)(B·D)` 8-gamma trace identity — e.g. for Bhabha,
`dot(p1,p4)·dot(p2,p3) = (−u/2)(−u/2) = +u²/4`, times the trace's own leading
`−32` and the `/4` normalisation shown in that step, giving `−8u²`). But the
*separate* `crossTerms` array (~line 3912), used only for the headline "Final
result" step, computes the displayed sign from **`pairSign` alone**
(`pairSign = signs[ii]*signs[jj] = (+1)(−1) = −1` for both Bhabha and
Møller, since both call `addDiagramRow(-1)`), silently dropping the
intrinsic `−1` that the trace evaluation itself produces and that
`pairSteps` — shown immediately above it in the same step list — correctly
derives. Two `pairSign × intrinsic_sign` = `(−1)×(−1) = +1` is the correct
combined sign; the code uses just `pairSign = −1`.

**Fix direction for Phase 3:** `crossTerms` must incorporate the same
intrinsic sign that `pairSteps` derives (or, better, the rewrite engine
should compute the cross-term sign exactly once and have both the detail
view and the headline reference that single derivation, so this kind of
duplicate-computation drift can't recur).

## Bug 3 — Massive example's "Final result" step silently drops the mass terms

**Symptom:** `eg('ee_mumu_mass')` (input has explicit `(p1+m)`/`(p2-m)` mass
insertions) produces a **final** step identical to the massless `ee_mumu`
result — `8e⁴(t²+u²)/s²`, with no `m²` or `m⁴` anywhere.

**Root cause:** `stepsDouble4`'s `hasMass` branch (~line 500-547) correctly
computes and *displays* an intermediate step with real mass-dependent terms
(`"Substitute Mandelstam + collect mass terms"`, with an explicit `massTerms`
string containing `m²`/`m⁴` coefficients). But the "Final result" step
(~line 570) uses `finalHTML`, which was built earlier (~line 472-486) purely
from `ev.final` — the return value of `evalDoubleTrace(A,B,C,D)`, a function
that **takes no mass information as input at all** and only ever computes
the massless closed form. The mass-dependent `massTerms` variable is
computed and shown in step 5 but never reaches step 6 (the actual final
answer).

**Fix direction for Phase 3:** the final-result assembly needs to route
through the same mass-aware computation as the intermediate step, or
`evalDoubleTrace` needs to accept mass-sign parameters and fold them into
`ev.final` directly (the cleaner option, since it removes the current
two-separate-code-paths risk that caused this bug in the first place — the
same category of mistake as Bug 2).

## Not investigated further in Phase 1 (out of scope, flagged for later)

- The exact closed-form value for `ee_mumu_mass` was intentionally not
  pinned to a specific textbook formula: the tool's convention of writing
  the *same* generic mass symbol `m` on both the electron and muon traces
  doesn't correspond to a single standard reference formula (textbooks
  standardly keep the electron massless and only the muon massive, or use
  two distinct mass symbols). Once Bug 3 is fixed, Phase 3 should also
  decide — and document — which mass convention this tool intends, then a
  precise golden value can be pinned down.
- Cosmetic-only display gaps (e.g. `Tr[p1 p2]`'s final answer rendering as
  `4·(1)/(2)·s` instead of simplified `2s`) are correct in *value*, just
  unsimplified in *display* — not treated as bugs here, since Phase 1 is
  scoped to physics correctness, not display polish.
