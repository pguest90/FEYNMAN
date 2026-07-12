'use strict';
// Tests for the "Export LaTeX" (tikz-feynman) feature in feynman_editor.html:
// buildTikzFeynmanExport() / buildOneTikzDiagram() and the modal/button wiring.
//
// buildTikzFeynmanExport() returns {full, diagramsOnly}: `full` is the
// complete standalone document (package note + \documentclass/\usepackage/
// \begin{document}...\end{document}), shown in the modal textarea and used
// by "Download .tex". `diagramsOnly` is just the \feynmandiagram block(s)
// (with their Feynman-rule comments) -- no package note, no document
// wrapper -- and is what "Copy to clipboard" actually copies, since a user
// pasting into their own already-set-up document doesn't want either.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadEditor } = require('./editor_harness.js');

// `verts`/`edges` are top-level `let` bindings in the page's classic <script>,
// which do NOT become window properties (see editor_harness.js/harness.js) --
// setting dom.window.verts=... would just create an unrelated shadow
// property. Assign through eval() instead, in the same realm as the script.
function setDiagram(dom, verts, edges) {
  dom.window.eval(`verts = ${JSON.stringify(verts)}; edges = ${JSON.stringify(edges)};`);
}

test('default sample diagram (γγ→e⁺e⁻) exports valid-looking tikz-feynman source', () => {
  const dom = loadEditor();
  const { full, diagramsOnly } = dom.window.eval('buildTikzFeynmanExport()');
  assert.match(full, /\\usepackage\{tikz-feynman\}/);
  assert.match(full, /\\feynmandiagram/);
  assert.match(full, /\\begin\{document\}/);
  assert.match(full, /\\end\{document\}/);
  // Only 1 connected component -> no "Diagram N of M" interference header.
  assert.ok(!/Diagram \d+ of \d+/.test(full), `expected a single diagram, got:\n${full}`);
  // 2 interaction vertices -> horizontal layout hint between them.
  assert.match(full, /horizontal=n\d+ to n\d+/);
  // Both QED vertices should be dot-tagged and rule-annotated.
  assert.match(full, /\[dot\]/);
  assert.match(full, /% n\d+: e — /);
  // diagramsOnly wraps the SAME \feynmandiagram body in a figure environment
  // (see the dedicated figure-wrapper test below) -- so it's not verbatim
  // inside `full` anymore, but the actual edge-list content must match.
  assert.match(diagramsOnly, /\\feynmandiagram/);
  const edgeListOf = s => s.match(/\\feynmandiagram[^{]*\{([\s\S]*?)\};/)[1].replace(/\s+/g, ' ').trim();
  assert.equal(edgeListOf(diagramsOnly), edgeListOf(full), 'diagramsOnly and full should describe the same diagram content');
});

test('"Copy to clipboard" wraps each diagram in a figure environment with caption/label', () => {
  const dom = loadEditor();
  const { diagramsOnly, full } = dom.window.eval('buildTikzFeynmanExport()');
  assert.match(diagramsOnly, /\\begin\{figure\}\[h\]/);
  assert.match(diagramsOnly, /\\centering/);
  assert.match(diagramsOnly, /\\caption\{Feynman diagram\.\}/);
  assert.match(diagramsOnly, /\\label\{fig:diagram\}/);
  assert.match(diagramsOnly, /\\end\{figure\}/);
  // `full` (the standalone test/preview document) stays bare -- no figure wrapper.
  assert.ok(!/\\begin\{figure\}/.test(full), `expected no figure wrapper in full, got:\n${full}`);
});

test('diagramsOnly excludes the package note and the document wrapper', () => {
  const dom = loadEditor();
  const { diagramsOnly } = dom.window.eval('buildTikzFeynmanExport()');
  assert.ok(!/Requires:/.test(diagramsOnly), `package note leaked into diagramsOnly:\n${diagramsOnly}`);
  assert.ok(!/\\usepackage/.test(diagramsOnly), `\\usepackage leaked into diagramsOnly:\n${diagramsOnly}`);
  assert.ok(!/\\documentclass/.test(diagramsOnly), `\\documentclass leaked into diagramsOnly:\n${diagramsOnly}`);
  assert.ok(!/\\begin\{document\}/.test(diagramsOnly), `\\begin{document} leaked into diagramsOnly:\n${diagramsOnly}`);
  assert.ok(!/\\end\{document\}/.test(diagramsOnly), `\\end{document} leaked into diagramsOnly:\n${diagramsOnly}`);
});

test('"Copy to clipboard" copies diagramsOnly, not the full document', () => {
  const dom = loadEditor();
  dom.window.document.getElementById('btn-export-latex')
    .dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  dom.window.document.getElementById('btn-copy-tikz')
    .dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));

  const copied = dom.window.__lastClipboardWrite;
  const ta = dom.window.document.getElementById('latex-export-text');
  assert.ok(copied, 'expected something to have been copied');
  assert.ok(!/Requires:/.test(copied), `package note should not be copied, got:\n${copied}`);
  assert.ok(!/\\documentclass/.test(copied), `\\documentclass should not be copied, got:\n${copied}`);
  assert.match(copied, /\\feynmandiagram/);
  // The textarea (and Download) still show/use the FULL document.
  assert.match(ta.value, /Requires:/);
  assert.match(ta.value, /\\documentclass/);
});

