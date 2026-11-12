import { For, Show, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import MarkdownIt from "markdown-it";
import { Portal } from "solid-js/web";
import type { Context } from "@opencode/plugin/gui";
import type { Board } from "./board";
import type { T } from "./i18n";
import { basename, labelColor, relativeTime } from "./model";
import { StatusIcon } from "./ui";

function preview(text: string): { head: string; tail: string } {
  const split = text.search(/\n\s*\n/);
  if (split >= 0) return { head: text.slice(0, split).trim(), tail: text.slice(split).trim() };
  const lines = text.split("\n");
  if (lines.length > 3) {
    return { head: lines.slice(0, 3).join("\n"), tail: lines.slice(3).join("\n").trim() };
  }
  return { head: text, tail: "" };
}

const markdown = new MarkdownIt({ html: false, linkify: true, breaks: true });

function Blocks(props: { text: string; onOpenLink?(href: string): void }) {
  const html = createMemo(() => markdown.render(props.text));
  return (
    <div
      class="ysb-widget-markdown"
      innerHTML={html()}
      onClick={(event) => {
        const target = event.target as HTMLElement | null;
        const anchor = target?.closest?.("a");
        if (!anchor) return;
        const href = anchor.getAttribute("href");
        if (!href) return;
        event.preventDefault();
        event.stopPropagation();
        props.onOpenLink?.(href);
      }}
    />
  );
}

function Chevron(props: { up?: boolean }) {
  return (
    <svg
      class="ysb-widget-toggleicon"
      classList={{ up: !!props.up }}
      viewBox="0 0 24 24"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      style="--yuri-icon-stroke: 2"
      aria-hidden="true"
    >
      <use href="#yuri-arrow-down-s" />
    </svg>
  );
}

export function TaskStatus(props: {
  board: Board;
  t: T;
  ctx: Context;
  sessionID?: string;
  onOpenBoard(): void;
}) {
  onMount(() => props.board.activate());
  onCleanup(() => props.board.deactivate());

  const [expanded, setExpanded] = createSignal(false);
  const [outputsExpanded, setOutputsExpanded] = createSignal(false);
  const [details, setDetails] = createSignal(false);
  const task = () => (props.sessionID ? props.board.task(props.sessionID) : undefined);
  const description = () => task()?.description.trim() ?? "";
  const parts = () => preview(description());
  const canExpand = () => !!parts().tail;
  const doc = () => task()?.record?.document?.content ?? "";
  const docParts = () => preview(doc());
  const canExpandDoc = () => !!docParts().tail;
  const [docEditing, setDocEditing] = createSignal(false);
  const [docDraft, setDocDraft] = createSignal("");
  const [descEditing, setDescEditing] = createSignal(false);
  const [descDraft, setDescDraft] = createSignal("");
  const sessions = () => task()?.record?.sessions ?? [];

  function openLink(href: string) {
    if (/^https?:\/\//i.test(href)) {
      props.ctx.system.openExternal(href);
      return;
    }
    try {
      const opened = props.ctx.links.open({
        href,
        exact: true,
        base: task()?.directory,
        session: props.ctx.sessions.current(),
      });
      if (opened) return;
    } catch {
      /* fall through to a harmless fallback */
    }
    void props.ctx.system.copy(href);
    props.ctx.toast.show({ title: props.t("output.copied") });
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

  function startEditDescription() {
    setDescDraft(description());
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

  const onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape" && details()) {
      event.stopPropagation();
      setDetails(false);
    }
  };
  document.addEventListener("keydown", onKey, true);
  onCleanup(() => document.removeEventListener("keydown", onKey, true));

  return (
    <div class="ysb-widget" data-ysb-widget>
      <Show
        when={task()}
        fallback={
          <Show when={!props.board.loading()}>
            <div class="ysb-widget-empty">
              <span>{props.t("widget.noTask")}</span>
            </div>
          </Show>
        }
      >
        {(task) => (
          <>
            <div class="ysb-widget-head">
              <StatusIcon status={task().status} size={12} />
              <span class="ysb-widget-status">{task().status}</span>
              <Show when={task().running}>
                <span class="ysb-widget-run" title={props.t("card.running")} />
              </Show>
              <span class="ysb-widget-time">{relativeTime(task().updated)}</span>
            </div>

            <button
              class="ysb-widget-title"
              type="button"
              title={task().title}
              onClick={props.onOpenBoard}
            >
              {task().title}
            </button>

            <Show when={description()}>
              <section class="ysb-widget-section">
                <header class="ysb-widget-sectionhead">
                  <span class="ysb-widget-sectiontitle">{props.t("widget.goal")}</span>
                  <Show when={canExpand()}>
                    <button
                      class="ysb-widget-sectiontoggle"
                      type="button"
                      onClick={() => setExpanded((value) => !value)}
                    >
                      {props.t(expanded() ? "widget.collapse" : "widget.expand")}
                      <Chevron up={expanded()} />
                    </button>
                  </Show>
                </header>
                <Blocks text={expanded() ? description() : parts().head} onOpenLink={openLink} />
              </section>
            </Show>

            <div class="ysb-widget-meta">
              <span class="ysb-widget-dir" title={task().directory}>
                {basename(task().directory)}
              </span>
              <span class="ysb-widget-sep" aria-hidden="true">
                ·
              </span>
              <span class="ysb-widget-agent">{task().agent}</span>
            </div>

            <Show when={task().labels.length > 0}>
              <div class="ysb-widget-labels">
                <For each={task().labels.slice(0, 2)}>
                  {(label) => (
                    <span class="ysb-widget-label" style={{ "--ysb-label": labelColor(label) }}>
                      <span class="ysb-widget-chipdot" />
                      {label}
                    </span>
                  )}
                </For>
              </div>
            </Show>

            <Show when={doc()}>
              <div class="ysb-widget-divider" />
              <section class="ysb-widget-section">
                <header class="ysb-widget-sectionhead">
                  <span class="ysb-widget-sectiontitle">{props.t("widget.outputs")}</span>
                  <Show when={canExpandDoc()}>
                    <button
                      class="ysb-widget-sectiontoggle"
                      type="button"
                      onClick={() => setOutputsExpanded((value) => !value)}
                    >
                      {props.t(outputsExpanded() ? "widget.collapse" : "widget.expand")}
                      <Chevron up={outputsExpanded()} />
                    </button>
                  </Show>
                </header>
                <Blocks text={outputsExpanded() ? doc() : docParts().head} onOpenLink={openLink} />
              </section>
            </Show>
          </>
        )}
      </Show>

      <div class="ysb-widget-actions">
        <button class="ysb-widget-action" type="button" onClick={() => setDetails(true)}>
          {props.t("widget.details")}
        </button>
        <button class="ysb-widget-action" type="button" onClick={props.onOpenBoard}>
          {props.t("widget.openBoard")}
        </button>
      </div>

      <Show when={details() ? task() : undefined}>
        {(task) => (
          <Portal mount={document.body}>
            <div
              class="ysb-detail-backdrop"
              onClick={(event) => {
                if (event.target === event.currentTarget) setDetails(false);
              }}
            >
              <section class="ysb-detail" role="dialog" aria-modal="true" aria-label={task().title}>
                <header class="ysb-detail-head">
                  <div class="ysb-detail-heading">
                    <StatusIcon status={task().status} size={14} />
                    <h2 class="ysb-detail-title">{task().title}</h2>
                  </div>
                  <button
                    class="ysb-detail-close"
                    type="button"
                    aria-label={props.t("action.close")}
                    onClick={() => setDetails(false)}
                  >
                    ×
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
                            style={{ "--ysb-label": labelColor(label) }}
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
                                setDetails(false);
                                props.board.open(link.sessionId);
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
                      <dd>{task().id}</dd>
                      <dt>{props.t("dialog.updated")}</dt>
                      <dd>{new Date(task().updated).toLocaleString()}</dd>
                      <dt>{props.t("dialog.cost")}</dt>
                      <dd>${task().cost.toFixed(2)}</dd>
                    </dl>
                  </section>
                </div>

                <footer class="ysb-detail-foot">
                  <button
                    class="ysb-widget-action"
                    type="button"
                    onClick={() => {
                      setDetails(false);
                      props.onOpenBoard();
                    }}
                  >
                    {props.t("widget.openBoard")}
                  </button>
                  <button
                    class="ysb-widget-action primary"
                    type="button"
                    onClick={() => setDetails(false)}
                  >
                    {props.t("action.close")}
                  </button>
                </footer>
              </section>
            </div>
          </Portal>
        )}
      </Show>
    </div>
  );
}
