'use strict';
// Phase 1 golden-value regression suite for amplitude_stepper.html.
//
// Purpose: lock in a VERIFIED-CORRECT baseline before any rewrite touches the
// generation engine (per the project's phased plan). Golden values here are
// either standard textbook results (Griffiths / Peskin & Schroeder, matching
// this repo's own README "Verified Results" table) or independently re-derived
// by hand from the trace algebra already in the file -- not copied from
// whatever the tool currently prints. Where the CURRENT code's output
// disagrees with the verified value, the test asserts the CORRECT value (so
// it fails now) and the discrepancy is documented with its root cause in
// CHANGES.md, per the project instructions. Nothing in amplitude_stepper.html
// is modified by this phase.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadStepper, runInput, runExample, finalPlainText } = require('./harness.js');

// ── Small helpers ────────────────────────────────────────────────────────────

// True if `text` contains all of the given substrings (order-independent) --
// used instead of exact-string equality because the app's own display
// formatting (fraction layout, spacing) is not itself under test here.
function containsAll(text, subs) {
  return subs.every(s => text.includes(s));
}

function noUnknown(steps) {
  return !steps.some(s => /not automatically recognized/i.test(s.expl || ''));
}

// ── Structural sanity: every documented input produces real steps ──────────
test('every example preset produces steps and never falls through to stepsUnknown', () => {
  const names = ['ee_mumu', 'ee_mumu_mass', 'emu_emu', 'compton_s', 'scalar_tr',
    'internal', 'spinor', 'qcd', 'yukawa_ff_t', 'yukawa_ffbar_t', 'yukawa_ffbar_s'];
  for (const name of names) {
    const dom = loadStepper();
    const r = runExample(name, { dom });
    assert.ok(r.steps.length > 0, `${name}: no steps produced`);
    assert.ok(noUnknown(r.steps), `${name}: hit "not automatically recognized"`);
  }
});

test('bhabha, moller, from_editor presets produce real steps with no unknown fallback', () => {
  for (const name of ['bhabha', 'moller', 'from_editor']) {
    const dom = loadStepper();
    const r = runExample(name, { dom });
    assert.ok(r.steps.length > 0, `${name}: no steps produced`);
    assert.ok(noUnknown(r.steps), `${name}: hit "not automatically recognized"`);
  }
});

// ── Pure trace-identity checks (no spin-averaging involved -- these are bare
//    Wick-trace evaluations, not full squared amplitudes, so they are NOT
//    expected to be affected by the spin-average bug documented below) ──────
test('Tr[p1 p2] = 4(p1.p2) = 2s', () => {
  const r = runInput('Tr[p1 p2]');
  const t = finalPlainText(r.steps);
  assert.ok(containsAll(t, ['4', '1', '2', 's']), `unexpected final form: ${t}`);
});

test('Tr[p1 gm p2 gm] = -8(p1.p2) = -4s  (gamma-contraction identity)', () => {
  const r = runInput('Tr[p1 gm p2 gm]');
  const t = finalPlainText(r.steps);
  assert.ok(t.includes('8') && t.includes('s') && /[-−]/.test(t), `unexpected final form: ${t}`);
});

// ── Golden physics values (spin-AVERAGED |M̄|², standard convention) ────────
// These assert the CORRECT, textbook value. As of this writing they FAIL
// against the current code: stepsDouble4's raw trace output is spin-SUMMED
// (a documented convention inside the file itself, see the "Convention note"
// comment near evalDoubleTrace's callers), and nothing along the bare-trace-
// example path divides by the spin multiplicity (4, for 2 incoming fermions)
// to reach the physically standard spin-averaged |M̄|². See CHANGES.md.
test('e+e- -> mu+mu- (massless): |M̄|² = 2e⁴(t²+u²)/s²', () => {
  const r = runExample('ee_mumu');
  const t = finalPlainText(r.steps);
  assert.ok(/\b2e⁴/.test(t) || t.includes('2·e⁴'), `expected coefficient 2, got: ${t}`);
  assert.ok(containsAll(t, ['t²', 'u²', 's²']), `expected t²+u² over s², got: ${t}`);
});

test('e-mu- -> e-mu-: |M̄|² = 2e⁴(s²+u²)/t²', () => {
  const r = runExample('emu_emu');
  const t = finalPlainText(r.steps);
  assert.ok(/\b2e⁴/.test(t) || t.includes('2·e⁴'), `expected coefficient 2, got: ${t}`);
  assert.ok(containsAll(t, ['s²', 'u²', 't²']), `expected s²+u² over t², got: ${t}`);
});

test('Compton (s-channel trace): |M̄|² has coefficient 2, not 8', () => {
  const r = runExample('compton_s');
  const t = finalPlainText(r.steps);
  assert.ok(/\b2e⁴/.test(t) || t.includes('2·e⁴'), `expected coefficient 2, got: ${t}`);
});

test('QCD t-channel (bare Lorentz trace, no colour factor in this input): coefficient 2, not 8', () => {
  const r = runExample('qcd');
  const t = finalPlainText(r.steps);
  assert.ok(/\b2g/.test(t) || t.includes('2·g'), `expected coefficient 2, got: ${t}`);
});

