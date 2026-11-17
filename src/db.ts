import { Database } from "bun:sqlite";
import { randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import {
  DEFAULT_STATUS,
  DEFAULT_STATUSES,
  DISCARD_STATUS,
  normalizeStatus,
  statusColor,
  type StatusInfo,
  type StatusKind,
} from "./model";
import type { SessionLink, Task } from "./task";

type Row = Record<string, unknown>;

const TASK_COLUMNS = [
  "id",
  "code",
  "title",
  "description",
  "status",
  "labels",
  "urgent",
  "rank",
  "main_session_id",
  "document_content",
  "document_updated_at",
  "document_updated_by",
  "revision",
  "created_at",
  "updated_at",
  "status_changed_at",
].join(", ");

export class BoardStore {
  private db: Database;

  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path, { create: true });
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS status (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE COLLATE NOCASE,
        color TEXT NOT NULL,
        position INTEGER NOT NULL,
        kind TEXT NOT NULL DEFAULT 'normal' CHECK (kind IN ('default', 'discard', 'normal')),
        visible INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_status_kind ON status(kind) WHERE kind <> 'normal';

      CREATE TABLE IF NOT EXISTS task (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL DEFAULT '',
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL REFERENCES status(name) ON UPDATE CASCADE ON DELETE RESTRICT,
        labels TEXT NOT NULL DEFAULT '[]',
        urgent INTEGER NOT NULL DEFAULT 0,
        rank REAL NOT NULL,
        main_session_id TEXT NOT NULL,
        document_content TEXT NOT NULL DEFAULT '',
        document_updated_at INTEGER NOT NULL,
        document_updated_by TEXT NOT NULL DEFAULT '',
        revision INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        status_changed_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS task_session (
        task_id TEXT NOT NULL REFERENCES task(id) ON DELETE CASCADE,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('main', 'sub')),
        parent_id TEXT,
        goal TEXT NOT NULL DEFAULT '',
        title TEXT NOT NULL,
        directory TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (task_id, session_id)
      );

      CREATE TABLE IF NOT EXISTS label (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        color TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS task_label (
        task_id TEXT NOT NULL REFERENCES task(id) ON DELETE CASCADE,
        label_id TEXT NOT NULL REFERENCES label(id) ON DELETE CASCADE,
        PRIMARY KEY (task_id, label_id)
      );

      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    try {
      this.db.exec("ALTER TABLE status ADD COLUMN visible INTEGER NOT NULL DEFAULT 1");
    } catch {
      /* the column already exists on newer databases */
    }
    try {
      this.db.exec("ALTER TABLE task ADD COLUMN code TEXT NOT NULL DEFAULT ''");
    } catch {
      /* the column already exists on newer databases */
    }
    try {
      this.db.exec("ALTER TABLE task ADD COLUMN urgent INTEGER NOT NULL DEFAULT 0");
    } catch {
      /* the column already exists on newer databases */
    }

    this.seedStatuses();
    this.migrateStatuses();
    this.rebuildTaskTable();

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_task_status_updated ON task(status, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_task_updated ON task(updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_task_session_session ON task_session(session_id);
      CREATE INDEX IF NOT EXISTS idx_task_session_parent ON task_session(parent_id);
      CREATE INDEX IF NOT EXISTS idx_task_label_label ON task_label(label_id);
    `);

    const missing = this.db
      .prepare("SELECT id FROM task WHERE code = '' ORDER BY created_at ASC")
      .all() as Row[];
    for (const row of missing) {
      this.db.prepare("UPDATE task SET code = ? WHERE id = ?").run(this.nextCode(), row.id);
    }

    if (!this.meta("labels_migrated")) {
      const pending = this.db
        .prepare(
          `SELECT t.id, t.labels FROM task t
           WHERE t.labels <> '[]'
             AND NOT EXISTS (SELECT 1 FROM task_label tl WHERE tl.task_id = t.id)`,
        )
        .all() as Row[];
      for (const row of pending) {
        try {
          const names = JSON.parse(String(row.labels));
          if (Array.isArray(names))
            this.syncLabels(
              String(row.id),
              names.filter((x) => typeof x === "string"),
            );
        } catch {
          /* malformed legacy labels are ignored */
        }
      }
      this.setMeta("labels_migrated", "1");
    }
  }

  private meta(key: string): string | undefined {
    const row = this.db.prepare("SELECT value FROM meta WHERE key = ?").get(key) as Row | undefined;
    return row ? String(row.value) : undefined;
  }

  private setMeta(key: string, value: string): void {
    this.db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)").run(key, value);
  }

  private statusId(): string {
    return `stt_${randomBytes(6).toString("hex")}`;
  }

  private insertStatus(name: string, color: string, position: number, kind: StatusKind): void {
    this.db
      .prepare(
        `INSERT INTO status (id, name, color, position, kind, visible, created_at)
         VALUES (?, ?, ?, ?, ?, 1, ?)`,
      )
      .run(this.statusId(), name, color, position, kind, Date.now());
  }

  /** Create the built-in catalog on first run and repair a missing default/discard role. */
  private seedStatuses(): void {
    const total = Number(
      (this.db.prepare("SELECT COUNT(*) AS count FROM status").get() as Row).count,
    );
    if (!total) {
      DEFAULT_STATUSES.forEach((name, position) => {
        const kind: StatusKind =
          name === DEFAULT_STATUS ? "default" : name === DISCARD_STATUS ? "discard" : "normal";
        this.insertStatus(name, statusColor(name), position, kind);
      });
      return;
    }
    const roles = new Set(
      this.db
        .prepare("SELECT kind FROM status WHERE kind <> 'normal'")
        .all()
        .map((row: Row) => String(row.kind)),
    );
    let position =
      Number(
        (this.db.prepare("SELECT COALESCE(MAX(position), -1) AS value FROM status").get() as Row)
          .value,
      ) + 1;
    for (const [kind, name] of [
      ["default", DEFAULT_STATUS],
      ["discard", DISCARD_STATUS],
    ] as const) {
      if (roles.has(kind)) continue;
      const named = this.db
        .prepare("SELECT id FROM status WHERE name = ? COLLATE NOCASE")
        .get(name) as Row | undefined;
      if (named) this.db.prepare("UPDATE status SET kind = ? WHERE id = ?").run(kind, named.id);
      else this.insertStatus(name, statusColor(name), position++, kind);
    }
  }

  /** Every status used by a task must exist in the catalog before the foreign key is enforced. */
  private migrateStatuses(): void {
    const rows = this.db.prepare("SELECT DISTINCT status FROM task").all() as Row[];
    let position =
      Number(
        (this.db.prepare("SELECT COALESCE(MAX(position), -1) AS value FROM status").get() as Row)
          .value,
      ) + 1;
    for (const row of rows) {
      const raw = String(row.status);
      const clean = normalizeStatus(raw);
      if (clean !== raw) {
        this.db.prepare("UPDATE task SET status = ? WHERE status = ?").run(clean, raw);
      }
      const known = this.db
        .prepare("SELECT id FROM status WHERE name = ? COLLATE NOCASE")
        .get(clean) as Row | undefined;
      if (!known) this.insertStatus(clean, statusColor(clean), position++, "normal");
    }
  }

  /** Older databases declared `CHECK (status IN (...))`; rebuild once to a catalog foreign key. */
  private rebuildTaskTable(): void {
    const row = this.db
      .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'task'")
      .get() as Row | undefined;
    const sql = row ? String(row.sql ?? "") : "";
    if (!sql.includes("CHECK (status IN")) return;

    this.db.exec("PRAGMA foreign_keys = OFF");
    try {
      this.db.exec("BEGIN");
      this.db.exec(`
        CREATE TABLE task_status_migration (
          id TEXT PRIMARY KEY,
          code TEXT NOT NULL DEFAULT '',
          title TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL REFERENCES status(name) ON UPDATE CASCADE ON DELETE RESTRICT,
          labels TEXT NOT NULL DEFAULT '[]',
          urgent INTEGER NOT NULL DEFAULT 0,
          rank REAL NOT NULL,
          main_session_id TEXT NOT NULL,
          document_content TEXT NOT NULL DEFAULT '',
          document_updated_at INTEGER NOT NULL,
          document_updated_by TEXT NOT NULL DEFAULT '',
          revision INTEGER NOT NULL DEFAULT 1,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          status_changed_at INTEGER NOT NULL
        )
      `);
      this.db.exec(
        `INSERT INTO task_status_migration (${TASK_COLUMNS}) SELECT ${TASK_COLUMNS} FROM task`,
      );
      this.db.exec("DROP TABLE task");
      this.db.exec("ALTER TABLE task_status_migration RENAME TO task");
      this.db.exec("COMMIT");
    } catch (error) {
      try {
        this.db.exec("ROLLBACK");
      } catch {
        /* the transaction never started */
      }
      throw error;
    } finally {
      this.db.exec("PRAGMA foreign_keys = ON");
    }
    const broken = this.db.prepare("PRAGMA foreign_key_check(task)").all();
    if (broken.length) throw new Error("任务状态迁移未通过外键校验");
  }

  listStatuses(): StatusInfo[] {
    return this.db
      .prepare(
        `SELECT s.id, s.name, s.color, s.position, s.kind, s.visible, COUNT(t.id) AS count
         FROM status s LEFT JOIN task t ON t.status = s.name
         GROUP BY s.id ORDER BY s.position ASC, s.name ASC`,
      )
      .all()
      .map((row: Row) => ({
        id: String(row.id),
        name: String(row.name),
        color: String(row.color),
        position: Number(row.position),
        kind: row.kind === "default" || row.kind === "discard" ? row.kind : "normal",
        visible: Boolean(row.visible),
        count: Number(row.count),
      }));
  }

  statusByName(name: string): StatusInfo | undefined {
    return this.listStatuses().find(
      (status) => status.name.toLocaleLowerCase() === name.trim().toLocaleLowerCase(),
    );
  }

  statusById(id: string): StatusInfo | undefined {
    return this.listStatuses().find((status) => status.id === id);
  }

  defaultStatus(): StatusInfo {
    const status = this.listStatuses().find((item) => item.kind === "default");
    if (!status) throw new Error("缺少默认状态");
    return status;
  }

  discardStatus(): StatusInfo {
    const status = this.listStatuses().find((item) => item.kind === "discard");
    if (!status) throw new Error("缺少废弃状态");
    return status;
  }

  /** Used by legacy metadata migration; returns the canonical stored name. */
  ensureStatus(name: string): string {
    const clean = normalizeStatus(name);
    const row = this.db
      .prepare("SELECT name FROM status WHERE name = ? COLLATE NOCASE")
      .get(clean) as Row | undefined;
    if (row) return String(row.name);
    const position =
      Number(
        (this.db.prepare("SELECT COALESCE(MAX(position), -1) AS value FROM status").get() as Row)
          .value,
      ) + 1;
    this.insertStatus(clean, statusColor(clean), position, "normal");
    return clean;
  }

  createStatus(name: string, color?: string): StatusInfo {
    const clean = name.trim();
    if (!clean) throw new Error("状态名不能为空");
    const clash = this.db
      .prepare("SELECT id FROM status WHERE name = ? COLLATE NOCASE")
      .get(clean) as Row | undefined;
    if (clash) throw new Error(`状态已存在：${clean}`);
    const position =
      Number(
        (this.db.prepare("SELECT COALESCE(MAX(position), -1) AS value FROM status").get() as Row)
          .value,
      ) + 1;
    this.insertStatus(clean, color || statusColor(clean), position, "normal");
    return this.statusByName(clean)!;
  }

  updateStatus(
    id: string,
    input: { name?: string; color?: string; visible?: boolean },
  ): StatusInfo {
    const current = this.statusById(id);
    if (!current) throw new Error("状态不存在");
    const name = input.name === undefined ? current.name : input.name.trim();
    if (!name) throw new Error("状态名不能为空");
    const clash = this.db
      .prepare("SELECT id FROM status WHERE name = ? COLLATE NOCASE AND id <> ?")
      .get(name, id) as Row | undefined;
    if (clash) throw new Error(`状态已存在：${name}`);
    if (current.kind === "default" && input.visible === false) {
      throw new Error("默认状态不能隐藏");
    }
    const color = input.color?.trim() || current.color;
    const visible = input.visible === undefined ? current.visible : input.visible;
    this.db
      .prepare("UPDATE status SET name = ?, color = ?, visible = ? WHERE id = ?")
      .run(name, color, visible ? 1 : 0, id);
    return this.statusById(id)!;
  }

  deleteStatus(id: string): { moved: number; target: string } {
    const status = this.statusById(id);
    if (!status) throw new Error("状态不存在");
    if (status.kind !== "normal") throw new Error("默认状态和废弃状态不能删除");
    const discard = this.discardStatus();
    const now = Date.now();
    const moved = this.db.transaction(() => {
      const result = this.db
        .prepare(
          `UPDATE task SET status = ?, status_changed_at = ?, updated_at = ?, revision = revision + 1
           WHERE status = ?`,
        )
        .run(discard.name, now, now, status.name);
      this.db.prepare("DELETE FROM status WHERE id = ?").run(id);
      return Number(result.changes);
    })();
    return { moved, target: discard.name };
  }

  reorderStatuses(ids: readonly string[]): StatusInfo[] {
    const known = this.listStatuses();
    const byId = new Map(known.map((status) => [status.id, status]));
    const ordered = ids.filter((id) => byId.has(id));
    const seen = new Set(ordered);
    for (const status of known) if (!seen.has(status.id)) ordered.push(status.id);
    this.db.transaction(() => {
      const update = this.db.prepare("UPDATE status SET position = ? WHERE id = ?");
      ordered.forEach((id, index) => update.run(index, id));
    })();
    return this.listStatuses();
  }

  private labelId(): string {
    return `lbl_${randomBytes(6).toString("hex")}`;
  }

  private labelColor(name: string): string {
    const palette = [
      "#8b8cdd",
      "#c586c0",
      "#5b9bd5",
      "#46a99a",
      "#b79b5a",
      "#d4836a",
      "#8599c2",
      "#7fae6a",
      "#c48a5e",
      "#6fa8b5",
      "#b07fc0",
      "#a3a35c",
      "#d07f9a",
      "#6f9fd8",
    ];
    let hash = 0;
    for (const ch of name.toLocaleLowerCase()) hash = (hash * 31 + ch.codePointAt(0)!) >>> 0;
    const used = new Set(
      this.db
        .prepare("SELECT color FROM label")
        .all()
        .map((row: Row) => String(row.color)),
    );
    const start = hash % palette.length;
    for (let index = 0; index < palette.length; index += 1) {
      const candidate = palette[(start + index) % palette.length];
      if (!used.has(candidate)) return candidate;
    }
    return palette[start];
  }

  private labelsFor(taskId: string): string[] {
    return this.db
      .prepare(
        `SELECT l.name FROM task_label tl JOIN label l ON l.id = tl.label_id
         WHERE tl.task_id = ? ORDER BY l.name`,
      )
      .all(taskId)
      .map((row: Row) => String(row.name));
  }

  private syncLabels(taskId: string, names: string[]): void {
    const unique = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
    const ensure = this.db.prepare(
      "INSERT OR IGNORE INTO label (id, name, color, created_at) VALUES (?, ?, ?, ?)",
    );
    for (const name of unique) {
      ensure.run(this.labelId(), name, this.labelColor(name), Date.now());
    }
    this.db.prepare("DELETE FROM task_label WHERE task_id = ?").run(taskId);
    const link = this.db.prepare(
      "INSERT OR IGNORE INTO task_label (task_id, label_id) VALUES (?, ?)",
    );
    for (const name of unique) {
      const row = this.db.prepare("SELECT id FROM label WHERE name = ?").get(name) as
        Row | undefined;
      if (row) link.run(taskId, row.id);
    }
  }

  listLabels(): Array<{ id: string; name: string; color: string; count: number }> {
    return this.db
      .prepare(
        `SELECT l.id, l.name, l.color, COUNT(tl.task_id) AS count
         FROM label l LEFT JOIN task_label tl ON tl.label_id = l.id
         GROUP BY l.id ORDER BY l.name`,
      )
      .all()
      .map((row: Row) => ({
        id: String(row.id),
        name: String(row.name),
        color: String(row.color),
        count: Number(row.count),
      }));
  }

  createLabel(name: string, color?: string): { id: string; name: string; color: string } {
    const clean = name.trim();
    if (!clean) throw new Error("标签名不能为空");
    const id = this.labelId();
    this.db
      .prepare("INSERT OR IGNORE INTO label (id, name, color, created_at) VALUES (?, ?, ?, ?)")
      .run(id, clean, color || this.labelColor(clean), Date.now());
    const row = this.db
      .prepare("SELECT id, name, color FROM label WHERE name = ?")
      .get(clean) as Row;
    return { id: String(row.id), name: String(row.name), color: String(row.color) };
  }

  renameLabel(id: string, name: string): void {
    const clean = name.trim();
    if (!clean) throw new Error("标签名不能为空");
    const clash = this.db
      .prepare("SELECT id FROM label WHERE name = ? AND id <> ?")
      .get(clean, id) as Row | undefined;
    if (clash) throw new Error(`标签已存在：${clean}`);
    this.db.prepare("UPDATE label SET name = ? WHERE id = ?").run(clean, id);
  }

  deleteLabel(id: string): void {
    this.db.prepare("DELETE FROM label WHERE id = ?").run(id);
  }

  nextCode(): string {
    const row = this.db
      .prepare(
        "SELECT code FROM task WHERE code <> '' ORDER BY CAST(substr(code, 4) AS INTEGER) DESC LIMIT 1",
      )
      .get() as Row | undefined;
    const current = row ? Number(String(row.code).slice(3)) : -1;
    return `ZM-${current + 1}`;
  }

  private sessions(taskId: string): SessionLink[] {
    const rows = this.db
      .prepare("SELECT * FROM task_session WHERE task_id = ? ORDER BY created_at ASC")
      .all(taskId);
    return rows.map((row: Row) => ({
      sessionId: String(row.session_id),
      role: row.role === "main" ? "main" : "sub",
      parentId: row.parent_id ? String(row.parent_id) : null,
      goal: String(row.goal ?? ""),
      title: String(row.title),
      directory: String(row.directory),
      createdAt: Number(row.created_at),
    }));
  }

  private map(row: Row): Task {
    const id = String(row.id);
    return {
      id,
      code: String(row.code ?? ""),
      title: String(row.title),
      description: String(row.description),
      status: String(row.status),
      labels: this.labelsFor(id),
      urgent: Boolean(row.urgent),
      rank: Number(row.rank),
      mainSessionId: String(row.main_session_id),
      sessions: this.sessions(id),
      document: {
        content: String(row.document_content),
        updatedAt: Number(row.document_updated_at),
        updatedBy: String(row.document_updated_by),
      },
      revision: Number(row.revision),
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at),
      statusChangedAt: Number(row.status_changed_at),
    };
  }

  list(): Task[] {
    return this.db
      .prepare("SELECT * FROM task ORDER BY updated_at DESC LIMIT 500")
      .all()
      .map((row: Row) => this.map(row));
  }

  get(taskId: string): Task | undefined {
    const row = this.db.prepare("SELECT * FROM task WHERE id = ?").get(taskId) as Row | undefined;
    return row ? this.map(row) : undefined;
  }

  write(task: Task): void {
    this.db
      .prepare(
        `
      INSERT OR REPLACE INTO task (
        id, code, title, description, status, labels, urgent, rank, main_session_id,
        document_content, document_updated_at, document_updated_by,
        revision, created_at, updated_at, status_changed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        task.id,
        task.code,
        task.title,
        task.description,
        task.status,
        JSON.stringify(task.labels),
        task.urgent ? 1 : 0,
        task.rank,
        task.mainSessionId,
        task.document.content,
        task.document.updatedAt,
        task.document.updatedBy,
        task.revision,
        task.createdAt,
        task.updatedAt,
        task.statusChangedAt,
      );

    const insert = this.db.prepare(`
      INSERT OR REPLACE INTO task_session (
        task_id, session_id, role, parent_id, goal, title, directory, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    this.syncLabels(task.id, task.labels);

    for (const link of task.sessions) {
      insert.run(
        task.id,
        link.sessionId,
        link.role,
        link.parentId,
        link.goal,
        link.title,
        link.directory,
        link.createdAt,
      );
    }
  }

  deleteTask(taskId: string): void {
    this.db.prepare("DELETE FROM task WHERE id = ?").run(taskId);
  }

  close(): void {
    this.db.close();
  }
}
