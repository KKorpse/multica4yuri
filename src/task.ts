import type { SessionInfo } from "@opencode/client";

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

export type Document = {
  content: string;
  updatedAt: number;
  updatedBy: string;
};

export type Task = {
  id: string;
  code: string;
  title: string;
  description: string;
  status: Status;
  labels: string[];
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
): Task {
  const now = Date.now();
  return {
    id: main.id,
    code: "",
    title,
    description,
    status: "待分配",
    labels,
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
接口变更由主会话先定，再派子会话实现；不要让两个子会话同时改互相依赖的接口。`;
  }

  return `[任务]
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
- 任务状态由系统和用户维护，不要修改。`;
}
