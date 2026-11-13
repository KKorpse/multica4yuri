#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import type { LabelInfo } from "./model";
import type { Task } from "./task";

type Json = any;

const json = process.argv.includes("--json");
const args = process.argv.slice(2).filter((arg) => arg !== "--json");
const positionals: string[] = [];
const flags: Record<string, string | boolean> = {};

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg.startsWith("--")) {
    const [key, inline] = arg.slice(2).split("=", 2);
    if (inline !== undefined) flags[key] = inline;
    else if (args[index + 1] && !args[index + 1].startsWith("--")) flags[key] = args[++index];
    else flags[key] = true;
  } else {
    positionals.push(arg);
  }
}

function flag(name: string): string | undefined {
  const value = flags[name];
  return typeof value === "string" ? value : undefined;
}

function has(name: string): boolean {
  return flags[name] === true || typeof flags[name] === "string";
}

function rpc(method: string, input: Json = {}): Json {
  const result = spawnSync(
    "opencode",
    ["api", "post", `/api/rpc/zmultica.board/${method}`, "--data", JSON.stringify({ input })],
    { encoding: "utf8" },
  );
  const raw = (result.stdout || "").trim();
  let data: Json;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error((result.stderr || raw || `RPC ${method} failed`).trim());
  }
  if (data.error || data._tag === "RpcError" || String(data.type ?? "").startsWith("rpc.")) {
    throw new Error(data.error?.message || data.message || `RPC ${method} failed`);
  }
  return data.output;
}

function print(value: unknown) {
  if (json) console.log(JSON.stringify(value, null, 2));
}

function tasks(): Task[] {
  return rpc("list") as Task[];
}

function resolve(ref: string | undefined): Task {
  if (!ref) throw new Error("缺少任务编号，例如 ZM-0");
  const all = tasks();
  const task =
    all.find((item) => item.code?.toLowerCase() === ref.toLowerCase()) ??
    all.find((item) => item.id === ref) ??
    all.find((item) => item.sessions.some((link) => link.sessionId === ref));
  if (!task) throw new Error(`任务不存在：${ref}`);
  return task;
}

function time(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const relative = value.match(/^(\d+)([mhdw])$/);
  if (relative) {
    const unit = { m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 }[
      relative[2] as "m" | "h" | "d" | "w"
    ];
    return Date.now() - Number(relative[1]) * unit;
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) throw new Error(`无法识别时间：${value}`);
  return parsed;
}

function formatDate(value: number): string {
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function listTasks() {
  const since = time(flag("since"));
  const until = time(flag("until"));
  const status = flag("status");
  const labels = (flag("label") || "")
    .split(",")
    .map((label) => label.trim().toLowerCase())
    .filter(Boolean);
  const search = flag("search")?.toLowerCase();
  const limit = Number(flag("limit") || 50);

  const result = tasks()
    .filter((task) => !status || task.status === status)
    .filter((task) => !since || task.updatedAt >= since)
    .filter((task) => !until || task.updatedAt <= until)
    .filter(
      (task) => !labels.length || task.labels.some((label) => labels.includes(label.toLowerCase())),
    )
    .filter((task) => {
      if (!search) return true;
      return `${task.code} ${task.title} ${task.description}`.toLowerCase().includes(search);
    })
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, limit);

  if (json) return print(result);
  if (!result.length) {
    console.log("没有匹配的任务");
    return;
  }
  const group = flag("group");
  if (group === "label") {
    const groups = new Map<string, Task[]>();
    for (const task of result) {
      for (const label of task.labels.length ? task.labels : ["无标签"]) {
        const list = groups.get(label) ?? [];
        list.push(task);
        groups.set(label, list);
      }
    }
    for (const [label, list] of [...groups.entries()].sort((a, b) =>
      a[0].localeCompare(b[0], "zh-CN"),
    )) {
      console.log(`# ${label}`);
      for (const task of list) printTaskLine(task);
    }
    return;
  }
  for (const task of result) printTaskLine(task);
}

function printTaskLine(task: Task) {
  const sessions = task.sessions.length;
  const labels = task.labels.length ? `  [${task.labels.join(", ")}]` : "";
  console.log(
    `${(task.code || task.id).padEnd(6)}  ${task.status.padEnd(4)}  ${task.title}${labels}  (${sessions} 会话, ${formatDate(task.updatedAt)})`,
  );
}

