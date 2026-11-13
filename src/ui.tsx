import type { AgentInfo } from "@opencode/client";
import {
  ErrorBoundary,
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
import { BUILD, consumeReturnSession, isCoarsePointer, isMobileSurface, openSession } from "./host";
import { TaskDetails } from "./details";
import { TagEditor } from "./tag";
import { StatusIcon } from "./status";
import type { T } from "./i18n";
import {
  basename,
  labelColor,
  relativeTime,
  type ArchiveFilter,
  type Grouping,
  type Sort,
  type Task,
} from "./model";

type DropTarget = { column: string; index: number };

function shortId(id: string): string {
  return id.replace(/^ses_/, "").slice(-6);
}

function summary(t: T, total: number, shown: number, running: number): string {
  return t("board.summary", { total, shown, running });
}

function IconSearch() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="4.2" stroke="currentColor" stroke-width="1.4" />
      <path d="m10.2 10.2 3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 3.2v9.6M3.2 8h9.6"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
      />
    </svg>
  );
}

function IconRefresh() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M12.6 6.5A4.8 4.8 0 1 0 13 9.4M12.6 2.8v3.7H8.9"
        stroke="currentColor"
        stroke-width="1.4"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}

function IconFilter() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2.6 3.4h10.8L9.4 8.2v4.4l-2.8-1.3V8.2L2.6 3.4Z"
        stroke="currentColor"
        stroke-width="1.3"
        stroke-linejoin="round"
      />
    </svg>
  );
}

