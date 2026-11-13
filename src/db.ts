import { Database } from "bun:sqlite";
import { randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { SessionLink, Task } from "./task";

type Row = Record<string, unknown>;

export class BoardStore {
  private db: Database;

  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path, { create: true });
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS task (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT '待分配' CHECK (status IN ('待分配', '执行中', '已完成', '废弃')),
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

      CREATE INDEX IF NOT EXISTS idx_task_status_updated ON task(status, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_task_updated ON task(updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_task_session_session ON task_session(session_id);
      CREATE INDEX IF NOT EXISTS idx_task_session_parent ON task_session(parent_id);
      CREATE INDEX IF NOT EXISTS idx_task_label_label ON task_label(label_id);
    `);

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
      status: row.status as Task["status"],
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

  close(): void {
    this.db.close();
  }
}
