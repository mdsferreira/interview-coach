import test from "node:test";
import assert from "node:assert";
globalThis.chrome = { action: { onClicked: { addListener() {} } }, runtime: { onMessage: { addListener() {} } } };
const { buildUserMessage, DEFAULT_SETTINGS } = await import("../src/background.js");

test("user message includes role, question and answer", () => {
  const m = buildUserMessage({ question: "What is N+1?", answer: "extra queries", role: "Senior dev" });
  assert.match(m, /Senior dev/);
  assert.match(m, /What is N\+1\?/);
  assert.match(m, /extra queries/);
});

test("empty answer is marked as none", () => {
  assert.match(buildUserMessage({ question: "Q", answer: "  ", role: "r" }), /\(none\)/);
});

test("default model", () => {
  assert.strictEqual(DEFAULT_SETTINGS.model, "claude-opus-5-5");
});

test("teach mode message has the question but no answer", () => {
  const m = buildUserMessage({ question: "What is N+1?", answer: "extra queries", role: "Senior dev", mode: "teach" });
  assert.match(m, /What is N\+1\?/);
  assert.doesNotMatch(m, /extra queries|spoken answer/);
});
