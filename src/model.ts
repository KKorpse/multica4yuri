import type { SessionInfo } from "@opencode/client";

export const METADATA_KEY = "sessionBoard";
export const DESCRIPTION_KEY = "session-board.task";
export const DEFAULT_STATUSES = ["待规划", "待开始", "执行中", "待确认", "已完成", "已搁置"];

export type TaskMeta = {
  version: number;
  description: string;
  status: string;
  labels: string[];
  rank: number;
};

export interface Task extends TaskMeta {
  id: string;
  title: string;
  directory: string;
  projectID: string;
  agent: string;
  planned: boolean;
  parentID?: string;
  archived: boolean;
  running: boolean;
  outcome?: SessionInfo["outcome"];
  created: number;
  updated: number;
  cost: number;
}

export type Grouping = "status" | "agent" | "directory";
export type Sort = "manual" | "updated" | "created" | "title";
export type ArchiveFilter = "active" | "all" | "archived";

export interface Filters {
  search: string;
  statuses: readonly string[];
  labels: readonly string[];
  agents: readonly string[];
  directories: readonly string[];
  runningOnly: boolean;
  plannedOnly: boolean;
  showChildren: boolean;
  archive: ArchiveFilter;
}

export const EMPTY_FILTERS: Filters = {
  search: "",
  statuses: [],
  labels: [],
  agents: [],
  directories: [],
  runningOnly: false,
  plannedOnly: false,
  showChildren: false,
  archive: "active",
};

export function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function uniqueLabels(values: readonly string[]): string[] {
  const seen = new Set<string>();
  return values
    .map((s) => s.trim())
    .filter((s) => {
      const key = s.toLocaleLowerCase();
      if (!s || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function taskMeta(session: SessionInfo): TaskMeta {
  const m = record(session.metadata?.[METADATA_KEY]);
  return {
    version: typeof m.version === "number" ? m.version : 1,
    description: typeof m.description === "string" ? m.description : "",
    status: typeof m.status === "string" && m.status.trim() ? m.status : DEFAULT_STATUSES[0],
    labels: Array.isArray(m.labels)
      ? uniqueLabels(m.labels.filter((s) => typeof s === "string"))
      : [],
    rank: typeof m.rank === "number" && Number.isFinite(m.rank) ? m.rank : -session.time.created,
  };
}

export function isSystemSession(session: SessionInfo): boolean {
  const yuri = record(session.metadata?.yuri ?? session.metadata?.openchamber);
  return !!(
    record(yuri.llm).purpose ||
    record(yuri.scheduledTask).taskID ||
    record(yuri.assistant).assistantID
  );
}

export function hasBoardMeta(session: SessionInfo): boolean {
  return record(session.metadata?.[METADATA_KEY]).version === 1;
}

/**
 * Existing sessions predate the board. Derive their first status from what the
 * session already recorded instead of dropping every one into “待规划”.
 */
export function deriveStatus(session: SessionInfo, running: boolean): string {
  if (running) return "执行中";
  if (session.outcome === "succeeded") return "已完成";
  if (session.outcome === "failed" || session.outcome === "interrupted") return "待确认";
  const time = record(session.time);
  if (typeof time.busy === "number" || typeof session.time.idle === "number") return "待确认";
  return "待规划";
}

export function toTask(session: SessionInfo, running = false): Task {
  const archive = record(record(session.metadata?.yuri).archive).archivedAt;
  const meta = taskMeta(session);
  const planned = hasBoardMeta(session);
  return {
    ...meta,
    status: planned ? meta.status : deriveStatus(session, running),
    planned,
    id: session.id,
    title: session.title?.trim() || "未命名会话",
    directory: session.location.directory,
    projectID: session.projectID,
    agent: session.agent || "默认 Agent",
    parentID: session.parentID,
    archived: typeof archive === "number" ? archive > 0 : !!session.time.archived,
    running,
    outcome: session.outcome,
    created: session.time.created,
    updated: session.time.updated,
    cost: session.cost,
  };
}

export function filterTasks(tasks: readonly Task[], filters: Filters): Task[] {
  const words = filters.search.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const labels = new Set(filters.labels.map((s) => s.toLocaleLowerCase()));
  return tasks.filter((task) => {
    if (!filters.showChildren && task.parentID) return false;
    if (filters.archive === "active" && task.archived) return false;
    if (filters.archive === "archived" && !task.archived) return false;
    if (filters.runningOnly && !task.running) return false;
    if (filters.plannedOnly && !task.planned) return false;
    if (filters.statuses.length && !filters.statuses.includes(task.status)) return false;
    if (filters.agents.length && !filters.agents.includes(task.agent)) return false;
    if (filters.directories.length && !filters.directories.includes(task.directory)) return false;
    if (labels.size && !task.labels.some((label) => labels.has(label.toLocaleLowerCase())))
      return false;
    const text = [task.title, task.description, task.id, ...task.labels]
      .join("\n")
      .toLocaleLowerCase();
    return words.every((word) => text.includes(word));
  });
}

export function sortTasks(tasks: readonly Task[], sort: Sort): Task[] {
  return [...tasks].sort((a, b) => {
    const delta =
      sort === "manual"
        ? a.rank - b.rank
        : sort === "updated"
          ? b.updated - a.updated
          : sort === "created"
            ? b.created - a.created
            : a.title.localeCompare(b.title, "zh-CN", { numeric: true });
    return delta || a.id.localeCompare(b.id);
  });
}

export function groupKey(task: Task, grouping: Grouping): string {
  return task[grouping];
}

export function columnKeys(
  tasks: readonly Task[],
  grouping: Grouping,
  statuses: readonly string[],
): string[] {
  if (grouping === "status") return [...new Set([...statuses, ...tasks.map((t) => t.status)])];
  return [...new Set(tasks.map((t) => groupKey(t, grouping)))].sort((a, b) =>
    a.localeCompare(b, "zh-CN"),
  );
}

/** Fractional ordering changes only the moved card. Tie/precision exhaustion is rebased by the caller. */
export function rankBetween(before?: number, after?: number): number | undefined {
  const rank =
    before === undefined
      ? (after ?? 0) - 1024
      : after === undefined
        ? before + 1024
        : before + (after - before) / 2;
  return Number.isFinite(rank) &&
    (before === undefined || rank > before) &&
    (after === undefined || rank < after)
    ? rank
    : undefined;
}

const PALETTE = ["#8b8cdd", "#c586c0", "#5b9bd5", "#46a99a", "#b79b5a", "#d4836a", "#8599c2"];
const STATUS_COLORS: Record<string, string> = {
  待规划: "#8b94a5",
  待开始: "#73a3dc",
  执行中: "#d5a653",
  待确认: "#b395dc",
  已完成: "#66b394",
  已搁置: "#b38086",
};

export function labelColor(label: string): string {
  let hash = 0;
  for (const c of label.toLocaleLowerCase()) hash = (hash * 31 + c.codePointAt(0)!) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export function statusColor(status: string): string {
  return STATUS_COLORS[status] ?? labelColor(status);
}

export function basename(directory: string): string {
  return directory.replace(/\\/g, "/").split("/").filter(Boolean).at(-1) || directory;
}

export function relativeTime(time: number): string {
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60000));
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} 小时前`;
  if (minutes < 43200) return `${Math.floor(minutes / 1440)} 天前`;
  return new Date(time).toLocaleDateString("zh-CN");
}
