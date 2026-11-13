import { Contract, Registry, type Context } from "@opencode/plugin/gui";
import type { JSX } from "solid-js";

export const PAGE_ID = "board";
export const BUILD = "0.15.7";

/** Touch devices never mount the board page at all. */
export function isTouchDevice(): boolean {
  try {
    return window.matchMedia("(pointer: coarse)").matches;
  } catch {
    return (navigator.maxTouchPoints || 0) > 0;
  }
}

/** The board is a wide, card-heavy surface; touch devices must not mount it. */
export function isMobileSurface(): boolean {
  try {
    if (window.matchMedia("(pointer: coarse)").matches) return true;
    return window.matchMedia("(max-width: 760px)").matches;
  } catch {
    return (window.innerWidth || 0) <= 760 || (navigator.maxTouchPoints || 0) > 0;
  }
}

/** HTML5 drag is unreliable on touch devices and can trigger WebKit drag bugs. */ export function isCoarsePointer(): boolean {
  try {
    return window.matchMedia("(pointer: coarse)").matches;
  } catch {
    return (navigator.maxTouchPoints || 0) > 0;
  }
}

export const YuriPage = Registry.define<{
  id: string;
  title: string;
  icon?: string;
  render(): JSX.Element;
}>("yuri.page");

/** The conversation's right work-status column (below Changes, above Todos). */
export type WorkStatusProps = {
  session?: { id: string; key: string; directory?: string | null };
  directory: string | null;
  placement: "inline" | "popover";
  active: boolean;
  signal: AbortSignal;
};

export const WorkStatus = Registry.define<{
  id: string;
  order?: number;
  render(props: WorkStatusProps): JSX.Element;
}>("yuri.work-status");

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
  // A popstate handler may switch tabs without selecting the session. Only
  // reload when the board is still on screen (the SPA route did not take over),
  // or when a different session surface is showing.
  window.setTimeout(() => {
    const page = document.querySelector<HTMLElement>("[data-ysb-page]");
    const boardVisible = !!page && page.getClientRects().length > 0;
    const surfaces = [...document.querySelectorAll<HTMLElement>("[data-context-session-surface]")];
    const wrongSession =
      surfaces.length > 0 && !surfaces.some((element) => element.dataset.sessionId === sessionID);
    if (boardVisible || wrongSession) window.location.assign(path);
  }, 800);
}

const RETURN_SESSION_KEY = "zmultica:return-session";

export function setReturnSession(id: string | undefined): void {
  try {
    if (id) sessionStorage.setItem(RETURN_SESSION_KEY, id);
    else sessionStorage.removeItem(RETURN_SESSION_KEY);
  } catch {
    /* storage can be unavailable */
  }
}

export function consumeReturnSession(): string | undefined {
  try {
    const id = sessionStorage.getItem(RETURN_SESSION_KEY) || undefined;
    if (id) sessionStorage.removeItem(RETURN_SESSION_KEY);
    return id;
  } catch {
    return undefined;
  }
}

export function openPluginPage(ctx: Context): void {
  setReturnSession(ctx.sessions.current()?.id);
  if (isMobileSurface()) {
    ctx.toast.show({ title: ctx.t("board.desktopOnly") });
    return;
  }
  try {
    const live = ctx.use(YuriPages)();
    if (live.status === "active" && live.value.open(PAGE_ID)) return;
  } catch {
    /* fall through to the URL route */
  }
  window.location.assign(`/plugins/${ctx.id}/${PAGE_ID}`);
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
