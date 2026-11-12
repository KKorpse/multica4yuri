import { Plugin } from "@opencode/plugin";
import {
  childTitle,
  mainMeta,
  renderBrief,
  renderDelta,
  subMeta,
  type Note,
  type Role,
  type SessionLink,
  type Task,
} from "./task";

const ENTRY_KEY = "zmultica.session";
const MAX_CHILDREN = 8;
const MAX_NOTES = 50;

type Link = { taskId: string; role: Role; parentId?: string; goal: string };

export default Plugin.define({
  id: "zmultica",
  async setup(ctx) {
    const tasks = new Map<string, Task>();
    const links = new Map<string, Link>();
    const controller = new AbortController();
    const registrations: Array<{ dispose(): Promise<void> | void }> = [];

    const getSession = (sessionID: string) => ctx.session.get({ sessionID });

    function selfLink(task: Task, sessionID: string): SessionLink | undefined {
      return task.sessions.find((link) => link.sessionId === sessionID);
    }

    async function writeBrief(sessionID: string) {
      const link = links.get(sessionID);
      if (!link) return;
      const task = tasks.get(link.taskId);
      const self = task && selfLink(task, sessionID);
      if (!task || !self) return;
      await ctx.session.instructions.entry.put({
        sessionID,
        key: ENTRY_KEY,
        value: renderBrief(task, self),
      });
    }

    async function refresh(sessionID: string): Promise<void> {
      const session = await getSession(sessionID);
      const main = mainMeta(session);
      if (main) {
        tasks.set(main.id, main);
        links.set(sessionID, { taskId: main.id, role: "main", goal: "" });
        for (const link of main.sessions) {
          links.set(link.sessionId, {
            taskId: main.id,
            role: link.role,
            parentId: link.parentId ?? undefined,
            goal: link.goal,
          });
        }
        await writeBrief(sessionID);
        return;
      }
      const sub = subMeta(session);
      if (sub) {
        links.set(sessionID, {
          taskId: sub.taskId,
          role: "sub",
          parentId: sub.parentId,
          goal: sub.goal,
        });
        if (!tasks.has(sub.taskId)) await refresh(sub.taskId);
        await writeBrief(sessionID);
        return;
      }
      links.delete(sessionID);
    }

    async function mutate(taskId: string, update: (task: Task) => void): Promise<Task> {
      const session = await getSession(taskId);
      const task = mainMeta(session);
      if (!task) throw new Error("任务不存在");
      update(task);
      task.updatedAt = Date.now();
      await ctx.session.update({
        sessionID: taskId,
        metadata: { ...session.metadata, sessionBoard: task },
      });
      tasks.set(taskId, task);
      for (const link of task.sessions) await writeBrief(link.sessionId);
      return task;
    }

    async function requireMain(sessionID: string): Promise<Task> {
      if (!links.has(sessionID)) await refresh(sessionID);
      const link = links.get(sessionID);
      if (!link || link.role !== "main") throw new Error("只有主会话可以执行此操作");
      const task = tasks.get(link.taskId);
      if (!task) throw new Error("任务不存在");
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

    async function linkedTask(sessionID: string): Promise<Task> {
      if (!links.has(sessionID)) await refresh(sessionID);
      const link = links.get(sessionID);
      if (!link) throw new Error("当前会话未绑定任务");
      const task = tasks.get(link.taskId);
      if (!task) throw new Error("任务不存在");
      return task;
    }

    function text(value: unknown): { content: string } {
      return { content: typeof value === "string" ? value : JSON.stringify(value, null, 2) };
    }

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
          name: "zmultica_session_note",
          description: "向当前任务写一条汇报。子会话完成、失败或阻塞时必须调用；主会话也可写结论。",
          input: {
            type: "object",
            properties: {
              status: { type: "string", enum: ["completed", "failed", "blocked", "note"] },
              summary: { type: "string" },
              refs: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string", enum: ["text", "file", "url"] },
                    title: { type: "string" },
                    value: { type: "string" },
                  },
                  required: ["type", "title", "value"],
                },
              },
            },
            required: ["status", "summary"],
          },
          execute: async (input: any, context) => {
            const task = await linkedTask(context.sessionID);
            const self = selfLink(task, context.sessionID);
            const seq = task.lastNoteSeq + 1;
            await mutate(task.id, (draft) => {
              const item: Note = {
                seq,
                sessionId: context.sessionID,
                role: self?.role ?? "sub",
                status: input.status,
                summary: input.summary.trim(),
                refs: input.refs ?? [],
                createdAt: Date.now(),
              };
              draft.lastNoteSeq = seq;
              draft.notes.push(item);
              if (draft.notes.length > MAX_NOTES)
                draft.notes.splice(0, draft.notes.length - MAX_NOTES);
              draft.readBy[context.sessionID] = seq;
            });
            return text({ seq, taskId: task.id });
          },
        });

        editor.add({
          name: "zmultica_session_list",
          description: "读取当前任务的会话清单和状态。",
          input: { type: "object", properties: {} },
          execute: async (_input: unknown, context) => text(await linkedTask(context.sessionID)),
        });

        editor.add({
          name: "zmultica_session_read",
          description: "读取当前任务的汇报，并把当前会话的未读游标标记为已读。",
          input: {
            type: "object",
            properties: { after: { type: "number", description: "只返回 seq 大于此值的汇报" } },
          },
          execute: async (input: any, context) => {
            const task = await linkedTask(context.sessionID);
            const notes = task.notes.filter((note) => note.seq > (input.after ?? 0));
            await mutate(task.id, (draft) => {
              draft.readBy[context.sessionID] = Math.max(
                draft.readBy[context.sessionID] ?? 0,
                draft.lastNoteSeq,
              );
            });
            return text(notes);
          },
        });
      }),
    );

    registrations.push(
      await ctx.session.hook("context", async (request) => {
        const sessionID = request.sessionID;
        if (!links.has(sessionID)) await refresh(sessionID).catch(() => undefined);
        const link = links.get(sessionID);
        if (!link) return;
        const task = tasks.get(link.taskId);
        if (!task) return;
        const block = renderDelta(task, sessionID);
        if (block) request.system.push({ type: "text", text: block });
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
          if (
            event.type === "session.metadata.updated" ||
            event.type === "session.renamed" ||
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
      controller.abort();
      for (const registration of registrations) void registration.dispose();
    };
  },
});
