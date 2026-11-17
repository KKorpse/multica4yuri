# ZMultica

ZMultica is a Yuri plugin that turns **sessions into a task board**: statuses, tags, search,
filtering and a create-task flow, while the conversation itself stays the native
Yuri chat.

## What it does

- **Board over tasks** — tasks live in the plugin's SQLite store; a task owns
  one main session plus optional child sessions. Sub-agent and Yuri system
  sessions are hidden. All tasks are created explicitly, so nothing is
  auto-classified from session history.
- **Agent is already bound** — the card reads `session.agent`; changing it in
  the chat composer updates the card. New tasks can pick an agent at creation.
- **Custom statuses** — a user-managed catalog with names, colors and order.
  The seeded catalog is `待分配 / 执行中 / 已完成 / 废弃`; rename, recolor,
  reorder, add or delete any of them. `待分配` is the default for new tasks and
  `废弃` is the discard target; both roles are protected from deletion. Drag
  cards between columns, or use the right-click menu to move a task anywhere.
  In status grouping, drag a column header to reorder the statuses; the eye in
  each header hides that status and all of its tasks until it is restored from
  the status manager.
- **Tags** — free-form, per task, with deterministic colors; filter by one or
  more tags.
- **Search & filters** — title, description, tag, task ID or output document;
  status, tag, agent, directory, running-only, tasks-only and sub-sessions.
- **Grouping & sorting** — group by status, agent or directory; sort manually,
  by update time, creation time or title.
- **Phones** — the board uses one status column at a time with horizontal snap
  scrolling, the list view stacks each task into a card-like row, the table view
  is hidden, and task details open full screen. Touch targets and the toolbar
  are sized for narrow widths.
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
- **Manual flow only** — statuses never change automatically. Right-click a
  task to move it to any status; **废弃** moves it to the discard status, and
  **彻底删除** (only inside the discard status) permanently deletes the task and
  all of its sessions.
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
  metadata, status and agent changes update without a reload.

## Using it

- Click a card for task details (title, description, status, tags, agent,
  directory, cost). Double-click the card, or use **打开对话**, to enter the
  native Yuri chat.
- Drag a card between columns to change its status. Within a column, drag to
  reorder while sorting is **手动**. On touch screens dragging is disabled; use
  the task details dialog to change status.
- The **+** in a column header creates a task directly in that status.
- **仅任务** hides sessions that have no board data yet; untick it to see every
  root session. **含子会话** includes sub-agent sessions.
- Right-click a task to move it to any status or to mark it **废弃**. Tasks in
  the discard status expose **彻底删除**, which deletes the task record, its
  artifact directory and every linked session.
- **状态** in the toolbar opens the status manager: add, rename, recolor,
  reorder, hide/show and delete statuses. Hidden statuses stay in the manager
  with their task count; their columns and tasks are removed from the board,
  list and table views. Deleting a status moves its tasks to the discard
  status; the default and discard statuses cannot be deleted, and the default
  status cannot be hidden.

## CLI

`zmultica` is a thin client over the same RPC and SQLite store used by the
board. Build it with `npm run build:cli`, then link it into PATH:

```bash
ln -sfn "$PWD/dist/cli.mjs" ~/bin/zmultica
zmultica task list
zmultica task get ZM-0
zmultica task create --title "..." --description "..." --status 执行中 --directory "$PWD" --send
zmultica task start ZM-0
zmultica session create ZM-0 --goal "补齐文档"
zmultica session start ses_xxx
zmultica session tail ses_xxx
zmultica document set ZM-0 --file ./output.md
zmultica status list
zmultica status add 待评审 --color "#8b8cdd"
zmultica status rename 待评审 评审中
zmultica status delete 评审中
```

Read commands accept `--json`. `task update --status` and `task create --status`
accept any status in the catalog; statuses never change on their own.
`task discard` moves a task to the discard status, while `task delete --yes`
permanently deletes it and its sessions. `task create --send` starts the main
session immediately; `task create` without `--send` only creates the task shell.
`session create` starts the child by default; pass `--no-start` to only link it.

The matching skill lives at `~/.config/opencode/skills/zmultica/SKILL.md` and is
also created in the Multica workspace as the `zmultica` skill.

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
// ~/.config/opencode/opencode.json
{
  "plugins": [
    {
      "package": "/absolute/path/to/yuri-session-board",
      // optional; all three default to a per-user directory
      "options": {
        "dataDir": "~/.local/share/zmultica",
        "dbPath": "~/.local/share/zmultica/board.db",
        "artifactRoot": "~/.local/share/zmultica/artifacts",
      },
    },
  ],
}
```

```bash
npm install
npm run build
```

Yuri reloads plugins on config change. Open the board with:

- the **看板** titlebar button,
- **Command palette → 打开会话看板** (`Command+M` on macOS, `Ctrl+M` elsewhere), or
- the URL `/plugins/yuri-session-board/board`.

For development:

```bash
npm run dev   # vite build --watch; Yuri reloads the GUI on every rebuild
npm run check # typecheck + unit tests + build
```

## Where the data lives

Task data lives in an embedded SQLite database, not in OpenCode's own database.
The default location is per user and portable across machines:

```text
$ZMULTICA_DATA_DIR/board.db                  # if the env var is set
$XDG_DATA_HOME/zmultica/board.db             # otherwise
~/.local/share/zmultica/board.db             # fallback
```

Task output documents are mirrored next to it under
`<dataDir>/artifacts/<taskId>/output.md`.

All three locations can be overridden in the plugin entry:

```jsonc
{
  "package": "/absolute/path/to/yuri-session-board",
  "options": {
    "dataDir": "/custom/zmultica",
    "dbPath": "/custom/zmultica/board.db",
    "artifactRoot": "/custom/zmultica-artifacts",
  },
}
```

Plugin options and `ZMULTICA_DATA_DIR` are local configuration. The SQLite file
itself is not synchronized between machines; sharing a board across hosts still
requires the multi-host support discussed in the design notes.

The status catalog lives in the `status` table; tasks reference status names
with `ON UPDATE CASCADE`, so renaming a status is a single-row write. Deleting a
status reassigns its tasks to the discard status in one transaction.

## Code map

| File           | Responsibility                                                |
| -------------- | ------------------------------------------------------------- |
| `src/model.ts` | Pure task model, metadata parsing, filtering, sorting, colors |
| `src/data.ts`  | Session/agent/project calls and Host metadata writes          |
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
- Manual ordering uses fractional ranks. A gap exhausted by float precision
  falls back to the nearest representable position; rebalancing a whole column
  is intentionally not part of v1.
- Yuri can refresh session titles from the first message. If that renames a
  task, the board follows the session. Disable **Settings → Chat → session title
  refresh** if you want hand-written task titles to stay untouched.
- Narrow screens use a responsive board: status columns are 84% of the viewport
  and snap horizontally, the toolbar scrolls sideways, the table view is hidden,
  and task details take the full screen. The right-side work-status panel wraps
  its header on narrow widths.
- Each column renders 40 cards at a time with **再显示** / **Show more**, and a
  page-level error boundary catches render failures, so a large history does not
  create thousands of DOM nodes at once.

## Roadmap

- Server part + RPC so agents can query/create tasks (`board.query`,
  `board.create`) without the GUI.
- Saved views and per-project boards.
- Swimlanes.
- Optional auto-transition on execution start/finish (deliberately absent today).
