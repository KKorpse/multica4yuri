# Yuri Session Board

A Yuri plugin that turns **sessions into a task board**: statuses, tags, search,
filtering and a create-task flow, while the conversation itself stays the native
Yuri chat.

## What it does

- **Board over sessions** — every root session is a task; sub-agent and Yuri
  system sessions are hidden. Sessions without task data are shown as
  “未规划” and become normal tasks as soon as you edit them.
- **Statuses** — `待规划 / 待开始 / 执行中 / 待确认 / 已完成 / 已搁置`, plus any
  custom status you type. Drag cards between columns (when grouped by status).
- **Tags** — free-form, per task, with deterministic colors; filter by one or
  more tags.
- **Search & filters** — title, description, tag or session ID; status, tag,
  agent, directory, running-only, tasks-only, sub-sessions and archive state.
- **Grouping & sorting** — group by status, agent or directory; sort manually,
  by update time, creation time or title.
- **Create task** — title, description, directory, initial status, tags and an
  agent. The description can be sent as the first message immediately.
- **Agent** — chosen when the task is created; later changes happen in the
  native chat composer and are reflected on the card.
- **Open chat** — single click opens task details, double-click (or “打开对话”)
  goes to the native session. The board is reachable again from the titlebar
  “看板” button, the command palette, or `/plugins/yuri-session-board/board`.
- **Live** — running badges follow `session.execution.*` events; renames,
  metadata, archive and agent changes update without a reload.

## Install

The GUI part is a package in this repository. Build it, then add the directory
to the global OpenCode config so Yuri loads it in every window:

```jsonc
// ~/.config/opencode/opencode.jsonc
{
  "plugins": [
    { "package": "/absolute/path/to/yuri-session-board" }
  ]
}
```

```bash
npm install
npm run build
```

Yuri reloads plugins on config change. Open the board with:

- the **看板** titlebar button,
- **Command palette → 打开会话看板** (`mod+shift+b`), or
- the URL `/plugins/yuri-session-board/board`.

For development:

```bash
npm run dev   # vite build --watch; Yuri reloads the GUI on every rebuild
npm run check # typecheck + unit tests + build
```

## Where the data lives

Nothing is stored in a plugin database. Task data is a JSON Merge Patch on the
session's Host metadata (`metadata.sessionBoard`), written through Yuri's
authenticated `PUT /api/yuri/sessions/:id/metadata` endpoint. This keeps the
session title, agent, archive state and every other metadata key intact, and it
is shared across windows and devices attached to the same host.

```ts
metadata.sessionBoard = {
  version: 1,
  description: string,
  status: string,
  labels: string[],
  rank: number, // manual ordering inside a column
}
```

Archiving uses Yuri's own archive endpoint, so the board and the native session
list agree.

## Code map

| File | Responsibility |
| --- | --- |
| `src/model.ts` | Pure task model, metadata parsing, filtering, sorting, colors |
| `src/data.ts` | Session/agent/project calls and Host metadata/archive writes |
| `src/board.ts` | Reactive board state, events, optimistic updates |
| `src/ui.tsx` | Page, columns, cards, filters, create/edit dialogs |
| `src/host.ts` | Yuri page registration and native URL navigation |
| `src/gui.tsx` | Plugin definition: page, commands, titlebar item, styles |

## Design notes / limits

- Yuri 0.2.28 does not expose `ctx.tabs`; opening a session uses Yuri's own
  `/session/:id` route, so the native chat keeps all of its features.
- The GUI API has no multi-line input; the description uses a native textarea
  styled from the host theme tokens.
- Task metadata is read from `session.list`; boards are therefore scoped to the
  sessions a host returns (root sessions, max 2000 per load).
- Archive writes are optimistic; a failed Host write is rolled back and shown as
  a toast.
- Manual ordering uses fractional ranks. A gap exhausted by float precision
  falls back to the nearest representable position; rebalancing a whole column
  is intentionally not part of v1.

## Roadmap

- Server part + RPC so agents can query/create tasks (`board.query`,
  `board.create`) without the GUI.
- Saved views and per-project boards.
- Swimlanes and a list/table view.
- Optional auto-transition on execution start/finish.
