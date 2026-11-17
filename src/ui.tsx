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
import { BookmarkIcon } from "./icons";
import { StatusIcon } from "./status";
import type { T } from "./i18n";
import {
  basename,
  labelColor,
  relativeTime,
  type Grouping,
  type Sort,
  type Task,
  type ViewMode,
} from "./model";

type DropTarget = { column: string; index: number };

function shortId(id: string): string {
  return id.replace(/^ses_/, "").slice(-6);
}

function summary(t: T, total: number, shown: number): string {
  return t("board.summary", { total, shown });
}

const SEARCH_HISTORY_KEY = "zmultica:search-history:v1";
const SEARCH_HISTORY_LIMIT = 20;

function readSearchHistory(): string[] {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const terms = parsed.filter(
      (item): item is string => typeof item === "string" && item.trim() !== "",
    );
    return terms.slice(0, SEARCH_HISTORY_LIMIT);
  } catch {
    return [];
  }
}

function writeSearchHistory(terms: readonly string[]): void {
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(terms));
  } catch {
    // Ignore unavailable storage (private mode or quota errors).
  }
}

function appendSearchTerm(terms: readonly string[], raw: string): string[] {
  const term = raw.trim();
  if (!term) return [...terms];
  return [term, ...terms.filter((item) => item !== term)].slice(0, SEARCH_HISTORY_LIMIT);
}

function IconSearch() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="4.2" stroke="currentColor" stroke-width="1.4" />
      <path d="m10.2 10.2 3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
    </svg>
  );
}

