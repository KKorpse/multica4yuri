import type { AgentInfo, SessionInfo } from "@opencode/client";
import type { Context } from "@opencode/plugin/gui";
import { createEffect, createMemo, createSignal, batch } from "solid-js";
import { createStore } from "solid-js/store";
import * as api from "./data";
import { openSession } from "./host";
import {
  EMPTY_FILTERS,
  DEFAULT_STATUSES,
  METADATA_KEY,
  basename,
  columnKeys,
  filterTasks,
  groupKey,
  isSystemSession,
  labelColor,
  rankBetween,
  record,
  sortTasks,
  statusColor,
  taskMeta,
  toTask,
  toTaskFromRecord,
  uniqueLabels,
  type ArchiveFilter,
  type Filters,
  type Grouping,
  type Sort,
  type Task,
  type TaskMeta,
} from "./model";
import { taskLink, type Task as TaskRecord } from "./task";
import { BoardRpc } from "./rpc";
import type { T } from "./i18n";

export interface ViewState {
  grouping: Grouping;
  sort: Sort;
  filters: Filters;
  lastDirectory: string;
}

export interface Column {
  key: string;
  label: string;
  color: string;
  tasks: Task[];
}

export interface CreateInput {
  title: string;
  description: string;
  acceptance?: string;
  directory: string;
  agent: string;
  status: string;
  labels: string[];
  send: boolean;
}

export interface SaveInput {
  title: string;
  description: string;
  acceptance?: string;
  status: string;
  labels: string[];
}

const VIEW_KEY = "yuri-session-board:view:v1";
const DEFAULT_VIEW: ViewState = {
  grouping: "status",
  sort: "manual",
  filters: { ...EMPTY_FILTERS },
  lastDirectory: "",
};

function loadView(): ViewState {
  try {
    const raw = localStorage.getItem(VIEW_KEY);
    if (!raw) return { ...DEFAULT_VIEW, filters: { ...EMPTY_FILTERS } };
    const parsed = record(JSON.parse(raw));
    const filters = record(parsed.filters);
    const text = (key: keyof Filters, fallback: string) =>
      typeof filters[key] === "string" ? (filters[key] as string) : fallback;
    const list = (key: keyof Filters) =>
      Array.isArray(filters[key])
        ? (filters[key] as string[]).filter((s) => typeof s === "string")
        : [];
    const bool = (key: keyof Filters, fallback: boolean) =>
      typeof filters[key] === "boolean" ? (filters[key] as boolean) : fallback;
    const archive = text("archive", "active");
    return {
      grouping:
        parsed.grouping === "agent" || parsed.grouping === "directory" ? parsed.grouping : "status",
      sort:
        parsed.sort === "updated" || parsed.sort === "created" || parsed.sort === "title"
          ? parsed.sort
          : "manual",
      filters: {
        search: text("search", ""),
        statuses: list("statuses"),
        labels: list("labels"),
        agents: list("agents"),
        directories: list("directories"),
        runningOnly: bool("runningOnly", false),
        plannedOnly: bool("plannedOnly", false),
        showChildren: bool("showChildren", false),
        archive:
          archive === "all" || archive === "archived" || archive === "active" ? archive : "active",
      },
      lastDirectory: typeof parsed.lastDirectory === "string" ? parsed.lastDirectory : "",
    };
  } catch {
    return { ...DEFAULT_VIEW, filters: { ...EMPTY_FILTERS } };
  }
}

type EventLike = { type: string; data?: Record<string, unknown> };

function eventSessionID(event: EventLike): string | undefined {
  const data = event.data ?? {};
  const info = record(data.info);
  const id = data.sessionID ?? info.id;
  return typeof id === "string" && id ? id : undefined;
}

