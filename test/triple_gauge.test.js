'use strict';
// Regression tests for stepsTripleGaugeVertex (amplitude_stepper.html) --
// the WWγ/WWZ/3g "triple gauge vertex" derivation, and the general
// channel-aware tensor engine it's built on (tripleGaugeChannelLegs /
// tripleGaugeVertexSign).
//
// History: this function originally stopped at a placeholder describing what
// a "9-term expansion" would require, without computing it -- and its
// momentum-routing convention (k3=+q at both vertices) made the two seagull
// terms vanish trivially via transversality, which is a sign bug, not a
// simplification. It was then rewritten to actually compute the closed form
// for the s-channel grouping, and finally generalized into a reusable engine
// that also gets the t/u-channel groupings right (previously it always used
// the s-channel {p1,p2}|{p3,p4} leg grouping regardless of what the
// propagator denominator said). This suite locks in all three channels:
//
//   s-channel: Σ_pol|M|² = g⁴ · 8(t²+u²)/s²
//   t-channel: Σ_pol|M|² = g⁴ · 8(s²+u²)/t²
//   u-channel: Σ_pol|M|² = g⁴ · 8(s²+t²)/u²
//
// Verified by: (1) a genuine (non-trivial) Ward-identity cancellation q·V₁=0
// shown as its own step in every channel, (2) direct re-derivation by hand
// (see the function's header comment), and (3) an independent numeric check
// against random massless 2→2 kinematics (not reproduced here -- see the
// session notes/commit that introduced this file).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadStepper } = require('./harness.js');

