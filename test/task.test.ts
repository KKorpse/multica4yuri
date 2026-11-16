import assert from "node:assert/strict";
import test from "node:test";
import { childTitle, newTask, sessionTitle, stripCodePrefix } from "../src/task.ts";

function task() {
  const value = newTask("Multica 插件支持", "", [], {
    id: "ses_main",
    title: "Multica 插件支持",
    directory: "/work/project",
  });
  value.code = "ZM-10";
  return value;
}

test("session titles carry the workspace prefix", () => {
  const value = task();
  assert.equal(sessionTitle(value), "[WS-10]Multica 插件支持");
  assert.equal(sessionTitle({ code: "", title: "No code" }), "No code");
});

test("manual renames strip workspace and legacy prefixes", () => {
  assert.equal(stripCodePrefix("[WS-10]Multica 插件支持", "ZM-10"), "Multica 插件支持");
  assert.equal(stripCodePrefix("【ZM-10】Multica 插件支持", "ZM-10"), "Multica 插件支持");
  assert.equal(stripCodePrefix("Multica 插件支持", "ZM-10"), "Multica 插件支持");
  assert.equal(stripCodePrefix("[WS-9]旧标题", "ZM-10"), "[WS-9]旧标题");
});

test("child session titles include the workspace and child sequence", () => {
  assert.equal(
    childTitle(task(), "补齐文档", "/work/project", 1),
    "[WS-10][S-1]Multica 插件支持 · 补齐文档",
  );
});
