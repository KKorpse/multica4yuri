import assert from "node:assert/strict";
import test from "node:test";
import { resolvePaths } from "../src/paths.ts";

const home = "/home/tester";

test("paths default to a per-user XDG data directory", () => {
  assert.deepEqual(resolvePaths({}, {}, home), {
    dataDir: "/home/tester/.local/share/zmultica",
    dbPath: "/home/tester/.local/share/zmultica/board.db",
  });
});

test("XDG_DATA_HOME and ZMULTICA_DATA_DIR are honored", () => {
  assert.deepEqual(resolvePaths({}, { XDG_DATA_HOME: "/xdg" }, home), {
    dataDir: "/xdg/zmultica",
    dbPath: "/xdg/zmultica/board.db",
  });
  assert.deepEqual(resolvePaths({}, { ZMULTICA_DATA_DIR: "/custom" }, home), {
    dataDir: "/custom",
    dbPath: "/custom/board.db",
  });
});

test("plugin options override dataDir and dbPath", () => {
  assert.deepEqual(
    resolvePaths(
      { dataDir: "/board", dbPath: "/board/tasks.db" },
      { ZMULTICA_DATA_DIR: "/ignored" },
      home,
    ),
    {
      dataDir: "/board",
      dbPath: "/board/tasks.db",
    },
  );
});

test("tilde paths expand against the home directory", () => {
  assert.deepEqual(resolvePaths({ dataDir: "~/zmultica" }, {}, home), {
    dataDir: "/home/tester/zmultica",
    dbPath: "/home/tester/zmultica/board.db",
  });
});
