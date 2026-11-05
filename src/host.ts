import { Contract, Registry, type Context } from "@opencode/plugin/gui";
import type { JSX } from "solid-js";

export const PLUGIN_ID = "yuri-session-board";
export const PAGE_ID = "board";
export const BUILD = "0.1.1";

export const YuriPage = Registry.define<{
  id: string;
  title: string;
  icon?: string;
  render(): JSX.Element;
}>("yuri.page");

/** Host-provided page navigator: switches the shell to the plugin main tab. */
export const YuriPages = Contract.define<
  {
    open(id: string): boolean;
    current(): string | undefined;
  },
  "yuri.pages"
>("yuri.pages");

/** Yuri 0.2.28 does not expose ctx.tabs; this uses its own route, then verifies the switch. */
export function openSession(sessionID: string): void {
  const path = `/session/${encodeURIComponent(sessionID)}`;
  const route = {
    sessionId: sessionID,
    isNewSession: false,
    tab: "chat",
    settingsPath: null,
    settingsEntityId: null,
    diffFile: null,
    diffScope: null,
    scheduleView: null,
    scheduleProjectId: null,
    scheduleTaskId: null,
    assistantId: null,
    focusSessionId: null,
  };
  try {
    window.history.pushState({ ...(window.history.state ?? {}), route }, "", path);
    window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
  } catch {
    window.location.assign(path);
    return;
  }
  // A popstate handler may switch tabs without selecting the session. If the
  // chat surface does not show the target, fall back to a real navigation.
  window.setTimeout(() => {
    const open = [...document.querySelectorAll<HTMLElement>("[data-context-session-surface]")].some(
      (element) => element.dataset.sessionId === sessionID,
    );
    if (!open) window.location.assign(path);
  }, 700);
}

export function openPluginPage(ctx: Context): void {
  try {
    const live = ctx.use(YuriPages)();
    if (live.status === "active" && live.value.open(PAGE_ID)) return;
  } catch {
    /* fall through to the URL route */
  }
  window.location.assign(`/plugins/${PLUGIN_ID}/${PAGE_ID}`);
}

/** Yuri's installed window.fetch bridge supplies the selected host's transport and authentication. */
export async function hostRequest<T>(ctx: Context, path: string, body: unknown): Promise<T> {
  ctx.signal.throwIfAborted();
  const response = await fetch(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    signal: ctx.signal,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `请求失败 (${response.status})`);
  ctx.signal.throwIfAborted();
  return data as T;
}