function IconEye(props: { off?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M1.7 8s2.4-3.9 6.3-3.9S14.3 8 14.3 8s-2.4 3.9-6.3 3.9S1.7 8 1.7 8Z"
        stroke="currentColor"
        stroke-width="1.3"
        stroke-linejoin="round"
      />
      <circle cx="8" cy="8" r="1.8" stroke="currentColor" stroke-width="1.3" />
      <Show when={props.off}>
        <path
          d="m2.6 13.4 10.8-10.8"
          stroke="currentColor"
          stroke-width="1.3"
          stroke-linecap="round"
        />
      </Show>
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
  const [columnDrag, setColumnDrag] = createSignal<string>();
  const [columnDrop, setColumnDrop] = createSignal<string>();
  const [filtersOpen, setFiltersOpen] = createSignal(false);
  const [labelsOpen, setLabelsOpen] = createSignal(false);
  const [statusOpen, setStatusOpen] = createSignal(false);
  const [menu, setMenu] = createSignal<{ id: string; x: number; y: number }>();
  const [narrow, setNarrow] = createSignal(isMobileSurface());
  const [limits, setLimits] = createSignal<Record<string, number>>({});
  const PAGE_SIZE = 40;
  const [history, setHistory] = createSignal<string[]>(readSearchHistory());
  const [historyOpen, setHistoryOpen] = createSignal(false);
  let draggedAt = 0;
  let searchInput: HTMLInputElement | undefined;
  let searchWrap: HTMLDivElement | undefined;

  function rememberSearch(raw: string) {
    const next = appendSearchTerm(history(), raw);
    if (next.length === history().length && next.every((item, index) => item === history()[index]))
      return;
    setHistory(next);
    writeSearchHistory(next);
  }

  function resetSearch() {
    rememberSearch(board.view.filters.search);
    board.setFilters({ search: "" });
    setHistoryOpen(false);
  }

  function applyHistory(term: string) {
    board.setFilters({ search: term });
    rememberSearch(term);
    setHistoryOpen(false);
    searchInput?.focus();
  }

  function clearHistory() {
    setHistory([]);
    writeSearchHistory([]);
    setHistoryOpen(false);
    searchInput?.focus();
  }

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
  onCleanup(() => {
    resetSearch();
    board.deactivate();
  });

  onMount(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!historyOpen()) return;
      const target = event.target;
      if (target instanceof Node && searchWrap?.contains(target)) return;
      setHistoryOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    onCleanup(() => document.removeEventListener("pointerdown", onPointerDown));
  });

  onMount(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        searchInput?.focus();
        searchInput?.select();
        setHistoryOpen(history().length > 0);
        return;
      }
      if (event.key !== "Escape") return;
      if (menu()) {
        event.preventDefault();
        event.stopPropagation();
        closeMenu(true);
        return;
      }
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
      if (statusOpen()) {
        event.stopPropagation();
        setStatusOpen(false);
        return;
      }
      if (board.deleteId()) {
        event.stopPropagation();
        board.closeDelete();
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

  const viewModes: Array<{ id: ViewMode; labelKey: string }> = [
    { id: "board", labelKey: "view.board" },
    { id: "list", labelKey: "view.list" },
    { id: "table", labelKey: "view.table" },
  ];

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
      (filters.unreadOnly ? 1 : 0) +
      (filters.plannedOnly ? 1 : 0) +
      (filters.showChildren ? 1 : 0)
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

  function startColumnDrag(key: string, event: DragEvent) {
    if (board.view.grouping !== "status") return;
    event.dataTransfer?.setData("application/x-ysb-status", key);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
    setColumnDrag(key);
    setColumnDrop(undefined);
  }

  function onColumnDragOver(key: string, event: DragEvent) {
    if (!columnDrag() || columnDrag() === key) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    if (columnDrop() !== key) setColumnDrop(key);
  }

  function onColumnDrop(key: string, event: DragEvent) {
    const source = columnDrag();
    if (!source) return;
    event.preventDefault();
    event.stopPropagation();
    setColumnDrag(undefined);
    setColumnDrop(undefined);
    if (source !== key) void board.moveStatusColumn(source, key);
  }

  function endColumnDrag() {
    setColumnDrag(undefined);
    setColumnDrop(undefined);
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

  function closeMenu(restoreFocus = false) {
    const id = menu()?.id;
    setMenu(undefined);
    if (!restoreFocus || !id) return;
    requestAnimationFrame(() => {
      const card = [...document.querySelectorAll<HTMLElement>("[data-ysb-card]")].find(
        (element) => element.dataset.ysbCard === id,
      );
      card?.focus();
    });
  }

  function onMenuKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape" || event.key === "Tab") {
      event.preventDefault();
      event.stopPropagation();
      closeMenu(true);
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const items = [
      ...(event.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>(
        ".ysb-menuitem:not(:disabled)",
      ),
    ];
    if (items.length === 0) return;
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? items.length - 1
          : event.key === "ArrowUp"
            ? (current <= 0 ? items.length : current) - 1
            : (current + 1) % items.length;
    items[next]?.focus();
  }

  function edit(id: string) {
    if (Date.now() - draggedAt < 250) return;
    board.markOpened(id);
    board.edit(id);
  }

  function chat(id: string) {
    if (Date.now() - draggedAt < 250) return;
    resetSearch();
    board.markOpened(id);
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
            <div class="ysb-errorbox" role="alert">
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
              <div class="ysb-titleblock">
                <div class="ysb-titlewrap">
                  <h1 class="ysb-title">{t("page.title")}</h1>
                </div>
                <div class="ysb-header-meta">
                  <span>{summary(t, board.total(), board.visible().length)}</span>
                  <Show when={board.runningCount() > 0}>
                    <button
                      class="ysb-activitychip is-running"
                      classList={{ "is-on": board.view.filters.runningOnly }}
                      type="button"
                      data-ysb-activity="running"
                      aria-pressed={board.view.filters.runningOnly}
                      onClick={() =>
                        board.setFilters({ runningOnly: !board.view.filters.runningOnly })
                      }
                    >
                      <span class="ysb-badgedot" />
                      {t("card.running")}
                      <strong>{board.runningCount()}</strong>
                    </button>
                  </Show>
                  <Show when={board.unreadCount() > 0}>
                    <button
                      class="ysb-activitychip is-unread"
                      classList={{ "is-on": board.view.filters.unreadOnly }}
                      type="button"
                      data-ysb-activity="unread"
                      aria-pressed={board.view.filters.unreadOnly}
                      onClick={() =>
                        board.setFilters({ unreadOnly: !board.view.filters.unreadOnly })
                      }
                    >
                      <span class="ysb-badgedot" />
                      {t("card.unread")}
                      <strong>{board.unreadCount()}</strong>
                    </button>
                  </Show>
                  <span class="ysb-header-metasep" aria-hidden="true">
                    ·
                  </span>
                  <span class="ysb-build">v{BUILD}</span>
                </div>
              </div>
              <div class="ysb-searchwrap" ref={searchWrap}>
                <label class="ysb-searchbox">
                  <IconSearch />
                  <input
                    ref={searchInput}
                    type="search"
                    value={board.view.filters.search}
                    placeholder={t("search.placeholder")}
                    aria-label={t("search.placeholder")}
                    autocomplete="off"
                    onInput={(event) => board.setFilters({ search: event.currentTarget.value })}
                    onFocus={() => setHistoryOpen(history().length > 0)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape" && historyOpen()) {
                        event.stopPropagation();
                        setHistoryOpen(false);
                        return;
                      }
                      if (event.key === "Enter") {
                        rememberSearch(board.view.filters.search);
                        setHistoryOpen(false);
                      }
                    }}
                  />
                </label>
                <Show when={historyOpen() && !board.view.filters.search && history().length > 0}>
                  <div class="ysb-searchhistory" role="listbox" aria-label={t("search.history")}>
                    <div class="ysb-searchhistoryhead">
                      <span>{t("search.history")}</span>
                      <button
                        class="ysb-searchhistoryclear"
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={clearHistory}
                      >
                        {t("search.clearHistory")}
                      </button>
                    </div>
                    <For each={history()}>
                      {(term) => (
                        <button
                          class="ysb-searchhistoryitem"
                          type="button"
                          role="option"
                          aria-selected="false"
                          title={term}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => applyHistory(term)}
                        >
                          <IconSearch />
                          <span>{term}</span>
                        </button>
                      )}
                    </For>
                  </div>
                </Show>
              </div>
              <div class="ysb-actions ysb-pageactions">
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
              <div class="ysb-viewswitch" role="group" aria-label={t("view.label")}>
                <For each={viewModes}>
                  {(mode) => (
                    <button
                      class="ysb-viewbtn"
                      classList={{
                        "is-on": board.view.mode === mode.id,
                        "yuri-segmented-selected-pill": board.view.mode === mode.id,
                      }}
                      type="button"
                      data-ysb-view={mode.id}
                      aria-pressed={board.view.mode === mode.id}
                      onClick={() => board.setMode(mode.id)}
                    >
                      {t(mode.labelKey)}
                    </button>
                  )}
                </For>
              </div>
              <span class="ysb-toolbar-separator" aria-hidden="true" />
              <div class="ysb-displayoptions">
                <Show when={board.view.mode === "board"}>
                  <label class="ysb-tool ysb-toolbar-select">
                    <select
                      value={board.view.grouping}
                      aria-label={t("filter.group")}
                      title={t("filter.group")}
                      onChange={(event) => board.setGrouping(event.currentTarget.value as Grouping)}
                    >
                      <option value="status">{t("group.status")}</option>
                      <option value="agent">{t("group.agent")}</option>
                      <option value="directory">{t("group.directory")}</option>
                      <option value="label">{t("group.label")}</option>
                    </select>
                  </label>
                </Show>
                <label class="ysb-tool ysb-toolbar-select">
                  <select
                    value={board.view.sort}
                    aria-label={t("filter.sort")}
                    title={t("filter.sort")}
                    onChange={(event) => board.setSort(event.currentTarget.value as Sort)}
                  >
                    <option value="manual">{t("sort.manual")}</option>
                    <option value="updated">{t("sort.updated")}</option>
                    <option value="created">{t("sort.created")}</option>
                    <option value="title">{t("sort.title")}</option>
                  </select>
                </label>
              </div>
              <span class="ysb-toolbar-separator" aria-hidden="true" />
              <div class="ysb-toolbar-actions">
                <button class="ysb-toolbarbtn" type="button" onClick={() => setStatusOpen(true)}>
                  {t("status.manage")}
                </button>
                <button class="ysb-toolbarbtn" type="button" onClick={() => setLabelsOpen(true)}>
                  {t("label.manage")}
                </button>
                <button
                  class="ysb-toolbarbtn"
                  classList={{ "is-active": filtersOpen() }}
                  type="button"
                  aria-expanded={filtersOpen()}
                  aria-controls="ysb-filter-panel"
                  onClick={() => setFiltersOpen((open) => !open)}
                >
                  <IconFilter />
                  {t("filter.panel")}
                  <Show when={activeFilters() > 0}>
                    <span class="ysb-badge">{activeFilters()}</span>
                  </Show>
                </button>
              </div>
            </div>

            <Show when={filtersOpen()}>
              <div class="ysb-filterpanel" id="ysb-filter-panel">
                <div class="ysb-filtergroup">
                  <span class="ysb-filterlabel">{t("filter.statuses")}</span>
                  <div class="ysb-chips">
                    <button
                      class="ysb-chip"
                      classList={{ "is-on": board.view.filters.statuses.length === 0 }}
                      type="button"
                      aria-pressed={board.view.filters.statuses.length === 0}
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
                          aria-pressed={board.view.filters.statuses.includes(status)}
                          onClick={() => board.toggleStatus(status)}
                        >
                          <StatusIcon status={status} color={board.colorOfStatus(status)} />
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
                            aria-pressed={board.view.filters.labels.includes(label.name)}
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
                      checked={board.view.filters.unreadOnly}
                      onChange={(event) =>
                        board.setFilters({ unreadOnly: event.currentTarget.checked })
                      }
                    />
                    {t("filter.unread")}
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

          <main
            classList={{
              "ysb-board": board.view.mode === "board",
              "ysb-view": board.view.mode !== "board",
            }}
          >
            <Show when={board.loading() && board.total() === 0}>
              <div class="ysb-loading" role="status">
                {t("board.loading")}
              </div>
            </Show>
            <Show when={board.error()}>
              <div class="ysb-errorbox" role="alert">
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
            <Show when={board.view.mode === "board"}>
              <Index each={board.columns()}>
                {(column) => (
                  <section
                    class="ysb-col"
                    classList={{
                      "is-over": drop()?.column === column().key,
                      "is-column-dragging": columnDrag() === column().key,
                      "is-column-drop": columnDrop() === column().key,
                    }}
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
                    <div
                      class="ysb-colhead"
                      classList={{ "is-draggable": board.view.grouping === "status" }}
                      draggable={board.view.grouping === "status" && !isCoarsePointer()}
                      data-ysb-colhead={column().key}
                      onDragStart={(event) => startColumnDrag(column().key, event)}
                      onDragOver={(event) => onColumnDragOver(column().key, event)}
                      onDragEnd={endColumnDrag}
                      onDrop={(event) => onColumnDrop(column().key, event)}
                    >
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
                        <StatusIcon
                          status={column().key}
                          size={13}
                          color={board.colorOfStatus(column().key)}
                        />
                      </Show>
                      <span class="ysb-coltitle">
                        {board.view.grouping === "directory"
                          ? basename(column().key)
                          : column().key}
                      </span>
                      <span class="ysb-colcount">{column().tasks.length}</span>
                      <Show when={board.view.grouping === "status"}>
                        <button
                          class="ysb-coladd"
                          type="button"
                          title={
                            column().key === board.defaultStatusName()
                              ? t("status.defaultLocked")
                              : t("status.hide")
                          }
                          aria-label={t("status.hide")}
                          data-ysb-hide-status={column().key}
                          disabled={column().key === board.defaultStatusName()}
                          onClick={(event) => {
                            event.stopPropagation();
                            void board.setStatusVisible(column().key, false);
                          }}
                        >
                          <IconEye />
                        </button>
                      </Show>
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
                              onTogglePin={(id, pinned) => void board.setPinned(id, pinned)}
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
            </Show>
            <Show when={board.view.mode === "list"}>
              <TaskList
                board={board}
                t={t}
                tasks={board.visible()}
                onEdit={edit}
                onChat={chat}
                onContextMenu={(id, x, y) => setMenu({ id, x, y })}
                onTogglePin={(id, pinned) => void board.setPinned(id, pinned)}
              />
            </Show>
            <Show when={board.view.mode === "table"}>
              <TaskTable
                board={board}
                t={t}
                tasks={board.visible()}
                onEdit={edit}
                onChat={chat}
                onContextMenu={(id, x, y) => setMenu({ id, x, y })}
                onTogglePin={(id, pinned) => void board.setPinned(id, pinned)}
              />
            </Show>
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
          <Show when={statusOpen()}>
            <StatusDialog board={board} t={t} onClose={() => setStatusOpen(false)} />
          </Show>
          <Show when={board.deleteId()}>
            {(id) => (
              <DeleteTaskDialog board={board} t={t} id={id()} onClose={() => board.closeDelete()} />
            )}
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
                    class="ysb-menu yuri-mobile-overlay-surface yuri-popup-surface"
                    role="menu"
                    ref={(element) =>
                      queueMicrotask(() => {
                        if (element.isConnected)
                          element
                            .querySelector<HTMLButtonElement>(".ysb-menuitem:not(:disabled)")
                            ?.focus();
                      })
                    }
                    onKeyDown={onMenuKeyDown}
                    style={{
                      left: `${Math.min(menu().x, window.innerWidth - 188)}px`,
                      top: `${Math.min(menu().y, window.innerHeight - 196)}px`,
                      "max-height": `${Math.max(
                        180,
                        window.innerHeight - Math.min(menu().y, window.innerHeight - 196) - 12,
                      )}px`,
                    }}
                  >
                    <Show when={task()}>
                      {(task) => (
                        <>
                          <div class="ysb-menulabel">{t("menu.moveTo")}</div>
                          <For each={board.visibleStatusList()}>
                            {(status) => (
                              <button
                                class="ysb-menuitem ysb-menustatus"
                                classList={{ "is-current": status.name === task().status }}
                                role="menuitem"
                                tabIndex={-1}
                                type="button"
                                disabled={status.name === task().status}
                                onClick={() => {
                                  void board.move(task().id, status.name);
                                  closeMenu(true);
                                }}
                              >
                                <StatusIcon status={status.name} size={12} color={status.color} />
                                <span class="ysb-menustatusname">{status.name}</span>
                                <Show when={status.name === task().status}>
                                  <span class="ysb-menustatuscheck" aria-hidden="true">
                                    ✓
                                  </span>
                                </Show>
                              </button>
                            )}
                          </For>
                          <div class="ysb-menusep yuri-popup-separator" role="separator" />
                          <Show
                            when={!board.isDiscarded(task().status)}
                            fallback={
                              <button
                                class="ysb-menuitem danger"
                                role="menuitem"
                                tabIndex={-1}
                                type="button"
                                onClick={() => {
                                  board.requestDelete(task().id);
                                  closeMenu(true);
                                }}
                              >
                                {t("menu.deleteForever")}
                              </button>
                            }
                          >
                            <button
                              class="ysb-menuitem danger"
                              role="menuitem"
                              tabIndex={-1}
                              type="button"
                              onClick={() => {
                                void board.move(task().id, board.discardStatusName());
                                closeMenu(true);
                              }}
                            >
                              {t("menu.discard")}
                            </button>
                          </Show>
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
  onTogglePin(id: string, pinned: boolean): void;
  onDragStart(id: string): void;
  onDragEnd(): void;
}) {
  const initial = () => props.task.agent.trim().charAt(0).toUpperCase() || "A";
  return (
    <article
      class="ysb-card"
      classList={{
        "is-dragging": props.dragging,
        "is-running": props.task.running,
        "is-unread": props.task.unread && !props.task.running,
      }}
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
          <button
            class="ysb-pinbtn"
            classList={{ "is-on": props.task.urgent }}
            type="button"
            title={props.task.urgent ? props.t("card.unpin") : props.t("card.pin")}
            aria-label={props.task.urgent ? props.t("card.unpin") : props.t("card.pin")}
            aria-pressed={props.task.urgent}
            draggable={false}
            onDragStart={(event) => event.preventDefault()}
            onClick={(event) => {
              event.stopPropagation();
              props.onTogglePin(props.task.id, !props.task.urgent);
            }}
          >
            <BookmarkIcon filled={props.task.urgent} />
          </button>
          <Show when={props.task.running}>
            <span class="ysb-activitybadge is-running" title={props.t("card.running")}>
              <span class="ysb-badgedot" />
              {props.t("card.running")}
            </span>
          </Show>
          <Show when={!props.task.running && props.task.unread}>
            <span class="ysb-activitybadge is-unread" title={props.t("card.unread")}>
              <span class="ysb-badgedot" />
              {props.t("card.unread")}
            </span>
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

function TaskList(props: {
  board: Board;
  t: T;
  tasks: Task[];
  onEdit(id: string): void;
  onChat(id: string): void;
  onContextMenu(id: string, x: number, y: number): void;
  onTogglePin(id: string, pinned: boolean): void;
}) {
  const groups = createMemo(() => {
    const byStatus = new Map<string, Task[]>();
    for (const status of props.board.statuses()) byStatus.set(status, []);
    for (const task of props.tasks) {
      const list = byStatus.get(task.status) ?? [];
      list.push(task);
      byStatus.set(task.status, list);
    }
    return [...byStatus.entries()].filter(([, list]) => list.length > 0);
  });

  return (
    <div class="ysb-list">
      <For each={groups()}>
        {([status, tasks]) => (
          <section class="ysb-listgroup">
            <header class="ysb-listgrouphead">
              <StatusIcon status={status} size={13} color={props.board.colorOfStatus(status)} />
              <span class="ysb-listgrouptitle">{status}</span>
              <span class="ysb-listgroupcount">{tasks.length}</span>
            </header>
            <div class="ysb-listrows">
              <For each={tasks}>
                {(task) => (
                  <div
                    class="ysb-listrow"
                    role="button"
                    tabindex="0"
                    data-ysb-listrow
                    onClick={() => props.onChat(task.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") props.onChat(task.id);
                    }}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      props.onContextMenu(task.id, event.clientX, event.clientY);
                    }}
                  >
                    <span class="ysb-listcode">#{task.code ?? shortId(task.id)}</span>
                    <span class="ysb-listmain">
                      <span class="ysb-listtitle">{task.title}</span>
                      <Show when={task.running}>
                        <span class="ysb-activitybadge is-running">
                          <span class="ysb-badgedot" />
                          {props.t("card.running")}
                        </span>
                      </Show>
                      <Show when={!task.running && task.unread}>
                        <span class="ysb-activitybadge is-unread">
                          <span class="ysb-badgedot" />
                          {props.t("card.unread")}
                        </span>
                      </Show>
                      <button
                        class="ysb-pinbtn"
                        classList={{ "is-on": task.urgent }}
                        type="button"
                        title={task.urgent ? props.t("card.unpin") : props.t("card.pin")}
                        aria-label={task.urgent ? props.t("card.unpin") : props.t("card.pin")}
                        aria-pressed={task.urgent}
                        onClick={(event) => {
                          event.stopPropagation();
                          props.onTogglePin(task.id, !task.urgent);
                        }}
                      >
                        <BookmarkIcon filled={task.urgent} />
                      </button>
                    </span>
                    <span class="ysb-listlabels">
                      <For each={task.labels.slice(0, 3)}>
                        {(label) => (
                          <span
                            class="ysb-label"
                            style={`--ysb-label:${props.board.colorOfLabel(label)}`}
                          >
                            <span class="ysb-chipdot" />
                            {label}
                          </span>
                        )}
                      </For>
                      <Show when={task.labels.length > 3}>
                        <span class="ysb-label ysb-label-more">+{task.labels.length - 3}</span>
                      </Show>
                    </span>
                    <span class="ysb-listagent">{task.agent}</span>
                    <span class="ysb-listdir" title={task.directory}>
                      {basename(task.directory)}
                    </span>
                    <span class="ysb-listtime">{relativeTime(task.updated)}</span>
                    <button
                      class="ysb-listdetails"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        props.onEdit(task.id);
                      }}
                    >
                      {props.t("widget.details")}
                    </button>
                  </div>
                )}
              </For>
            </div>
          </section>
        )}
      </For>
    </div>
  );
}

