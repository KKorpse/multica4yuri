import { For, Show, createSignal, onCleanup, onMount } from "solid-js";
import type { JSX } from "solid-js";
import { Portal } from "solid-js/web";
import type { Context } from "@opencode/plugin/gui";
import type { Board } from "./board";
import type { T } from "./i18n";
import { basename, labelColor, relativeTime, type Output } from "./model";
import { StatusIcon } from "./ui";

/** Render markdown links and bare http(s) URLs without pulling in a parser. */
function rich(text: string): JSX.Element[] {
  const out: JSX.Element[] = [];
  const token = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<]+)/g;
  let last = 0;
  for (let match = token.exec(text); match; match = token.exec(text)) {
    if (match.index > last) out.push(<>{text.slice(last, match.index)}</>);

    let href = match[2] ?? match[3] ?? "";
    let tail = "";
    if (!match[2]) {
      const clean = href.replace(/[).,;:!?]+$/, "");
      tail = href.slice(clean.length);
      href = clean;
    }
    if (href) {
      out.push(
        <a
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          onClick={(event) => event.stopPropagation()}
        >
          {match[1] ?? href}
        </a>,
      );
    }
    if (tail) out.push(<>{tail}</>);
    last = token.lastIndex;
  }
  if (last < text.length) out.push(<>{text.slice(last)}</>);
  return out;
}

function preview(text: string): { head: string; tail: string } {
  const split = text.search(/\n\s*\n/);
  if (split >= 0) return { head: text.slice(0, split).trim(), tail: text.slice(split).trim() };
  const lines = text.split("\n");
  if (lines.length > 3) {
    return { head: lines.slice(0, 3).join("\n"), tail: lines.slice(3).join("\n").trim() };
  }
  return { head: text, tail: "" };
}

function Block(props: { text: string }) {
  const lines = props.text.split("\n").filter((line) => line.trim());
  const first = lines[0] ?? "";
  const rest = lines.slice(1);
  const heading = !/^\s*[-*]\s+/.test(first) && /[:：]\s*$/.test(first) ? first : "";
  const body = heading ? rest : lines;
  const bullets = body.filter((line) => /^\s*[-*]\s+/.test(line));
  const prose = body.filter((line) => !/^\s*[-*]\s+/.test(line));

  return (
    <div class="ysb-widget-block">
      <Show when={heading}>
        <div class="ysb-widget-blocktitle">{heading}</div>
      </Show>
      <Show when={prose.length > 0}>
        <p class="ysb-widget-desc">{rich(prose.join("\n"))}</p>
      </Show>
      <Show when={bullets.length > 0}>
        <ul class="ysb-widget-list">
          <For each={bullets}>{(line) => <li>{rich(line.replace(/^\s*[-*]\s+/, ""))}</li>}</For>
        </ul>
      </Show>
    </div>
  );
}

