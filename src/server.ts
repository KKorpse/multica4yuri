import { Plugin } from "@opencode/plugin";
import { BoardStore } from "./db";
import { BoardRpc } from "./rpc";
import {
  childTitle,
  newTask,
  renderBrief,
  taskLink,
  type Role,
  type SessionLink,
  type Task,
} from "./task";

const ENTRY_KEY = "zmultica.session";
const MAX_CHILDREN = 8;

type Link = { taskId: string; role: Role; parentId?: string; goal: string };

export default Plugin.define({
  id: "zmultica",
  async setup(ctx) {
    const store = new BoardStore(
      (ctx.options as any).dbPath ?? "/data/mm64/zackkzhou/zmultica/board.db",
    );
    const tasks = new Map<string, Task>();
    const links = new Map<string, Link>();
    const controller = new AbortController();
    const registrations: Array<{ dispose(): Promise<void> | void }> = [];

    const getSession = (sessionID: string) => ctx.session.get({ sessionID });
    const readTask = async (taskId: string) => store.get(taskId);

    function selfLink(task: Task, sessionID: string): SessionLink | undefined {
      return task.sessions.find((link) => link.sessionId === sessionID);
    }

    async function writeBrief(sessionID: string) {
      const link = links.get(sessionID);
      if (!link) return;
      const task = tasks.get(link.taskId) ?? (await readTask(link.taskId));
      if (!task) return;
      tasks.set(task.id, task);
      const self = selfLink(task, sessionID);
      if (!self) return;
      await ctx.session.instructions.entry.put({
        sessionID,
        key: ENTRY_KEY,
        value: renderBrief(task, self),
      });
    }

    async function backlink(task: Task) {
      const main = await getSession(task.mainSessionId);
      await ctx.session.update({
        sessionID: task.mainSessionId,
        metadata: {
          ...main.metadata,
          sessionBoard: {
            version: 2,
            role: "main",
            taskId: task.id,
            parentId: null,
            goal: "",
            rev: task.revision,
          },
        },
      });
    }

    async function putTask(task: Task): Promise<Task> {
      task.revision += 1;
      task.updatedAt = Date.now();
      store.write(task);
      tasks.set(task.id, task);
      await backlink(task);
      for (const link of task.sessions) await writeBrief(link.sessionId);
      return task;
    }

    async function mutate(taskId: string, update: (task: Task) => void): Promise<Task> {
      const task = await readTask(taskId);
      if (!task) throw new Error("任务不存在");
      const previousTitle = task.title;
      update(task);
      if (task.title !== previousTitle) {
        const sub = task.sessions.filter((link) => link.role === "sub");
        sub.forEach((link, index) => {
          link.title = childTitle(task, link.goal, link.directory, index, link.sessionId);
        });
      }
      const updated = await putTask(task);
      if (updated.title !== previousTitle) {
        const main = await getSession(updated.mainSessionId);
        if (main.title !== updated.title) {
          await ctx.session
            .update({ sessionID: updated.mainSessionId, title: updated.title })
            .catch(() => undefined);
        }
        for (const link of updated.sessions.filter((entry) => entry.role === "sub")) {
          await ctx.session
            .update({ sessionID: link.sessionId, title: link.title })
            .catch(() => undefined);
        }
      }
      return updated;
    }

    async function refresh(sessionID: string): Promise<void> {
      const session = await getSession(sessionID);
      const link = taskLink(session);
      if (!link) {
        links.delete(sessionID);
        return;
      }
      links.set(sessionID, {
        taskId: link.taskId,
        role: link.role,
        parentId: link.parentId ?? undefined,
        goal: link.goal,
      });
      const task = await readTask(link.taskId);
      if (!task && link.role === "main") await migrateLegacy(session, link.taskId);
      if (task) tasks.set(task.id, task);
      await writeBrief(sessionID);
    }

    async function migrateLegacy(session: any, taskId: string) {
      const legacy = session.metadata?.sessionBoard;
      if (!legacy?.sessions || !legacy.title) return;
      const outputs = Array.isArray(legacy.outputs) ? legacy.outputs : [];
      const lines = outputs.map((output: any) =>
        output.type === "text"
          ? `- ${output.title}：${output.value}`
          : `- [${output.title}](${output.value})`,
      );
      const now = Date.now();
      const task: Task = {
        id: taskId,
        code: legacy.code ?? "",
        title: legacy.title,
        description: legacy.goal ?? legacy.description ?? "",
        status: legacy.status ?? "执行中",
        labels: legacy.labels ?? [],
        urgent: legacy.urgent === true,
        rank: legacy.rank ?? -(legacy.createdAt ?? now),
        mainSessionId: legacy.mainSessionId ?? session.id,
        sessions: legacy.sessions,
        document: {
          content: lines.join("\n"),
          updatedAt: now,
          updatedBy: session.id,
        },
        revision: 1,
        createdAt: legacy.createdAt ?? now,
        updatedAt: now,
        statusChangedAt: legacy.statusChangedAt ?? now,
      };
      store.write(task);
      tasks.set(task.id, task);
      await backlink(task);
    }

    async function requireMain(sessionID: string): Promise<Task> {
      if (!links.has(sessionID)) await refresh(sessionID);
      const link = links.get(sessionID);
      if (!link || link.role !== "main") throw new Error("只有主会话可以执行此操作");
      const task = tasks.get(link.taskId) ?? (await readTask(link.taskId));
      if (!task) throw new Error("任务不存在");
      tasks.set(task.id, task);
      return task;
    }

    async function linkedTask(sessionID: string): Promise<Task> {
      if (!links.has(sessionID)) await refresh(sessionID);
      const link = links.get(sessionID);
      if (!link) throw new Error("当前会话未绑定任务");
      const task = tasks.get(link.taskId) ?? (await readTask(link.taskId));
      if (!task) throw new Error("任务不存在");
      tasks.set(task.id, task);
      return task;
    }

    async function linkChild(
      callerID: string,
      childID: string,
      goal: string,
    ): Promise<SessionLink> {
      const task = await requireMain(callerID);
      const existing = selfLink(task, childID);
      if (existing) return existing;

      const child = await getSession(childID);
      const directory = child.location.directory;
      if (task.sessions.filter((link) => link.role === "sub").length >= MAX_CHILDREN) {
        throw new Error("子会话数量已达上限");
      }
      if (
        task.sessions.some(
          (link) => link.role === "sub" && link.goal === goal && link.directory === directory,
        )
      ) {
        throw new Error("相同目标和目录的子会话已存在");
      }

      const link: SessionLink = {
        sessionId: childID,
        role: "sub",
        parentId: callerID,
        goal,
        title: childTitle(task, goal, directory, task.sessions.length),
        directory,
        createdAt: Date.now(),
      };
      await ctx.session.update({
        sessionID: childID,
        metadata: {
          ...child.metadata,
          sessionBoard: { version: 2, role: "sub", taskId: task.id, parentId: callerID, goal },
        },
        title: link.title,
      });
      await mutate(task.id, (draft) => {
        draft.sessions.push(link);
      });
      return link;
    }

    async function createChild(
      callerID: string,
      input: { goal: string; directory?: string; agent?: string },
    ) {
      const task = await requireMain(callerID);
      const main = await getSession(callerID);
      const directory = input.directory || main.location.directory;
      const goal = input.goal.trim();
      if (!goal) throw new Error("goal 不能为空");
      if (task.sessions.filter((link) => link.role === "sub").length >= MAX_CHILDREN) {
        throw new Error("子会话数量已达上限");
      }
      if (
        task.sessions.some(
          (link) => link.role === "sub" && link.goal === goal && link.directory === directory,
        )
      ) {
        throw new Error("相同目标和目录的子会话已存在");
      }

      const child = await ctx.session.create({
        title: childTitle(task, goal, directory, task.sessions.length),
        agent: input.agent || main.agent,
        location: { directory },
      });
      await linkChild(callerID, child.id, goal);
      return child.id;
    }

    async function requireTask(taskId: string): Promise<Task> {
      const task = await readTask(taskId);
      if (!task) throw new Error("任务不存在");
      return task;
    }

    async function tail(sessionID: string) {
      const session = await getSession(sessionID);
      const messages = await ctx.session.context({ sessionID });
      const assistant = [...messages].reverse().find((message) => {
        if (message.type !== "assistant" || !("content" in message)) return false;
        return message.content.some((part) => part.type === "text" && part.text.trim());
      });
      const content = assistant && "content" in assistant ? assistant.content : [];
      const textPart = content.findLast((part) => part.type === "text" && part.text.trim());
      return {
        sessionID,
        title: session.title ?? "",
        outcome: session.outcome ?? null,
        updatedAt: session.time.updated ?? 0,
        text: textPart?.type === "text" ? textPart.text : "",
      };
    }

    async function createTask(input: {
      title: string;
      description?: string;
      labels?: string[];
      directory: string;
      agent?: string;
    }): Promise<Task> {
      const session = await ctx.session.create({
        title: input.title.trim(),
        agent: input.agent,
        location: { directory: input.directory },
      });
      const task = newTask(
        input.title.trim(),
        input.description?.trim() ?? "",
        input.labels ?? [],
        {
          id: session.id,
          title: session.title || input.title.trim(),
          directory: session.location.directory,
        },
      );
      task.code = store.nextCode();
      store.write(task);
      tasks.set(task.id, task);
      await backlink(task);
      await writeBrief(session.id);
      return task;
    }

    function text(value: unknown): { content: string } {
      return { content: typeof value === "string" ? value : JSON.stringify(value, null, 2) };
    }

    registrations.push(
      await ctx.rpc.register(BoardRpc, {
        list: async () => {
          return store.list();
        },
        create: async (input: any) => createTask(input),
        get: async (input: any) => requireTask(input.taskId),
        documentGet: async (input: any) => (await requireTask(input.taskId)).document,
        sessionList: async (input: any) => requireTask(input.taskId),
        sessionCreate: async (input: any) => {
          const task = await requireTask(input.taskId);
          const sessionID = await createChild(task.mainSessionId, input);
          const updated = await requireTask(task.id);
          return updated.sessions.find((link) => link.sessionId === sessionID);
        },
        sessionLink: async (input: any) => {
          const task = await requireTask(input.taskId);
          return linkChild(task.mainSessionId, input.sessionID, input.goal);
        },
        sessionTail: async (input: any) => tail(input.sessionID),
        update: async (input: any) =>
          mutate(input.taskId, (task) => {
            Object.assign(task, input.patch);
          }),
        setDocument: async (input: any) =>
          mutate(input.taskId, (task) => {
            task.document = {
              content: input.content,
              updatedAt: Date.now(),
              updatedBy: input.updatedBy ?? task.mainSessionId,
            };
          }),
      }),
    );

    registrations.push(
      await ctx.tool.transform((editor) => {
        editor.add({
          name: "zmultica_session_create",
          description:
            "创建并绑定一个子会话。只有主会话可调用；返回子会话 ID，之后由主会话发送第一条消息。",
          input: {
            type: "object",
            properties: {
              goal: { type: "string", description: "子会话目标，必填" },
              directory: { type: "string", description: "工作目录，默认与主会话相同" },
              agent: { type: "string", description: "可选 Agent，默认与主会话相同" },
            },
            required: ["goal"],
          },
          execute: async (input: any, context) => text(await createChild(context.sessionID, input)),
        });

        editor.add({
          name: "zmultica_session_link",
          description:
            "把一个已存在的会话（包括原生创建或 fork）绑定到当前任务。只有主会话可调用。",
          input: {
            type: "object",
            properties: {
              sessionID: { type: "string" },
              goal: { type: "string" },
            },
            required: ["sessionID", "goal"],
          },
          execute: async (input: any, context) =>
            text(await linkChild(context.sessionID, input.sessionID, input.goal.trim())),
        });

        editor.add({
          name: "zmultica_session_list",
          description: "读取当前任务的会话清单和状态。",
          input: { type: "object", properties: {} },
          execute: async (_input: unknown, context) => text(await linkedTask(context.sessionID)),
        });

        editor.add({
          name: "zmultica_session_tail",
          description: "读取某个会话的最后一条 assistant 文本和执行状态，用于了解最新进展。",
          input: {
            type: "object",
            properties: { sessionID: { type: "string" } },
            required: ["sessionID"],
          },
          execute: async (input: any) => text(await tail(input.sessionID)),
        });

        editor.add({
          name: "zmultica_document_set",
          description:
            "设置当前任务的产出文档内容。主会话和子会话都可以修改；内容应简洁，包含文字和链接。",
          input: {
            type: "object",
            properties: {
              content: { type: "string" },
            },
            required: ["content"],
          },
          execute: async (input: any, context) => {
            const task = await linkedTask(context.sessionID);
            const updated = await mutate(task.id, (draft) => {
              draft.document = {
                content: input.content,
                updatedAt: Date.now(),
                updatedBy: context.sessionID,
              };
            });
            return text(updated.document);
          },
        });

        editor.add({
          name: "zmultica_document_get",
          description: "读取当前任务的产出文档。",
          input: { type: "object", properties: {} },
          execute: async (_input: unknown, context) =>
            text((await linkedTask(context.sessionID)).document),
        });
      }),
    );

    void (async () => {
      try {
        for await (const event of ctx.event.subscribe({ signal: controller.signal })) {
          const data = (event.data ?? {}) as Record<string, unknown>;
          const info = (data.info ?? {}) as Record<string, unknown>;
          const sessionID =
            typeof data.sessionID === "string"
              ? data.sessionID
              : typeof info.id === "string"
                ? info.id
                : undefined;
          if (!sessionID) continue;

          if (event.type === "session.deleted") {
            links.delete(sessionID);
            tasks.delete(sessionID);
            continue;
          }
          if (event.type === "session.execution.started") {
            if (!links.has(sessionID)) await refresh(sessionID).catch(() => undefined);
            const link = links.get(sessionID);
            const task = link && tasks.get(link.taskId);
            if (task?.status === "待分配") {
              await mutate(task.id, (draft) => {
                draft.status = "执行中";
                draft.statusChangedAt = Date.now();
              }).catch(() => undefined);
            }
            continue;
          }
          if (event.type === "session.renamed") {
            await refresh(sessionID).catch(() => undefined);
            const link = links.get(sessionID);
            if (link) {
              const session = await getSession(sessionID);
              const title = session.title?.trim();
              const authority = (session.metadata?.yuri as any)?.titleAuthority;
              if (title) {
                const task = await readTask(link.taskId);
                const self = task?.sessions.find((item) => item.sessionId === sessionID);
                const shouldRenameTask =
                  link.role === "main" &&
                  authority?.source === "manual" &&
                  task &&
                  task.title !== title;
                if (task && (self?.title !== title || shouldRenameTask)) {
                  await mutate(task.id, (draft) => {
                    const current = draft.sessions.find((item) => item.sessionId === sessionID);
                    if (current) current.title = title;
                    if (shouldRenameTask) draft.title = title;
                  }).catch(() => undefined);
                }
              }
            }
            continue;
          }
          if (
            event.type === "session.metadata.updated" ||
            event.type === "session.moved" ||
            event.type === "session.created" ||
            event.type === "session.forked"
          ) {
            await refresh(sessionID).catch(() => undefined);
          }
        }
      } catch {
        /* the stream is recovered on the next plugin reload */
      }
    })();

    return () => {
      store.close();
      controller.abort();
      for (const registration of registrations) void registration.dispose();
    };
  },
});
