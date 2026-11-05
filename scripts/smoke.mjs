/**
 * Headless smoke test: loads the built GUI bundle into a DOM, registers the
 * plugin through the real SDK, renders the page and asserts that sessions
 * become cards. Run after `npm run build`.
 */
import assert from 'node:assert/strict';
import Module, { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const project = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const require = createRequire(project + '/package.json');

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://127.0.0.1:31815/plugins/yuri-session-board/board',
  pretendToBeVisual: true,
});
for (const key of ['window', 'document', 'HTMLElement', 'Node', 'Event', 'PopStateEvent', 'CustomEvent', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame']) {
  Object.defineProperty(globalThis, key, { value: dom.window[key], configurable: true });
}
Object.defineProperty(globalThis, 'localStorage', { value: dom.window.localStorage, configurable: true });
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });

const gui = await import(project + '/node_modules/@opencode/plugin/dist/gui/index.js');
const originalLoad = Module._load;
let solid, solidStore, solidWeb;
Module._load = function (request, parent, isMain) {
  if (request === '@opencode/plugin/gui') return gui;
  if (request === 'solid-js') return solid || (solid = originalLoad.call(this, project + '/node_modules/solid-js/dist/solid.cjs', parent, isMain));
  if (request === 'solid-js/store') return solidStore || (solidStore = originalLoad.call(this, project + '/node_modules/solid-js/store/dist/store.cjs', parent, isMain));
  if (request === 'solid-js/web') return solidWeb || (solidWeb = originalLoad.call(this, project + '/node_modules/solid-js/web/dist/web.cjs', parent, isMain));
  return originalLoad.call(this, request, parent, isMain);
};
solid = require(project + '/node_modules/solid-js/dist/solid.cjs');
solidStore = require(project + '/node_modules/solid-js/store/dist/store.cjs');
solidWeb = require(project + '/node_modules/solid-js/web/dist/web.cjs');

const now = Date.now();
const sessions = [
  {
    id: 'ses_board_a',
    projectID: 'prj',
    cost: 0.12,
    tokens: { input: 1, output: 1, reasoning: 0, cache: { read: 0, write: 0 } },
    time: { created: now - 60_000, updated: now - 30_000 },
    title: 'Example task',
    agent: 'build',
    location: { directory: '/work/project' },
    metadata: {
      sessionBoard: { version: 1, description: 'Ship the board', status: '执行中', labels: ['ui'], rank: 1 },
    },
  },
  {
    id: 'ses_board_b',
    projectID: 'prj',
    cost: 0,
    tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
    time: { created: now - 120_000, updated: now - 90_000 },
    title: 'Plain session',
    location: { directory: '/work/project' },
  },
  {
    id: 'ses_board_child',
    parentID: 'ses_board_a',
    projectID: 'prj',
    cost: 0,
    tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
    time: { created: now, updated: now },
    title: 'Hidden child',
    location: { directory: '/work/project' },
  },
];

const ctx = {
  id: 'yuri-session-board',
  signal: new AbortController().signal,
  t: (key, params) => (params ? `${key} ${JSON.stringify(params)}` : key),
  options: {},
  toast: { show() {} },
  sessions: { current: () => undefined },
  client: {
    session: {
      list: async () => ({ data: sessions, cursor: {} }),
      get: async ({ sessionID }) => sessions.find((item) => item.id === sessionID),
      create: async () => ({}),
      update: async () => undefined,
      active: async () => ({}),
      prompt: async () => ({}),
    },
    agent: { list: async () => ({ data: [] }) },
    project: { list: async () => [] },
    event: {
      subscribe: ({ signal }) => ({
        async *[Symbol.asyncIterator]() {
          while (!signal.aborted) await new Promise((resolve) => setTimeout(resolve, 50));
        },
      }),
    },
  },
  add() {
    return () => {};
  },
};

const added = [];
const tracked = { ...ctx, add(token, item) { added.push([token && token.id, item]); return () => {}; } };

const bundle = require(project + '/dist/gui-experimental.cjs');
const plugin = bundle.default || bundle;
let cleanup;
solid.createRoot((dispose) => {
  cleanup = plugin.setup(tracked);
  return dispose;
});
const page = added.find(([id]) => id === 'yuri.page')?.[1];
assert.ok(page, 'page registered');
assert.equal(page.id, 'board');

const dispose = solidWeb.render(() => page.render(), dom.window.document.getElementById('root'));
await new Promise((resolve) => setTimeout(resolve, 200));

const cards = [...dom.window.document.querySelectorAll('[data-ysb-card]')].map((node) => node.textContent);
assert.equal(cards.length, 2, `expected 2 cards, got ${cards.length}`);
assert.ok(cards.some((text) => text.includes('Example task')), 'planned task rendered');
assert.ok(cards.some((text) => text.includes('Plain session')), 'unplanned session rendered');
assert.ok(!cards.some((text) => text.includes('Hidden child')), 'child session hidden');
assert.match(dom.window.document.body.textContent, /page\.title/, 'page title rendered');

dispose();
if (typeof cleanup === 'function') cleanup();
console.log('smoke: ok, rendered', cards.length, 'cards');
process.exit(0);