export function BoardPage(props: { board: Board; t: T }) {
  const board = props.board;
  const t = props.t;
  const [dragging, setDragging] = createSignal<string>();
  const [drop, setDrop] = createSignal<DropTarget>();
  const [filtersOpen, setFiltersOpen] = createSignal(false);
  const [labelsOpen, setLabelsOpen] = createSignal(false);
  const [menu, setMenu] = createSignal<{ id: string; x: number; y: number }>();
  const [narrow, setNarrow] = createSignal(isMobileSurface());
  const [limits, setLimits] = createSignal<Record<string, number>>({});
  const PAGE_SIZE = 40;
  let draggedAt = 0;

  createEffect(() => {
    if (narrow()) board.deactivate();
    else board.activate();
  });
  onMount(() => {
    if (typeof window.matchMedia !== "function") return;
    const width = window.matchMedia("(max-width: 760px)");
    const coarse = window.matchMedia("(pointer: coarse)");
    const update = () => setNarrow(width.matches || coarse.matches);
    update();
    width.addEventListener?.("change", update);
    coarse.addEventListener?.("change", update);
    onCleanup(() => {
      width.removeEventListener?.("change", update);
      coarse.removeEventListener?.("change", update);
    });
  });
  onCleanup(() => board.deactivate());

  onMount(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (board.createOpen()) {
        event.stopPropagation();
        board.closeCreate();
        return;
      }
      if (board.editingId()) {
        event.stopPropagation();
        board.closeEdit();
        return;
      }
      if (labelsOpen()) {
        event.stopPropagation();
        setLabelsOpen(false);
        return;
      }
      const id = consumeReturnSession();
      event.preventDefault();
      if (id) openSession(id);
      else window.history.back();
    };
    document.addEventListener("keydown", onKey);
    onCleanup(() => document.removeEventListener("keydown", onKey));
  });

  const canDrag = () => board.view.grouping === "status" && !isCoarsePointer();

  function limitOf(key: string): number {
    return limits()[key] ?? PAGE_SIZE;
  }

  function shownTasks(column: Column): Task[] {
    return column.tasks.slice(0, limitOf(column.key));
  }

  function showMore(key: string) {
    setLimits((previous) => ({ ...previous, [key]: limitOf(key) + PAGE_SIZE }));
  }

  const labelChips = createMemo(() => {
    const list = board.labelCounts().slice(0, 14);
    for (const label of board.view.filters.labels) {
      if (!list.some((entry) => entry.name === label)) list.push({ name: label, count: 0 });
    }
    return list;
  });

  const activeFilters = createMemo(() => {
    const filters = board.view.filters;
    return (
      filters.statuses.length +
      filters.labels.length +
      filters.agents.length +
      filters.directories.length +
      (filters.runningOnly ? 1 : 0) +
      (filters.plannedOnly ? 1 : 0) +
      (filters.showChildren ? 1 : 0) +
      (filters.archive !== "active" ? 1 : 0)
    );
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
    <Show
      when={!narrow()}
      fallback={
        <div class="ysb-root">
          <div class="ysb-mobile">{t("board.desktopOnly")}</div>
        </div>
      }
    >
      <ErrorBoundary
        fallback={(error, reset) => (
          <div class="ysb-root">
            <div class="ysb-errorbox">
              <strong>{t("board.crashed")}</strong>
              <span>{String(error)}</span>
              <button class="ysb-btn small" type="button" onClick={reset}>
                {t("board.retry")}
              </button>
            </div>
          </div>
        )}
      >
        <div class="ysb-root" data-ysb-page>
          <header class="ysb-header">
            <div class="ysb-headrow">
              <div class="ysb-titlewrap">
                <h1 class="ysb-title">{t("page.title")}</h1>
                <span class="ysb-total">{board.visible().length}</span>
                <span class="ysb-build">v{BUILD}</span>
              </div>
              <div class="ysb-actions">
                <label class="ysb-searchbox">
                  <IconSearch />
                  <input
                    type="search"
                    value={board.view.filters.search}
                    placeholder={t("search.placeholder")}
                    aria-label={t("search.placeholder")}
                    onInput={(event) => board.setFilters({ search: event.currentTarget.value })}
                  />
                </label>
                <button
                  class="ysb-btn"
                  classList={{ "is-active": filtersOpen() }}
                  type="button"
                  onClick={() => setFiltersOpen((open) => !open)}
                >
                  <IconFilter />
                  {t("filter.panel")}
                  <Show when={activeFilters() > 0}>
                    <span class="ysb-badge">{activeFilters()}</span>
                  </Show>
                </button>
                <button class="ysb-btn primary" type="button" onClick={() => board.requestCreate()}>
                  <IconPlus />
                  {t("action.create")}
                </button>
                <button
                  class="ysb-iconbtn"
                  type="button"
                  title={t("action.refresh")}
                  aria-label={t("action.refresh")}
                  onClick={() => void board.reload()}
                >
                  <IconRefresh />
                </button>
              </div>
            </div>

            <div class="ysb-toolbar">
              <label class="ysb-tool">
                {t("filter.group")}
                <select
                  value={board.view.grouping}
                  onChange={(event) => board.setGrouping(event.currentTarget.value as Grouping)}
                >
                  <option value="status">{t("group.status")}</option>
                  <option value="agent">{t("group.agent")}</option>
                  <option value="directory">{t("group.directory")}</option>
                  <option value="label">{t("group.label")}</option>
                </select>
              </label>
              <button class="ysb-btn small" type="button" onClick={() => setLabelsOpen(true)}>
                {t("label.manage")}
              </button>
              <label class="ysb-tool">
                {t("filter.sort")}
                <select
                  value={board.view.sort}
                  onChange={(event) => board.setSort(event.currentTarget.value as Sort)}
                >
                  <option value="manual">{t("sort.manual")}</option>
                  <option value="updated">{t("sort.updated")}</option>
                  <option value="created">{t("sort.created")}</option>
                  <option value="title">{t("sort.title")}</option>
                </select>
              </label>
              <label class="ysb-tool">
                {t("filter.archive")}
                <select
                  value={board.view.filters.archive}
                  onChange={(event) => board.setArchive(event.currentTarget.value as ArchiveFilter)}
                >
                  <option value="active">{t("archive.active")}</option>
                  <option value="all">{t("archive.all")}</option>
                  <option value="archived">{t("archive.archived")}</option>
                </select>
              </label>
              <span class="ysb-toolbar-meta">
                {summary(t, board.total(), board.visible().length, board.runningCount())}
              </span>
            </div>

            <Show when={filtersOpen()}>
              <div class="ysb-filterpanel">
                <div class="ysb-filtergroup">
                  <span class="ysb-filterlabel">{t("filter.statuses")}</span>
                  <div class="ysb-chips">
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
                          type="button"
                          onClick={() => board.toggleStatus(status)}
                        >
                          <StatusIcon status={status} />
                          {status}
                          <span class="ysb-chipcount">{board.statusCounts().get(status) ?? 0}</span>
                        </button>
                      )}
                    </For>
                  </div>
                </div>

                <Show when={labelChips().length > 0}>
                  <div class="ysb-filtergroup">
                    <span class="ysb-filterlabel">{t("filter.labels")}</span>
                    <div class="ysb-chips">
                      <For each={labelChips()}>
                        {(label) => (
                          <button
                            class="ysb-chip"
                            classList={{ "is-on": board.view.filters.labels.includes(label.name) }}
                            type="button"
                            onClick={() => board.toggleLabel(label.name)}
                          >
                            <span
                              class="ysb-chipdot"
                              style={`background:${board.colorOfLabel(label.name)}`}
                            />
                            {label.name}
                            <span class="ysb-chipcount">{label.count}</span>
                          </button>
                        )}
                      </For>
                    </div>
                  </div>
                </Show>

                <div class="ysb-filterrow">
                  <label class="ysb-tool">
                    {t("filter.agent")}
                    <select
                      value={board.view.filters.agents[0] ?? ""}
                      onChange={(event) => board.setAgentFilter(event.currentTarget.value)}
                    >
                      <option value="">{t("filter.allAgents")}</option>
                      <For each={board.agentOptions()}>
                        {(agent) => <option value={agent}>{agent}</option>}
                      </For>
                    </select>
                  </label>
                  <label class="ysb-tool">
                    {t("filter.directory")}
                    <select
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
                      onChange={(event) =>
                        board.setFilters({ runningOnly: event.currentTarget.checked })
                      }
                    />
                    {t("filter.running")}
                  </label>
                  <label class="ysb-check">
                    <input
                      type="checkbox"
                      checked={board.view.filters.plannedOnly}
                      onChange={(event) =>
                        board.setFilters({ plannedOnly: event.currentTarget.checked })
                      }
                    />
                    {t("filter.planned")}
                  </label>
                  <label class="ysb-check">
                    <input
                      type="checkbox"
                      checked={board.view.filters.showChildren}
                      onChange={(event) =>
                        board.setFilters({ showChildren: event.currentTarget.checked })
                      }
                    />
                    {t("filter.children")}
                  </label>
                  <button
                    class="ysb-btn ghost small"
                    type="button"
                    onClick={() => board.resetFilters()}
                  >
                    {t("filter.reset")}
                  </button>
                </div>
              </div>
            </Show>
          </header>

          <main class="ysb-board">
            <Show when={board.loading() && board.total() === 0}>
              <div class="ysb-loading">{t("board.loading")}</div>
            </Show>
            <Show when={board.error()}>
              <div class="ysb-errorbox">
                <strong>{t("board.error")}</strong>
                <span>{board.error()}</span>
                <button class="ysb-btn small" type="button" onClick={() => void board.reload()}>
                  {t("board.retry")}
                </button>
              </div>
            </Show>
            <Show when={!board.loading() && board.visible().length === 0 && !board.error()}>
              <div class="ysb-empty">
                <div>{t("board.empty")}</div>
                <p>{t("board.emptyHint")}</p>
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
                    if (
                      !(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node)
                    ) {
                      const current = drop();
                      if (current?.column === column().key) setDrop(undefined);
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    void onDropCard(column().key);
                  }}
                >
                  <div class="ysb-colhead">
                    <Show
                      when={board.view.grouping === "status"}
                      fallback={
                        <span
                          class="ysb-chipdot"
                          style={`background:${column().color}`}
                          aria-hidden="true"
                        />
                      }
                    >
                      <StatusIcon status={column().key} size={13} />
                    </Show>
                    <span class="ysb-coltitle">
                      {board.view.grouping === "directory" ? basename(column().key) : column().key}
                    </span>
                    <span class="ysb-colcount">{column().tasks.length}</span>
                    <button
                      class="ysb-coladd"
                      type="button"
                      title={t("action.create")}
                      aria-label={t("action.create")}
                      onClick={() =>
                        board.requestCreate(board.view.grouping === "status" ? column().key : "")
                      }
                    >
                      <IconPlus />
                    </button>
                  </div>
                  <div class="ysb-colbody">
                    <Index each={shownTasks(column())}>
                      {(task, index) => (
                        <>
                          <Show
                            when={
                              insertionIndex(
                                shownTasks(column()),
                                column().key,
                                dragging(),
                                drop(),
                              ) === index
                            }
                          >
                            <div class="ysb-insert" />
                          </Show>
                          <Card
                            task={task()}
                            t={t}
                            colorOf={board.colorOfLabel}
                            canDrag={canDrag()}
                            dragging={dragging() === task().id}
                            onEdit={edit}
                            onChat={chat}
                            onContextMenu={(id, x, y) => setMenu({ id, x, y })}
                            onDragStart={startDrag}
                            onDragEnd={endDrag}
                          />
                        </>
                      )}
                    </Index>
                    <Show
                      when={
                        insertionIndex(shownTasks(column()), column().key, dragging(), drop()) ===
                        shownTasks(column()).length
                      }
                    >
                      <div class="ysb-insert" />
                    </Show>
                    <Show when={shownTasks(column()).length === 0}>
                      <div class="ysb-colempty">
                        {dragging() ? t("column.drop") : t("column.empty")}
                      </div>
                    </Show>
                    <Show when={column().tasks.length > shownTasks(column()).length}>
                      <button
                        class="ysb-loadmore"
                        type="button"
                        onClick={() => showMore(column().key)}
                      >
                        {t("column.more", {
                          count: Math.min(
                            PAGE_SIZE,
                            column().tasks.length - shownTasks(column()).length,
                          ),
                        })}
                      </button>
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
          <Show when={labelsOpen()}>
            <LabelDialog board={board} t={t} onClose={() => setLabelsOpen(false)} />
          </Show>

          <Show when={menu()}>
            {(menu) => {
              const task = () => board.task(menu().id);
              return (
                <>
                  <div
                    class="ysb-menu-backdrop"
                    onMouseDown={() => setMenu(undefined)}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      setMenu(undefined);
                    }}
                  />
                  <div
                    class="ysb-menu"
                    role="menu"
                    style={{
                      left: `${Math.min(menu().x, window.innerWidth - 168)}px`,
                      top: `${Math.min(menu().y, window.innerHeight - 196)}px`,
                    }}
                  >
                    <Show when={task()}>
                      {(task) => (
                        <>
                          <button
                            class="ysb-menuitem"
                            type="button"
                            onClick={() => {
                              void board.setUrgent(task().id, !task().urgent);
                              setMenu(undefined);
                            }}
                          >
                            {task().urgent ? t("menu.notUrgent") : t("menu.urgent")}
                          </button>
                          <div class="ysb-menusep" />
                          <Show when={task().status !== "已完成"}>
                            <button
                              class="ysb-menuitem"
                              type="button"
                              onClick={() => {
                                void board.move(task().id, "已完成");
                                setMenu(undefined);
                              }}
                            >
                              {t("menu.complete")}
                            </button>
                          </Show>
                          <Show when={task().status !== "废弃"}>
                            <button
                              class="ysb-menuitem danger"
                              type="button"
                              onClick={() => {
                                void board.move(task().id, "废弃");
                                setMenu(undefined);
                              }}
                            >
                              {t("menu.discard")}
                            </button>
                          </Show>
                          <Show when={task().status === "已完成" || task().status === "废弃"}>
                            <button
                              class="ysb-menuitem"
                              type="button"
                              onClick={() => {
                                void board.reopen(task().id);
                                setMenu(undefined);
                              }}
                            >
                              {t("menu.reopen")}
                            </button>
                          </Show>
                          <div class="ysb-menusep" />
                          <button
                            class="ysb-menuitem"
                            type="button"
                            onClick={() => {
                              board.open(task().id);
                              setMenu(undefined);
                            }}
                          >
                            {t("action.chat")}
                          </button>
                        </>
                      )}
                    </Show>
                  </div>
                </>
              );
            }}
          </Show>
        </div>
      </ErrorBoundary>
    </Show>
  );
}