export function createBoard(ctx: Context, t: T) {
  const [sessions, setSessions] = createSignal<SessionInfo[]>([]);
  const [records, setRecords] = createSignal<TaskRecord[]>([]);
  const [projects, setProjects] = createSignal<Array<{ path: string; label: string }>>([]);
  const [running, setRunning] = createSignal<ReadonlySet<string>>(new Set());
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal("");
  const [refreshedAt, setRefreshedAt] = createSignal(0);
  const [createOpen, setCreateOpen] = createSignal(false);
  const [createStatus, setCreateStatus] = createSignal("");
  const [editingId, setEditingId] = createSignal<string>();
  const [view, setView] = createStore<ViewState>(loadView());

  const agentCache = new Map<string, AgentInfo[]>();
  const agentInflight = new Map<string, Promise<AgentInfo[]>>();
  const refreshTimers = new Map<string, ReturnType<typeof setTimeout>>();
  let generation = 0;
  let subscribed = false;
  let eventAbort: AbortController | undefined;
  let disposed = false;
  let watchers = 0;

  createEffect(() => {
    const snapshot = JSON.stringify(view);
    try {
      localStorage.setItem(VIEW_KEY, snapshot);
    } catch {
      /* storage can be unavailable; preferences are optional */
    }
  });

  const tasks = createMemo(() => {
    const active = running();
    const byId = new Map(sessions().map((session) => [session.id, session]));
    const fromRecords = records().map((record) =>
      toTaskFromRecord(record, byId.get(record.mainSessionId), active.has(record.mainSessionId)),
    );
    const fromSessions = sessions()
      .filter((session) => !isSystemSession(session) && !taskLink(session))
      .map((session) => toTask(session, active.has(session.id)));
    return [...fromRecords, ...fromSessions];
  });

  const visible = createMemo(() => sortTasks(filterTasks(tasks(), view.filters), view.sort));

  const statuses = createMemo(() => {
    const seen = new Set<string>();
    for (const status of DEFAULT_STATUSES) seen.add(status);
    for (const task of tasks()) seen.add(task.status);
    return [...seen];
  });

  const filteredForFacets = createMemo(() =>
    filterTasks(tasks(), { ...view.filters, statuses: [], labels: [] }),
  );

  const statusCounts = createMemo(() => {
    const counts = new Map<string, number>();
    for (const task of filteredForFacets())
      counts.set(task.status, (counts.get(task.status) ?? 0) + 1);
    return counts;
  });

  const labelCounts = createMemo(() => {
    const counts = new Map<string, number>();
    for (const task of filteredForFacets()) {
      for (const label of task.labels) counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "zh-CN"));
  });

  const agentOptions = createMemo(() => {
    const seen = new Set<string>();
    for (const task of tasks()) seen.add(task.agent);
    return [...seen].sort((a, b) => a.localeCompare(b, "zh-CN"));
  });

  const directoryOptions = createMemo(() => {
    const map = new Map<string, string>();
    for (const project of projects()) map.set(project.path, project.label);
    for (const task of tasks())
      if (!map.has(task.directory)) map.set(task.directory, basename(task.directory));
    const current = currentDirectory();
    if (current && !map.has(current)) map.set(current, current);
    if (view.lastDirectory && !map.has(view.lastDirectory))
      map.set(view.lastDirectory, view.lastDirectory);
    return [...map.entries()]
      .map(([path, label]) => ({ path, label: label === path ? basename(path) : label }))
      .sort((a, b) => a.label.localeCompare(b.label, "zh-CN"));
  });

  const columns = createMemo<Column[]>(() => {
    const list = visible();
    const keys = view.filters.statuses.length ? view.filters.statuses : statuses();
    return columnKeys(list, view.grouping, keys).map((key) => {
      const items = list.filter((task) => groupKey(task, view.grouping) === key);
      return {
        key,
        label: key,
        color: view.grouping === "status" ? statusColor(key) : labelColor(key),
        tasks: items,
      };
    });
  });

  const runningCount = createMemo(() => tasks().filter((task) => task.running).length);

  function sessionById(id: string): SessionInfo | undefined {
    return sessions().find((session) => session.id === id);
  }

  function taskById(id: string): Task | undefined {
    return tasks().find((task) => task.id === id);
  }

  function patchSession(id: string, patch: (session: SessionInfo) => SessionInfo) {
    setSessions((list) => list.map((session) => (session.id === id ? patch(session) : session)));
  }

  function patchMeta(id: string, meta: TaskMeta) {
    patchSession(id, (session) => ({
      ...session,
      metadata: { ...session.metadata, [METADATA_KEY]: meta },
    }));
  }

  function patchArchived(id: string, archived: boolean) {
    patchSession(id, (session) => {
      const yuri = record(session.metadata?.yuri);
      return {
        ...session,
        metadata: {
          ...session.metadata,
          yuri: {
            ...yuri,
            archive: { ...record(yuri.archive), archivedAt: archived ? Date.now() : 0 },
          },
        },
      };
    });
  }

  function upsert(session: SessionInfo) {
    setSessions((list) => {
      const index = list.findIndex((item) => item.id === session.id);
      if (index === -1) return [session, ...list];
      const next = [...list];
      next[index] = session;
      return next;
    });
  }

  function remove(id: string) {
    setSessions((list) => list.filter((session) => session.id !== id));
  }

  function setRunningState(id: string, value: boolean) {
    setRunning((previous) => {
      if (previous.has(id) === value) return previous;
      const next = new Set(previous);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function refreshOne(id: string) {
    if (disposed) return;
    const session = await api.getSession(ctx, id, ctx.signal);
    if (session) upsert(session);
    else remove(id);
  }

  function scheduleRefresh(id: string) {
    if (disposed || refreshTimers.has(id)) return;
    refreshTimers.set(
      id,
      setTimeout(() => {
        refreshTimers.delete(id);
        void refreshOne(id);
      }, 200),
    );
  }

  async function reload(silent = false) {
    const request = ++generation;
    if (!silent) setLoading(true);
    setError("");
    try {
      const active = await api.listSessions(ctx, false, ctx.signal);
      const archived =
        view.filters.archive === "active" ? [] : await api.listSessions(ctx, true, ctx.signal);
      if (request !== generation) return;
      const merged = new Map<string, SessionInfo>();
      for (const session of [...active, ...archived]) merged.set(session.id, session);
      const [live, taskRecords] = await Promise.all([
        ctx.client.session.active({ signal: ctx.signal }).catch(() => ({})),
        ctx.client.rpc(BoardRpc).list({}) as Promise<TaskRecord[]>,
      ]);
      if (request !== generation) return;
      batch(() => {
        setSessions([...merged.values()]);
        setRecords(taskRecords);
        setRunning(new Set(Object.keys(live)));
        setLoading(false);
        setRefreshedAt(Date.now());
      });
      if (!projects().length) {
        const directories = await api.listProjectDirectories(ctx, ctx.signal);
        if (request === generation && directories.length) setProjects(directories);
      }
    } catch (caught) {
      if (request === generation && !ctx.signal.aborted) {
        setError(api.message(caught));
        setLoading(false);
      }
    }
  }

  function handleEvent(raw: unknown) {
    const event = raw as EventLike;
    const id = eventSessionID(event);
    switch (event.type) {
      case "session.execution.started":
        if (id) setRunningState(id, true);
        return;
      case "session.execution.succeeded":
      case "session.execution.failed":
      case "session.execution.interrupted":
        if (id) setRunningState(id, false);
        return;
      case "session.deleted":
        if (id) remove(id);
        return;
      case "session.renamed": {
        const title = typeof event.data?.title === "string" ? event.data.title : "";
        if (id && title) patchSession(id, (session) => ({ ...session, title }));
        return;
      }
      case "session.metadata.updated": {
        const metadata = record(event.data?.metadata);
        if (id)
          patchSession(id, (session) => ({
            ...session,
            metadata: metadata as SessionInfo["metadata"],
          }));
        return;
      }
      case "session.agent.selected": {
        const agent = typeof event.data?.agent === "string" ? event.data.agent : "";
        if (id && agent) patchSession(id, (session) => ({ ...session, agent }));
        return;
      }
      case "session.archived":
        if (id) patchArchived(id, true);
        return;
      case "session.unarchived":
        if (id) patchArchived(id, false);
        return;
      case "session.created":
      case "session.moved":
      case "session.forked":
        if (id) scheduleRefresh(id);
        return;
      default:
        return;
    }
  }

  function subscribe() {
    if (subscribed || disposed) return;
    subscribed = true;
    const controller = new AbortController();
    eventAbort = controller;
    void (async () => {
      try {
        for await (const event of ctx.client.event.subscribe({ signal: controller.signal })) {
          if (controller.signal.aborted) break;
          handleEvent(event);
        }
      } catch {
        /* a dropped stream is recovered by the next reload */
      } finally {
        if (eventAbort === controller) eventAbort = undefined;
      }
    })();
  }

  function unsubscribe() {
    subscribed = false;
    eventAbort?.abort();
    eventAbort = undefined;
  }

  function activate() {
    watchers += 1;
    subscribe();
    if (!refreshedAt() || Date.now() - refreshedAt() > 30_000) void reload(refreshedAt() > 0);
  }

  function deactivate() {
    watchers = Math.max(0, watchers - 1);
    if (watchers > 0) return;
    unsubscribe();
    for (const timer of refreshTimers.values()) clearTimeout(timer);
    refreshTimers.clear();
  }

  async function create(
    input: CreateInput,
  ): Promise<{ id: string; sent: boolean; sendError?: unknown }> {
    const task = (await ctx.client.rpc(BoardRpc).create({
      title: input.title.trim(),
      description: input.description.trim(),
      labels: uniqueLabels(input.labels),
      directory: input.directory,
      agent: input.agent || undefined,
    })) as TaskRecord;
    setRecords((list) => [task, ...list.filter((item) => item.id !== task.id)]);
    setView("lastDirectory", input.directory);
    let sent = false;
    let sendError: unknown;
    if (input.send && task.description) {
      try {
        await api.sendPrompt(ctx, task.mainSessionId, task.description, ctx.signal);
        sent = true;
      } catch (caught) {
        sendError = caught;
      }
    }
    void reload(true);
    return { id: task.mainSessionId, sent, sendError };
  }

  function allowedStatus<P extends string>(next: string, previous: P): P {
    return next === previous || next === "已完成" || next === "废弃" ? (next as P) : previous;
  }

  async function save(id: string, input: SaveInput): Promise<void> {
    const session = sessionById(id);
    if (!session) return;
    const record = taskById(id)?.record;
    const title = input.title.trim() || session.title || "";

    if (record) {
      await ctx.client.rpc(BoardRpc).update({
        taskId: record.id,
        patch: {
          title: title || record.title,
          description: input.description.trim(),
          status: allowedStatus(input.status || record.status, record.status),
          labels: uniqueLabels(input.labels),
        },
      });
      if (title && title !== session.title) await api.updateTitle(ctx, id, title);
      void reload(true);
      return;
    }

    const previous = taskMeta(session);
    const next: TaskMeta = {
      ...previous,
      description: input.description.trim(),
      status: allowedStatus(input.status || previous.status, previous.status),
      labels: uniqueLabels(input.labels),
    };
    patchMeta(id, next);
    if (title) patchSession(id, (value) => ({ ...value, title }));
    try {
      if (title && title !== session.title) await api.updateTitle(ctx, id, title);
      await api.writeBoardMeta(ctx, session, next, ctx.signal);
    } catch (caught) {
      patchMeta(id, previous);
      patchSession(id, (value) => ({ ...value, title: session.title }));
      throw caught;
    }
  }

  async function reopen(id: string): Promise<void> {
    const task = taskById(id);
    if (!task || (task.status !== "已完成" && task.status !== "废弃")) return;
    const record = task.record;
    if (record) {
      await ctx.client.rpc(BoardRpc).update({ taskId: record.id, patch: { status: "待分配" } });
      void reload(true);
      return;
    }
    const session = sessionById(id);
    if (!session) return;
    const previous = taskMeta(session);
    const next: TaskMeta = { ...previous, status: "待分配" };
    patchMeta(id, next);
    try {
      await api.writeBoardMeta(ctx, session, next, ctx.signal);
    } catch (caught) {
      patchMeta(id, previous);
      throw caught;
    }
  }

  async function saveDocument(id: string, content: string): Promise<void> {
    await ctx.client.rpc(BoardRpc).setDocument({ taskId: id, content });
    void reload(true);
  }

  async function move(id: string, status: string, index?: number): Promise<void> {
    const session = sessionById(id);
    const task = taskById(id);
    if (!session || !task || view.grouping !== "status") return;
    const nextStatus = allowedStatus(status, task.status);
    let rank = task.rank;
    if (view.sort === "manual" && index !== undefined) {
      const siblings = tasks()
        .filter((item) => item.status === nextStatus && item.id !== id)
        .sort((a, b) => a.rank - b.rank);
      const before = siblings[index - 1]?.rank;
      const after = siblings[index]?.rank;
      rank =
        rankBetween(before, after) ??
        (before !== undefined ? before + 1e-6 : after !== undefined ? after - 1024 : -Date.now());
    }
    if (nextStatus === task.status && rank === task.rank) return;

    const record = task.record;
    if (record) {
      await ctx.client.rpc(BoardRpc).update({
        taskId: record.id,
        patch: { status: allowedStatus(status, record.status), rank },
      });
      void reload(true);
      return;
    }

    const previous = taskMeta(session);
    const next: TaskMeta = { ...previous, status: nextStatus, rank };
    patchMeta(id, next);
    try {
      await api.writeBoardMeta(ctx, session, next, ctx.signal);
    } catch (caught) {
      patchMeta(id, previous);
      throw caught;
    }
  }

  async function archive(id: string, archived: boolean): Promise<void> {
    const session = sessionById(id);
    if (!session) return;
    const was = taskById(id)?.archived ?? false;
    patchArchived(id, archived);
    try {
      await api.setArchived(ctx, session, archived, ctx.signal);
    } catch (caught) {
      patchArchived(id, was);
      throw caught;
    }
  }

  function open(id: string) {
    openSession(id);
  }

  function openLink(href: string, directory?: string) {
    const external = /^https?:\/\//i.test(href);
    try {
      const opened = ctx.links.open({
        href,
        ...(external ? {} : { exact: true, base: directory }),
        session: ctx.sessions.current(),
      });
      if (opened) return;
    } catch {
      /* fall through */
    }
    if (external) {
      ctx.system.openExternal(href);
      return;
    }
    void ctx.system.copy(href);
    ctx.toast.show({ title: t("output.copied") });
  }

  function loadAgents(directory: string, force = false): Promise<AgentInfo[]> {
    if (!directory) return Promise.resolve([]);
    if (!force) {
      const cached = agentCache.get(directory);
      if (cached) return Promise.resolve(cached);
      const pending = agentInflight.get(directory);
      if (pending) return pending;
    }
    const request = api
      .listAgents(ctx, directory, ctx.signal)
      .then((agents) => {
        agentCache.set(directory, agents);
        return agents;
      })
      .catch(() => [] as AgentInfo[])
      .finally(() => agentInflight.delete(directory));
    agentInflight.set(directory, request);
    return request;
  }

  function currentDirectory(): string {
    try {
      return ctx.sessions.current()?.directory ?? "";
    } catch {
      return "";
    }
  }

  function requestCreate(status = "") {
    setCreateStatus(status);
    setCreateOpen(true);
  }

  function setFilters(patch: Partial<Filters>) {
    setView("filters", patch);
  }

  function toggleIn(key: "statuses" | "labels", value: string) {
    const list = view.filters[key];
    setFilters({
      [key]: list.includes(value) ? list.filter((item) => item !== value) : [...list, value],
    } as Partial<Filters>);
  }

  function setAgentFilter(agent: string) {
    setFilters({ agents: agent ? [agent] : [] });
  }

  function setDirectoryFilter(directory: string) {
    setFilters({ directories: directory ? [directory] : [] });
  }

  function notice(key: string, variant: "default" | "success" | "error" = "default") {
    ctx.toast.show({ title: t(key), variant });
  }

  function fail(caught: unknown, key: string) {
    ctx.toast.show({
      title: t(key),
      description: api.message(caught),
      variant: "error",
      duration: 8000,
    });
  }

  function dispose() {
    disposed = true;
    watchers = 0;
    deactivate();
  }

  return {
    t,
    view,
    loading,
    error,
    refreshedAt,
    createOpen,
    createStatus,
    editingId,
    tasks,
    visible,
    columns,
    statuses,
    statusCounts,
    labelCounts,
    agentOptions,
    directoryOptions,
    runningCount,
    task: taskById,
    total: () => tasks().length,
    setGrouping: (grouping: Grouping) => setView("grouping", grouping),
    setSort: (sort: Sort) => setView("sort", sort),
    setFilters,
    setArchive: (archive: ArchiveFilter) => {
      setFilters({ archive });
      if (archive !== "active") void reload(true);
    },
    toggleStatus: (status: string) => toggleIn("statuses", status),
    toggleLabel: (label: string) => toggleIn("labels", label),
    setAgentFilter,
    setDirectoryFilter,
    resetFilters: () => setFilters({ ...EMPTY_FILTERS, archive: view.filters.archive }),
    reload,
    activate,
    deactivate,
    create,
    save,
    saveDocument,
    reopen,
    move,
    archive,
    open,
    openLink,
    loadAgents,
    currentDirectory,
    requestCreate,
    closeCreate: () => setCreateOpen(false),
    edit: (id: string) => setEditingId(id),
    closeEdit: () => setEditingId(undefined),
    notice,
    fail,
    dispose,
  };
}

export type Board = ReturnType<typeof createBoard>;
