'use strict';
// Regression + new-feature tests for feynman_editor.html's "Lagrangian ->
// Feynman Rules" derive panel (deriveLag / the momentum-space derivative-
// vertex engine added on top of it).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadEditor, derive } = require('./editor_harness.js');

// ── Existing examples must still derive cleanly (regression guard for the
//    field-boundary regex fix: (?![a-zA-Z_]) -> (?![a-zA-Z0-9]) touches every
//    field-matching regex in the file) ─────────────────────────────────────

test('phi4: kinetic+mass propagator and -ilambda vertex, no warnings', () => {
  const dom = loadEditor();
  const r = derive('(1/2)*(d phi)^2 - (m^2/2)*phi^2 - (lam/4!)*phi^4',
    [{name:'phi',type:'scalar'}], {dom});
  assert.equal(r.warnings.length, 0);
  assert.ok(r.propMap.phi.kinetic && r.propMap.phi.hasMass);
  assert.equal(r.vertices.length, 1);
  assert.equal(r.vertices[0].total, 4);
});

test('yukawa: fermion pair propagator recognized, g*phi*psib*psi vertex present', () => {
  const dom = loadEditor();
  const r = derive('psib*(i*dslash - M)*psi + (1/2)*(d phi)^2 - (mu^2/2)*phi^2 - g*phi*psib*psi',
    [{name:'psi',type:'fermion'},{name:'psib',type:'fermion_bar'},{name:'phi',type:'scalar'}], {dom});
  assert.equal(r.warnings.length, 0);
  const fermProp = r.propMap['psib/psi'];
  assert.ok(fermProp && fermProp.kinetic && fermProp.hasMass && fermProp.massSymbol==='M');
  assert.equal(r.vertices.length, 1);
  assert.equal(r.vertices[0].total, 3);
  assert.equal(r.vertices[0].momentumRule, null); // fermion vertex -- new engine must not engage
});

test('qed: -e*psib*gam^mu*psi*A vertex present, gamma extracted, no momentum engine', () => {
  const dom = loadEditor();
  const r = derive('psib*(i*dslash - m)*psi - (1/4)*F^2 - e*psib*gam^mu*psi*A',
    [{name:'psi',type:'fermion'},{name:'psib',type:'fermion_bar'},{name:'A',type:'vector'}], {dom});
  assert.equal(r.warnings.length, 0);
  assert.equal(r.vertices.length, 1);
  assert.equal(r.vertices[0].gammas.length, 1);
  assert.equal(r.vertices[0].momentumRule, null);
});

// ── Scalar QED: the actual new capability under test ──────────────────────

const SQED_FIELDS = [
  {name:'phi', type:'scalar'},
  {name:'phis', type:'scalar_bar'},
  {name:'A', type:'vector'},
];
const SQED_LAG = '(d phis)*(d phi) - m^2*phis*phi - (1/4)*F^2 '
  + '+ i*e*A_mu*(phis*(d_mu phi) - phi*(d_mu phis)) + e^2*A_mu*A_mu*phis*phi';

test('scalar QED: complex-scalar propagator pair recognized (phis/phi, massive, kinetic)', () => {
  const dom = loadEditor();
  const r = derive(SQED_LAG, SQED_FIELDS, {dom});
  assert.equal(r.warnings.length, 0, `unexpected warnings: ${JSON.stringify(r.warnings)}`);
  const pd = r.propMap['phis/phi'];
  assert.ok(pd, 'expected a phis/phi propagator entry');
  assert.equal(pd.type, 'scalar');
  assert.ok(pd.kinetic, 'expected kinetic flag from (d phis)*(d phi)');
  assert.ok(pd.hasMass, 'expected mass flag from m^2*phis*phi');
  assert.equal(pd.massSymbol, 'm', 'mass term is already written squared (m^2*phis*phi) -- should not be re-squared');
});

