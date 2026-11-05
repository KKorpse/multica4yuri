import { Contract, Registry, type Context } from "@opencode/plugin/gui";
import type { JSX } from "solid-js";

export const PLUGIN_ID = "yuri-session-board";
export const PAGE_ID = "board";

export const YuriPage = Registry.define<{
  id: string;
  title: string;
  icon?: string;
  render(): JSX.Element;
}>("yuri.page");

/** Host-provided page navigator: switches the shell to the plugin main tab. */
export const YuriPages = Contract.define<{
  open(id: string): boolean;
  current(): string | undefined;
}, "yuri.pages">("yuri.pages");

function navigate(path: string) {
  if (window.location.pathname === path) return;
  window.history.pushState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

/** Yuri 0.2.28 does not expose ctx.tabs; its router reacts to this URL change. */
export function openSession(ctx: Context, sessionID: string): void {
  ctx.signal.throwIfAborted();
  navigate(`/session/${encodeURIComponent(sessionID)}`);
}

export function openPluginPage(ctx: Context): void {
  try {
    const live = ctx.use(YuriPages)();
    if (live.status === "active" && live.value.open(PAGE_ID)) return;
  } catch {
    /* fall through to the URL route */
  }
  navigate(`/plugins/${PLUGIN_ID}/${PAGE_ID}`);
}

/** Yuri's installed window.fetch bridge supplies the selected host's transport and authentication. */
export async function hostRequest<T>(
  ctx: Context,
  path: string,
  body: unknown,
): Promise<T> {
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
