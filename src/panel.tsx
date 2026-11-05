import type { MountedSession } from "@opencode/plugin/gui";
import { For, Show, createEffect, createMemo, createSignal, on } from "solid-js";
import { createStore } from "solid-js/store";
import type { Board } from "./board";
import type { T } from "./i18n";
import { basename, labelColor, relativeTime, type Task } from "./model";
import { StatusIcon, TagEditor } from "./ui";

type Scope = "directory" | "agent" | "all";

function initial(value: string): string {
  return value.trim().charAt(0).toUpperCase() || "A";
}

export function TaskPanel(props: {
  board: Board;
  t: T;
  session: MountedSession;
  onOpenBoard(): void;
}) {
  const board = props.board;
  const t = props.t;
  const [selected, setSelected] = createSignal<string>();
  const [scope, setScope] = createSignal<Scope>("directory");
  const [editing, setEditing] = createSignal(false);
  const [expanded, setExpanded] = createSignal(false);
  const [busy, setBusy] = createSignal(false);
  const [draft, setDraft] = createStore({
    title: "",
    description: "",
    status: "",
    labels: [] as string[],
  });
  let scrollRef: HTMLDivElement | undefined;

  const currentId = () => props.session.id;
  const currentTask = () => board.task(currentId());
  const detail = () => board.task(selected() ?? currentId());
  const isCurrent = () => !selected() || selected() === currentId();

  const related = createMemo(() => {
    const task = detail();
    const directory = task?.directory ?? props.session.directory;
    const agent = task?.agent ?? "";
    const excluded = task?.id ?? currentId();
    return board
      .tasks()
      .filter((item) => !item.parentID && item.id !== excluded)
      .filter((item) =>
        scope() === "all"
          ? true
          : scope() === "directory"
            ? item.directory === directory
            : item.agent === agent,
      )
      .sort((a, b) => b.updated - a.updated)
      .slice(0, 50);
  });

  const total = createMemo(() => {
    const current = currentTask();
    const included = current ? related().some((item) => item.id === current.id) : false;
    return related().length + (current && !included ? 1 : 0);
  });

  createEffect(
    on(
      () => props.session.id,
      () => {
        setSelected(undefined);
        setEditing(false);
        setExpanded(false);
      },
    ),
  );

  createEffect(
    on(
      () => detail()?.id,
      () => {
        setEditing(false);
        setExpanded(false);
      },
    ),
  );

  function selectTask(id: string) {
    setSelected(id);
    setEditing(false);
    setExpanded(false);
    queueMicrotask(() => scrollRef?.scrollTo({ top: 0 }));
  }

  function startEdit() {
    const task = detail();
    if (!task) return;
    setDraft({
      title: task.title,
      description: task.description,
      status: task.status,
      labels: [...task.labels],
    });
    setEditing(true);
  }

  async function saveEdit() {
    const task = detail();
    if (!task || busy()) return;
    setBusy(true);
    try {
      await board.save(task.id, { ...draft });
      board.notice("toast.saved", "success");
      setEditing(false);
    } catch (caught) {
      board.fail(caught, "error.save");
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(status: string) {
    const task = detail();
    if (!task) return;
    try {
      await board.setStatus(task.id, status);
    } catch (caught) {
      board.fail(caught, "error.save");
    }
  }

  async function toggleArchive() {
    const task = detail();
    if (!task || busy()) return;
    const next = !task.archived;
    setBusy(true);
    try {
      await board.archive(task.id, next);
      board.notice(next ? "toast.archived" : "toast.unarchived", "success");
    } catch (caught) {
      board.fail(caught, "error.archive");
    } finally {
      setBusy(false);
    }
  }

  async function joinBoard() {
    const task = currentTask();
    if (!task || busy()) return;
    setBusy(true);
    try {
      await board.adopt(task.id);
      board.notice("panel.joined", "success");
    } catch (caught) {
      board.fail(caught, "error.save");
    } finally {
      setBusy(false);
    }
  }

  function metaLine(task: Task) {
    return `${basename(task.directory)} · ${relativeTime(task.updated)}`;
  }

  return (
    <div class="ysb-root ysb-panel">
      <header class="ysb-panelhead">
        <span class="ysb-paneltitle">{t("panel.title")}</span>
        <span class="ysb-panelcount">{total()}</span>
        <span class="ysb-panelspacer" />
        <button
          class="ysb-iconbtn"
          type="button"
          title={t("action.refresh")}
          aria-label={t("action.refresh")}
          onClick={() => void board.reload(true)}
        >
          ⟳
        </button>
      </header>

      <div class="ysb-panelscroll" ref={scrollRef}>
        <Show when={detail()} fallback={<p class="ysb-panelempty">{t("panel.noTask")}</p>}>
          <section class="ysb-panelsection">
            <div class="ysb-panelsectionhead">
              <span class="ysb-panelsectiontitle">
                {isCurrent() ? t("panel.current") : t("panel.detail")}
              </span>
              <Show when={!isCurrent()}>
                <button
                  class="ysb-btn ghost small"
                  type="button"
                  onClick={() => setSelected(undefined)}
                >
                  {t("panel.back")}
                </button>
              </Show>
            </div>

            <div class="ysb-panelcard">
              <div class="ysb-panelstatusline">
                <StatusIcon status={detail()!.status} size={13} />
                <select
                  class="ysb-panelselect"
                  value={editing() ? draft.status : detail()!.status}
                  aria-label={t("field.status")}
                  onChange={(event) => {
                    const status = event.currentTarget.value;
                    if (editing()) setDraft("status", status);
                    else void changeStatus(status);
                  }}
                >
                  <For each={board.statuses()}>
                    {(status) => <option value={status}>{status}</option>}
                  </For>
                </select>
                <Show when={detail()!.running}>
                  <span class="ysb-run" title={t("card.running")} />
                </Show>
                <Show when={detail()!.archived}>
                  <span class="ysb-panelarchived">{t("panel.archived")}</span>
                </Show>
              </div>

              <Show
                when={editing()}
                fallback={
                  <>
                    <h3 class="ysb-paneltasktitle">{detail()!.title}</h3>
                    <Show
                      when={detail()!.description}
                      fallback={<p class="ysb-paneldesc is-empty">{t("panel.descEmpty")}</p>}
                    >
                      <p class="ysb-paneldesc" classList={{ clamped: !expanded() }}>
                        {detail()!.description}
                      </p>
                      <Show when={detail()!.description.length > 120}>
                        <button
                          class="ysb-linkbtn"
                          type="button"
                          onClick={() => setExpanded((value) => !value)}
                        >
                          {expanded() ? t("panel.collapse") : t("panel.expand")}
                        </button>
                      </Show>
                    </Show>

                    <Show when={detail()!.labels.length > 0}>
                      <div class="ysb-chips">
                        <For each={detail()!.labels}>
                          {(label) => (
                            <span class="ysb-label" style={`--ysb-label:${labelColor(label)}`}>
                              <span class="ysb-chipdot" />
                              {label}
                            </span>
                          )}
                        </For>
                      </div>
                    </Show>

                    <div class="ysb-panelmeta">
                      <span class="ysb-agent" title={detail()!.agent}>
                        <span
                          class="ysb-avatar"
                          style={`--ysb-avatar:${labelColor(detail()!.agent)}`}
                        >
                          {initial(detail()!.agent)}
                        </span>
                        <span class="ysb-agentname">{detail()!.agent}</span>
                      </span>
                      <span class="ysb-metadir">{metaLine(detail()!)}</span>
                    </div>

                    <div class="ysb-panelactions">
                      <button class="ysb-btn small" type="button" onClick={startEdit}>
                        {t("panel.edit")}
                      </button>
                      <button
                        class="ysb-btn small"
                        type="button"
                        onClick={() => board.open(detail()!.id)}
                      >
                        {t("action.chat")}
                      </button>
                      <button
                        class="ysb-btn small"
                        classList={{ danger: !detail()!.archived }}
                        type="button"
                        disabled={busy()}
                        onClick={() => void toggleArchive()}
                      >
                        {detail()!.archived ? t("action.unarchive") : t("action.archive")}
                      </button>
                      <Show when={!detail()!.planned}>
                        <button
                          class="ysb-btn small primary"
                          type="button"
                          disabled={busy()}
                          onClick={() => void joinBoard()}
                        >
                          {t("panel.join")}
                        </button>
                      </Show>
                    </div>
                  </>
                }
              >
                <div class="ysb-form ysb-panelform">
                  <label class="ysb-formitem">
                    <span>{t("field.title")}</span>
                    <input
                      class="ysb-input"
                      value={draft.title}
                      onInput={(event) => setDraft("title", event.currentTarget.value)}
                    />
                  </label>
                  <label class="ysb-formitem">
                    <span>{t("field.description")}</span>
                    <textarea
                      class="ysb-textarea"
                      value={draft.description}
                      placeholder={t("field.descriptionPlaceholder")}
                      onInput={(event) => setDraft("description", event.currentTarget.value)}
                    />
                  </label>
                  <div class="ysb-formitem">
                    <span>{t("field.labels")}</span>
                    <TagEditor
                      value={draft.labels}
                      suggestions={board.labelCounts()}
                      placeholder={t("field.labelsPlaceholder")}
                      t={t}
                      onChange={(next) => setDraft("labels", next)}
                    />
                  </div>
                  <div class="ysb-panelactions">
                    <button
                      class="ysb-btn primary small"
                      type="button"
                      disabled={busy()}
                      onClick={() => void saveEdit()}
                    >
                      {busy() ? "…" : t("action.save")}
                    </button>
                    <button class="ysb-btn small" type="button" onClick={() => setEditing(false)}>
                      {t("action.cancel")}
                    </button>
                  </div>
                </div>
              </Show>
            </div>
          </section>
        </Show>

        <section class="ysb-panelsection">
          <div class="ysb-panelsectionhead">
            <span class="ysb-panelsectiontitle">{t("panel.related")}</span>
            <select
              class="ysb-panelselect"
              value={scope()}
              aria-label={t("panel.related")}
              onChange={(event) => setScope(event.currentTarget.value as Scope)}
            >
              <option value="directory">{t("panel.scope.directory")}</option>
              <option value="agent">{t("panel.scope.agent")}</option>
              <option value="all">{t("panel.scope.all")}</option>
            </select>
          </div>
          <Show
            when={related().length > 0}
            fallback={<p class="ysb-panelempty">{t("panel.emptyRelated")}</p>}
          >
            <div class="ysb-relatedlist">
              <For each={related()}>
                {(task) => (
                  <button class="ysb-relatedrow" type="button" onClick={() => selectTask(task.id)}>
                    <StatusIcon status={task.status} size={12} />
                    <span class="ysb-relatedtitle">{task.title}</span>
                    <Show when={task.running}>
                      <span class="ysb-run" />
                    </Show>
                    <span class="ysb-relatedtime">{relativeTime(task.updated)}</span>
                  </button>
                )}
              </For>
            </div>
          </Show>
        </section>
      </div>

      <footer class="ysb-panelfoot">
        <button class="ysb-btn" type="button" onClick={props.onOpenBoard}>
          {t("panel.openBoard")}
        </button>
      </footer>
    </div>
  );
}
