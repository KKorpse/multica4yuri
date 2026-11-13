import { For, Show, createSignal, onCleanup, onMount } from "solid-js";
import { Portal } from "solid-js/web";
import type { Board } from "./board";
import type { T } from "./i18n";
import { Blocks } from "./markdown";
import { SpriteIcon } from "./icons";
import { basename, relativeTime } from "./model";
import { StatusIcon } from "./status";
import { TagEditor } from "./tag";

export function TaskDetails(props: { board: Board; t: T; id: string; onClose(): void }) {
  const task = () => props.board.task(props.id);
  const doc = () => task()?.record?.document?.content ?? "";
  const sessions = () => task()?.record?.sessions ?? [];

  const [descEditing, setDescEditing] = createSignal(false);
  const [descDraft, setDescDraft] = createSignal("");
  const [docEditing, setDocEditing] = createSignal(false);
  const [docDraft, setDocDraft] = createSignal("");
  const [title, setTitle] = createSignal(task()?.title ?? "");
  const [status, setStatus] = createSignal(task()?.status ?? "待分配");
  const [labelValue, setLabelValue] = createSignal<string[]>(task()?.labels ?? []);
  const [busy, setBusy] = createSignal(false);

  function openLink(href: string) {
    props.board.openLink(href, task()?.directory);
  }

  function startEditDescription() {
    setDescDraft(task()?.description ?? "");
    setDescEditing(true);
  }

  async function saveDescription() {
    const current = task();
    if (!current) return;
    await props.board.save(current.id, {
      title: current.title,
      description: descDraft(),
      status: current.status,
      labels: current.labels,
    });
    setDescEditing(false);
  }

  function startEditDocument() {
    setDocDraft(doc());
    setDocEditing(true);
  }

  async function saveDocument() {
    const current = task();
    if (!current) return;
    await props.board.saveDocument(current.id, docDraft());
    setDocEditing(false);
  }

  async function saveSettings() {
    const current = task();
    if (!current || busy()) return;
    setBusy(true);
    try {
      await props.board.save(current.id, {
        title: title(),
        description: current.description,
        status: status(),
        labels: labelValue(),
      });
      props.onClose();
    } finally {
      setBusy(false);
    }
  }

  async function toggleArchive() {
    const current = task();
    if (!current || busy()) return;
    setBusy(true);
    try {
      await props.board.archive(current.id, !current.archived);
    } finally {
      setBusy(false);
    }
  }

  onMount(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      props.onClose();
    };
    window.document.addEventListener("keydown", onKey);
    onCleanup(() => document.removeEventListener("keydown", onKey));
  });

  return (
    <Show when={task()}>
      {(task) => (
        <Portal mount={window.document.body}>
          <div
            class="ysb-detail-backdrop"
            onClick={(event) => {
              if (event.target === event.currentTarget) props.onClose();
            }}
          >
            <section class="ysb-detail" role="dialog" aria-modal="true" aria-label={task().title}>
              <header class="ysb-detail-head">
                <div class="ysb-detail-heading">
                  <StatusIcon status={task().status} size={14} />
                  <h2 class="ysb-detail-title">{task().title}</h2>
                  <span class="ysb-detail-code">{task().code ?? task().id}</span>
                </div>
                <button
                  class="ysb-detail-close"
                  type="button"
                  aria-label={props.t("action.close")}
                  onClick={props.onClose}
                >
                  <SpriteIcon name="close" size={14} />
                </button>
              </header>

              <div class="ysb-detail-body">
                <div class="ysb-detail-statusline">
                  <span>{task().status}</span>
                  <span class="ysb-detail-dot" aria-hidden="true">
                    ·
                  </span>
                  <span>{relativeTime(task().updated)}</span>
                </div>

                <Show when={task().description || descEditing()}>
                  <section class="ysb-detail-section">
                    <div class="ysb-detail-sectionhead">
                      <h3>{props.t("widget.goal")}</h3>
                      <Show when={!descEditing()}>
                        <button
                          class="ysb-widget-sectiontoggle"
                          type="button"
                          onClick={startEditDescription}
                        >
                          {props.t("action.edit")}
                        </button>
                      </Show>
                    </div>
                    <Show
                      when={!descEditing()}
                      fallback={
                        <div class="ysb-detail-docedit">
                          <textarea
                            class="ysb-textarea"
                            value={descDraft()}
                            onInput={(event) => setDescDraft(event.currentTarget.value)}
                          />
                          <div class="ysb-detail-docactions">
                            <button
                              class="ysb-widget-action"
                              type="button"
                              onClick={() => setDescEditing(false)}
                            >
                              {props.t("action.cancel")}
                            </button>
                            <button
                              class="ysb-widget-action primary"
                              type="button"
                              onClick={saveDescription}
                            >
                              {props.t("action.save")}
                            </button>
                          </div>
                        </div>
                      }
                    >
                      <Blocks text={task().description} onOpenLink={openLink} />
                    </Show>
                  </section>
                </Show>

                <Show when={task().labels.length > 0}>
                  <div class="ysb-widget-labels">
                    <For each={task().labels}>
                      {(label) => (
                        <span
                          class="ysb-widget-label"
                          style={{ "--ysb-label": props.board.colorOfLabel(label) }}
                        >
                          <span class="ysb-widget-chipdot" />
                          {label}
                        </span>
                      )}
                    </For>
                  </div>
                </Show>

                <Show when={doc() || docEditing()}>
                  <section class="ysb-detail-section">
                    <div class="ysb-detail-sectionhead">
                      <h3>{props.t("widget.outputs")}</h3>
                      <Show when={!docEditing()}>
                        <button
                          class="ysb-widget-sectiontoggle"
                          type="button"
                          onClick={startEditDocument}
                        >
                          {props.t("action.edit")}
                        </button>
                      </Show>
                    </div>
                    <Show
                      when={!docEditing()}
                      fallback={
                        <div class="ysb-detail-docedit">
                          <textarea
                            class="ysb-textarea"
                            value={docDraft()}
                            onInput={(event) => setDocDraft(event.currentTarget.value)}
                          />
                          <div class="ysb-detail-docactions">
                            <button
                              class="ysb-widget-action"
                              type="button"
                              onClick={() => setDocEditing(false)}
                            >
                              {props.t("action.cancel")}
                            </button>
                            <button
                              class="ysb-widget-action primary"
                              type="button"
                              onClick={saveDocument}
                            >
                              {props.t("action.save")}
                            </button>
                          </div>
                        </div>
                      }
                    >
                      <Blocks text={doc()} onOpenLink={openLink} />
                    </Show>
                  </section>
                </Show>

                <Show when={sessions().length > 0}>
                  <section class="ysb-detail-section">
                    <h3>{props.t("dialog.sessions")}</h3>
                    <div class="ysb-detail-sessionlist">
                      <For each={sessions()}>
                        {(link) => (
                          <button
                            class="ysb-detail-session"
                            type="button"
                            title={link.directory}
                            onClick={() => {
                              props.board.open(link.sessionId);
                              props.onClose();
                            }}
                          >
                            <span class={`ysb-detail-role ${link.role}`}>
                              {link.role === "main" ? "主" : "子"}
                            </span>
                            <span class="ysb-detail-sessiontitle">{link.title}</span>
                            <span class="ysb-detail-sessiondir">{basename(link.directory)}</span>
                          </button>
                        )}
                      </For>
                    </div>
                  </section>
                </Show>

                <section class="ysb-detail-section">
                  <h3>{props.t("dialog.info")}</h3>
                  <dl class="ysb-detail-meta">
                    <dt>{props.t("field.directory")}</dt>
                    <dd title={task().directory}>{task().directory}</dd>
                    <dt>{props.t("field.agent")}</dt>
                    <dd>{task().agent}</dd>
                    <dt>{props.t("edit.meta")}</dt>
                    <dd>{task().code ?? task().id}</dd>
                    <dt>{props.t("dialog.updated")}</dt>
                    <dd>{new Date(task().updated).toLocaleString()}</dd>
                    <dt>{props.t("dialog.cost")}</dt>
                    <dd>${task().cost.toFixed(2)}</dd>
                  </dl>
                </section>

                <section class="ysb-detail-section">
                  <h3>{props.t("detail.settings")}</h3>
                  <label class="ysb-formitem">
                    <span>{props.t("field.title")}</span>
                    <input
                      class="ysb-input"
                      value={title()}
                      onInput={(event) => setTitle(event.currentTarget.value)}
                    />
                  </label>
                  <div class="ysb-detail-settingsrow">
                    <label class="ysb-formitem">
                      <span>{props.t("field.status")}</span>
                      <select
                        class="ysb-select"
                        value={status()}
                        onChange={(event) => setStatus(event.currentTarget.value)}
                      >
                        <For each={[...new Set([status(), "已完成", "废弃"])]}>
                          {(value) => <option value={value}>{value}</option>}
                        </For>
                      </select>
                    </label>
                    <div class="ysb-formitem">
                      <span>{props.t("field.labels")}</span>
                      <TagEditor
                        value={labelValue()}
                        suggestions={props.board.labelOptions()}
                        placeholder={props.t("field.labelsPlaceholder")}
                        t={props.t}
                        colorOf={props.board.colorOfLabel}
                        onChange={setLabelValue}
                      />
                    </div>
                  </div>
                  <div class="ysb-detail-docactions">
                    <button
                      class="ysb-widget-action"
                      type="button"
                      disabled={busy()}
                      onClick={() => void toggleArchive()}
                    >
                      {task().archived ? props.t("action.unarchive") : props.t("action.archive")}
                    </button>
                    <button
                      class="ysb-widget-action primary"
                      type="button"
                      disabled={busy()}
                      onClick={() => void saveSettings()}
                    >
                      {props.t("action.save")}
                    </button>
                  </div>
                </section>
              </div>

              <footer class="ysb-detail-foot">
                <button
                  class="ysb-widget-action"
                  type="button"
                  onClick={() => {
                    props.board.open(props.id);
                    props.onClose();
                  }}
                >
                  {props.t("action.chat")}
                </button>
                <button class="ysb-widget-action" type="button" onClick={props.onClose}>
                  {props.t("action.close")}
                </button>
              </footer>
            </section>
          </div>
        </Portal>
      )}
    </Show>
  );
}