test('fermion arrow direction maps to fermion vs anti fermion correctly', () => {
  const dom = loadEditor();
  const { full } = dom.window.eval('buildTikzFeynmanExport()');
  // loadSample(): edge 10 (electron out, not reversed) -> plain fermion;
  // edge 11 (positron out, reversed:true) -> anti fermion.
  assert.match(full, /\[fermion,/, 'expected at least one plain fermion line');
  assert.match(full, /\[anti fermion,/, 'expected the reversed leg to render as "anti fermion"');
});

test('undirected line types (photon/gluon/scalar/graviton) never get an "anti" prefix', () => {
  const dom = loadEditor();
  setDiagram(dom,
    [
      { id: 1, x: 0, y: 0, label: 'hAA', style: 'dot' },
      { id: 2, x: -100, y: -50, label: '', style: 'none' },
      { id: 3, x: 100, y: -50, label: '', style: 'none' },
      { id: 4, x: 0, y: 100, label: '', style: 'none' },
    ],
    [
      { id: 10, from: 2, to: 1, type: 'photon', label: '', reversed: true, cx: 0, cy: 0 },
      { id: 11, from: 1, to: 3, type: 'photon', label: '', reversed: true, cx: 0, cy: 0 },
      { id: 12, from: 1, to: 4, type: 'graviton', label: '', reversed: true, cx: 0, cy: 0 },
    ]
  );
  const { full } = dom.window.eval('buildTikzFeynmanExport()');
  assert.ok(!/anti photon/.test(full) && !/anti graviton/.test(full),
    `photon/graviton must stay undirected even with reversed:true, got:\n${full}`);
  assert.match(full, /\[photon,/);
  assert.match(full, /\[graviton,/);
});

test('self-loop edge exports via the auxiliary-vertex workaround (tikz-feynman has no working single-edge self-loop)', () => {
  const dom = loadEditor();
  setDiagram(dom,
    [
      { id: 1, x: 0, y: 0, label: 'q', style: 'dot' },
      { id: 2, x: -100, y: -50, label: '', style: 'none' },
      { id: 3, x: -100, y: 50, label: '', style: 'none' },
      { id: 4, x: 100, y: 0, label: '', style: 'none' },
    ],
    [
      { id: 10, from: 2, to: 1, type: 'fermion', label: '', reversed: false, cx: 0, cy: 0 },
      { id: 11, from: 1, to: 3, type: 'fermion', label: '', reversed: false, cx: 0, cy: 0 },
      { id: 12, from: 1, to: 1, type: 'gluon', label: '', reversed: false, cx: 0, cy: 0 },
      { id: 13, from: 1, to: 4, type: 'photon', label: '', reversed: false, cx: 0, cy: 0 },
    ]
  );
  const { full } = dom.window.eval('buildTikzFeynmanExport()');
  // `v -- [gluon] v` silently draws nothing in tikz-feynman (verified by
  // actually compiling it) -- the fix is two half-circle arcs through an
  // auxiliary vertex named after the edge id, e.g. n12loop for edge id 12.
  assert.match(full, /n1 -- \[gluon, half left\] n12loop,/, `expected the auxiliary-vertex loop workaround, got:\n${full}`);
  assert.match(full, /n12loop -- \[gluon, half left\] n1,/, `expected the return arc back to n1, got:\n${full}`);
  // The vertex itself must still get its [dot] tag despite the extra loop lines.
  assert.match(full, /n1 \[dot\]/, `expected n1 to still be dot-tagged, got:\n${full}`);
});

test('two parallel propagators between the same vertex pair (one-loop bubble) get separated with bend angles', () => {
  // Without a bend, two identical "n1 -- [scalar] n2" edges render as the
  // exact same straight segment stacked on top of each other (confirmed by
  // actually compiling it -- this was reported as "the 2 lines in the loop
  // are on top of each other"). Fix: fan them out with bend left/right.
  const dom = loadEditor();
  setDiagram(dom,
    [
      { id: 1, x: -100, y: 0, label: 'lam', style: 'dot' },
      { id: 2, x: 100, y: 0, label: 'lam', style: 'dot' },
      { id: 3, x: -250, y: -100, label: '', style: 'none' },
      { id: 4, x: -250, y: 100, label: '', style: 'none' },
      { id: 5, x: 250, y: -100, label: '', style: 'none' },
      { id: 6, x: 250, y: 100, label: '', style: 'none' },
    ],
    [
      { id: 10, from: 3, to: 1, type: 'scalar', label: '', reversed: false, cx: 0, cy: 0 },
      { id: 11, from: 4, to: 1, type: 'scalar', label: '', reversed: false, cx: 0, cy: 0 },
      { id: 12, from: 1, to: 2, type: 'scalar', label: '', reversed: false, cx: 0, cy: -30 },
      { id: 13, from: 1, to: 2, type: 'scalar', label: '', reversed: false, cx: 0, cy: 30 },
      { id: 14, from: 2, to: 5, type: 'scalar', label: '', reversed: false, cx: 0, cy: 0 },
      { id: 15, from: 2, to: 6, type: 'scalar', label: '', reversed: false, cx: 0, cy: 0 },
    ]
  );
  const { full } = dom.window.eval('buildTikzFeynmanExport()');
  assert.match(full, /n1 -- \[scalar, bend left=30\] n2/, `expected the first parallel edge bent left, got:\n${full}`);
  assert.match(full, /n1 -- \[scalar, bend right=30\] n2/, `expected the second parallel edge bent right, got:\n${full}`);
});

test('a single (non-parallel) propagator between two vertices gets no bend option', () => {
  const dom = loadEditor();
  const { full } = dom.window.eval('buildTikzFeynmanExport()'); // default sample: n1--n2 fermion propagator, no duplicate
  assert.match(full, /n1 \[dot\] -- \[fermion\] n2 \[dot\],/, `expected the sole n1-n2 propagator with no bend option, got:\n${full}`);
});

test('multiple disconnected diagrams (interference terms) each get their own \\feynmandiagram block', () => {
  const dom = loadEditor();
  setDiagram(dom,
    [
      { id: 1, x: 0, y: 0, label: 'e', style: 'dot' },
      { id: 2, x: -100, y: -50, label: '', style: 'none' },
      { id: 3, x: -100, y: 50, label: '', style: 'none' },
      { id: 4, x: 100, y: 0, label: '', style: 'none' },
      { id: 5, x: 400, y: 0, label: 'λ', style: 'dot' },
      { id: 6, x: 300, y: -50, label: '', style: 'none' },
      { id: 7, x: 300, y: 50, label: '', style: 'none' },
      { id: 8, x: 500, y: -50, label: '', style: 'none' },
      { id: 9, x: 500, y: 50, label: '', style: 'none' },
    ],
    [
      { id: 10, from: 2, to: 1, type: 'fermion', label: '', reversed: false, cx: 0, cy: 0 },
      { id: 11, from: 1, to: 3, type: 'fermion', label: '', reversed: false, cx: 0, cy: 0 },
      { id: 12, from: 1, to: 4, type: 'photon', label: '', reversed: false, cx: 0, cy: 0 },
      { id: 13, from: 6, to: 5, type: 'scalar', label: '', reversed: false, cx: 0, cy: 0 },
      { id: 14, from: 5, to: 7, type: 'scalar', label: '', reversed: false, cx: 0, cy: 0 },
      { id: 15, from: 5, to: 8, type: 'scalar', label: '', reversed: false, cx: 0, cy: 0 },
      { id: 16, from: 5, to: 9, type: 'scalar', label: '', reversed: false, cx: 0, cy: 0 },
    ]
  );
  const { full, diagramsOnly } = dom.window.eval('buildTikzFeynmanExport()');
  const blocks = full.match(/\\feynmandiagram/g) || [];
  assert.equal(blocks.length, 2, `expected 2 \\feynmandiagram blocks, got:\n${full}`);
  assert.match(full, /Diagram 1 of 2 \(interference term/);
  assert.match(full, /Diagram 2 of 2 \(interference term/);
  // Each figure-wrapped diagram (Copy to clipboard) gets its own distinct label.
  assert.match(diagramsOnly, /\\label\{fig:diagram1\}/);
  assert.match(diagramsOnly, /\\label\{fig:diagram2\}/);
  assert.match(diagramsOnly, /\\caption\{Feynman diagram 1 of 2/);
  assert.match(diagramsOnly, /\\caption\{Feynman diagram 2 of 2/);
});

test('empty canvas exports null, and the export button shows a friendly placeholder instead of crashing', () => {
  const dom = loadEditor();
  setDiagram(dom, [], []);
  const result = dom.window.eval('buildTikzFeynmanExport()');
  assert.equal(result, null);

  const btn = dom.window.document.getElementById('btn-export-latex');
  btn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  const modal = dom.window.document.getElementById('latex-modal');
  const ta = dom.window.document.getElementById('latex-export-text');
  assert.equal(modal.style.display, 'flex');
  assert.match(ta.value, /No diagram drawn yet/);
});

test('Export LaTeX button opens the modal with populated source; Escape closes it', () => {
  const dom = loadEditor();
  const btn = dom.window.document.getElementById('btn-export-latex');
  btn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  const modal = dom.window.document.getElementById('latex-modal');
  const ta = dom.window.document.getElementById('latex-export-text');
  assert.equal(modal.style.display, 'flex');
  assert.match(ta.value, /feynmandiagram/);

  dom.window.document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape' }));
  assert.equal(modal.style.display, 'none');
});

test('Download .tex button does not throw', () => {
  const dom = loadEditor();
  dom.window.document.getElementById('btn-export-latex')
    .dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  assert.doesNotThrow(() => {
    dom.window.document.getElementById('btn-download-tikz')
      .dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  });
});
