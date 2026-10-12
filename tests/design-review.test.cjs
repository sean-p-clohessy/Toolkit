const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'assets/js/app.js'), 'utf8');

function fixture(fetch) {
  const attributes = {};
  const retry = { addEventListener(type, handler) { this.handler = handler; }, focus() {} };
  const region = {
    innerHTML: '',
    contains() { return false; },
    getAttribute(name) { return attributes[name]; },
    setAttribute(name, value) { attributes[name] = value; },
    querySelector() { return retry; }
  };
  const grid = { innerHTML: '' };
  const context = vm.createContext({
    window: {}, AbortSignal, fetch,
    document: { activeElement: null, querySelector(selector) {
      return selector === '[data-updates]' ? region : selector === '[data-tool-grid]' ? grid : null;
    } }
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/config.js'), 'utf8'), context);
  vm.runInContext(source.slice(0, source.lastIndexOf('\nrenderTools();')), context);
  return { context, region, retry, attributes, grid };
}

test('seven tool destinations, individual colours and new-tab hints are retained', () => {
  const f = fixture();
  f.context.renderTools();
  assert.equal((f.grid.innerHTML.match(/class="tool-card/g) || []).length, 7);
  assert.equal((f.grid.innerHTML.match(/tool-card--game/g) || []).length, 1);
  assert.equal(f.context.window.TOOLKIT_TOOLS.at(-1).id, 'evidence-please');
  for (const tool of f.context.window.TOOLKIT_TOOLS) {
    assert.ok(f.grid.innerHTML.includes('href="' + tool.url + '"'));
    assert.ok(f.grid.innerHTML.includes('--tool-accent:' + tool.accent));
  }
  assert.equal((f.grid.innerHTML.match(/opens in a new tab/g) || []).length, 7);
});
test('successful feed renders updates and clears busy state', async () => {
  const f = fixture(async () => ({ ok: true, json: async () => ({ updates: [
    { tool: 'Test tool', timestamp: '2026-10-12', summary: 'fix: Improve clarity' }
  ] }) }));
  await f.context.loadUpdates();
  assert.match(f.region.innerHTML, /Improve clarity/);
  assert.equal(f.attributes['aria-busy'], 'false');
});
test('empty feed is distinct from an error', async () => {
  const f = fixture(async () => ({ ok: true, json: async () => [] }));
  await f.context.loadUpdates();
  assert.match(f.region.innerHTML, /No updates yet/);
  assert.doesNotMatch(f.region.innerHTML, /Try again/);
});
test('failed request offers retry and recovers', async () => {
  let fail = true;
  const f = fixture(async () => {
    if (fail) throw new Error('Offline');
    return { ok: true, json: async () => [] };
  });
  await f.context.loadUpdates();
  assert.match(f.region.innerHTML, /Try again/);
  assert.equal(f.attributes['aria-busy'], 'false');
  fail = false;
  await f.retry.handler();
  assert.match(f.region.innerHTML, /No updates yet/);
});
test('malformed feed and HTTP failures are recoverable errors', async () => {
  for (const response of [{ ok: false }, { ok: true, json: async () => ({ bad: true }) }]) {
    const f = fixture(async () => response);
    await f.context.loadUpdates();
    assert.match(f.region.innerHTML, /Try again/);
  }
});
