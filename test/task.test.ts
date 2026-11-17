import assert from "node:assert/strict";
import test from "node:test";
import { childTitle, cleanChildGoal, newTask, sessionTitle, stripCodePrefix } from "../src/task.ts";

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
  assert.equal(sessionTitle(value), "【WS-10】Multica 插件支持");
  assert.equal(sessionTitle({ code: "", title: "No code" }), "No code");
});

test("manual renames strip workspace and legacy prefixes", () => {
  assert.equal(stripCodePrefix("【WS-10】Multica 插件支持", "ZM-10"), "Multica 插件支持");
  assert.equal(stripCodePrefix("【WS-10-1】子目标", "ZM-10"), "子目标");
  assert.equal(stripCodePrefix("【ZM-10】Multica 插件支持", "ZM-10"), "Multica 插件支持");
  assert.equal(stripCodePrefix("Multica 插件支持", "ZM-10"), "Multica 插件支持");
  assert.equal(stripCodePrefix("【WS-9】旧标题", "ZM-10"), "【WS-9】旧标题");
});

test("child session titles use the child sequence without repeating the task title", () => {
  assert.equal(childTitle(task(), "补齐文档", "/work/project", 1), "【WS-10-1】补齐文档");
});

test("model-authored title prefixes are stripped from child goals", () => {
  assert.equal(cleanChildGoal("【WS-19-review-2】只读复核", "ZM-19"), "只读复核");
  assert.equal(cleanChildGoal("【WS-19-2】只读复核", "ZM-19"), "只读复核");
  assert.equal(cleanChildGoal("【P0】只读复核", "ZM-19"), "【P0】只读复核");
  assert.equal(cleanChildGoal("【WS-190】只读复核", "ZM-19"), "【WS-190】只读复核");
  assert.equal(
    childTitle(task(), "【WS-10-review】补齐文档", "/work/project", 1),
    "【WS-10-1】补齐文档",
  );
});
