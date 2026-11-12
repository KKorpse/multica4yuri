import type { SessionInfo } from "@opencode/client";
import type { Output } from "./model";

export const META_VERSION = 2;
export const STATUSES = ["待分配", "执行中", "已完成", "废弃"] as const;
export type Status = (typeof STATUSES)[number];
export type Role = "main" | "sub";

export type SessionLink = {
  sessionId: string;
  role: Role;
  parentId: string | null;
  goal: string;
  title: string;
  directory: string;
  createdAt: number;
};

export type Note = {
  seq: number;
  sessionId: string;
  role: Role;
  status: "completed" | "failed" | "blocked" | "note";
  summary: string;
  refs: Output[];
  createdAt: number;
};

export type Task = {
  id: string;
  title: string;
  goal: string;
  acceptance: string;
  status: Status;
  labels: string[];
  outputs: Output[];
  rank: number;
  mainSessionId: string;
  sessions: SessionLink[];
  notes: Note[];
  lastNoteSeq: number;
  readBy: Record<string, number>;
  createdAt: number;
  updatedAt: number;
  statusChangedAt: number;
};

export type MainMeta = Task & { version: typeof META_VERSION; role: "main" };
export type SubMeta = {
  version: typeof META_VERSION;
  role: "sub";
  taskId: string;
  parentId: string;
  goal: string;
};

export function mainMeta(session: SessionInfo): MainMeta | undefined {
  const meta = session.metadata?.sessionBoard as Partial<MainMeta> | undefined;
  return meta?.version === META_VERSION && meta.role === "main" ? (meta as MainMeta) : undefined;
}

export function subMeta(session: SessionInfo): SubMeta | undefined {
  const meta = session.metadata?.sessionBoard as Partial<SubMeta> | undefined;
  return meta?.version === META_VERSION && meta.role === "sub" ? (meta as SubMeta) : undefined;
}

export function newTask(
  title: string,
  goal: string,
  acceptance: string,
  labels: string[],
  main: { id: string; title: string; directory: string },
): MainMeta {
  const now = Date.now();
  return {
    version: META_VERSION,
    role: "main",
    id: main.id,
    title,
    goal,
    acceptance,
    status: "待分配",
    labels,
    outputs: [],
    rank: -now,
    mainSessionId: main.id,
    sessions: [
      {
        sessionId: main.id,
        role: "main",
        parentId: null,
        goal: "",
        title: main.title,
        directory: main.directory,
        createdAt: now,
      },
    ],
    notes: [],
    lastNoteSeq: 0,
    readBy: { [main.id]: 0 },
    createdAt: now,
    updatedAt: now,
    statusChangedAt: now,
  };
}

export function childTitle(task: Task, goal: string, directory: string, index: number): string {
  const label = goal.trim() || `子会话 ${index}`;
  const duplicate = task.sessions.some((link) => link.goal === goal.trim() && goal.trim());
  return `${task.title} · ${label}${duplicate ? ` · ${directory.split("/").filter(Boolean).at(-1)}` : ""}`;
}

function roster(task: Task): string {
  return task.sessions
    .map((link) => {
      const role = link.role === "main" ? "主" : "子";
      const parent = link.parentId ? ` · 父 ${link.parentId}` : "";
      return `- ${role} · ${link.sessionId} · ${link.title} · ${link.directory}${parent}`;
    })
    .join("\n");
}

export function renderBrief(task: Task, self: SessionLink): string {
  if (self.role === "main") {
    return `[任务]
id: ${task.id}
标题: ${task.title}
状态: ${task.status}
目标: ${task.goal}
验收: ${task.acceptance}

[会话清单]
${roster(task)}

[你的角色]
你是主会话 ${self.sessionId}（${self.title}）。
- 只有你可以创建子会话。
- 子会话的汇报由你汇总后回复用户，不要让用户去子会话里看。
- 需要子会话细节时用工具查询，不要凭记忆。
- 任务状态由系统和用户维护，你不要修改任务状态。

[子会话创建准则]
同时满足才创建：独立交付物、独立上下文、可回传结果。
优先创建：可并行、需要不同 Agent/权限/环境、耗时或高风险。
不要创建：查文件、改几行代码、强同步修改、没有明确交付物。
接口变更由主会话先定，再派子会话实现；不要让两个子会话同时改互相依赖的接口。

[汇报规则]
子会话完成、失败或阻塞时写 note：状态、结论、改动或证据位置、下一步。`;
  }

  return `[任务]
id: ${task.id}
标题: ${task.title}

[会话清单]
${roster(task)}

[你的角色]
你是子会话 ${self.sessionId}（${self.title}），父会话 ${self.parentId}。
子目标: ${self.goal}
工作目录: ${self.directory}
- 你不能创建子会话。
- 完成、失败或阻塞时写 note 给父会话，不要直接找用户。
- 需要其他会话上下文时用工具查询。
- 任务状态由系统和用户维护，不要修改。

[汇报格式]
状态: 完成 / 失败 / 阻塞
结论: 一句话
改动/证据: 文件路径、diff 或命令结果
下一步: 需要主会话做什么，或“无”`;
}

function clip(text: string, limit = 120): string {
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}

export function renderDelta(task: Task, selfID: string): string {
  const read = task.readBy[selfID] ?? 0;
  const unread = task.notes.filter((note) => note.seq > read && note.sessionId !== selfID);
  if (!unread.length) return "";

  const lines = unread.slice(-5).map((note) => {
    const status =
      note.status === "completed"
        ? "完成"
        : note.status === "failed"
          ? "失败"
          : note.status === "blocked"
            ? "阻塞"
            : "汇报";
    return `- ${note.sessionId} ${status}：${clip(note.summary)}`;
  });
  if (unread.length > 5)
    lines.push(`- 还有 ${unread.length - 5} 条，调用 zmultica_session_read 查看`);
  return `[未读汇报]\n${lines.join("\n")}`;
}
