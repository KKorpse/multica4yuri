import type { AgentInfo } from "@opencode/client";
import {
  For,
  Index,
  Show,
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
  onMount,
} from "solid-js";
import { createStore } from "solid-js/store";
import type { Board, Column } from "./board";
import type { T } from "./i18n";
import {
  basename,
  labelColor,
  relativeTime,
  statusColor,
  uniqueLabels,
  type ArchiveFilter,
  type Grouping,
  type Sort,
  type Task,
} from "./model";

type DropTarget = { column: string; index: number };

function cost(value: number): string {
  return value > 0 ? `$${value.toFixed(value < 0.01 ? 4 : 2)}` : "$0";
}

function summary(t: T, total: number, shown: number, running: number): string {
  return t("board.summary", { total, shown, running });
}

export function BoardPage(props: { board: Board; t: T }) {
  const board = props.board;
  const t = props.t;
  const [dragging, setDragging] = createSignal<string>();
  const [drop, setDrop] = createSignal<DropTarget>();
  let draggedAt = 0;

  onMount(() => board.activate());
  onCleanup(() => board.deactivate());

  const labelChips = createMemo(() => {
    const list = board.labelCounts().slice(0, 14);
    for (const label of board.view.filters.labels) {
      if (!list.some((entry) => entry.name === label)) list.push({ name: label, count: 0 });
    }
    return list;
  });

  function columnElement(key: string): HTMLElement | undefined {
    return [...document.querySelectorAll<HTMLElement>("[data-ysb-column]")].find(
      (element) => element.dataset.ysbColumn === key,
    );
  }

  function cardsIn(key: string): HTMLElement[] {
    const column = columnElement(key);
    if (!column) return [];
    return [...column.querySelectorAll<HTMLElement>("[data-ysb-card]")].filter(
      (element) => element.dataset.ysbCard !== dragging(),
    );
  }

  function onDragOver(key: string, event: DragEvent) {
    if (!dragging()) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    const cards = cardsIn(key);
    let index = cards.length;
    for (let cursor = 0; cursor < cards.length; cursor += 1) {
      const rect = cards[cursor].getBoundingClientRect();
      if (event.clientY < rect.top + rect.height / 2) {
        index = cursor;
        break;
      }
    }
    const current = drop();
    if (!current || current.column !== key || current.index !== index) {
      setDrop({ column: key, index });
    }
  }

  async function onDropCard(key: string) {
    const id = dragging();
    const target = drop();
    setDragging(undefined);
    setDrop(undefined);
    if (!id || !target || target.column !== key) return;
    try {
      await board.move(id, key, target.index);
    } catch (caught) {
      board.fail(caught, "error.move");
    }
  }

  function startDrag(id: string) {
    draggedAt = Date.now();
    setDragging(id);
  }

  function endDrag() {
    setDragging(undefined);
    setDrop(undefined);
  }

  function edit(id: string) {
    if (Date.now() - draggedAt < 250) return;
    board.edit(id);
  }

  function chat(id: string) {
    if (Date.now() - draggedAt < 250) return;
    board.open(id);
  }

  return (
    <div class="ysb-root" data-ysb-page>
      <header class="ysb-header">
        <div class="ysb-headrow">
          <div>
            <h1 class="ysb-title">{t("page.title")}</h1>
            <p class="ysb-sub">
              {summary(t, board.total(), board.visible().length, board.runningCount())}
            </p>
          </div>
          <div class="ysb-actions">
            <input
              class="ysb-input ysb-search"
              type="search"
              value={board.view.filters.search}
              placeholder={t("search.placeholder")}
              aria-label={t("search.placeholder")}
              onInput={(event) => board.setFilters({ search: event.currentTarget.value })}
            />
            <button class="ysb-btn primary" type="button" onClick={() => board.requestCreate()}>
              + {t("action.create")}
            </button>
            <button
              class="ysb-icon-btn"
              type="button"
              title={t("action.refresh")}
              aria-label={t("action.refresh")}
              onClick={() => void board.reload()}
            >
              ⟳
            </button>
          </div>
        </div>

        <div class="ysb-filters">
          <label class="ysb-field">
            {t("filter.group")}
            <select
              class="ysb-select"
              value={board.view.grouping}
              onChange={(event) => board.setGrouping(event.currentTarget.value as Grouping)}
            >
              <option value="status">{t("group.status")}</option>
              <option value="agent">{t("group.agent")}</option>
              <option value="directory">{t("group.directory")}</option>
            </select>
          </label>
          <label class="ysb-field">
            {t("filter.sort")}
            <select
              class="ysb-select"
              value={board.view.sort}
              onChange={(event) => board.setSort(event.currentTarget.value as Sort)}
            >
              <option value="manual">{t("sort.manual")}</option>
              <option value="updated">{t("sort.updated")}</option>
              <option value="created">{t("sort.created")}</option>
              <option value="title">{t("sort.title")}</option>
            </select>
          </label>
          <label class="ysb-field">
            {t("filter.archive")}
            <select
              class="ysb-select"
              value={board.view.filters.archive}
              onChange={(event) => board.setArchive(event.currentTarget.value as ArchiveFilter)}
            >
              <option value="active">{t("archive.active")}</option>
              <option value="all">{t("archive.all")}</option>
              <option value="archived">{t("archive.archived")}</option>
            </select>
          </label>
          <label class="ysb-field">
            {t("filter.agent")}
            <select
              class="ysb-select"
              value={board.view.filters.agents[0] ?? ""}
              onChange={(event) => board.setAgentFilter(event.currentTarget.value)}
            >
              <option value="">{t("filter.allAgents")}</option>
              <For each={board.agentOptions()}>
                {(agent) => <option value={agent}>{agent}</option>}
              </For>
            </select>
          </label>
          <label class="ysb-field">
            {t("filter.directory")}
            <select
              class="ysb-select"
              value={board.view.filters.directories[0] ?? ""}
              onChange={(event) => board.setDirectoryFilter(event.currentTarget.value)}
            >
              <option value="">{t("filter.allDirectories")}</option>
              <For each={board.directoryOptions()}>
                {(directory) => <option value={directory.path}>{directory.label}</option>}
              </For>
            </select>
          </label>
          <label class="ysb-check">
            <input
              type="checkbox"
              checked={board.view.filters.runningOnly}
              onChange={(event) => board.setFilters({ runningOnly: event.currentTarget.checked })}
            />
            {t("filter.running")}
          </label>
          <label class="ysb-check">
            <input
              type="checkbox"
              checked={board.view.filters.plannedOnly}
              onChange={(event) => board.setFilters({ plannedOnly: event.currentTarget.checked })}
            />
            {t("filter.planned")}
          </label>
          <label class="ysb-check">
            <input
              type="checkbox"
              checked={board.view.filters.showChildren}
              onChange={(event) => board.setFilters({ showChildren: event.currentTarget.checked })}
            />
            {t("filter.children")}
          </label>
          <button class="ysb-btn ghost small" type="button" onClick={() => board.resetFilters()}>
            {t("filter.reset")}
          </button>
        </div>

        <div class="ysb-chiprow">
          <span class="ysb-chiprow-label">{t("filter.statuses")}</span>
          <button
            class="ysb-chip"
            classList={{ "is-on": board.view.filters.statuses.length === 0 }}
            type="button"
            onClick={() => board.setFilters({ statuses: [] })}
          >
            {t("filter.all")}
          </button>
          <For each={board.statuses()}>
            {(status) => (
              <button
                class="ysb-chip"
                classList={{ "is-on": board.view.filters.statuses.includes(status) }}
                style={`--ysb-chip:${statusColor(status)}`}
                type="button"
                onClick={() => board.toggleStatus(status)}
              >
                <span class="ysb-chip-dot" />
                {status}
                <span class="ysb-chip-count">{board.statusCounts().get(status) ?? 0}</span>
              </button>
            )}
          </For>
        </div>

        <Show when={labelChips().length > 0}>
          <div class="ysb-chiprow">
            <span class="ysb-chiprow-label">{t("filter.labels")}</span>
            <For each={labelChips()}>
              {(label) => (
                <button
                  class="ysb-chip"
                  classList={{ "is-on": board.view.filters.labels.includes(label.name) }}
                  style={`--ysb-chip:${labelColor(label.name)}`}
                  type="button"
                  onClick={() => board.toggleLabel(label.name)}
                >
                  <span class="ysb-chip-dot" />
                  {label.name}
                  <span class="ysb-chip-count">{label.count}</span>
                </button>
              )}
            </For>
          </div>
        </Show>
      </header>

      <main class="ysb-board">
        <Show when={board.loading() && board.total() === 0}>
          <div class="ysb-loading">{t("board.loading")}</div>
        </Show>
        <Show when={board.error()}>
          <div class="ysb-error-box">
            <strong>{t("board.error")}</strong>
            <span>{board.error()}</span>
            <div>
              <button class="ysb-btn small" type="button" onClick={() => void board.reload()}>
                {t("board.retry")}
              </button>
            </div>
          </div>
        </Show>
        <Show when={!board.loading() && board.visible().length === 0 && !board.error()}>
          <div class="ysb-loading">
            <div>{t("board.empty")}</div>
            <p class="ysb-hint">{t("board.emptyHint")}</p>
          </div>
        </Show>
        <Index each={board.columns()}>
          {(column) => (
            <section
              class="ysb-col"
              classList={{ "is-over": drop()?.column === column().key }}
              data-ysb-column={column().key}
              onDragOver={(event) => onDragOver(column().key, event)}
              onDragLeave={(event) => {
                if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node)) {
                  const current = drop();
                  if (current?.column === column().key) setDrop(undefined);
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                void onDropCard(column().key);
              }}
            >
              <div class="ysb-col-head">
                <span
                  class="ysb-dot"
                  style={{ background: column().color }}
                  aria-hidden="true"
                />
                <span class="ysb-col-title">
                  {board.view.grouping === "directory"
                    ? basename(column().key)
                    : column().key}
                </span>
                <span class="ysb-col-count">{column().tasks.length}</span>
                <button
                  class="ysb-icon-btn"
                  type="button"
                  title={t("action.create")}
                  aria-label={t("action.create")}
                  onClick={() =>
                    board.requestCreate(board.view.grouping === "status" ? column().key : "")
                  }
                >
                  +
                </button>
              </div>
              <div class="ysb-col-body">
                <Index each={column().tasks}>
                  {(task, index) => (
                    <>
                      <Show when={insertionIndex(column(), dragging(), drop()) === index}>
                        <div class="ysb-insert" />
                      </Show>
                      <Card
                        task={task()}
                        t={t}
                        canDrag={board.view.grouping === "status"}
                        dragging={dragging() === task().id}
                        onEdit={edit}
                        onChat={chat}
                        onDragStart={startDrag}
                        onDragEnd={endDrag}
                      />
                    </>
                  )}
                </Index>
                <Show
                  when={
                    insertionIndex(column(), dragging(), drop()) === column().tasks.length
                  }
                >
                  <div class="ysb-insert" />
                </Show>
                <Show when={column().tasks.length === 0}>
                  <div class="ysb-col-empty">
                    {dragging() ? t("column.drop") : t("column.empty")}
                  </div>
                </Show>
              </div>
            </section>
          )}
        </Index>
      </main>

      <Show when={board.createOpen()}>
        <CreateDialog board={board} t={t} onClose={() => board.closeCreate()} />
      </Show>
      <Show when={board.editingId()}>
        {(id) => <EditDialog board={board} t={t} id={id()} onClose={() => board.closeEdit()} />}
      </Show>
    </div>
  );
}