function Blocks(props: { text: string }) {
  const blocks = () =>
    props.text
      .trim()
      .split(/\n\s*\n/)
      .filter((block) => block.trim());
  return <For each={blocks()}>{(block) => <Block text={block} />}</For>;
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
  const outputs = () => task()?.outputs ?? [];
  const sessions = () => task()?.record?.sessions ?? [];
  const notes = () => task()?.record?.notes ?? [];
  const acceptance = () => task()?.record?.acceptance ?? "";
  const [filePreview, setFilePreview] = createSignal<{
    title: string;
    path: string;
    content: string;
    loading: boolean;
    error?: string;
  }>();

  async function openOutput(output: Output) {
    if (output.type === "text") return;
    if (output.type === "url") {
      props.ctx.system.openExternal(output.value);
      return;
    }

    const path = output.value;
    try {
      if (props.ctx.links.open({ href: path, exact: true, session: props.ctx.sessions.current() }))
        return;
    } catch {
      /* no native handler: fall back to the in-app preview */
    }

    setFilePreview({ title: output.title, path, content: "", loading: true });
    try {
      const screen = props.ctx.screen.current();
      if (!screen) throw new Error("no session screen");
      const resolved = screen.file.resolve(path);
      await screen.file.sync(resolved, { silent: true });
      const state = screen.file.get(resolved);
      if (state?.content?.type === "text") {
        setFilePreview({
          title: output.title,
          path: resolved,
          content: state.content.content,
          loading: false,
        });
      } else {
        setFilePreview({
          title: output.title,
          path: resolved,
          content: "",
          loading: false,
          error: state?.error || props.t("output.previewError"),
        });
      }
    } catch (error) {
      setFilePreview({
        title: output.title,
        path,
        content: "",
        loading: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function copyPreviewPath() {
    const current = filePreview();
    if (!current) return;
    await props.ctx.system.copy(current.path);
    props.ctx.toast.show({ title: props.t("output.copied") });
  }

  const onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape" && filePreview()) {
      event.stopPropagation();
      setFilePreview(undefined);
      return;
    }
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
                <Blocks text={expanded() ? description() : parts().head} />
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

            <Show when={outputs().length > 0}>
              <div class="ysb-widget-divider" />
              <section class="ysb-widget-section">
                <header class="ysb-widget-sectionhead">
                  <span class="ysb-widget-sectiontitle">{props.t("widget.outputs")}</span>
                  <Show when={outputs().length > 2}>
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
                <div class="ysb-widget-outputlist">
                  <For each={outputsExpanded() ? outputs() : outputs().slice(0, 2)}>
                    {(output) =>
                      output.type === "text" ? (
                        <span class="ysb-widget-outputtext" title={output.value}>
                          {output.title}
                        </span>
                      ) : (
                        <button
                          class="ysb-widget-output"
                          type="button"
                          title={output.value}
                          onClick={() => openOutput(output)}
                        >
                          <span class="ysb-widget-outputicon" aria-hidden="true">
                            {output.type === "url" ? "↗" : "▤"}
                          </span>
                          <span class="ysb-widget-outputtitle">{output.title}</span>
                        </button>
                      )
                    }
                  </For>
                </div>
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

                  <Show when={task().description}>
                    <section class="ysb-detail-section">
                      <h3>{props.t("widget.goal")}</h3>
                      <Blocks text={task().description} />
                      <Show when={acceptance()}>
                        <p class="ysb-detail-acceptance">
                          <strong>{props.t("field.acceptance")}</strong>
                          {acceptance()}
                        </p>
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

                  <Show when={outputs().length > 0}>
                    <section class="ysb-detail-section">
                      <h3>{props.t("widget.outputs")}</h3>
                      <div class="ysb-detail-outputlist">
                        <For each={outputs()}>
                          {(output) =>
                            output.type === "text" ? (
                              <div class="ysb-detail-outputtext">
                                <strong>{output.title}</strong>
                                <p>{output.value}</p>
                              </div>
                            ) : (
                              <button
                                class="ysb-detail-output"
                                type="button"
                                title={output.value}
                                onClick={() => openOutput(output)}
                              >
                                <span>{output.title}</span>
                                <span aria-hidden="true">↗</span>
                              </button>
                            )
                          }
                        </For>
                      </div>
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

                  <Show when={notes().length > 0}>
                    <section class="ysb-detail-section">
                      <h3>{props.t("dialog.notes")}</h3>
                      <div class="ysb-detail-notelist">
                        <For each={[...notes()].reverse().slice(0, 8)}>
                          {(note) => (
                            <div class="ysb-detail-note">
                              <span class={`ysb-detail-notestatus ${note.status}`}>
                                {note.status}
                              </span>
                              <span class="ysb-detail-notesummary">{note.summary}</span>
                              <span class="ysb-detail-noteauthor">{note.sessionId}</span>
                            </div>
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

      <Show when={filePreview()}>
        {(current) => (
          <Portal mount={document.body}>
            <div
              class="ysb-detail-backdrop"
              onClick={(event) => {
                if (event.target === event.currentTarget) setFilePreview(undefined);
              }}
            >
              <section
                class="ysb-detail"
                role="dialog"
                aria-modal="true"
                aria-label={current().title}
              >
                <header class="ysb-detail-head">
                  <div class="ysb-detail-heading">
                    <h2 class="ysb-detail-title">{current().title}</h2>
                  </div>
                  <button
                    class="ysb-detail-close"
                    type="button"
                    aria-label={props.t("action.close")}
                    onClick={() => setFilePreview(undefined)}
                  >
                    ×
                  </button>
                </header>

                <div class="ysb-detail-body">
                  <div class="ysb-detail-statusline">
                    <span class="ysb-preview-path">{current().path}</span>
                  </div>
                  <Show when={current().loading}>
                    <p class="ysb-detail-desc">{props.t("output.loading")}</p>
                  </Show>
                  <Show when={current().error}>
                    <p class="ysb-detail-error">{current().error}</p>
                  </Show>
                  <Show when={!current().loading && !current().error}>
                    <pre class="ysb-preview-content">{current().content}</pre>
                  </Show>
                </div>

                <footer class="ysb-detail-foot">
                  <button class="ysb-widget-action" type="button" onClick={copyPreviewPath}>
                    {props.t("output.copyPath")}
                  </button>
                  <button
                    class="ysb-widget-action primary"
                    type="button"
                    onClick={() => setFilePreview(undefined)}
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
