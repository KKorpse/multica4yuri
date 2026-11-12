import { For, Show, onCleanup, onMount } from "solid-js";
import type { Board } from "./board";
import type { T } from "./i18n";
import { basename, labelColor, relativeTime } from "./model";
import { StatusIcon } from "./ui";

export function TaskStatus(props: { board: Board; t: T; sessionID?: string; onOpenBoard(): void }) {
  onMount(() => props.board.activate());
  onCleanup(() => props.board.deactivate());

  const task = () => (props.sessionID ? props.board.task(props.sessionID) : undefined);

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