function showTask(task: Task) {
  if (json) return print(task);
  console.log(`${task.code || task.id}  ${task.status}  ${task.title}`);
  console.log(`描述：${task.description || "无"}`);
  console.log("会话：");
  for (const link of task.sessions) {
    const role = link.role === "main" ? "主" : "子";
    console.log(
      `  ${role}  ${link.sessionId}  ${link.title}${link.goal ? `  (${link.goal})` : ""}`,
    );
  }
  console.log("产出：");
  console.log(task.document.content || "（空）");
}

function createTask() {
  const title = flag("title");
  const directory = flag("directory") || process.cwd();
  if (!title) throw new Error("缺少 --title");
  const labels = (flag("labels") || "")
    .split(",")
    .map((label) => label.trim())
    .filter(Boolean);
  const task = rpc("create", {
    title,
    description: flag("description") || "",
    labels,
    directory,
    agent: flag("agent"),
  }) as Task;
  if (json) return print(task);
  console.log(`已创建 ${task.code || task.id}  ${task.title}`);
  console.log(`主会话：${task.mainSessionId}`);
}

function updateTask(ref: string | undefined) {
  const task = resolve(ref);
  const patch: Json = {};
  for (const key of ["title", "description"]) {
    const value = flag(key);
    if (value !== undefined) patch[key] = value;
  }
  if (has("labels")) {
    patch.labels = (flag("labels") || "")
      .split(",")
      .map((label) => label.trim())
      .filter(Boolean);
  }
  const status = flag("status");
  if (status) {
    if (status !== "已完成" && status !== "废弃") {
      throw new Error("CLI 只能手动设置为 已完成 或 废弃；执行中由系统自动进入");
    }
    patch.status = status;
  }
  if (!Object.keys(patch).length) throw new Error("没有要修改的字段");
  const updated = rpc("update", { taskId: task.id, patch }) as Task;
  if (json) return print(updated);
  console.log(`已更新 ${updated.code || updated.id}  ${updated.status}  ${updated.title}`);
}

function setDocument(ref: string | undefined) {
  const task = resolve(ref);
  let content: string;
  if (flag("file")) content = readFileSync(flag("file")!, "utf8");
  else if (has("stdin")) content = readFileSync(0, "utf8");
  else if (flag("text") !== undefined) content = flag("text")!;
  else throw new Error("需要 --file、--stdin 或 --text");
  const document = rpc("setDocument", { taskId: task.id, content });
  if (json) return print(document);
  console.log(`已更新 ${task.code || task.id} 的产出`);
}

function getDocument(ref: string | undefined) {
  const task = resolve(ref);
  const document = rpc("documentGet", { taskId: task.id });
  if (json) return print(document);
  console.log(document.content || "");
}

function sessionCreate(ref: string | undefined) {
  const task = resolve(ref);
  const goal = flag("goal");
  if (!goal) throw new Error("缺少 --goal");
  const link = rpc("sessionCreate", {
    taskId: task.id,
    goal,
    directory: flag("directory"),
    agent: flag("agent"),
  });
  if (json) return print(link);
  console.log(`已创建子会话 ${link.sessionId}  ${link.title}`);
}

function sessionLink(ref: string | undefined) {
  const task = resolve(ref);
  const sessionID = flag("session");
  const goal = flag("goal");
  if (!sessionID || !goal) throw new Error("需要 --session 和 --goal");
  const link = rpc("sessionLink", { taskId: task.id, sessionID, goal });
  if (json) return print(link);
  console.log(`已绑定 ${link.sessionId}  ${link.title}`);
}

function sessionList(ref: string | undefined) {
  const task = resolve(ref);
  const result = rpc("sessionList", { taskId: task.id }) as Task;
  if (json) return print(result.sessions);
  for (const link of result.sessions) {
    const role = link.role === "main" ? "主" : "子";
    console.log(`${role}  ${link.sessionId}  ${link.title}${link.goal ? `  (${link.goal})` : ""}`);
  }
}

function sessionTail(sessionID: string | undefined) {
  if (!sessionID) throw new Error("缺少 sessionId");
  const result = rpc("sessionTail", { sessionID });
  if (json) return print(result);
  console.log(`会话：${result.title || sessionID}`);
  console.log(`状态：${result.outcome || "unknown"}  ${formatDate(result.updatedAt)}`);
  console.log(result.text || "（暂无回复）");
}