type TableSortKey = "code" | "title" | "status" | "agent" | "directory" | "updated";

function TaskTable(props: {
  board: Board;
  t: T;
  tasks: Task[];
  onEdit(id: string): void;
  onChat(id: string): void;
  onContextMenu(id: string, x: number, y: number): void;
  onTogglePin(id: string, pinned: boolean): void;
}) {
  const [sort, setSort] = createSignal<{ key: TableSortKey; desc: boolean }>({
    key: "updated",
    desc: true,
  });
  const sorted = createMemo(() => {
    const statuses = props.board.statuses();
    const { key, desc } = sort();
    return [...props.tasks].sort((a, b) => {
      let result = 0;
      if (key === "updated") result = a.updated - b.updated;
      else if (key === "code")
        result =
          Number((a.code || "").replace(/\D/g, "")) - Number((b.code || "").replace(/\D/g, ""));
      else if (key === "status") result = statuses.indexOf(a.status) - statuses.indexOf(b.status);
      else result = String(a[key]).localeCompare(String(b[key]), "zh-CN", { numeric: true });
      return desc ? -result : result;
    });
  });

  function toggleSort(key: TableSortKey) {
    setSort((current) =>
      current.key === key
        ? { key, desc: !current.desc }
        : { key, desc: key === "updated" || key === "code" },
    );
  }

  function header(key: TableSortKey, label: string) {
    return (
      <th>
        <button class="ysb-thbtn" type="button" onClick={() => toggleSort(key)}>
          {label}
          <Show when={sort().key === key}>
            <span class="ysb-thsort">{sort().desc ? "↓" : "↑"}</span>
          </Show>
        </button>
      </th>
    );
  }

  return (
    <div class="ysb-tablewrap">
      <table class="ysb-table" data-ysb-table>
        <thead>
          <tr>
            {header("code", props.t("field.code"))}
            {header("title", props.t("field.title"))}
            {header("status", props.t("field.status"))}
            <th>{props.t("field.labels")}</th>
            {header("agent", props.t("field.agent"))}
            {header("directory", props.t("field.directory"))}
            {header("updated", props.t("dialog.updated"))}
            <th aria-label={props.t("widget.details")} />
          </tr>
        </thead>
        <tbody>
          <For each={sorted()}>
            {(task) => (
              <tr
                onClick={() => props.onChat(task.id)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  props.onContextMenu(task.id, event.clientX, event.clientY);
                }}
              >
                <td class="ysb-tablecode">#{task.code ?? shortId(task.id)}</td>
                <td>
                  <span class="ysb-tablemain">
                    <span class="ysb-tabletitle">{task.title}</span>
                    <Show when={task.running}>
                      <span class="ysb-activitybadge is-running">
                        <span class="ysb-badgedot" />
                        {props.t("card.running")}
                      </span>
                    </Show>
                    <Show when={!task.running && task.unread}>
                      <span class="ysb-activitybadge is-unread">
                        <span class="ysb-badgedot" />
                        {props.t("card.unread")}
                      </span>
                    </Show>
                  </span>
                </td>
                <td>
                  <span class="ysb-tablestatus">
                    <StatusIcon
                      status={task.status}
                      size={12}
                      color={props.board.colorOfStatus(task.status)}
                    />
                    {task.status}
                  </span>
                </td>
                <td>
                  <span class="ysb-chips">
                    <For each={task.labels.slice(0, 3)}>
                      {(label) => (
                        <span
                          class="ysb-label"
                          style={`--ysb-label:${props.board.colorOfLabel(label)}`}
                        >
                          <span class="ysb-chipdot" />
                          {label}
                        </span>
                      )}
                    </For>
                    <Show when={task.labels.length > 3}>
                      <span class="ysb-label ysb-label-more">+{task.labels.length - 3}</span>
                    </Show>
                  </span>
                </td>
                <td class="ysb-tablemuted">{task.agent}</td>
                <td class="ysb-tablemuted" title={task.directory}>
                  {basename(task.directory)}
                </td>
                <td class="ysb-tablemuted">{relativeTime(task.updated)}</td>
                <td>
                  <span class="ysb-tablerowactions">
                    <button
                      class="ysb-pinbtn"
                      classList={{ "is-on": task.urgent }}
                      type="button"
                      title={task.urgent ? props.t("card.unpin") : props.t("card.pin")}
                      aria-label={task.urgent ? props.t("card.unpin") : props.t("card.pin")}
                      aria-pressed={task.urgent}
                      onClick={(event) => {
                        event.stopPropagation();
                        props.onTogglePin(task.id, !task.urgent);
                      }}
                    >
                      <BookmarkIcon filled={task.urgent} />
                    </button>
                    <button
                      class="ysb-tabledetails"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        props.onEdit(task.id);
                      }}
                    >
                      {props.t("widget.details")}
                    </button>
                  </span>
                </td>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
}

