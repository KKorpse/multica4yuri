/**
 * Headless smoke test: loads the built GUI bundle into a DOM, registers the
 * plugin through the real SDK, renders the page and asserts that sessions
 * become cards. Run after `npm run build`.
 */
import assert from "node:assert/strict";
import Module, { createRequire } from "node:module";
import { JSDOM } from "jsdom";

const project = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const require = createRequire(project + "/package.json");

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: "http://127.0.0.1:31815/plugins/yuri-session-board/board",
  pretendToBeVisual: true,
});
for (const key of [
  "window",
  "document",
  "HTMLElement",
  "HTMLHeadElement",
  "Node",
  "Event",
  "PopStateEvent",
  "CustomEvent",
  "getComputedStyle",
  "requestAnimationFrame",
  "cancelAnimationFrame",
]) {
  Object.defineProperty(globalThis, key, { value: dom.window[key], configurable: true });
}
Object.defineProperty(globalThis, "localStorage", {
  value: dom.window.localStorage,
  configurable: true,
});
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });

const gui = await import(project + "/node_modules/@opencode/plugin/dist/gui/index.js");
const originalLoad = Module._load;
let solid, solidStore, solidWeb;
Module._load = function (request, parent, isMain) {
  if (request === "@opencode/plugin/gui") return gui;
  if (request === "solid-js")
    return (
      solid ||
      (solid = originalLoad.call(
        this,
        project + "/node_modules/solid-js/dist/solid.cjs",
        parent,
        isMain,
      ))
    );
  if (request === "solid-js/store")
    return (
      solidStore ||
      (solidStore = originalLoad.call(
        this,
        project + "/node_modules/solid-js/store/dist/store.cjs",
        parent,
        isMain,
      ))
    );
  if (request === "solid-js/web")
    return (
      solidWeb ||
      (solidWeb = originalLoad.call(
        this,
        project + "/node_modules/solid-js/web/dist/web.cjs",
        parent,
        isMain,
      ))
    );
  return originalLoad.call(this, request, parent, isMain);
};
solid = require(project + "/node_modules/solid-js/dist/solid.cjs");
solidStore = require(project + "/node_modules/solid-js/store/dist/store.cjs");
solidWeb = require(project + "/node_modules/solid-js/web/dist/web.cjs");

const now = Date.now();
const sessions = [
  {
    id: "ses_board_a",
    projectID: "prj",
    cost: 0.12,
    tokens: { input: 1, output: 1, reasoning: 0, cache: { read: 0, write: 0 } },
    time: { created: now - 60_000, updated: now - 30_000 },
    title: "Example task",
    agent: "build",
    location: { directory: "/work/project" },
    metadata: {
      sessionBoard: {
        version: 1,
        description: "Ship the board",
        status: "执行中",
        labels: ["ui"],
        rank: 1,
      },
    },
  },
  {
    id: "ses_board_b",
    projectID: "prj",
    cost: 0,
    tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
    time: { created: now - 120_000, updated: now - 90_000 },
    title: "Plain session",
    location: { directory: "/work/project" },
  },
  {
    id: "ses_board_child",
    parentID: "ses_board_a",
    projectID: "prj",
    cost: 0,
    tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
    time: { created: now, updated: now },
    title: "Hidden child",
    location: { directory: "/work/project" },
  },
  {
    id: "ses_board_done",
    projectID: "prj",
    cost: 0.4,
    tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
    time: { created: now - 300_000, updated: now - 200_000, busy: now - 240_000 },
    outcome: "succeeded",
    title: "Finished session",
    agent: "plan",
    location: { directory: "/work/project" },
  },
];