function insertionIndex(
  tasks: readonly Task[],
  key: string,
  dragging: string | undefined,
  drop: DropTarget | undefined,
): number {
  if (!drop || drop.column !== key) return -1;
  const index = tasks.findIndex((task) => task.id === dragging);
  return index !== -1 && index < drop.index ? drop.index + 1 : drop.index;
}

function Card(props: {
  task: Task;
  t: T;
  colorOf: (name: string) => string;
  canDrag: boolean;
  dragging: boolean;
  onEdit(id: string): void;
  onChat(id: string): void;
  onContextMenu(id: string, x: number, y: number): void;
  onDragStart(id: string): void;
  onDragEnd(): void;
}) {
  const initial = () => props.task.agent.trim().charAt(0).toUpperCase() || "A";
  return (
    <article
      class="ysb-card"
      classList={{ "is-dragging": props.dragging, "is-urgent": props.task.urgent }}
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
      onClick={() => props.onChat(props.task.id)}
      onContextMenu={(event) => {
        event.preventDefault();
        props.onContextMenu(props.task.id, event.clientX, event.clientY);
      }}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && event.key === "Enter")
          props.onChat(props.task.id);
      }}
    >
      <div class="ysb-cardtop">
        <span class="ysb-cardid">#{props.task.code ?? shortId(props.task.id)}</span>
        <span class="ysb-cardtopmeta">
          <Show when={props.task.running}>
            <span class="ysb-run" title={props.t("card.running")} />
          </Show>
          <button
            class="ysb-carddetails"
            type="button"
            title={props.t("widget.details")}
            aria-label={props.t("widget.details")}
            draggable={false}
            onDragStart={(event) => event.preventDefault()}
            onClick={(event) => {
              event.stopPropagation();
              props.onEdit(props.task.id);
            }}
          >
            {props.t("widget.details")}
          </button>
        </span>
      </div>
      <p class="ysb-cardtitle">{props.task.title}</p>
      <Show when={props.task.description}>
        <p class="ysb-carddesc">{props.task.description}</p>
      </Show>
      <Show when={props.task.labels.length > 0}>
        <div class="ysb-chips ysb-cardchips">
          <For each={props.task.labels.slice(0, 4)}>
            {(label) => (
              <span class="ysb-label" style={`--ysb-label:${props.colorOf(label)}`}>
                <span class="ysb-chipdot" />
                {label}
              </span>
            )}
          </For>
          <Show when={props.task.labels.length > 4}>
            <span class="ysb-label ysb-label-more">+{props.task.labels.length - 4}</span>
          </Show>
        </div>
      </Show>
      <div class="ysb-cardmeta">
        <span class="ysb-agent" title={props.task.agent}>
          <span class="ysb-avatar" style={`--ysb-avatar:${labelColor(props.task.agent)}`}>
            {initial()}
          </span>
          <span class="ysb-agentname">{props.task.agent}</span>
        </span>
        <span class="ysb-metadir">{basename(props.task.directory)}</span>
        <span class="ysb-time">{relativeTime(props.task.updated)}</span>
      </div>
    </article>
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
    status: board.createStatus() || "待分配",
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
        status: "待分配",
        labels: form.labels,
        send: form.send,
      });
      if (result.sendError) board.fail(result.sendError, "error.send");
      board.notice("toast.created", "success");
      if (form.send) board.open(result.id);
      props.onClose();
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
        <div class="ysb-modalhead">
          <div>
            <h2 class="ysb-modaltitle">{t("create.title")}</h2>
            <p class="ysb-modalsub">{t("create.hint")}</p>
          </div>
          <button
            class="ysb-iconbtn"
            type="button"
            title={t("action.close")}
            aria-label={t("action.close")}
            onClick={props.onClose}
          >
            ×
          </button>
        </div>

        <div class="ysb-form">
          <label class="ysb-formitem">
            <span>{t("field.title")}</span>
            <input
              class="ysb-input"
              value={form.title}
              autofocus
              placeholder={t("field.titlePlaceholder")}
              onInput={(event) => setForm("title", event.currentTarget.value)}
            />
          </label>

          <label class="ysb-formitem">
            <span>{t("field.description")}</span>
            <textarea
              class="ysb-textarea"
              value={form.description}
              placeholder={t("field.descriptionPlaceholder")}
              onInput={(event) => setForm("description", event.currentTarget.value)}
            />
          </label>

          <div class="ysb-formrow">
            <label class="ysb-formitem">
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
            <label class="ysb-formitem">
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

          <div class="ysb-formrow">
            <label class="ysb-formitem">
              <span>{t("field.status")}</span>
              <select class="ysb-select" value="待分配" disabled>
                <option value="待分配">待分配</option>
              </select>
            </label>
            <label class="ysb-check ysb-sendcheck">
              <input
                type="checkbox"
                checked={form.send}
                onChange={(event) => setForm("send", event.currentTarget.checked)}
              />
              {t("create.send")}
            </label>
          </div>

          <div class="ysb-formitem">
            <span>{t("field.labels")}</span>
            <TagEditor
              value={form.labels}
              suggestions={board.labelOptions()}
              placeholder={t("field.labelsPlaceholder")}
              t={t}
              colorOf={board.colorOfLabel}
              onChange={(next) => setForm("labels", next)}
            />
          </div>

          <p class="ysb-hint">{form.send ? t("create.sendHint") : t("create.hint")}</p>
          <Show when={problem()}>
            <p class="ysb-error">{problem()}</p>
          </Show>
        </div>

        <div class="ysb-modalfoot">
          <div class="ysb-footright">
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

