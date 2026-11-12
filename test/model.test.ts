import assert from "node:assert/strict";
import test from "node:test";
import type { SessionInfo } from "@opencode/client";
import {
  EMPTY_FILTERS,
  METADATA_KEY,
  columnKeys,
  deriveStatus,
  filterTasks,
  isSystemSession,
  labelColor,
  rankBetween,
  sortTasks,
  taskMeta,
  toTask,
  type Filters,
} from "../src/model.ts";

function session(overrides: Partial<SessionInfo> = {}): SessionInfo {
  return {
    id: "ses_1",
    projectID: "prj_1",
    cost: 0,
    tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
    time: { created: 1000, updated: 2000 },
    title: "Example",
    location: { directory: "/work/project" },
    ...overrides,
  } as SessionInfo;
}

test("taskMeta reads the stored task and applies defaults", () => {
  assert.deepEqual(taskMeta(session()), {
    version: 1,
    description: "",
    status: "待分配",
    labels: [],
    rank: -1000,
    outputs: [],
  });

  const stored = session({
    metadata: {
      [METADATA_KEY]: {
        version: 1,
        description: "ship it",
        status: "执行中",
        labels: ["backend", " backend ", "ui"],
        rank: 32,
      },
    },
  } as Partial<SessionInfo>);
  assert.deepEqual(taskMeta(stored), {
    version: 1,
    description: "ship it",
    status: "执行中",
    labels: ["backend", "ui"],
    rank: 32,
    outputs: [],
  });
});

test("toTask marks planned, archived and running sessions", () => {
  const planned = toTask(
    session({
      metadata: {
        [METADATA_KEY]: { version: 1, description: "", status: "已完成", labels: [], rank: 1 },
        yuri: { archive: { archivedAt: 99 } },
      },
    } as Partial<SessionInfo>),
    true,
  );
  assert.equal(planned.planned, true);
  assert.equal(planned.archived, true);
  assert.equal(planned.running, true);
  assert.equal(planned.title, "Example");
  assert.equal(planned.agent, "默认 Agent");

  const plain = toTask(session());
  assert.equal(plain.planned, false);
  assert.equal(plain.archived, false);
});

test("executed sessions derive a first status from their own history", () => {
  assert.equal(deriveStatus(session(), false), "待分配");
  assert.equal(
    deriveStatus(session({ time: { created: 1, updated: 2, idle: 3 } }), false),
    "执行中",
  );
  assert.equal(deriveStatus(session({ outcome: "succeeded" }), false), "执行中");
  assert.equal(deriveStatus(session({ outcome: "failed" }), false), "执行中");
  assert.equal(deriveStatus(session({ outcome: "interrupted" }), false), "执行中");
  assert.equal(deriveStatus(session({ outcome: "succeeded" }), true), "执行中");

  const succeeded = toTask(session({ outcome: "succeeded" }));
  assert.equal(succeeded.status, "执行中");
  assert.equal(succeeded.planned, false);
});

test("system sessions are not board tasks", () => {
  assert.equal(isSystemSession(session()), false);
  assert.equal(
    isSystemSession(
      session({
        metadata: { yuri: { llm: { purpose: "chat-completions" } } },
      } as Partial<SessionInfo>),
    ),
    true,
  );
  assert.equal(
    isSystemSession(
      session({
        metadata: { yuri: { scheduledTask: { taskID: "task" } } },
      } as Partial<SessionInfo>),
    ),
    true,
  );
});

function task(overrides: Record<string, unknown> = {}) {
  return {
    ...toTask(session()),
    status: "待规划",
    labels: [] as string[],
    description: "",
    running: false,
    archived: false,
    planned: true,
    parentID: undefined,
    agent: "build",
    title: "Example",
    ...overrides,
  } as ReturnType<typeof toTask>;
}

function filters(overrides: Partial<Filters> = {}): Filters {
  return { ...EMPTY_FILTERS, ...overrides };
}

test("filters compose: any status, any label, and every search word", () => {
  const tasks = [
    task({ id: "a", title: "Refund flow", labels: ["backend"], status: "执行中" }),
    task({ id: "b", title: "Settings page", labels: ["frontend"], status: "待规划" }),
    task({ id: "c", title: "Refund UI", labels: ["backend", "frontend"], status: "已完成" }),
  ];

  assert.deepEqual(
    filterTasks(tasks, filters({ statuses: ["执行中", "已完成"] })).map((item) => item.id),
    ["a", "c"],
  );
  assert.deepEqual(
    filterTasks(tasks, filters({ labels: ["frontend"] })).map((item) => item.id),
    ["b", "c"],
  );
  assert.deepEqual(
    filterTasks(tasks, filters({ labels: ["frontend"], statuses: ["已完成"] })).map(
      (item) => item.id,
    ),
    ["c"],
  );
  assert.deepEqual(
    filterTasks(tasks, filters({ search: "refund ui" })).map((item) => item.id),
    ["c"],
  );
  assert.deepEqual(
    filterTasks(tasks, filters({ search: "后端" })).map((item) => item.id),
    [],
  );
});

test("filters hide children, unplanned and archived tasks by default", () => {
  const tasks = [
    task({ id: "root" }),
    task({ id: "child", parentID: "root" }),
    task({ id: "plain", planned: false }),
    task({ id: "archived", archived: true }),
    task({ id: "running", running: true }),
  ];
  assert.deepEqual(
    filterTasks(tasks, filters()).map((item) => item.id),
    ["root", "plain", "running"],
  );
  assert.deepEqual(
    filterTasks(tasks, filters({ showChildren: true })).map((item) => item.id),
    ["root", "child", "plain", "running"],
  );
  assert.deepEqual(
    filterTasks(tasks, filters({ plannedOnly: true })).map((item) => item.id),
    ["root", "running"],
  );
  assert.deepEqual(
    filterTasks(tasks, filters({ runningOnly: true })).map((item) => item.id),
    ["running"],
  );
  assert.deepEqual(
    filterTasks(tasks, filters({ archive: "archived" })).map((item) => item.id),
    ["archived"],
  );
});

test("rankBetween keeps ordering and detects exhausted precision", () => {
  assert.equal(rankBetween(10, 20), 15);
  assert.equal(rankBetween(undefined, 20), 20 - 1024);
  assert.equal(rankBetween(10, undefined), 10 + 1024);
  assert.equal(rankBetween(10, 10 + Number.EPSILON), undefined);
});

test("columns keep the default status order and append custom statuses", () => {
  const tasks = [
    task({ status: "待分配" }),
    task({ status: "稍后处理" }),
    task({ status: "执行中" }),
  ];
  assert.deepEqual(columnKeys(tasks, "status", ["待分配", "执行中", "已完成", "废弃"]), [
    "待分配",
    "执行中",
    "已完成",
    "废弃",
    "稍后处理",
  ]);
});

test("sorting is stable and tag colours are deterministic", () => {
  const tasks = [
    task({ id: "b", title: "B", updated: 1 }),
    task({ id: "a", title: "A", updated: 2 }),
  ];
  assert.deepEqual(
    sortTasks(tasks, "updated").map((item) => item.id),
    ["a", "b"],
  );
  assert.equal(labelColor("backend"), labelColor("backend"));
  assert.notEqual(labelColor("backend"), labelColor("frontend"));
});