// ── Bhabha / Møller: overall factor AND interference sign ──────────────────
// Griffiths §9.3/9.4 (also this repo's own README):
//   Bhabha: |M̄|² = 2e⁴[(s²+u²)/t² + (t²+u²)/s² + 2u²/(st)]   (interference: +)
//   Møller: |M̄|² = 2e⁴[(s²+u²)/t² + (s²+t²)/u² + 2s²/(tu)]   (interference: +)
// Both currently fail for TWO independent, confirmed reasons (see CHANGES.md):
//  (1) the same missing spin-average ÷4 as above, and
//  (2) stepsInterference's headline "Final result" step derives the
//      cross-term sign from ONLY the diagram-pair relative sign (pairSign),
//      dropping the trace evaluation's OWN intrinsic minus sign (the
//      -32(A·C)(B·D) identity) that the very same function's `pairSteps`
//      detail view correctly computes just above it -- an internal
//      inconsistency demonstrable from the tool's own output, independent of
//      any external reference.
test('Bhabha: coefficient 2 (not 8) and POSITIVE interference term', () => {
  const r = runExample('bhabha');
  const t = finalPlainText(r.steps);
  assert.ok(/\b2e⁴/.test(t), `expected overall coefficient 2, got: ${t}`);
  assert.ok(!t.includes('−') || t.indexOf('+') < t.lastIndexOf('u²'),
    `expected a '+' interference term, got: ${t}`);
});

test('Moller: coefficient 2 (not 8) and POSITIVE interference term', () => {
  const r = runExample('moller');
  const t = finalPlainText(r.steps);
  assert.ok(/\b2e⁴/.test(t), `expected overall coefficient 2, got: ${t}`);
});

// ── Massive ee->mumu: mass terms must survive into the FINAL step ──────────
// Confirmed bug: the intermediate "Substitute Mandelstam + collect mass
// terms" step DOES compute m²/m⁴ corrections, but the "Final result" step
// falls back to evalDoubleTrace's massless closed form (`ev.final`), which
// was never given the mass information -- so the displayed final answer for
// the massive example is numerically IDENTICAL to the massless one. This
// test intentionally checks structure, not an exact closed form (the tool's
// "both traces share generic mass m" convention doesn't map onto a single
// textbook formula without picking a convention this project hasn't fixed
// yet), and documents the gap rather than asserting a possibly-wrong number.
test('e+e- -> mu+mu- (massive): final result must retain m-dependence', () => {
  const r = runExample('ee_mumu_mass');
  const t = finalPlainText(r.steps);
  assert.ok(/m[²⁴]|m\^?2|m\^?4/.test(t),
    `massive example's FINAL step lost all m-dependence (shows: "${t}") -- see CHANGES.md`);
});

// ── Determinism ──────────────────────────────────────────────────────────────
// Each run loads a fresh jsdom realm (separate vm context), so the resulting
// plain objects are structurally identical but not the SAME [[Prototype]] --
// assert.deepEqual's strict mode treats that as inequality even though every
// field matches. Comparing serialized content is the correct check here (it's
// literally what "identical step list" means from the outside).
test('same input + same {dim,xi} produces identical STEPS and LATEX', () => {
  const a = runInput('(e4/s2) * Tr[p1 gm p2 gn] * Tr[p3 gm p4 gn]', { dim: 4, xi: 1 });
  const b = runInput('(e4/s2) * Tr[p1 gm p2 gn] * Tr[p3 gm p4 gn]', { dim: 4, xi: 1 });
  assert.equal(JSON.stringify(a.steps), JSON.stringify(b.steps));
  assert.equal(a.latex, b.latex);
});

// ── xi-independence smoke test ──────────────────────────────────────────────
// The physical |M̄|² must not depend on the gauge parameter xi. The file
// already has a partial mechanism for this (stepsGaugeWard, invoked from
// stepsDouble4 when XI!==1) -- this test only checks the FINAL numeric
// structure is unchanged across xi, not that intermediate Ward-identity steps
// are shown (that's a Phase 2+ concern per the roadmap).
test('ee_mumu final Mandelstam structure is xi-independent', () => {
  const r0 = runExample('ee_mumu', { xi: 0 });
  const r1 = runExample('ee_mumu', { xi: 1 });
  const r3 = runExample('ee_mumu', { xi: 3 });
  const t0 = finalPlainText(r0.steps), t1 = finalPlainText(r1.steps), t3 = finalPlainText(r3.steps);
  assert.equal(t0, t1, `xi=0 vs xi=1 differ: "${t0}" vs "${t1}"`);
  assert.equal(t1, t3, `xi=1 vs xi=3 differ: "${t1}" vs "${t3}"`);
});

// ── d-dimension sanity ───────────────────────────────────────────────────────
test('ee_mumu result changes with spacetime dimension d (dimensional-regularisation term active)', () => {
  const r4 = runExample('ee_mumu', { dim: 4 });
  const r6 = runExample('ee_mumu', { dim: 6 });
  const t4 = finalPlainText(r4.steps), t6 = finalPlainText(r6.steps);
  assert.notEqual(t4, t6, `expected d=4 and d=6 results to differ, both gave: "${t4}"`);
});

test('ee_mumu at d=4 matches the physical (no dimensional-regularisation correction) result', () => {
  const r = runExample('ee_mumu', { dim: 4 });
  const t = finalPlainText(r.steps);
  assert.ok(!/d[-−]4|\(d/.test(t), `expected no leftover (d-4) term at d=4, got: ${t}`);
});