function LabelDialog(props: { board: Board; t: T; onClose(): void }) {
  const t = props.t;
  const [name, setName] = createSignal("");
  const [editingId, setEditingId] = createSignal<string>();
  const [deletingId, setDeletingId] = createSignal<string>();
  const [draft, setDraft] = createSignal("");
  const [busy, setBusy] = createSignal(false);
  const [problem, setProblem] = createSignal("");

  const labels = () => props.board.labels();

  async function run(action: () => Promise<void>) {
    if (busy()) return;
    setProblem("");
    setBusy(true);
    try {
      await action();
    } catch (caught) {
      setProblem(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }

  function create() {
    const value = name().trim();
    if (!value) return;
    void run(async () => {
      await props.board.createLabel(value);
      setName("");
    });
  }

  function startRename(id: string, value: string) {
    setDeletingId(undefined);
    setEditingId(id);
    setDraft(value);
  }

  function commitRename(id: string, current: string) {
    const value = draft().trim();
    if (!value || value === current) {
      setEditingId(undefined);
      return;
    }
    void run(async () => {
      await props.board.renameLabel(id, value);
      setEditingId(undefined);
    });
  }

  function remove(id: string) {
    void run(async () => {
      await props.board.deleteLabel(id);
      setDeletingId(undefined);
    });
  }

  useDialogKeys(props.onClose, create);

  return (
    <div
      class="ysb-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) props.onClose();
      }}
    >
      <div
        class="ysb-modal ysb-labelmodal"
        role="dialog"
        aria-modal="true"
        aria-label={t("label.title")}
      >
        <div class="ysb-modalhead">
          <div>
            <h2 class="ysb-modaltitle">{t("label.title")}</h2>
            <p class="ysb-modalsub">{t("label.hint")}</p>
          </div>
          <button
            class="ysb-iconbtn"
            type="button"
            title={t("action.close")}
            aria-label={t("action.close")}
            onClick={props.onClose}
          >
            ×
          </button>
        </div>

        <div class="ysb-form">
          <div class="ysb-labelcomposer">
            <span class="ysb-labeladdicon" aria-hidden="true">
              +
            </span>
            <input
              class="ysb-input"
              value={name()}
              ref={(element) => element.focus()}
              placeholder={t("label.placeholder")}
              onInput={(event) => setName(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  create();
                }
              }}
            />
            <button
              class="ysb-btn primary"
              type="button"
              disabled={busy() || !name().trim()}
              onClick={create}
            >
              {t("label.add")}
            </button>
          </div>
          <p class="ysb-hint ysb-labelcreatehint">{t("label.createHint")}</p>

          <div class="ysb-labellisthead">
            <span>{t("label.all")}</span>
            <span>{t("label.total", { count: labels().length })}</span>
          </div>

          <Show
            when={labels().length > 0}
            fallback={<div class="ysb-labelempty">{t("label.empty")}</div>}
          >
            <div class="ysb-labellist">
              <For each={labels()}>
                {(label) => (
                  <div
                    class="ysb-labelrow"
                    classList={{
                      "is-editing": editingId() === label.id,
                      "is-confirming": deletingId() === label.id,
                    }}
                  >
                    <span
                      class="ysb-labeldot"
                      style={`--ysb-label:${label.color}; background:${label.color}`}
                      aria-hidden="true"
                    />
                    <Show
                      when={editingId() === label.id}
                      fallback={
                        <div class="ysb-labelmain">
                          <span class="ysb-labelname">{label.name}</span>
                          <span class="ysb-labelmeta">
                            {t("label.taskCount", { count: label.count })}
                          </span>
                        </div>
                      }
                    >
                      <input
                        class="ysb-input ysb-labelrename"
                        value={draft()}
                        ref={(element) => {
                          element.focus();
                          element.select();
                        }}
                        onInput={(event) => setDraft(event.currentTarget.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            commitRename(label.id, label.name);
                          } else if (event.key === "Escape") {
                            event.preventDefault();
                            event.stopPropagation();
                            setEditingId(undefined);
                          }
                        }}
                      />
                    </Show>
                    <div class="ysb-labelactions">
                      <Show
                        when={editingId() === label.id}
                        fallback={
                          <Show
                            when={deletingId() === label.id}
                            fallback={
                              <>
                                <button
                                  class="ysb-btn small ghost"
                                  type="button"
                                  disabled={busy()}
                                  onClick={() => startRename(label.id, label.name)}
                                >
                                  {t("label.rename")}
                                </button>
                                <button
                                  class="ysb-btn small ghost ysb-danger-text"
                                  type="button"
                                  disabled={busy()}
                                  onClick={() => {
                                    setEditingId(undefined);
                                    setDeletingId(label.id);
                                  }}
                                >
                                  {t("action.delete")}
                                </button>
                              </>
                            }
                          >
                            <span class="ysb-labelconfirm">
                              {t("label.deleteInline", { count: label.count })}
                            </span>
                            <button
                              class="ysb-btn small danger"
                              type="button"
                              disabled={busy()}
                              onClick={() => remove(label.id)}
                            >
                              {t("action.delete")}
                            </button>
                            <button
                              class="ysb-btn small ghost"
                              type="button"
                              onClick={() => setDeletingId(undefined)}
                            >
                              {t("action.cancel")}
                            </button>
                          </Show>
                        }
                      >
                        <button
                          class="ysb-btn small primary"
                          type="button"
                          disabled={busy()}
                          onClick={() => commitRename(label.id, label.name)}
                        >
                          {t("action.save")}
                        </button>
                        <button
                          class="ysb-btn small ghost"
                          type="button"
                          onClick={() => setEditingId(undefined)}
                        >
                          {t("action.cancel")}
                        </button>
                      </Show>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>

          <Show when={problem()}>
            <p class="ysb-error">{problem()}</p>
          </Show>
        </div>

        <div class="ysb-modalfoot">
          <div class="ysb-footright">
            <button class="ysb-btn" type="button" onClick={props.onClose}>
              {t("action.close")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditDialog(props: { board: Board; t: T; id: string; onClose(): void }) {
  return <TaskDetails board={props.board} t={props.t} id={props.id} onClose={props.onClose} />;
}
