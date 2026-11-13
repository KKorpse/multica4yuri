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

test("session titles carry the task code prefix", () => {
  const value = task();
  assert.equal(sessionTitle(value), "【ZM-10】Multica 插件支持");
  assert.equal(sessionTitle({ code: "", title: "No code" }), "No code");
});

test("manual renames strip the code prefix from the task title", () => {
  assert.equal(stripCodePrefix("【ZM-10】Multica 插件支持", "ZM-10"), "Multica 插件支持");
  assert.equal(stripCodePrefix("Multica 插件支持", "ZM-10"), "Multica 插件支持");
  assert.equal(stripCodePrefix("【ZM-9】旧标题", "ZM-10"), "【ZM-9】旧标题");
});

test("child session titles keep the code prefix", () => {
  assert.equal(
    childTitle(task(), "补齐文档", "/work/project", 1),
    "【ZM-10】Multica 插件支持 · 补齐文档",
  );
});
