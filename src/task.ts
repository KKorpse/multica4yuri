import type { SessionInfo } from "@opencode/client";

export const META_VERSION = 2;
/** User-defined status names are arbitrary strings stored in the status catalog. */
export type Status = string;
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

export type Document = {
  content: string;
  updatedAt: number;
  updatedBy: string;
  path?: string;
};

export type Task = {
  id: string;
  code: string;
  title: string;
  description: string;
  status: Status;
  labels: string[];
  urgent: boolean;
  rank: number;
  mainSessionId: string;
  sessions: SessionLink[];
  document: Document;
  revision: number;
  createdAt: number;
  updatedAt: number;
  statusChangedAt: number;
};

export type TaskLink = {
  version: typeof META_VERSION;
  role: Role;
  taskId: string;
  parentId: string | null;
  goal: string;
};

export function taskLink(session: SessionInfo): TaskLink | undefined {
  const meta = session.metadata?.sessionBoard as Partial<TaskLink> & { id?: string };
  if (meta?.version !== META_VERSION || (meta.role !== "main" && meta.role !== "sub"))
    return undefined;
  const taskId = meta.taskId ?? (meta.role === "main" ? meta.id : undefined);
  if (!taskId) return undefined;
  return {
    version: META_VERSION,
    role: meta.role,
    taskId,
    parentId: meta.parentId ?? null,
    goal: meta.goal ?? "",
  };
}

export function newTask(
  title: string,
  description: string,
  labels: string[],
  main: { id: string; title: string; directory: string },
  status = "待分配",
): Task {
  const now = Date.now();
  return {
    id: main.id,
    code: "",
    title,
    description,
    status,
    labels,
    urgent: false,
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
    document: { content: "", updatedAt: now, updatedBy: main.id },
    revision: 1,
    createdAt: now,
    updatedAt: now,
    statusChangedAt: now,
  };
}

function workspaceCode(code: string): string {
  const clean = code.trim();
  return clean ? clean.replace(/^ZM-/i, "WS-") : "";
}

export function sessionTitle(task: Pick<Task, "code" | "title">): string {
  const code = workspaceCode(task.code ?? "");
  return code ? `【${code}】${task.title}` : task.title;
}

export function stripCodePrefix(title: string, code?: string): string {
  const clean = title.trim();
  const raw = code?.trim() ?? "";
  const ws = workspaceCode(raw);
  const patterns = [
    ws ? new RegExp(`^【${ws}(?:-\\d+)?】`) : null,
    ws ? new RegExp(`^\\[${ws}\\](?:\\[S-\\d+\\])?`) : null,
    raw ? new RegExp(`^【${raw}】`) : null,
  ].filter((pattern): pattern is RegExp => Boolean(pattern));
  for (const pattern of patterns) {
    if (pattern.test(clean)) return clean.replace(pattern, "").trim();
  }
  return clean;
}

export function childTitle(
  task: Task,
  goal: string,
  directory: string,
  index: number,
  exceptId?: string,
): string {
  const label = goal.trim() || `子会话 ${index}`;
  const duplicate = task.sessions.some(
    (link) => link.sessionId !== exceptId && link.goal === goal.trim() && goal.trim(),
  );
  const subs = task.sessions.filter((link) => link.role === "sub");
  const existing = exceptId ? subs.findIndex((link) => link.sessionId === exceptId) : -1;
  const sequence = existing >= 0 ? existing + 1 : subs.length + 1;
  const ws = workspaceCode(task.code);
  const prefix = ws ? `【${ws}-${sequence}】` : "";
  return `${prefix}${label}${duplicate ? ` · ${directory.split("/").filter(Boolean).at(-1)}` : ""}`;
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

export function renderBrief(task: Task, self: SessionLink, documentPath?: string): string {
  const docPath = documentPath ?? task.document.path ?? "（任务文档）";
  const outputStyle = `[输出风格]
产出按需：只有任务描述明确要求 MR、文档、报告、评审结论等交付物时，才写入任务文档。
- 没有产出要求：直接简洁回答，不要调用 zmultica_document_set，不要生成文档链接，也不要输出「产出」段。
- 有产出要求：先调用 zmultica_document_set 写文档；聊天只输出：
  结论：一句话。
  产出：
  - [文档标题](${docPath})
  - [MR 标题](MR 链接)
  描述、方案、证据放文档；代码、diff、验证细节放 MR。
任何情况下都不要过程叙述、不要重复任务描述、不要在聊天里贴完整正文。`;

  if (self.role === "main") {
    return `${outputStyle}

[任务]
id: ${task.id}
标题: ${task.title}
状态: ${task.status}
任务描述: ${task.description}

[会话清单]
${roster(task)}

[你的角色]
你是主会话 ${self.sessionId}（${self.title}）。
- 只有你可以创建子会话。
- 子会话的最新回复由你按需读取并汇总给用户，不要让用户去子会话里看。
- 需要子会话细节时用工具查询，不要凭记忆。
- 任务状态由系统和用户维护，你不要修改任务状态。
- 任务文档由你和子会话共同修改，只有你可以删除。

[子会话创建准则]
同时满足才创建：独立交付物、独立上下文、可回传结果。
优先创建：可并行、需要不同 Agent/权限/环境、耗时或高风险。
不要创建：查文件、改几行代码、强同步修改、没有明确交付物。
接口变更由主会话先定，再派子会话实现；不要让两个子会话同时改互相依赖的接口。

[回复格式再确认]
没有明确要求产出的任务，直接简要回答，不写文档、不给产出链接。
需要产出时，聊天只输出「结论」和「产出」两段，完整内容写入 ${docPath}；不要粘贴正文。`;
  }

  return `${outputStyle}

[任务]
id: ${task.id}
标题: ${task.title}
状态: ${task.status}

[会话清单]
${roster(task)}

[你的角色]
你是子会话 ${self.sessionId}（${self.title}），父会话 ${self.parentId}。
子目标: ${self.goal}
工作目录: ${self.directory}
- 你不能创建子会话。
- 完成、失败或阻塞时，在最后一条回复里说明结论和证据位置，不要直接找用户。
- 需要长期交付的内容写入任务文档；你可以修改，不能删除。
- 需要其他会话的最新回复时用工具查询。
- 任务状态由系统和用户维护，不要修改。

[回复格式再确认]
没有明确要求产出的任务，直接简要回答，不写文档、不给产出链接。
需要产出时，聊天只输出「结论」和「产出」两段，完整内容写入 ${docPath}；不要粘贴正文。`;
}
