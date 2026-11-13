import assert from "node:assert/strict";
import test from "node:test";
import { resolvePaths } from "../src/paths.ts";

const home = "/home/tester";

test("paths default to a per-user XDG data directory", () => {
  assert.deepEqual(resolvePaths({}, {}, home), {
    dataDir: "/home/tester/.local/share/zmultica",
    dbPath: "/home/tester/.local/share/zmultica/board.db",
    artifactRoot: "/home/tester/.local/share/zmultica/artifacts",
  });
});

test("XDG_DATA_HOME and ZMULTICA_DATA_DIR are honored", () => {
  assert.deepEqual(resolvePaths({}, { XDG_DATA_HOME: "/xdg" }, home), {
    dataDir: "/xdg/zmultica",
    dbPath: "/xdg/zmultica/board.db",
    artifactRoot: "/xdg/zmultica/artifacts",
  });
  assert.deepEqual(resolvePaths({}, { ZMULTICA_DATA_DIR: "/custom" }, home), {
    dataDir: "/custom",
    dbPath: "/custom/board.db",
    artifactRoot: "/custom/artifacts",
  });
});

test("plugin options override dataDir, dbPath and artifactRoot", () => {
  assert.deepEqual(
    resolvePaths(
      { dataDir: "/board", dbPath: "/board/tasks.db", artifactRoot: "/docs" },
      { ZMULTICA_DATA_DIR: "/ignored" },
      home,
    ),
    {
      dataDir: "/board",
      dbPath: "/board/tasks.db",
      artifactRoot: "/docs",
    },
  );
});

test("tilde paths expand against the home directory", () => {
  assert.deepEqual(resolvePaths({ dataDir: "~/zmultica" }, {}, home), {
    dataDir: "/home/tester/zmultica",
    dbPath: "/home/tester/zmultica/board.db",
    artifactRoot: "/home/tester/zmultica/artifacts",
  });
});
