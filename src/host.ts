import { Contract, Registry, type Context } from "@opencode/plugin/gui";
import type { JSX } from "solid-js";

export const PAGE_ID = "board";
export const BUILD = "0.23.5";

/** Touch devices never mount the board page at all. */
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
let suppressOwnEscape = false;

/** The board's Escape handler must not react to the synthetic dismiss used below. */
export function consumeOwnEscapeSuppression(): boolean {
  const value = suppressOwnEscape;
  suppressOwnEscape = false;
  return value;
}

export function openSession(sessionID: string, directory?: string): void {
  const path = `/session/${encodeURIComponent(sessionID)}`;
  const capacitor = (
    window as unknown as {
      Capacitor?: {
        isNativePlatform?: () => boolean;
        Plugins?: { App?: { openUrl?: (options: { url: string }) => Promise<void> } };
      };
    }
  ).Capacitor;
  const narrow =
    typeof window.matchMedia === "function" && window.matchMedia("(max-width: 760px)").matches;
  const coarse =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(pointer: coarse)").matches
      : (navigator.maxTouchPoints || 0) > 0;
  const mobile = capacitor?.isNativePlatform?.() === true || (narrow && coarse);
  if (mobile) {
    // The phone shell keeps navigation in the mobile store, not the URL router, and
    // opens a chat through the same yuri:// deep link used by notifications.
    const deepLink = `yuri://session/${encodeURIComponent(sessionID)}${
      directory ? `?directory=${encodeURIComponent(directory)}` : ""
    }`;
    window.dispatchEvent(
      new CustomEvent("yuri:open-session", { detail: { sessionId: sessionID, directory } }),
    );
    // Close the host's mobile plugin sheet first; it sits above the tab shell.
    suppressOwnEscape = true;
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    window.setTimeout(() => {
      suppressOwnEscape = false;
    }, 500);
    window.setTimeout(() => {
      // The mobile home is mounted behind the sheet; its row uses the app's own
      // navigation coordinator, which is the most reliable phone path.
      const row = [...document.querySelectorAll<HTMLElement>("[data-mobile-session-id]")].find(
        (element) => element.dataset.mobileSessionId === sessionID,
      );
      if (row) {
        row.click();
        return;
      }
      if (capacitor?.isNativePlatform?.() && capacitor.Plugins?.App?.openUrl) {
        void capacitor.Plugins.App.openUrl({ url: deepLink }).catch(() =>
          window.location.assign(path),
        );
        return;
      }
      window.location.assign(path);
    }, 180);
    return;
  }
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
