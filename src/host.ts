import { Contract, Registry, type Context } from "@opencode/plugin/gui";
import type { JSX } from "solid-js";

export const YuriPage = Registry.define<{
  id: string;
  title: string;
  icon?: string;
  render(): JSX.Element;
}>("yuri.page");

export const YuriPages = Contract.define<{
  open(id: string): boolean;
  current(): string | undefined;
}, "yuri.pages">("yuri.pages");

/** Yuri 0.2.28 exposes page contributions and native URL routing, but not ctx.tabs. */
export function openSession(ctx: Context, sessionID: string): void {
  ctx.signal.throwIfAborted();
  const path = `/session/${encodeURIComponent(sessionID)}`;
  window.history.pushState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
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