function insertionIndex(column: Column, dragging: string | undefined, drop: DropTarget | undefined): number {
  if (!drop || drop.column !== column.key) return -1;
  const index = column.tasks.findIndex((task) => task.id === dragging);
  return index !== -1 && index < drop.index ? drop.index + 1 : drop.index;
}

function Card(props: {
  task: Task;
  t: T;
  canDrag: boolean;
  dragging: boolean;
  onEdit(id: string): void;
  onChat(id: string): void;
  onDragStart(id: string): void;
  onDragEnd(): void;
}) {
  return (
    <article
      class="ysb-card"
      classList={{ "is-dragging": props.dragging }}
      data-ysb-card={props.task.id}
      draggable={props.canDrag}
      title={props.t("card.chatHint")}
      tabindex="0"
      onDragStart={(event) => {
        if (!props.canDrag) {
          event.preventDefault();
          return;
        }
        event.dataTransfer?.setData("text/plain", props.task.id);
        if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
        props.onDragStart(props.task.id);
      }}
      onDragEnd={() => props.onDragEnd()}
      onClick={() => props.onEdit(props.task.id)}
      onDblClick={() => props.onChat(props.task.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter") props.onEdit(props.task.id);
      }}
    >
      <div class="ysb-card-top">
        <span class="ysb-dot" style={{ background: statusColor(props.task.status) }} />
        <span class="ysb-card-title">{props.task.title}</span>
        <Show when={props.task.running}>
          <span class="ysb-run-dot" title={props.t("card.running")} />
        </Show>
      </div>
      <Show when={props.task.description}>
        <p class="ysb-desc">{props.task.description}</p>
      </Show>
      <Show when={props.task.labels.length > 0}>
        <div class="ysb-card-labels">
          <For each={props.task.labels.slice(0, 4)}>
            {(label) => (
              <span class="ysb-label" style={`--ysb-label:${labelColor(label)}`}>
                {label}
              </span>
            )}
          </For>
          <Show when={props.task.labels.length > 4}>
            <span class="ysb-label" style="--ysb-label:var(--ysb-muted)">
              +{props.task.labels.length - 4}
            </span>
          </Show>
        </div>
      </Show>
      <div class="ysb-card-foot">
        <span class="ysb-agent" title={props.task.agent}>
          <span
            class="ysb-agent-dot"
            style={`--ysb-agent:${labelColor(props.task.agent)}`}
          />
          <span class="ysb-agent-name">{props.task.agent}</span>
        </span>
        <span class="ysb-dir">{basename(props.task.directory)}</span>
        <span class="ysb-time">{relativeTime(props.task.updated)}</span>
      </div>
      <Show when={!props.task.planned}>
        <span class="ysb-unplanned">{props.t("card.unplanned")}</span>
      </Show>
    </article>
  );
}

