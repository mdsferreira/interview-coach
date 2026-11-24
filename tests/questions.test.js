const test = require("node:test");
const assert = require("node:assert");
const IC = require("../extension/questions.js");

test("detects spoken questions without punctuation", () => {
  for (const q of [
    "what is the difference between select related and prefetch related",
    "can you explain how middleware works in django",
    "tell me about a challenging project you worked on",
    "so walk me through how you would scale this service",
    "Is it a good idea to use signals?",
  ]) assert.ok(IC.looksLikeQuestion(q), q);
});

test("ignores statements and filler", () => {
  for (const s of [
    "okay",
    "thanks for joining today",
    "I worked on payments for three years",
    "let's get started",
  ]) assert.ok(!IC.looksLikeQuestion(s), s);
});

test("matches paraphrased questions to the bank", () => {
  assert.match(IC.findInBank("how would you fix an n+1 query problem").q, /N\+1/);
  assert.match(IC.findInBank("difference between select_related and prefetch_related").q, /select_related/);
  assert.match(IC.findInBank("why use a custom user model").q, /custom user model/);
});

test("returns null for unrelated questions", () => {
  assert.strictEqual(IC.findInBank("what is your favorite kubernetes operator"), null);
});

test("randomQuestion avoids repeating the current one", () => {
  const first = IC.BANK[0].q;
  for (let i = 0; i < 50; i++) assert.notStrictEqual(IC.randomQuestion(first).q, first);
});