const taskRecords = [
  {
    id: "ses_board_a",
    code: "ZM-0",
    title: "Example task",
    description: "Ship the board",
    status: "执行中",
    labels: ["ui"],
    urgent: false,
    rank: -now,
    mainSessionId: "ses_board_a",
    sessions: [
      {
        sessionId: "ses_board_a",
        role: "main",
        parentId: null,
        goal: "",
        title: "Example task",
        directory: "/work/project",
        createdAt: now - 60_000,
      },
    ],
    document: { content: "", updatedAt: now - 30_000, updatedBy: "ses_board_a" },
    revision: 1,
    createdAt: now - 60_000,
    updatedAt: now - 30_000,
    statusChangedAt: now - 30_000,
  },
  {
    id: "ses_board_b",
    code: "ZM-1",
    title: "Plain session",
    description: "",
    status: "待分配",
    labels: [],
    urgent: false,
    rank: -now,
    mainSessionId: "ses_board_b",
    sessions: [
      {
        sessionId: "ses_board_b",
        role: "main",
        parentId: null,
        goal: "",
        title: "Plain session",
        directory: "/work/project",
        createdAt: now - 120_000,
      },
    ],
    document: { content: "", updatedAt: now - 90_000, updatedBy: "ses_board_b" },
    revision: 1,
    createdAt: now - 120_000,
    updatedAt: now - 90_000,
    statusChangedAt: now - 90_000,
  },
  {
    id: "ses_board_done",
    code: "ZM-2",
    title: "Finished session",
    description: "",
    status: "执行中",
    labels: [],
    urgent: false,
    rank: -now,
    mainSessionId: "ses_board_done",
    sessions: [
      {
        sessionId: "ses_board_done",
        role: "main",
        parentId: null,
        goal: "",
        title: "Finished session",
        directory: "/work/project",
        createdAt: now - 300_000,
      },
    ],
    document: { content: "", updatedAt: now - 200_000, updatedBy: "ses_board_done" },
    revision: 1,
    createdAt: now - 300_000,
    updatedAt: now - 200_000,
    statusChangedAt: now - 200_000,
  },
];