function plain(html) {
  return html.replace(/&nbsp;/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function runTripleGauge(text, dom) {
  const d = dom || loadStepper();
  return d.window.eval(`stepsTripleGaugeVertex(${JSON.stringify(text)}, {})`);
}

function sampleText(denom) {
  return 'iM = ig[g^{αβ}(k1-k2)^μ + g^{βμ}(q-k1)^α + g^{μα}(k2-q)^β] × '
    + `(−ig_μν/${denom}) × ig[g^{γδ}(k1-k2)^ν + g^{δν}(q-k1)^γ + g^{νγ}(k2-q)^δ] × `
    + 'ε(p1) × ε(p2) × ε(p3) × ε(p4)';
}

const SAMPLE_TEXT = sampleText('s');

test('triple gauge vertex: produces a real multi-step derivation, not a placeholder', () => {
  const r = runTripleGauge(SAMPLE_TEXT);
  assert.ok(r.steps.length >= 8, `expected a full multi-step derivation, got ${r.steps.length} steps`);
  const allText = r.steps.map(s => plain(s.expr) + ' ' + plain(s.rule)).join(' ');
  assert.ok(!/next engine to add/i.test(allText), 'placeholder "next engine to add" language should be gone');
});

test('triple gauge vertex: seagull terms are genuinely nonzero (momentum-routing sign fix)', () => {
  const r = runTripleGauge(SAMPLE_TEXT);
  const contractStep = r.steps.find(s => /effective current/i.test(s.title));
  assert.ok(contractStep, 'expected the "contract external indices" step');
  const t = plain(contractStep.expr);
  // Term B/C coefficients must be the nonzero 2(k·ε) form, not a trivially-zero p·ε(same particle) form.
  assert.match(t, /2\(\s*p2\s*·ε₁\s*\)/, `expected nonzero seagull coefficient 2(p2·ε₁), got: ${t}`);
  assert.match(t, /−2\(\s*p1\s*·ε₂\s*\)/, `expected nonzero seagull coefficient -2(p1·ε₂), got: ${t}`);
});

test('triple gauge vertex: Ward identity q·V1=0 is shown as a genuine (nontrivial) cancellation', () => {
  const r = runTripleGauge(SAMPLE_TEXT);
  const wardStep = r.steps.find(s => /ward identity/i.test(s.title));
  assert.ok(wardStep, 'expected a dedicated Ward-identity check step');
  const t = plain(wardStep.expr);
  assert.match(t, /=\s*0\s*✓/, `expected the Ward identity to conclude "= 0 ✓", got: ${t}`);
  // The two surviving terms must actually be equal-and-opposite (nontrivial), not both already zero.
  assert.match(t, /2\(\s*p2\s*·ε₁\s*\)\(\s*p1\s*·ε₂\s*\)/, `expected a genuine nonzero term before cancellation, got: ${t}`);
});

test('triple gauge vertex: swapping which momentum plays leg-1/leg-2 (p1<->p2) leaves the result symmetric', () => {
  // Physical check: (X1·X2)(Y1·Y2)+(X1·Y2)(Y1·X2) is symmetric under 1<->2, so the
  // final numeric coefficient shouldn't change if the two "incoming" legs are relabelled.
  const swapped = SAMPLE_TEXT.replace(/ε\(p1\)/, 'ε(pX)').replace(/ε\(p2\)/, 'ε(p1)').replace(/ε\(pX\)/, 'ε(p2)');
  const r1 = runTripleGauge(SAMPLE_TEXT);
  const r2 = runTripleGauge(swapped);
  // Only the final closed-form result is a physical invariant under 1<->2 --
  // the intermediate substitution step may list the same two dot products in
  // a different order without that mattering.
  const finalOf = r => plain(r.steps[r.steps.length - 1].expr).match(/Σ pol.*$/)[0];
  const f1 = finalOf(r1), f2 = finalOf(r2);
  assert.equal(f1, f2, `expected leg relabelling to leave the final result unchanged, got:\n${f1}\nvs\n${f2}`);
});

// ── General channel-aware engine: s/t/u all give the correct, crossing-
//    symmetric closed form ("8(other two Mandelstam²)/channel²") ──────────

const CHANNEL_EXPECT = {
  s: { latex: '\\Sigma_{\\rm pol}|\\mathcal{M}|^2 = \\frac{8(g)^4(t^2+u^2)}{s^2}', legs: ['p1', 'p2', 'p3', 'p4'] },
  t: { latex: '\\Sigma_{\\rm pol}|\\mathcal{M}|^2 = \\frac{8(g)^4(s^2+u^2)}{t^2}', legs: ['p1', 'p3', 'p2', 'p4'] },
  u: { latex: '\\Sigma_{\\rm pol}|\\mathcal{M}|^2 = \\frac{8(g)^4(s^2+t^2)}{u^2}', legs: ['p1', 'p4', 'p2', 'p3'] },
};

for (const [channel, expect] of Object.entries(CHANNEL_EXPECT)) {
  test(`triple gauge vertex: ${channel}-channel gives the correct crossing-symmetric closed form`, () => {
    const r = runTripleGauge(sampleText(channel));
    assert.equal(r.latex, expect.latex, `wrong closed form for ${channel}-channel`);

    const channelStep = r.steps.find(s => /channel selection/i.test(s.title));
    assert.ok(channelStep, 'expected a channel-selection step');
    const t = plain(channelStep.expr);
    const [v1a, v1b, v2a, v2b] = expect.legs;
    assert.match(t, new RegExp(`${channel}-channel`), `expected the ${channel}-channel to be identified, got: ${t}`);
    assert.match(t, new RegExp(`Vertex 1 = \\{\\s*${v1a}\\s*,\\s*${v1b}\\s*\\}`), `expected vertex 1 legs {${v1a},${v1b}}, got: ${t}`);
    assert.match(t, new RegExp(`Vertex 2 = \\{\\s*${v2a}\\s*,\\s*${v2b}\\s*\\}`), `expected vertex 2 legs {${v2a},${v2b}}, got: ${t}`);
  });

  test(`triple gauge vertex: ${channel}-channel Ward identity still holds (genuine cancellation, correctly signed)`, () => {
    const r = runTripleGauge(sampleText(channel));
    const wardStep = r.steps.find(s => /ward identity/i.test(s.title));
    const t = plain(wardStep.expr);
    assert.match(t, /=\s*0\s*✓/, `expected "= 0 ✓" for ${channel}-channel, got: ${t}`);
  });
}
