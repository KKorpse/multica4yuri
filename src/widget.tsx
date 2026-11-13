import { For, Show, createSignal, onCleanup, onMount } from "solid-js";
import type { Board } from "./board";
import type { T } from "./i18n";
import { TaskDetails } from "./details";
import { Chevron } from "./icons";
import { Blocks } from "./markdown";
import { basename, relativeTime } from "./model";
import { StatusIcon } from "./status";

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
  const [outputsExpanded, setOutputsExpanded] = createSignal(false);
  const [details, setDetails] = createSignal(false);
  const task = () => (props.sessionID ? props.board.task(props.sessionID) : undefined);
  const description = () => task()?.description.trim() ?? "";
  const parts = () => preview(description());
  const canExpand = () => !!parts().tail;
  const doc = () => task()?.record?.document?.content ?? "";
  const docParts = () => (doc().length <= 800 ? { head: doc(), tail: "" } : preview(doc()));
  const canExpandDoc = () => !!docParts().tail;

  const openLink = (href: string) => props.board.openLink(href, task()?.directory);

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

      <Show when={details() && task()}>
        <TaskDetails
          board={props.board}
          t={props.t}
          id={task()!.id}
          onClose={() => setDetails(false)}
        />
      </Show>
    </div>
  );
}
