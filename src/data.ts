import type { AgentInfo, Project, SessionInfo } from "@opencode/client";
import type { Context } from "@opencode/plugin/gui";
import { hostRequest } from "./host";
import { METADATA_KEY, type TaskMeta } from "./model";

const PAGE = 200;
const MAX_PAGES = 10;

/** The client of the server that runs this plugin. Read it at call time: it changes after a restart. */
export function client(ctx: Context) {
  return ctx.client;
}

export async function listSessions(
  ctx: Context,
  archived: boolean,
  signal: AbortSignal,
): Promise<SessionInfo[]> {
  const out: SessionInfo[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const response = await client(ctx).session.list(
      {
        limit: PAGE,
        order: "desc",
        parentID: null,
        archived,
        ...(cursor ? { cursor } : {}),
      },
      { signal },
    );
    out.push(...response.data);
    cursor = response.cursor.next ?? undefined;
    if (!cursor) break;
  }
  return out;
}

export async function getSession(
  ctx: Context,
  id: string,
  signal: AbortSignal,
): Promise<SessionInfo | undefined> {
  try {
    return await client(ctx).session.get({ sessionID: id }, { signal });
  } catch {
    return undefined;
  }
}

export async function listAgents(
  ctx: Context,
  directory: string,
  signal: AbortSignal,
): Promise<AgentInfo[]> {
  const response = await client(ctx).agent.list({ location: { directory } }, { signal });
  return response.data.filter((agent) => agent.mode !== "subagent" && !agent.hidden);
}

export async function listProjectDirectories(
  ctx: Context,
  signal: AbortSignal,
): Promise<Array<{ path: string; label: string }>> {
  try {
    const projects: Project[] = await client(ctx).project.list(undefined, { signal });
    return projects.map((project) => ({
      path: project.canonical,
      label: project.name?.trim() || project.canonical,
    }));
  } catch {
    return [];
  }
}

export async function createSession(
  ctx: Context,
  input: {
    title: string;
    directory: string;
    agent?: string;
    meta: TaskMeta;
  },
  signal: AbortSignal,
): Promise<SessionInfo> {
  return client(ctx).session.create(
    {
      title: input.title,
      location: { directory: input.directory },
      ...(input.agent ? { agent: input.agent } : {}),
      metadata: { [METADATA_KEY]: input.meta },
    },
    { signal },
  );
}

export async function sendPrompt(
  ctx: Context,
  sessionID: string,
  text: string,
  signal: AbortSignal,
) {
  return client(ctx).session.prompt({ sessionID, text }, { signal });
}

export async function updateTitle(ctx: Context, sessionID: string, title: string) {
  return client(ctx).session.update({ sessionID, title });
}

/**
 * Yuri stores Host metadata through a merge-patch endpoint. Using it instead of
 * session.update keeps every other metadata key (title refresh, assist, archive)
 * intact. The request goes through Yuri's authenticated window.fetch bridge.
 */
export async function writeBoardMeta(
  ctx: Context,
  session: Pick<SessionInfo, "id" | "location">,
  meta: TaskMeta,
  signal: AbortSignal,
): Promise<Record<string, unknown>> {
  const response = await hostRequest<{ metadata: Record<string, unknown> }>(
    ctx,
    `/api/yuri/sessions/${encodeURIComponent(session.id)}/metadata`,
    { patch: { [METADATA_KEY]: meta }, directory: session.location.directory },
  );
  signal.throwIfAborted();
  return response.metadata ?? {};
}

export async function setArchived(
  ctx: Context,
  session: Pick<SessionInfo, "id" | "location">,
  archived: boolean,
  signal: AbortSignal,
): Promise<void> {
  await hostRequest(ctx, `/api/yuri/sessions/${encodeURIComponent(session.id)}/archive`, {
    archivedAt: archived ? Date.now() : 0,
    directory: session.location.directory,
  });
  signal.throwIfAborted();
}

export function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
