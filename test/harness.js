'use strict';
// Headless harness for amplitude_stepper.html.
//
// The shipped app is a single HTML file with an inline <script> and no build
// step -- we don't want a second, drifting copy of that logic for testing.
// jsdom's runScripts:"dangerously" loads and executes the file exactly as a
// browser would (parses the real DOM, runs the inline script, wires up all
// the button handlers), so this harness never touches amplitude_stepper.html;
// it just drives it the way a browser tab would.
//
// Top-level `let`/`const` in a classic <script> do NOT become window
// properties (only `var`/function declarations do) -- but they ARE reachable
// via further code evaluated in the same window realm, exactly like typing
// into the browser devtools console on the loaded page. So instead of trying
// to read `window.STEPS` directly, every helper below runs a tiny follow-up
// script through `window.eval(...)` to read back STEPS/LATEX/DIM/XI.

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const STEPPER_PATH = path.join(__dirname, '..', 'amplitude_stepper.html');

function loadStepper() {
  const html = fs.readFileSync(STEPPER_PATH, 'utf8');
  const dom = new JSDOM(html, {
    url: 'file://' + STEPPER_PATH,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
  });
  // navigator.clipboard isn't implemented by jsdom; the app only touches it
  // inside the "Copy LaTeX" button's click handler, which no test triggers,
  // but define a harmless stub so nothing throws if that ever changes.
  if (!dom.window.navigator.clipboard) {
    dom.window.navigator.clipboard = { writeText: () => Promise.resolve() };
  }
  return dom;
}

// Read back a script-global value (STEPS, LATEX, DIM, XI, ...) by evaluating
// a bare expression in the page's realm.
function readGlobal(dom, name) {
  return dom.window.eval(name);
}

function setInput(dom, text) {
  dom.window.document.getElementById('amp-input').value = text;
}

function setDim(dom, dim) {
  if (dim === undefined) return;
  dom.window.document.getElementById('inp-dim').value = String(dim);
}

function setXi(dom, xi) {
  if (xi === undefined) return;
  dom.window.document.getElementById('inp-xi').value = String(xi);
}

// Run a typed trace/iM expression through the same path the Solve button
// uses, returning {steps, latex, dom}.
function runInput(text, { dim, xi, dom } = {}) {
  const d = dom || loadStepper();
  setDim(d, dim);
  setXi(d, xi);
  setInput(d, text);
  d.window.eval('go()');
  return { steps: readGlobal(d, 'STEPS'), latex: readGlobal(d, 'LATEX'), dom: d };
}

// Run one of the built-in Examples-drawer presets (eg('ee_mumu'), eg('bhabha'), ...).
function runExample(name, { dim, xi, dom } = {}) {
  const d = dom || loadStepper();
  setDim(d, dim);
  setXi(d, xi);
  d.window.eval(`eg(${JSON.stringify(name)})`);
  return { steps: readGlobal(d, 'STEPS'), latex: readGlobal(d, 'LATEX'), dom: d };
}

// Strip HTML tags and collapse whitespace, for plain-text assertions against
// the final step's rendered expression. Parsed structurally (via a scratch
// jsdom document) rather than with regex, because the app renders fractions
// as <span class="fr"><span class="n">NUM</span><span class="d">DEN</span></span>
// with no literal "/" character -- naive tag-stripping would silently
// concatenate numerator and denominator. class="n"/"d" get a "/" between
// them; everything else is plain text concatenation.
let scratchDoc = null;
function plainText(html) {
  if (!html) return '';
  if (!scratchDoc) scratchDoc = new JSDOM('').window.document;
  const root = scratchDoc.createElement('div');
  root.innerHTML = html;
  let out = '';
  (function walk(node) {
    if (node.nodeType === 3) { out += node.textContent; return; }
    if (node.nodeType !== 1) return;
    if (node.classList && node.classList.contains('fr')) {
      const n = node.querySelector('.n');
      const d = node.querySelector('.d');
      out += '(' + plainText(n ? n.innerHTML : '') + ')/(' + plainText(d ? d.innerHTML : '') + ')';
      return;
    }
    node.childNodes.forEach(c => walk(c));
  })(root);
  return out
    .replace(/\s+/g, ' ')
    .trim();
}

function finalStep(steps) {
  return steps[steps.length - 1];
}

function finalPlainText(steps) {
  return plainText(finalStep(steps).expr);
}

module.exports = { loadStepper, runInput, runExample, plainText, finalStep, finalPlainText, readGlobal };
