import { For, Show, createSignal, onCleanup, onMount } from "solid-js";
import type { JSX } from "solid-js";
import type { Board } from "./board";
import type { T } from "./i18n";
import { basename, labelColor, relativeTime } from "./model";
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

export function TaskStatus(props: { board: Board; t: T; sessionID?: string; onOpenBoard(): void }) {
  onMount(() => props.board.activate());
  onCleanup(() => props.board.deactivate());

  const [expanded, setExpanded] = createSignal(false);
  const task = () => (props.sessionID ? props.board.task(props.sessionID) : undefined);
  const description = () => task()?.description.trim() ?? "";
  const parts = () => preview(description());
  const canExpand = () => !!parts().tail;

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
              <p class="ysb-widget-desc">{rich(expanded() ? description() : parts().head)}</p>
              <Show when={canExpand()}>
                <button
                  class="ysb-widget-more"
                  type="button"
                  onClick={() => setExpanded((value) => !value)}
                >
                  {props.t(expanded() ? "widget.collapse" : "widget.expand")}
                </button>
              </Show>
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
          </>
        )}
      </Show>

      <button class="ysb-widget-open" type="button" onClick={props.onOpenBoard}>
        {props.t("widget.openBoard")}
      </button>
    </div>
  );
}
