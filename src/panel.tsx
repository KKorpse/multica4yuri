import type { MountedSession } from "@opencode/plugin/gui";
import { For, Show, onMount } from "solid-js";
import type { Board } from "./board";
import type { T } from "./i18n";
import { basename, labelColor, relativeTime } from "./model";
import { StatusIcon } from "./ui";

export function TaskPanel(props: {
  board: Board;
  t: T;
  session: MountedSession;
  onOpenBoard(): void;
}) {
  const task = () => props.board.task(props.session.id);
  onMount(() => props.board.activate());
  return (
    <div class="ysb-sidepanel">
      <header class="ysb-sidehead">
        <span class="ysb-sidetitle">{props.t("panel.title")}</span>
        <button class="ysb-btn ghost small" type="button" onClick={props.onOpenBoard}>
          {props.t("panel.openBoard")}
        </button>
      </header>

      <div class="ysb-sidebody">
        <Show when={task()} fallback={<p class="ysb-panelempty">{props.t("panel.noTask")}</p>}>
          <div class="ysb-sidecard">
            <div class="ysb-panelstatusline">
              <StatusIcon status={task()!.status} size={13} />
              <span class="ysb-sidestatus">{task()!.status}</span>
              <Show when={task()!.running}>
                <span class="ysb-run" title={props.t("card.running")} />
              </Show>
            </div>
            <h3 class="ysb-paneltasktitle">{task()!.title}</h3>
            <Show when={task()!.description}>
              <p class="ysb-paneldesc clamped">{task()!.description}</p>
            </Show>
            <Show when={task()!.labels.length > 0}>
              <div class="ysb-chips">
                <For each={task()!.labels}>
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
              <span class="ysb-agent">
                <span class="ysb-avatar" style={`--ysb-avatar:${labelColor(task()!.agent)}`}>
                  {task()!.agent.trim().charAt(0).toUpperCase()}
                </span>
                <span class="ysb-agentname">{task()!.agent}</span>
              </span>
              <span class="ysb-metadir">{basename(task()!.directory)}</span>
              <span class="ysb-time">{relativeTime(task()!.updated)}</span>
            </div>
            <div class="ysb-panelactions">
              <button
                class="ysb-btn small"
                type="button"
                onClick={() => props.board.open(task()!.id)}
              >
                {props.t("action.chat")}
              </button>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
}