test('scalar QED: cubic current vertex derives to ie(p_phi - p_phis)^mu, not a generic note', () => {
  const dom = loadEditor();
  const r = derive(SQED_LAG, SQED_FIELDS, {dom});
  const cubic = r.vertices.find(v => v.total===3);
  assert.ok(cubic, 'expected a 3-point vertex (A, phi, phis)');
  assert.ok(cubic.momentumRule, 'expected the momentum engine to engage on the derivative current term');

  const { renderMomentumRule } = dom.window.__lagEngine;
  const { rule, legend } = renderMomentumRule(cubic.momentumRule);

  // All-incoming convention: ie(p_phi - p_phis)^mu, i.e. one leg +, one leg -,
  // both carrying the same Lorentz index, coupling "e", overall phase "i".
  assert.match(rule, /^ie\(/, `expected rule to start "ie(", got: ${rule}`);
  assert.match(rule, /p.\^μ/, `expected a momentum factor with a μ index, got: ${rule}`);
  assert.match(rule, /−/, `expected one leg's momentum to enter with a minus sign, got: ${rule}`);
  assert.ok(legend.includes('all momenta incoming'), `expected an all-incoming legend note, got: ${legend}`);
  // Legend must name exactly the vertex's three legs.
  assert.ok(legend.includes('=A') && legend.includes('=phi') && legend.includes('=phis'),
    `expected legend to name A, phi, phis legs, got: ${legend}`);
});

test('scalar QED: quartic seagull vertex gets combinatorial factor 2 from repeated A, no bogus momentum note', () => {
  const dom = loadEditor();
  const r = derive(SQED_LAG, SQED_FIELDS, {dom});
  const quartic = r.vertices.find(v => v.total===4);
  assert.ok(quartic, 'expected a 4-point vertex (A, A, phis, phi)');
  assert.equal(quartic.momentumRule, null, 'seagull term has no derivative -- engine must not engage');
  const aField = quartic.fields.find(f=>f.name==='A');
  assert.ok(aField && aField.count===2, `expected A to be counted twice (regex boundary fix), got: ${JSON.stringify(aField)}`);

  const html = dom.window.__lagEngine.renderRules(r);
  // vertexStr's existing (pre-existing, unchanged) display convention puts
  // the identical-particle combinatorial factor after the coupling: "ie²·2".
  assert.match(html, /ie²·2|ie\^2·2/, `expected the seagull rule to show a factor of 2, got: ${html}`);
});

// ── SMEFT B/L-violating preset: must flow into the "⚛ Generate Diagrams"
//    theory-vertex pipeline (buildGenTheory/generateAllDiagrams), not just
//    the rules-panel display -- that's the whole point of adding it as an
//    EXAMPLES preset instead of just a FR_DEFAULTS canvas vertex. ─────────

test('SMEFT B/L preset: all 5 operators (LLHH, duql, qque, qqql, duue) derive as clean 4-point vertices', () => {
  const dom = loadEditor();
  const ex = dom.window.__lagEngine.EXAMPLES.smeft_bl;
  assert.ok(ex, 'expected an EXAMPLES.smeft_bl preset');
  const r = derive(ex.lag, ex.fields, {dom});
  assert.equal(r.warnings.length, 0, `unexpected warnings: ${JSON.stringify(r.warnings)}`);
  assert.equal(r.vertices.length, 5, `expected 5 vertex terms, got: ${JSON.stringify(r.vertices.map(v=>v.fields))}`);
  r.vertices.forEach(v => assert.equal(v.total, 4, `expected every SMEFT operator here to be a 4-point vertex, got ${v.total}`));
});

test('SMEFT B/L preset: every declared fermion pair + Higgs gets a real propagator (needed for Generate Diagrams)', () => {
  const dom = loadEditor();
  const ex = dom.window.__lagEngine.EXAMPLES.smeft_bl;
  const r = derive(ex.lag, ex.fields, {dom});
  for (const key of ['dqb/dq', 'ub/u', 'Qb/Q', 'Lb/L', 'eb/e']) {
    assert.ok(r.propMap[key]?.kinetic, `expected a kinetic fermion propagator for ${key}`);
  }
  assert.ok(r.propMap.H?.kinetic, 'expected a kinetic Higgs propagator');
});

test('SMEFT B/L preset: buildGenTheory recognizes all 5 operators as vertexTypes usable by the generator', () => {
  const dom = loadEditor();
  const ex = dom.window.__lagEngine.EXAMPLES.smeft_bl;
  const r = derive(ex.lag, ex.fields, {dom});
  const theory = dom.window.__lagEngine.buildGenTheory(r);
  assert.equal(theory.lineTypes.length, 6, 'expected 6 lines: 5 fermion species + Higgs');
  assert.equal(theory.vertexTypes.length, 5, 'expected all 5 SMEFT operators to become generator vertexTypes');
  theory.vertexTypes.forEach(vt => assert.equal(vt.valence, 4, 'every SMEFT contact operator here is 4-point'));
});

test('SMEFT B/L preset: Generate Diagrams (tree level) actually produces diagrams, not an empty/crashed result', () => {
  const dom = loadEditor();
  const ex = dom.window.__lagEngine.EXAMPLES.smeft_bl;
  const r = derive(ex.lag, ex.fields, {dom});
  const theory = dom.window.__lagEngine.buildGenTheory(r);
  const genResult = dom.window.__lagEngine.generateAllDiagrams(theory, 0);
  assert.ok(genResult && genResult.groups && genResult.groups.length > 0,
    `expected at least one generated diagram group, got: ${JSON.stringify(genResult)}`);
});