function listLabels() {
  const result = rpc("labelList") as LabelInfo[];
  if (json) return print(result);
  if (!result.length) {
    console.log("还没有标签");
    return;
  }
  for (const label of result) {
    console.log(
      `${label.name.padEnd(12)}  ${String(label.count).padStart(3)}  ${label.color}  ${label.id}`,
    );
  }
}

function resolveLabel(ref: string | undefined): LabelInfo {
  if (!ref) throw new Error("缺少标签名");
  const all = rpc("labelList") as LabelInfo[];
  const label =
    all.find((item) => item.id === ref) ??
    all.find((item) => item.name.toLocaleLowerCase() === ref.toLocaleLowerCase());
  if (!label) throw new Error(`标签不存在：${ref}`);
  return label;
}

function createLabel() {
  const name = positionals[2];
  if (!name) throw new Error("缺少标签名");
  const label = rpc("labelCreate", { name, color: flag("color") }) as LabelInfo;
  if (json) return print(label);
  console.log(`已创建标签 ${label.name}  ${label.color}  ${label.id}`);
}

function renameLabel() {
  const target = positionals[3];
  if (!target) throw new Error("用法：label rename <旧名> <新名>");
  const label = resolveLabel(positionals[2]);
  const updated = rpc("labelRename", { id: label.id, name: target }) as LabelInfo;
  if (json) return print(updated);
  console.log(`已重命名 ${label.name} → ${updated?.name ?? target}`);
}

function deleteLabel() {
  const label = resolveLabel(positionals[2]);
  rpc("labelDelete", { id: label.id });
  if (json) return print({ ok: true, id: label.id, name: label.name });
  console.log(`已删除标签 ${label.name}（从 ${label.count} 个任务移除）`);
}

function help() {
  console.log(`zmultica <command> <subcommand> [flags]

任务
  task list [--status 执行中] [--since 7d] [--label 支付] [--group label] [--search 关键字] [--limit 50] [--json]
  task get <ZM-0>
  task create --title "..." [--description "..."] [--labels a,b] [--directory /path] [--agent build]
  task update <ZM-0> [--title "..."] [--description "..."] [--labels a,b] [--status 已完成|废弃]
  task complete <ZM-0>
  task discard <ZM-0>

标签
  label list
  label create <名称> [--color #8b8cdd]
  label rename <旧名|ID> <新名>
  label delete <名称|ID>

产出
  document get <ZM-0>
  document set <ZM-0> --file ./output.md
  document set <ZM-0> --stdin
  document set <ZM-0> --text "..."

会话
  session list <ZM-0>
  session create <ZM-0> --goal "补齐文档" [--directory /path] [--agent build]
  session link <ZM-0> --session ses_xxx --goal "补齐文档"
  session tail ses_xxx`);
}

try {
  const group = positionals[0];
  const action = positionals[1];
  const ref = positionals[2];

  if (!group || group === "help") help();
  else if (group === "task" && action === "list") listTasks();
  else if (group === "task" && action === "get") showTask(resolve(ref));
  else if (group === "task" && action === "create") createTask();
  else if (group === "task" && action === "update") updateTask(ref);
  else if (group === "task" && action === "complete") updateTaskWithStatus(ref, "已完成");
  else if (group === "task" && action === "discard") updateTaskWithStatus(ref, "废弃");
  else if (group === "document" && action === "get") getDocument(ref);
  else if (group === "document" && action === "set") setDocument(ref);
  else if (group === "session" && action === "list") sessionList(ref);
  else if (group === "session" && action === "create") sessionCreate(ref);
  else if (group === "session" && action === "link") sessionLink(ref);
  else if (group === "session" && action === "tail") sessionTail(ref);
  else if (group === "label" && action === "list") listLabels();
  else if (group === "label" && action === "create") createLabel();
  else if (group === "label" && action === "rename") renameLabel();
  else if (group === "label" && action === "delete") deleteLabel();
  else {
    help();
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

function updateTaskWithStatus(ref: string | undefined, status: string) {
  const task = resolve(ref);
  const updated = rpc("update", { taskId: task.id, patch: { status } }) as Task;
  if (json) return print(updated);
  console.log(`已标记 ${updated.code || updated.id} 为 ${status}`);
}
