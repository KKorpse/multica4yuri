# ZMultica

ZMultica is a Yuri plugin that turns **sessions into a task board**: statuses, tags, search,
filtering and a create-task flow, while the conversation itself stays the native
Yuri chat.

## What it does

- **Board over sessions** — every root session is a task; sub-agent and Yuri
  system sessions are hidden. Sessions without task data are auto-classified
  from their own history: running → 执行中, `outcome: succeeded` → 已完成,
  failed/interrupted → 待确认, previously executed → 待确认, never run → 待规划.
  The first edit persists the task data on the session.
- **Agent is already bound** — the card reads `session.agent`; changing it in
  the chat composer updates the card. New tasks can pick an agent at creation.
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
- **Multi-session tasks** — one main session per task; child sessions are
  created with `zmultica_session_create` (or bound with `zmultica_session_link`).
  Tasks live in an embedded SQLite database (`zmultica/board.db`) with `task`
  and `task_session` tables. Each task has one output document
  (`document_content`); latest replies are read on demand with
  `zmultica_session_tail`. Main/sub briefs are durable instruction entries.
- **Four statuses** — `待分配 / 执行中 / 已完成 / 废弃`. Execution start moves
  待分配 → 执行中 automatically; completion and discard are manual only.
- **Outputs** — `sessionBoard.outputs` holds deliverables of type `text`,
  `file` or `url`. The details dialog edits the task document. Artifacts live
  under `zmultica-artifacts/<sessionId>/`.
- **Esc navigation** — opening the board remembers the session you came from;
  `Esc` closes an open dialog first, otherwise returns to that session.
- **Right-side task widget** — the open conversation's right work-status column
  (`yuri.work-status`, below Changes) shows the task status, title, directory,
  agent and tags. Descriptions support Markdown/bare-URL links and an expand
  toggle; **详情** opens a wider dialog with the full task details. It shares
  the board state, so status and rename changes update live.
- **Live** — running badges follow `session.execution.*` events; renames,
  metadata, archive and agent changes update without a reload.

## Using it

- Click a card for task details (title, description, status, tags, agent,
  directory, cost). Double-click the card, or use **打开对话**, to enter the
  native Yuri chat.
- Drag a card between columns to change its status. Within a column, drag to
  reorder while sorting is **手动**.
- The **+** in a column header creates a task directly in that status.
- **仅任务** hides sessions that have no board data yet; untick it to see every
  root session. **含子会话** includes sub-agent sessions.
- Archive is Yuri's own session archive, so both views agree. The archive
  selector decides whether archived sessions are listed.

## Verification

```bash
npm run check
```

Runs the TypeScript check, unit tests for the pure model/query logic, the
production GUI and server bundle builds, and a headless render smoke test. The smoke test loads
the built bundle through the real plugin SDK, renders the page in JSDOM with
stubbed sessions, and asserts that planned and unplanned sessions become cards
while child sessions stay hidden.

The plugin is also verified against the local host: OpenCode lists it as
`features.gui: true, state: active`, and `/api/plugin/gui?id=yuri-session-board`
serves the built CommonJS bundle.

## Install

The GUI part is a package in this repository. Build it, then add the directory
to the global OpenCode config so Yuri loads it in every window:

```jsonc
// ~/.config/opencode/opencode.jsonc
{
  "plugins": [{ "package": "/absolute/path/to/yuri-session-board" }],
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

| File           | Responsibility                                                |
| -------------- | ------------------------------------------------------------- |
| `src/model.ts` | Pure task model, metadata parsing, filtering, sorting, colors |
| `src/data.ts`  | Session/agent/project calls and Host metadata/archive writes  |
| `src/board.ts` | Reactive board state, events, optimistic updates              |
| `src/ui.tsx`   | Page, columns, cards, filters, create/edit dialogs            |
| `src/host.ts`  | Yuri page registration and native URL navigation              |
| `src/gui.tsx`  | Plugin definition: page, commands, titlebar item, styles      |

## Design notes / limits

- Yuri 0.2.28 does not expose `ctx.tabs`; opening a session navigates to Yuri's
  own `/session/:id` route, so the native chat keeps all of its features. Plugin
  pages are opened through Yuri's `yuri.pages` contract.
- The GUI API has no multi-line input; the description uses a native textarea
  styled from the host theme tokens.
- Task metadata is read from `session.list`; boards are therefore scoped to the
  sessions a host returns (root sessions, max 2000 per load).
- Archive writes are optimistic; a failed Host write is rolled back and shown as
  a toast.
- Manual ordering uses fractional ranks. A gap exhausted by float precision
  falls back to the nearest representable position; rebalancing a whole column
  is intentionally not part of v1.
- Yuri can refresh session titles from the first message. If that renames a
  task, the board follows the session. Disable **Settings → Chat → session title
  refresh** if you want hand-written task titles to stay untouched.
- The board is desktop/web only. Yuri 0.2.28 does not mount plugin pages on
  narrow surfaces, does not expose `ctx.dialogs`/`ctx.ui`, and its mobile
  renderer does not load the GUI plugin host at all, so there is no supported
  plugin surface to host a mobile board.
- Each column renders 40 cards at a time with **再显示** / **Show more**, and a
  page-level error boundary catches render failures, so a large history does not
  create thousands of DOM nodes at once.

## Roadmap

- Server part + RPC so agents can query/create tasks (`board.query`,
  `board.create`) without the GUI.
- Saved views and per-project boards.
- Swimlanes and a list/table view.
- Optional auto-transition on execution start/finish.
