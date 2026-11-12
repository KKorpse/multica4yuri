import { Database } from "bun:sqlite";
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

      CREATE INDEX IF NOT EXISTS idx_task_status_updated ON task(status, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_task_updated ON task(updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_task_session_session ON task_session(session_id);
      CREATE INDEX IF NOT EXISTS idx_task_session_parent ON task_session(parent_id);
    `);
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
      title: String(row.title),
      description: String(row.description),
      status: row.status as Task["status"],
      labels: JSON.parse(String(row.labels)),
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
        id, title, description, status, labels, rank, main_session_id,
        document_content, document_updated_at, document_updated_by,
        revision, created_at, updated_at, status_changed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        task.id,
        task.title,
        task.description,
        task.status,
        JSON.stringify(task.labels),
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