const ctx = {
  id: "yuri-session-board",
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
    rpc: () => ({
      list: async () => taskRecords,
      labelList: async () => [{ id: "lbl_ui", name: "ui", color: "#8b8cdd", count: 3 }],
      create: async () => {
        throw new Error("not implemented in smoke");
      },
      update: async () => ({}),
      setDocument: async () => ({}),
    }),
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
const tracked = {
  ...ctx,
  add(token, item) {
    added.push([token && token.id, item]);
    return () => {};
  },
};

const bundle = require(project + "/dist/gui-experimental.cjs");
const cssBundle = require("node:fs").readFileSync(project + "/dist/gui-experimental.cjs", "utf8");
assert.ok(cssBundle.includes(".ysb-card {"), "board card styles are bundled");
assert.ok(cssBundle.includes(".ysb-cardtitle"), "card title styles are bundled");
assert.ok(cssBundle.includes(".ysb-modal {"), "board dialog styles are bundled");
const plugin = bundle.default || bundle;
let cleanup;
solid.createRoot((dispose) => {
  cleanup = plugin.setup(tracked);
  return dispose;
});
const page = added.find(([id]) => id === "yuri.page")?.[1];
assert.ok(page, "page registered");
assert.equal(page.id, "board");

const statusEntry = added.find(([id]) => id === "yuri.work-status")?.[1];
assert.ok(statusEntry, "work-status registered");
const statusRoot = dom.window.document.createElement("div");
dom.window.document.body.append(statusRoot);
const statusDispose = solidWeb.render(
  () =>
    statusEntry.render({
      session: { id: "ses_board_a" },
      directory: "/work/project",
      placement: "inline",
      active: true,
      signal: new AbortController().signal,
    }),
  statusRoot,
);
await new Promise((resolve) => setTimeout(resolve, 50));
console.log("STATUS TEXT", statusRoot.textContent.slice(0, 200));
statusDispose();
const dispose = solidWeb.render(() => page.render(), dom.window.document.getElementById("root"));
await new Promise((resolve) => setTimeout(resolve, 200));

const cards = [...dom.window.document.querySelectorAll("[data-ysb-card]")].map(
  (node) => node.textContent,
);
assert.equal(cards.length, 3, `expected 3 cards, got ${cards.length}`);
assert.ok(
  cards.some((text) => text.includes("Example task")),
  "planned task rendered",
);
assert.ok(
  cards.some((text) => text.includes("Plain session")),
  "unplanned session rendered",
);
assert.ok(
  cards.some((text) => text.includes("Finished session")),
  "executed session rendered",
);
const doneColumn = [...dom.window.document.querySelectorAll("[data-ysb-column]")].find(
  (node) => node.dataset.ysbColumn === "执行中",
);
assert.ok(
  doneColumn?.textContent.includes("Finished session"),
  "executed session stays in progress until the user completes it",
);
assert.equal(doneColumn?.textContent.includes("Plain session"), false);
assert.ok(!cards.some((text) => text.includes("Hidden child")), "child session hidden");
assert.match(dom.window.document.body.textContent, /page\.title/, "page title rendered");

// Card click opens the chat; every card has a separate details button.
const pushes = [];
dom.window.history.pushState = (_state, _title, url) => pushes.push(String(url));
const cardsWithDetails = [...dom.window.document.querySelectorAll("[data-ysb-card]")].map((card) =>
  card.querySelector(".ysb-carddetails"),
);
assert.equal(cardsWithDetails.length, 3, "every card renders a details button");
assert.ok(cardsWithDetails.every(Boolean), "details buttons are present");

const plainCard = [...dom.window.document.querySelectorAll("[data-ysb-card]")].find((card) =>
  card.textContent.includes("Plain session"),
);
plainCard.querySelector(".ysb-carddetails").click();
await new Promise((resolve) => setTimeout(resolve, 50));
const plainDetail = dom.window.document.querySelector(".ysb-detail");
assert.ok(plainDetail, "details button opens the task dialog");
assert.match(plainDetail.textContent, /filter\.labels/, "details always shows the tag section");
assert.match(plainDetail.textContent, /label\.none/, "details shows the empty tag hint");
dom.window.document.querySelector(".ysb-detail-close").click();
await new Promise((resolve) => setTimeout(resolve, 50));

const firstCard = dom.window.document.querySelector("[data-ysb-card]");
firstCard.click();
await new Promise((resolve) => setTimeout(resolve, 50));
assert.ok(
  pushes.some((url) => url.includes("/session/")),
  `card click opens the session route (${pushes.join(", ")})`,
);

firstCard.querySelector(".ysb-carddetails").click();
await new Promise((resolve) => setTimeout(resolve, 50));
const chatButton = [...dom.window.document.querySelectorAll("button")].find((button) =>
  button.textContent.includes("action.chat"),
);
assert.ok(chatButton, "open chat button rendered");
const beforeChat = pushes.length;
chatButton.click();
await new Promise((resolve) => setTimeout(resolve, 50));
assert.ok(
  pushes.length > beforeChat && pushes.at(-1).includes("/session/"),
  `detail dialog chat action reached the session route (${pushes.join(", ")})`,
);

// Grouping by tag and the tag manager must render from the label catalog.
const groupSelect = dom.window.document.querySelector(".ysb-toolbar select");
groupSelect.value = "label";
groupSelect.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
await new Promise((resolve) => setTimeout(resolve, 50));
const columns = [...dom.window.document.querySelectorAll("[data-ysb-column]")].map(
  (node) => node.dataset.ysbColumn,
);
assert.ok(columns.includes("ui"), `tag grouping shows the ui column (${columns.join(", ")})`);
assert.ok(
  columns.includes("无标签") || columns.includes("label.untagged"),
  `tag grouping shows the untagged column (${columns.join(", ")})`,
);
const manageButton = [...dom.window.document.querySelectorAll("button")].find((button) =>
  button.textContent.includes("label.manage"),
);
assert.ok(manageButton, "tag manager button rendered");
manageButton.click();
await new Promise((resolve) => setTimeout(resolve, 50));
assert.match(dom.window.document.body.textContent, /label\.title/, "tag manager opened");
assert.equal(
  dom.window.document.querySelectorAll(".ysb-labelrow").length,
  1,
  "tag manager lists labels",
);

Object.defineProperty(dom.window, "matchMedia", {
  configurable: true,
  value: (query) => ({
    matches: query.includes("pointer: coarse") || query.includes("max-width"),
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() {
      return false;
    },
  }),
});
const mobileRoot = dom.window.document.createElement("div");
dom.window.document.body.append(mobileRoot);
const mobilePage = solidWeb.render(() => page.render(), mobileRoot);
await new Promise((resolve) => setTimeout(resolve, 50));
assert.match(
  mobileRoot.textContent,
  /board\.desktopOnly/,
  "touch devices get the desktop-only message",
);
assert.equal(
  mobileRoot.querySelectorAll("[data-ysb-card]").length,
  0,
  "touch devices do not render cards",
);
mobilePage();

dispose();
if (typeof cleanup === "function") cleanup();
console.log("smoke: ok, rendered", cards.length, "cards");
process.exit(0);
