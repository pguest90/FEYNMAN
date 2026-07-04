'use strict';
// Headless harness for feynman_editor.html's "Lagrangian -> Feynman Rules"
// panel. Same approach as harness.js for the stepper: load the real file
// into jsdom with runScripts:"dangerously" so we exercise the shipped code,
// not a copy of it. The derivation engine lives inside an IIFE, so it
// exposes a small `window.__lagEngine` test hook (see the end of the
// "Lagrangian engine IIFE" in feynman_editor.html) instead of relying on
// bare top-level declarations becoming window properties.

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const EDITOR_PATH = path.join(__dirname, '..', 'feynman_editor.html');

// jsdom doesn't implement <canvas> 2D rendering (getContext('2d') is null by
// default), but the page's own load path unconditionally draws the sample
// diagram on load -- left unstubbed, that throws and aborts the inline
// <script> before it reaches the bottom of the file, so window.__lagEngine
// never gets installed. None of that drawing matters for testing the
// Lagrangian-derive engine, so hand back a no-op-everything fake context.
function makeFakeCtx() {
  const store = {};
  return new Proxy(store, {
    get(target, prop) {
      if (prop === 'measureText') return () => ({ width: 0 });
      if (prop in target) return target[prop];
      return () => {};
    },
    set(target, prop, value) { target[prop] = value; return true; },
  });
}

function loadEditor() {
  const html = fs.readFileSync(EDITOR_PATH, 'utf8');
  const dom = new JSDOM(html, {
    url: 'file://' + EDITOR_PATH,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(window) {
      const fakeCtx = makeFakeCtx();
      window.HTMLCanvasElement.prototype.getContext = () => fakeCtx;
    },
  });
  return dom;
}

// Run deriveLag(lagText, fields) through the loaded page and return its result.
function derive(lagText, fields, { dom } = {}) {
  const d = dom || loadEditor();
  return d.window.__lagEngine.deriveLag(lagText, fields);
}

module.exports = { loadEditor, derive };
