import { homedir } from "node:os";
import { join } from "node:path";

export type ZMulticaPaths = {
  dataDir: string;
  dbPath: string;
  artifactRoot: string;
};

export function resolvePaths(
  options: Record<string, unknown> = {},
  env: NodeJS.ProcessEnv = process.env,
  home = homedir(),
): ZMulticaPaths {
  const expand = (value: string) =>
    value === "~" ? home : value.startsWith("~/") ? join(home, value.slice(2)) : value;
  const optionPath = (key: string) =>
    typeof options[key] === "string" ? expand(options[key] as string) : undefined;
  const dataDir =
    optionPath("dataDir") ??
    (env.ZMULTICA_DATA_DIR ? expand(env.ZMULTICA_DATA_DIR) : undefined) ??
    join(env.XDG_DATA_HOME ?? join(home, ".local", "share"), "zmultica");
  return {
    dataDir,
    dbPath: optionPath("dbPath") ?? join(dataDir, "board.db"),
    artifactRoot: optionPath("artifactRoot") ?? join(dataDir, "artifacts"),
  };
}