function TagEditor(props: {
  value: string[];
  suggestions: Array<{ name: string; count: number }>;
  placeholder: string;
  t: T;
  onChange(next: string[]): void;
}) {
  const [draft, setDraft] = createSignal("");
  const freeSuggestions = createMemo(() =>
    props.suggestions.filter((entry) => !props.value.includes(entry.name)).slice(0, 6),
  );

  function add(raw: string) {
    const value = raw.trim();
    if (!value) return;
    props.onChange(uniqueLabels([...props.value, value]));
    setDraft("");
  }

  return (
    <div class="ysb-tags">
      <For each={props.value}>
        {(label) => (
          <span class="ysb-tag" style={`--ysb-label:${labelColor(label)}`}>
            {label}
            <button
              type="button"
              title={props.t("label.remove")}
              aria-label={props.t("label.remove")}
              onClick={() => props.onChange(props.value.filter((item) => item !== label))}
            >
              ×
            </button>
          </span>
        )}
      </For>
      <input
        class="ysb-input ysb-tag-input"
        value={draft()}
        placeholder={props.placeholder}
        onInput={(event) => setDraft(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            add(draft());
          }
        }}
      />
      <Show when={freeSuggestions().length > 0}>
        <div class="ysb-suggestions">
          <For each={freeSuggestions()}>
            {(entry) => (
              <button class="ysb-suggestion" type="button" onClick={() => add(entry.name)}>
                {entry.name}
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}

function useDialogKeys(close: () => void, submit: () => void) {
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      submit();
    }
  };
  onMount(() => window.addEventListener("keydown", onKeyDown));
  onCleanup(() => window.removeEventListener("keydown", onKeyDown));
}

