import type { AgentInfo, SessionInfo } from "@opencode/client";
import type { Context } from "@opencode/plugin/gui";
import { createEffect, createMemo, createSignal, batch } from "solid-js";
import { createStore } from "solid-js/store";
import * as api from "./data";
import { openSession } from "./host";
import {
  DEFAULT_STATUS,
  DISCARD_STATUS,
  EMPTY_FILTERS,
  METADATA_KEY,
  basename,
  columnKeys,
  filterTasks,
  groupKey,
  labelColor,
  rankBetween,
  record,
  sortTasks,
  statusColor,
  taskMeta,
  toTaskFromRecord,
  uniqueLabels,
  type Filters,
  type Grouping,
  type LabelInfo,
  type Sort,
  type StatusInfo,
  type Task,
  type TaskMeta,
  type ViewMode,
} from "./model";
import type { Task as TaskRecord } from "./task";
import { BoardRpc } from "./rpc";
import type { T } from "./i18n";

export interface ViewState {
  mode: ViewMode;
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
  mode: "board",
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
    return {
      mode: parsed.mode === "list" || parsed.mode === "table" ? parsed.mode : "board",
      grouping:
        parsed.grouping === "agent" ||
        parsed.grouping === "directory" ||
        parsed.grouping === "label"
          ? parsed.grouping
          : "status",
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
        unreadOnly: bool("unreadOnly", false),
        plannedOnly: bool("plannedOnly", false),
        showChildren: bool("showChildren", false),
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
  const [labels, setLabels] = createSignal<LabelInfo[]>([]);
  const [statusList, setStatusList] = createSignal<StatusInfo[]>([]);
  const [projects, setProjects] = createSignal<Array<{ path: string; label: string }>>([]);
  const [running, setRunning] = createSignal<ReadonlySet<string>>(new Set());
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal("");
  const [refreshedAt, setRefreshedAt] = createSignal(0);
  const [createOpen, setCreateOpen] = createSignal(false);
  const [createStatus, setCreateStatus] = createSignal("");
  const [editingId, setEditingId] = createSignal<string>();
  const [deleteId, setDeleteId] = createSignal<string>();
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
    return records().map((record) =>
      toTaskFromRecord(
        record,
        byId.get(record.mainSessionId),
        record.sessions.some((link) => active.has(link.sessionId)),
      ),
    );
  });

  const statuses = createMemo(() =>
    statusList()
      .filter((status) => status.visible)
      .map((status) => status.name),
  );

  const visibleStatusList = createMemo(() => statusList().filter((status) => status.visible));

  const colorOfStatus = (name: string): string =>
    statusList().find((status) => status.name === name)?.color ?? statusColor(name);

  const defaultStatusName = (): string =>
    statusList().find((status) => status.kind === "default")?.name ?? DEFAULT_STATUS;

  const discardStatusName = (): string =>
    statusList().find((status) => status.kind === "discard")?.name ?? DISCARD_STATUS;

  const isDiscarded = (name: string): boolean =>
    statusList().find((status) => status.name === name)?.kind === "discard";

  const tasksInView = createMemo(() => {
    if (!statusList().length) return tasks();
    const shown = new Set(statuses());
    return tasks().filter((task) => shown.has(task.status));
  });

  const visible = createMemo(() => sortTasks(filterTasks(tasksInView(), view.filters), view.sort));

  const filteredForFacets = createMemo(() =>
    filterTasks(tasksInView(), { ...view.filters, statuses: [], labels: [] }),
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

  const labelOptions = createMemo(() =>
    labels().map((label) => ({ name: label.name, count: label.count })),
  );

  function colorOfLabel(name: string): string {
    return labels().find((label) => label.name === name)?.color ?? labelColor(name);
  }

  const agentOptions = createMemo(() => {
    const seen = new Set<string>();
    for (const task of tasksInView()) seen.add(task.agent);
    return [...seen].sort((a, b) => a.localeCompare(b, "zh-CN"));
  });

  const directoryOptions = createMemo(() => {
    const map = new Map<string, string>();
    for (const project of projects()) map.set(project.path, project.label);
    for (const task of tasksInView())
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
    if (view.grouping === "label") {
      const untagged = t("label.untagged");
      const keys = [
        ...new Set(list.flatMap((task) => (task.labels.length ? task.labels : [untagged]))),
      ].sort((a, b) => a.localeCompare(b, "zh-CN"));
      return keys.map((key) => ({
        key,
        label: key,
        color: key === untagged ? statusColor("待分配") : colorOfLabel(key),
        tasks: list.filter((task) =>
          key === untagged ? task.labels.length === 0 : task.labels.includes(key),
        ),
      }));
    }
    const keys = view.filters.statuses.length ? view.filters.statuses : statuses();
    return columnKeys(list, view.grouping, keys).map((key) => {
      const items = list.filter((task) => groupKey(task, view.grouping) === key);
      return {
        key,
        label: key,
        color: view.grouping === "status" ? colorOfStatus(key) : labelColor(key),
        tasks: items,
      };
    });
  });

  const runningCount = createMemo(() => tasksInView().filter((task) => task.running).length);

  const unreadCount = createMemo(
    () => tasksInView().filter((task) => task.unread && !task.running).length,
  );

  function sessionById(id: string): SessionInfo | undefined {
    return sessions().find((session) => session.id === id);
  }

  function taskById(id: string): Task | undefined {
    return tasks().find(
      (task) =>
        task.id === id || task.record?.sessions.some((link) => link.sessionId === id) === true,
    );
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
      const active = await api.listSessions(ctx, ctx.signal);
      if (request !== generation) return;
      const [live, taskRecords, labelList, catalog] = await Promise.all([
        ctx.client.session.active({ signal: ctx.signal }).catch(() => ({})),
        ctx.client.rpc(BoardRpc).list({}) as Promise<TaskRecord[]>,
        ctx.client.rpc(BoardRpc).labelList({}) as Promise<LabelInfo[]>,
        ctx.client.rpc(BoardRpc).statusList({}) as Promise<StatusInfo[]>,
      ]);
      if (request !== generation) return;
      batch(() => {
        setSessions(active);
        setRecords(taskRecords);
        setLabels(labelList);
        setStatusList(catalog);
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
        if (id) {
          setRunningState(id, false);
          const at = Date.now();
          setRecords((list) =>
            list.map((record) =>
              record.sessions.some((link) => link.sessionId === id)
                ? { ...record, lastFinishedAt: at, updatedAt: at }
                : record,
            ),
          );
        }
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
      status: input.status || undefined,
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

  async function save(id: string, input: SaveInput): Promise<void> {
    const task = taskById(id);
    if (!task) return;
    const record = task.record;
    const title = input.title.trim() || record?.title || task.title || "";

    if (record) {
      await ctx.client.rpc(BoardRpc).update({
        taskId: record.id,
        patch: {
          title: title || record.title,
          description: input.description.trim(),
          status: input.status || record.status,
          labels: uniqueLabels(input.labels),
        },
      });
      if (title && title !== task.title) await api.updateTitle(ctx, id, title);
      void reload(true);
      return;
    }

    const session = sessionById(id);
    if (!session) return;

    const previous = taskMeta(session);
    const next: TaskMeta = {
      ...previous,
      description: input.description.trim(),
      status: input.status || previous.status,
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

  /** Stored as `urgent` for compatibility; the UI calls this pinning. */
  async function setPinned(id: string, pinned: boolean): Promise<void> {
    const task = taskById(id);
    if (!task) return;
    const record = task.record;
    if (record) {
      const patchRecords = (value: boolean) =>
        setRecords((list) =>
          list.map((item) => (item.id === record.id ? { ...item, urgent: value } : item)),
        );
      patchRecords(pinned);
      try {
        await ctx.client.rpc(BoardRpc).update({ taskId: record.id, patch: { urgent: pinned } });
        void reload(true);
      } catch (caught) {
        patchRecords(!pinned);
        throw caught;
      }
      return;
    }
    const session = sessionById(id);
    if (!session) return;
    const previous = taskMeta(session);
    const next: TaskMeta = { ...previous, urgent: pinned };
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

  async function createLabel(name: string, color?: string): Promise<LabelInfo> {
    const label = (await ctx.client.rpc(BoardRpc).labelCreate({ name, color })) as LabelInfo;
    setLabels((list) =>
      [...list.filter((item) => item.id !== label.id), { ...label, count: 0 }].sort((a, b) =>
        a.name.localeCompare(b.name, "zh-CN"),
      ),
    );
    return label;
  }

  async function renameLabel(id: string, name: string): Promise<void> {
    await ctx.client.rpc(BoardRpc).labelRename({ id, name });
    await reload(true);
  }

  async function deleteLabel(id: string): Promise<void> {
    await ctx.client.rpc(BoardRpc).labelDelete({ id });
    await reload(true);
  }

  async function addStatus(name: string, color?: string): Promise<StatusInfo> {
    const status = (await ctx.client.rpc(BoardRpc).statusCreate({ name, color })) as StatusInfo;
    await reload(true);
    return status;
  }

  async function updateStatus(
    id: string,
    patch: { name?: string; color?: string; visible?: boolean },
  ): Promise<StatusInfo> {
    const previous = statusList().find((status) => status.id === id);
    const status = (await ctx.client.rpc(BoardRpc).statusUpdate({
      id,
      ...patch,
    })) as StatusInfo;
    if (previous && previous.name !== status.name) {
      setFilters({
        statuses: view.filters.statuses.map((name) =>
          name === previous.name ? status.name : name,
        ),
      });
    }
    await reload(true);
    return status;
  }

  async function deleteStatus(id: string): Promise<{ moved: number; target: string }> {
    const removed = statusList().find((status) => status.id === id)?.name;
    const result = (await ctx.client.rpc(BoardRpc).statusDelete({ id })) as {
      moved: number;
      target: string;
    };
    if (removed) {
      setFilters({ statuses: view.filters.statuses.filter((name) => name !== removed) });
    }
    await reload(true);
    return result;
  }

  async function reorderStatuses(ids: string[]): Promise<void> {
    const list = (await ctx.client.rpc(BoardRpc).statusReorder({ ids })) as StatusInfo[];
    setStatusList(list);
  }

  async function setStatusVisible(name: string, visible: boolean): Promise<void> {
    const status = statusList().find((item) => item.name === name);
    if (!status || status.visible === visible) return;
    if (!visible && status.kind === "default") {
      fail(new Error(t("status.defaultLocked")), "error.status");
      return;
    }
    try {
      await ctx.client.rpc(BoardRpc).statusUpdate({ id: status.id, visible });
      if (!visible) {
        setFilters({ statuses: view.filters.statuses.filter((item) => item !== name) });
      }
      await reload(true);
    } catch (caught) {
      fail(caught, "error.status");
    }
  }

  async function moveStatusColumn(source: string, target: string): Promise<void> {
    const ordered = [...statuses()];
    const from = ordered.indexOf(source);
    const to = ordered.indexOf(target);
    if (from < 0 || to < 0 || from === to) return;
    ordered.splice(from, 1);
    ordered.splice(to, 0, source);
    const catalog = [...statusList()].sort((a, b) => a.position - b.position);
    const byName = new Map(statusList().map((status) => [status.name, status.id]));
    const shown = new Set(statuses());
    let cursor = 0;
    const ids = catalog.map((status) =>
      shown.has(status.name) ? (byName.get(ordered[cursor++]) ?? status.id) : status.id,
    );
    try {
      const list = (await ctx.client.rpc(BoardRpc).statusReorder({ ids })) as StatusInfo[];
      setStatusList(list);
    } catch (caught) {
      fail(caught, "error.status");
    }
  }

  function requestDelete(id: string) {
    setDeleteId(id);
  }

  function closeDelete() {
    setDeleteId(undefined);
  }

  function markOpened(id: string): void {
    const task = taskById(id);
    const record = task?.record;
    if (!record) return;
    if (record.lastFinishedAt <= record.lastOpenedAt && !record.manualUnread) return;
    const at = Date.now();
    setRecords((list) =>
      list.map((item) =>
        item.id === record.id ? { ...item, lastOpenedAt: at, manualUnread: false } : item,
      ),
    );
    void ctx.client
      .rpc(BoardRpc)
      .taskOpen({ taskId: record.id })
      .catch(() => undefined);
  }

  function markUnread(id: string): void {
    const task = taskById(id);
    const record = task?.record;
    if (!record) return;
    setRecords((list) =>
      list.map((item) => (item.id === record.id ? { ...item, manualUnread: true } : item)),
    );
    void ctx.client
      .rpc(BoardRpc)
      .taskUnread({ taskId: record.id, unread: true })
      .catch(() => undefined);
  }

  async function deleteTask(id: string): Promise<void> {
    await ctx.client.rpc(BoardRpc).taskDelete({ taskId: id });
    setDeleteId(undefined);
    await reload(true);
  }

  async function move(id: string, status: string, index?: number): Promise<void> {
    const task = taskById(id);
    if (!task) return;
    if (statusList().length && !statusList().some((item) => item.name === status)) return;
    const nextStatus = status;
    let rank = task.rank;
    if (view.grouping === "status" && view.sort === "manual" && index !== undefined) {
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
        patch: { status: nextStatus, rank },
      });
      void reload(true);
      return;
    }

    const session = sessionById(id);
    if (!session) return;
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

  function open(id: string) {
    const task = taskById(id);
    const directory =
      task?.record?.sessions.find((link) => link.sessionId === id)?.directory ?? task?.directory;
    openSession(id, directory);
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
    createStatusSeed: createStatus,
    editingId,
    tasks,
    visible,
    columns,
    statuses,
    statusList,
    visibleStatusList,
    statusCounts,
    colorOfStatus,
    defaultStatusName,
    discardStatusName,
    isDiscarded,
    labelCounts,
    labels,
    labelOptions,
    colorOfLabel,
    agentOptions,
    directoryOptions,
    runningCount,
    unreadCount,
    markOpened,
    markUnread,
    task: taskById,
    total: () => tasksInView().length,
    setMode: (mode: ViewMode) => setView("mode", mode),
    setGrouping: (grouping: Grouping) => setView("grouping", grouping),
    setSort: (sort: Sort) => setView("sort", sort),
    setFilters,
    toggleStatus: (status: string) => toggleIn("statuses", status),
    toggleLabel: (label: string) => toggleIn("labels", label),
    setAgentFilter,
    setDirectoryFilter,
    resetFilters: () => setFilters({ ...EMPTY_FILTERS }),
    reload,
    activate,
    deactivate,
    create,
    save,
    saveDocument,
    createLabel,
    renameLabel,
    deleteLabel,
    createStatus: addStatus,
    updateStatus,
    deleteStatus,
    reorderStatuses,
    setStatusVisible,
    moveStatusColumn,
    setPinned,
    move,
    deleteId,
    requestDelete,
    closeDelete,
    deleteTask,
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
