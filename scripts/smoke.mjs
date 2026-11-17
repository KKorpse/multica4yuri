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

const statusRecords = [
  {
    id: "stt_default",
    name: "待分配",
    color: "#8b94a5",
    position: 0,
    kind: "default",
    visible: true,
    count: 1,
  },
  {
    id: "stt_doing",
    name: "执行中",
    color: "#d5a653",
    position: 1,
    kind: "normal",
    visible: true,
    count: 2,
  },
  {
    id: "stt_done",
    name: "已完成",
    color: "#5b9bd5",
    position: 2,
    kind: "normal",
    visible: true,
    count: 0,
  },
  {
    id: "stt_discard",
    name: "废弃",
    color: "#b38086",
    position: 3,
    kind: "discard",
    visible: true,
    count: 0,
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
      statusList: async () =>
        statusRecords
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((status) => ({ ...status })),
      statusUpdate: async ({ id, name, color, visible }) => {
        const status = statusRecords.find((item) => item.id === id);
        if (!status) throw new Error("status not found");
        if (name !== undefined) status.name = name;
        if (color !== undefined) status.color = color;
        if (visible !== undefined) status.visible = visible;
        return { ...status };
      },
      statusReorder: async ({ ids }) => {
        ids.forEach((id, index) => {
          const status = statusRecords.find((item) => item.id === id);
          if (status) status.position = index;
        });
        return statusRecords
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((status) => ({ ...status }));
      },
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

const commandEntries = added
  .filter(([id]) => id === "command")
  .flatMap(([, item]) => (typeof item === "function" ? [item()] : [item]));
assert.equal(
  commandEntries.find((entry) => entry?.id === "open")?.bind,
  "mod+m",
  "the board command uses Command+M",
);

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
const plainDetailsButton = plainCard.querySelector(".ysb-carddetails");
plainDetailsButton.focus();
plainDetailsButton.click();
await new Promise((resolve) => setTimeout(resolve, 50));
const plainDetail = dom.window.document.querySelector(".ysb-detail");
assert.ok(plainDetail, "details button opens the task dialog");
assert.equal(
  dom.window.document.activeElement,
  plainDetail.querySelector(".ysb-detail-close"),
  "details dialog has an initial keyboard focus target",
);
assert.match(plainDetail.textContent, /filter\.labels/, "details always shows the tag section");
assert.match(plainDetail.textContent, /label\.none/, "details shows the empty tag hint");
dom.window.document.querySelector(".ysb-detail-close").click();
await new Promise((resolve) => setTimeout(resolve, 50));
assert.equal(
  dom.window.document.activeElement,
  plainDetailsButton,
  "closing details restores focus to its trigger",
);

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

// The card context menu keeps status actions only; details live on the card button.
firstCard.dispatchEvent(
  new dom.window.MouseEvent("contextmenu", { bubbles: true, clientX: 12, clientY: 12 }),
);
await new Promise((resolve) => setTimeout(resolve, 50));
const menuText = dom.window.document.querySelector(".ysb-menu")?.textContent ?? "";
assert.match(menuText, /menu\.urgent/, "context menu rendered");
assert.match(menuText, /menu\.moveTo/, "context menu exposes status targets");
assert.match(menuText, /废弃/, "context menu lists the discard status");
assert.equal(menuText.includes("widget.details"), false, "context menu has no details entry");
assert.equal(menuText.includes("action.chat"), false, "context menu has no open-chat entry");
const menuElement = dom.window.document.querySelector(".ysb-menu");
const menuItems = [...menuElement.querySelectorAll(".ysb-menuitem:not(:disabled)")];
assert.equal(
  dom.window.document.activeElement,
  menuItems[0],
  "context menu focuses its first action",
);
menuElement.dispatchEvent(
  new dom.window.KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
);
assert.equal(
  dom.window.document.activeElement,
  menuItems[1],
  "arrow keys move through menu actions",
);
menuItems[1].dispatchEvent(
  new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
);
await new Promise((resolve) => setTimeout(resolve, 50));
assert.equal(dom.window.document.querySelector(".ysb-menu"), null, "Escape dismisses the menu");
assert.equal(dom.window.document.activeElement, firstCard, "menu dismissal restores card focus");

firstCard.dispatchEvent(
  new dom.window.MouseEvent("contextmenu", { bubbles: true, clientX: 12, clientY: 12 }),
);
await new Promise((resolve) => setTimeout(resolve, 50));
dom.window.document
  .querySelector(".ysb-menu-backdrop")
  ?.dispatchEvent(new dom.window.MouseEvent("mousedown", { bubbles: true }));
await new Promise((resolve) => setTimeout(resolve, 50));

// The status manager lists the catalog and marks the built-in roles.
const statusButton = [...dom.window.document.querySelectorAll(".ysb-toolbarbtn")].find((button) =>
  button.textContent.includes("status.manage"),
);
assert.ok(statusButton, "status manager button rendered");
statusButton.click();
await new Promise((resolve) => setTimeout(resolve, 50));
const statusDialog = dom.window.document.querySelector(".ysb-statusmodal");
assert.ok(statusDialog, "status manager opens");
assert.equal(
  statusDialog.querySelectorAll(".ysb-labelrow").length,
  4,
  "status manager lists the built-in catalog",
);
assert.match(statusDialog.textContent, /status\.default/, "default status is marked");
assert.match(statusDialog.textContent, /status\.discard/, "discard status is marked");
const managerEye = statusDialog.querySelector('[data-ysb-toggle-status="执行中"]');
managerEye.click();
await new Promise((resolve) => setTimeout(resolve, 50));
const hiddenRow = [...statusDialog.querySelectorAll(".ysb-labelrow")].find((row) =>
  row.textContent.includes("执行中"),
);
assert.ok(hiddenRow?.classList.contains("is-hidden"), "manager marks hidden statuses");
statusDialog.querySelector('[data-ysb-toggle-status="执行中"]').click();
await new Promise((resolve) => setTimeout(resolve, 50));
assert.equal(
  [...statusDialog.querySelectorAll(".ysb-labelrow")].some((row) =>
    row.classList.contains("is-hidden"),
  ),
  false,
  "manager eye restores a hidden status",
);
statusDialog.querySelector(".ysb-modalhead .ysb-iconbtn").click();
await new Promise((resolve) => setTimeout(resolve, 50));
assert.equal(dom.window.document.querySelector(".ysb-statusmodal"), null, "status manager closes");

// List and table views expose the same task set as the board.
document.querySelector('[data-ysb-view="list"]').click();
await new Promise((resolve) => setTimeout(resolve, 50));
assert.equal(
  dom.window.document.querySelectorAll("[data-ysb-listrow]").length,
  3,
  "list view renders every task",
);
document.querySelector('[data-ysb-view="table"]').click();
await new Promise((resolve) => setTimeout(resolve, 50));
assert.equal(
  dom.window.document.querySelectorAll("[data-ysb-table] tbody tr").length,
  3,
  "table view renders every task",
);
document.querySelector('[data-ysb-view="board"]').click();
await new Promise((resolve) => setTimeout(resolve, 50));
assert.ok(
  dom.window.document.querySelectorAll("[data-ysb-column]").length > 0,
  "board view returns after switching views",
);

// Searching then opening a task clears the box and keeps the query in history.
const searchInput = dom.window.document.querySelector(".ysb-searchbox input");
assert.ok(searchInput, "search input rendered");
searchInput.focus();
searchInput.value = "Finished";
searchInput.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
await new Promise((resolve) => setTimeout(resolve, 50));
assert.equal(
  dom.window.document.querySelectorAll("[data-ysb-card]").length,
  1,
  "search narrows the board",
);
dom.window.document.querySelector("[data-ysb-card]").click();
await new Promise((resolve) => setTimeout(resolve, 50));
assert.equal(searchInput.value, "", "opening a task clears the search box");
assert.equal(
  dom.window.document.querySelectorAll("[data-ysb-card]").length,
  3,
  "clearing the search restores every task",
);
searchInput.blur();
searchInput.focus();
await new Promise((resolve) => setTimeout(resolve, 50));
const historyPanel = dom.window.document.querySelector(".ysb-searchhistory");
assert.ok(historyPanel, "focusing the empty search box opens history");
assert.match(historyPanel.textContent, /Finished/, "cleared query is kept in history");
historyPanel.querySelector(".ysb-searchhistoryitem").click();
await new Promise((resolve) => setTimeout(resolve, 50));
assert.equal(searchInput.value, "Finished", "history item restores the query");
assert.equal(
  dom.window.document.querySelectorAll("[data-ysb-card]").length,
  1,
  "history item applies the search",
);
searchInput.value = "";
searchInput.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
await new Promise((resolve) => setTimeout(resolve, 50));
assert.equal(
  JSON.parse(dom.window.localStorage.getItem("zmultica:search-history:v1")).length,
  1,
  "search history persists once per query",
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
manageButton.focus();
manageButton.click();
await new Promise((resolve) => setTimeout(resolve, 50));
assert.match(dom.window.document.body.textContent, /label\.title/, "tag manager opened");
assert.equal(
  dom.window.document.activeElement,
  dom.window.document.querySelector(".ysb-labelcomposer input"),
  "tag manager focuses its create input",
);
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