function CreateDialog(props: { board: Board; t: T; onClose(): void }) {
  const board = props.board;
  const t = props.t;
  const initialDirectory =
    board.currentDirectory() ||
    board.view.lastDirectory ||
    board.directoryOptions()[0]?.path ||
    board.tasks()[0]?.directory ||
    "";
  const [form, setForm] = createStore({
    title: "",
    description: "",
    directory: initialDirectory,
    agent: "",
    status: board.createStatus() || "待规划",
    labels: [] as string[],
    send: true,
  });
  const [agents, setAgents] = createSignal<AgentInfo[]>([]);
  const [busy, setBusy] = createSignal(false);
  const [problem, setProblem] = createSignal("");
  let agentRequest = 0;

  createEffect(
    on(
      () => form.directory,
      (directory) => {
        const request = ++agentRequest;
        if (!directory.trim()) {
          setAgents([]);
          return;
        }
        void board.loadAgents(directory).then((list) => {
          if (request !== agentRequest) return;
          setAgents(list);
          if (form.agent && !list.some((agent) => agent.id === form.agent)) setForm("agent", "");
        });
      },
    ),
  );

  async function submit() {
    if (busy()) return;
    if (!form.title.trim() || !form.description.trim()) {
      setProblem(t("create.required"));
      return;
    }
    if (!form.directory.trim()) {
      setProblem(t("error.directory"));
      return;
    }
    setProblem("");
    setBusy(true);
    try {
      const result = await board.create({
        title: form.title,
        description: form.description,
        directory: form.directory.trim(),
        agent: form.agent,
        status: form.send && form.status === "待规划" ? "执行中" : form.status,
        labels: form.labels,
        send: form.send,
      });
      props.onClose();
      board.notice("toast.created", "success");
      if (result.sendError) board.fail(result.sendError, "error.send");
      if (form.send) board.open(result.id);
    } catch (caught) {
      board.fail(caught, "error.create");
    } finally {
      setBusy(false);
    }
  }

  useDialogKeys(props.onClose, () => void submit());

  return (
    <div
      class="ysb-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) props.onClose();
      }}
    >
      <div class="ysb-modal" role="dialog" aria-modal="true" aria-label={t("create.title")}>
        <div class="ysb-modal-head">
          <div>
            <h2 class="ysb-modal-title">{t("create.title")}</h2>
            <p class="ysb-modal-sub">{t("create.hint")}</p>
          </div>
          <button
            class="ysb-icon-btn"
            type="button"
            title={t("action.close")}
            aria-label={t("action.close")}
            onClick={props.onClose}
          >
            ×
          </button>
        </div>

        <div class="ysb-form">
          <label class="ysb-form-item">
            <span>{t("field.title")}</span>
            <input
              class="ysb-input"
              value={form.title}
              autofocus
              placeholder={t("field.titlePlaceholder")}
              onInput={(event) => setForm("title", event.currentTarget.value)}
            />
          </label>

          <label class="ysb-form-item">
            <span>{t("field.description")}</span>
            <textarea
              class="ysb-textarea"
              value={form.description}
              placeholder={t("field.descriptionPlaceholder")}
              onInput={(event) => setForm("description", event.currentTarget.value)}
            />
          </label>

          <div class="ysb-form-row">
            <label class="ysb-form-item">
              <span>{t("field.directory")}</span>
              <input
                class="ysb-input"
                list="ysb-directories"
                value={form.directory}
                placeholder={t("field.directoryPlaceholder")}
                onInput={(event) => setForm("directory", event.currentTarget.value)}
              />
              <datalist id="ysb-directories">
                <For each={board.directoryOptions()}>
                  {(directory) => <option value={directory.path}>{directory.label}</option>}
                </For>
              </datalist>
            </label>
            <label class="ysb-form-item">
              <span>{t("field.agent")}</span>
              <select
                class="ysb-select"
                value={form.agent}
                onChange={(event) => setForm("agent", event.currentTarget.value)}
              >
                <option value="">{t("field.agentDefault")}</option>
                <For each={agents()}>
                  {(agent) => <option value={agent.id}>{agent.name || agent.id}</option>}
                </For>
              </select>
            </label>
          </div>

          <div class="ysb-form-row">
            <label class="ysb-form-item">
              <span>{t("field.status")}</span>
              <select
                class="ysb-select"
                value={form.status}
                onChange={(event) => setForm("status", event.currentTarget.value)}
              >
                <For each={board.statuses()}>
                  {(status) => <option value={status}>{status}</option>}
                </For>
              </select>
            </label>
            <label class="ysb-check" style="align-self:end;padding-bottom:7px">
              <input
                type="checkbox"
                checked={form.send}
                onChange={(event) => setForm("send", event.currentTarget.checked)}
              />
              {t("create.send")}
            </label>
          </div>

          <div class="ysb-form-item">
            <span>{t("field.labels")}</span>
            <TagEditor
              value={form.labels}
              suggestions={board.labelCounts()}
              placeholder={t("field.labelsPlaceholder")}
              t={t}
              onChange={(next) => setForm("labels", next)}
            />
          </div>

          <p class="ysb-hint">{form.send ? t("create.sendHint") : t("create.hint")}</p>
          <Show when={problem()}>
            <p class="ysb-error">{problem()}</p>
          </Show>
        </div>

        <div class="ysb-modal-foot">
          <div class="ysb-foot-right">
            <button class="ysb-btn" type="button" onClick={props.onClose}>
              {t("action.cancel")}
            </button>
            <button
              class="ysb-btn primary"
              type="button"
              disabled={busy()}
              onClick={() => void submit()}
            >
              {busy() ? "…" : t("create.submit")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditDialog(props: { board: Board; t: T; id: string; onClose(): void }) {
  const board = props.board;
  const t = props.t;
  const current = board.task(props.id);
  const [form, setForm] = createStore({
    title: current?.title ?? "",
    description: current?.description ?? "",
    status: current?.status ?? "待规划",
    labels: current?.labels ?? [],
  });
  const [busy, setBusy] = createSignal(false);
  const task = () => board.task(props.id);

  async function submit() {
    if (busy() || !task()) return;
    setBusy(true);
    try {
      await board.save(props.id, { ...form });
      board.notice("toast.saved", "success");
      props.onClose();
    } catch (caught) {
      board.fail(caught, "error.save");
    } finally {
      setBusy(false);
    }
  }

  async function toggleArchive() {
    const value = task();
    if (!value || busy()) return;
    const next = !value.archived;
    setBusy(true);
    try {
      await board.archive(props.id, next);
      board.notice(next ? "toast.archived" : "toast.unarchived", "success");
      props.onClose();
    } catch (caught) {
      board.fail(caught, "error.archive");
    } finally {
      setBusy(false);
    }
  }

  useDialogKeys(props.onClose, () => void submit());

  return (
    <div
      class="ysb-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) props.onClose();
      }}
    >
      <div
        class="ysb-modal wide"
        role="dialog"
        aria-modal="true"
        aria-label={t("edit.title")}
      >
        <div class="ysb-modal-head">
          <div>
            <h2 class="ysb-modal-title">{t("edit.title")}</h2>
            <p class="ysb-modal-sub">{t("edit.hint")}</p>
          </div>
          <button
            class="ysb-icon-btn"
            type="button"
            title={t("action.close")}
            aria-label={t("action.close")}
            onClick={props.onClose}
          >
            ×
          </button>
        </div>

        <Show when={task()} fallback={<p class="ysb-hint">{t("board.empty")}</p>}>
          <div class="ysb-form">
            <label class="ysb-form-item">
              <span>{t("field.title")}</span>
              <input
                class="ysb-input"
                value={form.title}
                onInput={(event) => setForm("title", event.currentTarget.value)}
              />
            </label>

            <label class="ysb-form-item">
              <span>{t("field.description")}</span>
              <textarea
                class="ysb-textarea"
                value={form.description}
                placeholder={t("field.descriptionPlaceholder")}
                onInput={(event) => setForm("description", event.currentTarget.value)}
              />
            </label>

            <div class="ysb-form-row">
              <label class="ysb-form-item">
                <span>{t("field.status")}</span>
                <select
                  class="ysb-select"
                  value={form.status}
                  onChange={(event) => setForm("status", event.currentTarget.value)}
                >
                  <For each={board.statuses()}>
                    {(status) => <option value={status}>{status}</option>}
                  </For>
                </select>
              </label>
              <div class="ysb-form-item">
                <span>{t("field.agent")}</span>
                <div class="ysb-tags">
                  <span
                    class="ysb-tag"
                    style={`--ysb-label:${labelColor(task()!.agent)}`}
                  >
                    {task()!.agent}
                  </span>
                </div>
                <p class="ysb-hint">{t("edit.agentHint")}</p>
              </div>
            </div>

            <div class="ysb-form-item">
              <span>{t("field.labels")}</span>
              <TagEditor
                value={form.labels}
                suggestions={board.labelCounts()}
                placeholder={t("field.labelsPlaceholder")}
                t={t}
                onChange={(next) => setForm("labels", next)}
              />
            </div>

            <div class="ysb-meta">
              <span>
                {t("edit.meta")}: <span class="ysb-mono">{task()!.id}</span>
              </span>
              <span>{basename(task()!.directory)}</span>
              <span>{t("edit.updated", { time: relativeTime(task()!.updated) })}</span>
              <span>{t("edit.cost", { cost: cost(task()!.cost) })}</span>
              <Show when={!task()!.planned}>
                <span>{t("edit.unplanned")}</span>
              </Show>
            </div>
          </div>
        </Show>

        <div class="ysb-modal-foot">
          <button
            class="ysb-btn small"
            classList={{ danger: !task()?.archived }}
            type="button"
            disabled={busy() || !task()}
            onClick={() => void toggleArchive()}
          >
            {task()?.archived ? t("action.unarchive") : t("action.archive")}
          </button>
          <div class="ysb-foot-right">
            <button
              class="ysb-btn ghost"
              type="button"
              disabled={!task()}
              onClick={() => {
                props.onClose();
                board.open(props.id);
              }}
            >
              {t("action.chat")}
            </button>
            <button class="ysb-btn" type="button" onClick={props.onClose}>
              {t("action.cancel")}
            </button>
            <button
              class="ysb-btn primary"
              type="button"
              disabled={busy() || !task()}
              onClick={() => void submit()}
            >
              {busy() ? "…" : t("action.save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