function useDialogKeys(close: () => void, submit: () => void) {
  const returnFocus = document.activeElement as HTMLElement | null;
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
  onCleanup(() => {
    window.removeEventListener("keydown", onKeyDown);
    if (returnFocus?.isConnected) returnFocus.focus();
  });
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
    status: board.createStatusSeed() || board.defaultStatusName(),
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
        status: form.status,
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
              <select
                class="ysb-select"
                value={form.status}
                onChange={(event) => setForm("status", event.currentTarget.value)}
              >
                <For each={board.visibleStatusList()}>
                  {(status) => <option value={status.name}>{status.name}</option>}
                </For>
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
            <p class="ysb-error" role="alert">
              {problem()}
            </p>
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
              aria-busy={busy()}
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
              ref={(element) =>
                queueMicrotask(() => {
                  if (element.isConnected) element.focus();
                })
              }
              placeholder={t("label.placeholder")}
              aria-label={t("label.placeholder")}
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
                        aria-label={t("label.rename")}
                        ref={(element) =>
                          queueMicrotask(() => {
                            if (!element.isConnected) return;
                            element.focus();
                            element.select();
                          })
                        }
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
            <p class="ysb-error" role="alert">
              {problem()}
            </p>
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

function StatusDialog(props: { board: Board; t: T; onClose(): void }) {
  const t = props.t;
  const [name, setName] = createSignal("");
  const [color, setColor] = createSignal("#8b8cdd");
  const [editingId, setEditingId] = createSignal<string>();
  const [deletingId, setDeletingId] = createSignal<string>();
  const [draft, setDraft] = createSignal("");
  const [busy, setBusy] = createSignal(false);
  const [problem, setProblem] = createSignal("");

  const statuses = () => props.board.statusList();

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
      await props.board.createStatus(value, color());
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
      await props.board.updateStatus(id, { name: value });
      setEditingId(undefined);
    });
  }

  function move(id: string, offset: number) {
    const list = statuses();
    const index = list.findIndex((status) => status.id === id);
    const target = index + offset;
    if (index < 0 || target < 0 || target >= list.length) return;
    const ids = list.map((status) => status.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    void run(async () => {
      await props.board.reorderStatuses(ids);
    });
  }

  function remove(id: string) {
    void run(async () => {
      await props.board.deleteStatus(id);
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
        class="ysb-modal ysb-statusmodal"
        role="dialog"
        aria-modal="true"
        aria-label={t("status.title")}
      >
        <div class="ysb-modalhead">
          <div>
            <h2 class="ysb-modaltitle">{t("status.title")}</h2>
            <p class="ysb-modalsub">{t("status.hint")}</p>
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
            <input
              class="ysb-statuscolor"
              type="color"
              value={color()}
              title={t("status.color")}
              aria-label={t("status.color")}
              onInput={(event) => setColor(event.currentTarget.value)}
            />
            <input
              class="ysb-input"
              value={name()}
              ref={(element) =>
                queueMicrotask(() => {
                  if (element.isConnected) element.focus();
                })
              }
              placeholder={t("status.placeholder")}
              aria-label={t("status.placeholder")}
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
              {t("status.add")}
            </button>
          </div>

          <div class="ysb-labellisthead">
            <span>{t("status.all")}</span>
            <span>{t("status.total", { count: statuses().length })}</span>
          </div>

          <div class="ysb-labellist">
            <For each={statuses()}>
              {(status, index) => (
                <div
                  class="ysb-labelrow"
                  classList={{
                    "is-editing": editingId() === status.id,
                    "is-confirming": deletingId() === status.id,
                    "is-hidden": !status.visible,
                  }}
                >
                  <input
                    class="ysb-statuscolor"
                    type="color"
                    value={status.color}
                    title={t("status.color")}
                    aria-label={t("status.color")}
                    disabled={busy()}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      void run(async () => {
                        await props.board.updateStatus(status.id, { color: value });
                      });
                    }}
                  />
                  <Show
                    when={editingId() === status.id}
                    fallback={
                      <div class="ysb-labelmain">
                        <span class="ysb-labelname">{status.name}</span>
                        <span class="ysb-labelmeta">
                          {t("status.taskCount", { count: status.count })}
                          <Show when={status.kind !== "normal"}>
                            {" · "}
                            {status.kind === "default" ? t("status.default") : t("status.discard")}
                          </Show>
                          <Show when={!status.visible}>
                            {" · "}
                            {t("status.hidden")}
                          </Show>
                        </span>
                      </div>
                    }
                  >
                    <input
                      class="ysb-input ysb-labelrename"
                      value={draft()}
                      aria-label={t("status.rename")}
                      ref={(element) =>
                        queueMicrotask(() => {
                          if (!element.isConnected) return;
                          element.focus();
                          element.select();
                        })
                      }
                      onInput={(event) => setDraft(event.currentTarget.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          commitRename(status.id, status.name);
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
                      when={editingId() === status.id}
                      fallback={
                        <Show
                          when={deletingId() === status.id}
                          fallback={
                            <>
                              <button
                                class="ysb-btn small ghost ysb-statuseye"
                                type="button"
                                title={status.visible ? t("status.hide") : t("status.show")}
                                aria-label={status.visible ? t("status.hide") : t("status.show")}
                                data-ysb-toggle-status={status.name}
                                disabled={busy() || (status.kind === "default" && status.visible)}
                                onClick={() =>
                                  void run(async () => {
                                    await props.board.setStatusVisible(
                                      status.name,
                                      !status.visible,
                                    );
                                  })
                                }
                              >
                                <IconEye off={!status.visible} />
                              </button>
                              <button
                                class="ysb-btn small ghost"
                                type="button"
                                title={t("status.moveUp")}
                                aria-label={t("status.moveUp")}
                                disabled={busy() || index() === 0}
                                onClick={() => move(status.id, -1)}
                              >
                                ↑
                              </button>
                              <button
                                class="ysb-btn small ghost"
                                type="button"
                                title={t("status.moveDown")}
                                aria-label={t("status.moveDown")}
                                disabled={busy() || index() === statuses().length - 1}
                                onClick={() => move(status.id, 1)}
                              >
                                ↓
                              </button>
                              <button
                                class="ysb-btn small ghost"
                                type="button"
                                disabled={busy()}
                                onClick={() => startRename(status.id, status.name)}
                              >
                                {t("status.rename")}
                              </button>
                              <button
                                class="ysb-btn small ghost ysb-danger-text"
                                type="button"
                                disabled={busy() || status.kind !== "normal"}
                                title={status.kind === "normal" ? undefined : t("status.locked")}
                                onClick={() => {
                                  setEditingId(undefined);
                                  setDeletingId(status.id);
                                }}
                              >
                                {t("action.delete")}
                              </button>
                            </>
                          }
                        >
                          <span class="ysb-labelconfirm">
                            {t("status.deleteInline", {
                              count: status.count,
                              target: props.board.discardStatusName(),
                            })}
                          </span>
                          <button
                            class="ysb-btn small danger"
                            type="button"
                            disabled={busy()}
                            onClick={() => remove(status.id)}
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
                        onClick={() => commitRename(status.id, status.name)}
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

          <Show when={problem()}>
            <p class="ysb-error" role="alert">
              {problem()}
            </p>
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

function DeleteTaskDialog(props: { board: Board; t: T; id: string; onClose(): void }) {
  const t = props.t;
  const [busy, setBusy] = createSignal(false);
  const task = () => props.board.task(props.id);
  const sessionCount = () => task()?.record?.sessions.length ?? 1;

  async function remove() {
    if (busy()) return;
    setBusy(true);
    try {
      await props.board.deleteTask(props.id);
      props.onClose();
    } catch (caught) {
      props.board.fail(caught, "error.deleteTask");
      setBusy(false);
    }
  }

  useDialogKeys(props.onClose, () => undefined);

  return (
    <div
      class="ysb-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) props.onClose();
      }}
    >
      <div
        class="ysb-modal ysb-confirmmodal"
        role="alertdialog"
        aria-modal="true"
        aria-label={t("deleteTask.title")}
      >
        <div class="ysb-modalhead">
          <div>
            <h2 class="ysb-modaltitle">{t("deleteTask.title")}</h2>
            <p class="ysb-modalsub">
              {t("deleteTask.body", {
                title: task()?.title ?? props.id,
                count: sessionCount(),
              })}
            </p>
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
        <div class="ysb-modalfoot">
          <div class="ysb-footright">
            <button class="ysb-btn" type="button" onClick={props.onClose}>
              {t("action.cancel")}
            </button>
            <button
              class="ysb-btn danger"
              type="button"
              disabled={busy()}
              aria-busy={busy()}
              onClick={() => void remove()}
            >
              {t("deleteTask.confirm")}
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
